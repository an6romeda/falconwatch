// Launch Library 2 API client (The Space Devs)
// API Documentation: https://ll.thespacedevs.com/docs/

import { LAUNCH_SITES, getLaunchSite, getSiteForPad, getAllSiteIds, type LaunchSite } from "./launchSites";

const LL2_API_BASE = "https://ll.thespacedevs.com/2.2.0";

export interface Launch {
  id: string;
  name: string;
  status: {
    id: number;
    name: string;
    abbrev: string;
    description: string;
  };
  net: string; // NET (No Earlier Than) datetime
  window_start: string;
  window_end: string;
  rocket: {
    id: number;
    configuration: {
      name: string;
      full_name: string;
      family: string;
    };
  };
  mission: {
    name: string;
    description: string;
    type: string;
    orbit?: {
      name: string;
      abbrev: string;
    };
  } | null;
  pad: {
    id: number;
    name: string;
    location: {
      name: string;
    };
  };
  launch_service_provider: {
    name: string;
    type: string;
  };
  image?: string;
  webcast_live?: boolean;
  vidURLs?: Array<{
    url: string;
    title: string;
  }>;
}

export interface EnrichedLaunch extends Launch {
  date_utc: string;
  date_unix: number;
  details: string | null;
  flight_number: number;
  links: {
    patch: { small: string | null };
    webcast: string | null;
  };
  rocketData?: {
    name: string;
    type: string;
  };
  launchpadData?: {
    name: string;
    full_name: string;
  };
  payloadData?: Array<{
    name: string;
    type: string;
    customers: string[];
    orbit: string;
  }>;
  spacexUrl?: string | null; // SpaceX launch page URL if it exists
  siteId?: string; // Launch site identifier
}

// Generate SpaceX URL slug from mission name
function generateSpacexSlug(name: string): string | null {
  // Extract mission name after pipe separator if present
  const missionName = name.includes("|")
    ? name.split("|").pop()?.trim() || name
    : name;

  // Starlink missions - use "sl-X-Y" format
  const starlinkMatch = missionName.match(/Starlink\s+(?:Group\s+)?(\d+-\d+)/i);
  if (starlinkMatch) {
    return `sl-${starlinkMatch[1]}`;
  }

  // SDA Tranche 1 Transport Layer missions - use "sda-t1tl-X" format
  const sdaT1Match = missionName.match(/SDA\s+Tranche\s*1\s+Transport\s+Layer\s+([A-Z])/i);
  if (sdaT1Match) {
    return `sda-t1tl-${sdaT1Match[1].toLowerCase()}`;
  }

  // Transporter missions - use "transporter-X" format
  const transporterMatch = missionName.match(/Transporter[\s-]*(\d+)/i);
  if (transporterMatch) {
    return `transporter-${transporterMatch[1]}`;
  }

  // NROL missions - use "nrol-XXX" format
  const nrolMatch = missionName.match(/NROL-?(\d+)/i);
  if (nrolMatch) {
    return `nrol-${nrolMatch[1]}`;
  }

  // Unknown mission type - return null to skip linking
  return null;
}

// Check if a SpaceX launch page exists
// Returns: true if page exists, false if confirmed not to exist, true on errors (fail open)
async function checkSpacexPageExists(slug: string): Promise<boolean> {
  const targetUrl = `https://www.spacex.com/launches/${slug}/`;
  try {
    const response = await fetch(targetUrl, {
      method: "HEAD",
      redirect: "manual", // Don't follow redirects - we want to detect them
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });
    // 404 means page definitely doesn't exist
    if (response.status === 404) {
      return false;
    }
    // 3xx redirect likely means the page doesn't exist and redirects to homepage
    if (response.status >= 300 && response.status < 400) {
      return false;
    }
    // 200 means it exists
    return response.ok;
  } catch {
    // On error (network, timeout), assume page exists (fail open)
    // This prevents hiding launches due to network issues
    return true;
  }
}

// Transform LL2 launch to our format, with site detection
function transformLaunch(launch: Launch): EnrichedLaunch {
  const netDate = new Date(launch.net);

  // Detect which site this launch belongs to
  const site = getSiteForPad(launch.pad.id, launch.pad.name);
  const siteId = site?.id;

  return {
    ...launch,
    date_utc: launch.net,
    date_unix: Math.floor(netDate.getTime() / 1000),
    details: launch.mission?.description || null,
    flight_number: 0, // Not available from Launch Library 2 API
    links: {
      patch: { small: launch.image || null },
      webcast: launch.vidURLs?.[0]?.url || null,
    },
    rocketData: {
      name: launch.rocket.configuration.full_name,
      type: launch.rocket.configuration.family,
    },
    launchpadData: {
      name: launch.pad.name,
      full_name: `${launch.pad.name}, ${launch.pad.location.name}`,
    },
    payloadData: launch.mission ? [{
      name: launch.mission.name,
      type: launch.mission.type,
      customers: [launch.launch_service_provider.name],
      orbit: launch.mission.orbit?.abbrev || "Unknown",
    }] : [],
    siteId,
  };
}

// Check if a launch matches a given site
function launchMatchesSite(launch: Launch, site: LaunchSite): boolean {
  return (
    site.ll2PadIds.includes(launch.pad.id) ||
    site.padNamePatterns.some((p) => launch.pad.name.toLowerCase().includes(p))
  );
}

// Fetch upcoming launches for a specific site (SpaceX only)
export async function getUpcomingLaunches(siteId?: string): Promise<EnrichedLaunch[]> {
  const site = siteId ? getLaunchSite(siteId) : getLaunchSite("vandenberg");
  if (!site) return [];

  try {
    const locationIds = site.ll2LocationIds.join(",");
    const lspIds = site.lspIds.join(",");
    const response = await fetch(
      `${LL2_API_BASE}/launch/upcoming/?location__ids=${locationIds}&lsp__ids=${lspIds}&limit=20`,
      {
        next: { revalidate: 300 },
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      console.error(`Launch Library 2 API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const launches: Launch[] = data.results || [];

    // 12 hours in milliseconds - launches older than this are considered "past"
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
    const now = Date.now();

    // Filter for this site's pads specifically and transform
    const siteLaunches = launches
      .filter((launch: Launch) => launchMatchesSite(launch, site))
      .map(transformLaunch)
      .filter((launch: EnrichedLaunch) => {
        const launchTime = launch.date_unix * 1000;
        return launchTime > now - TWELVE_HOURS_MS;
      });

    // Sort by date
    const sortedLaunches = siteLaunches.sort((a, b) => a.date_unix - b.date_unix);

    // Check SpaceX page existence for each launch (in parallel)
    const launchesWithUrls = await Promise.all(
      sortedLaunches.map(async (launch) => {
        const slug = generateSpacexSlug(launch.name);
        if (!slug) {
          return { ...launch, spacexUrl: null };
        }
        const pageExists = await checkSpacexPageExists(slug);
        return {
          ...launch,
          spacexUrl: pageExists ? `https://www.spacex.com/launches/${slug}/` : null,
        };
      })
    );

    return launchesWithUrls;
  } catch (error) {
    console.error("Failed to fetch launches:", error);
    return [];
  }
}

// Fetch upcoming launches from ALL sites in parallel
export async function getUpcomingLaunchesAllSites(): Promise<EnrichedLaunch[]> {
  const siteIds = getAllSiteIds();
  const allLaunches = await Promise.all(
    siteIds.map((siteId) => getUpcomingLaunches(siteId))
  );

  // Flatten and sort by date
  return allLaunches.flat().sort((a, b) => a.date_unix - b.date_unix);
}

// Fetch past launches for a specific site
export async function getPastLaunches(
  siteId?: string,
  limit = 5
): Promise<EnrichedLaunch[]> {
  const site = siteId ? getLaunchSite(siteId) : getLaunchSite("vandenberg");
  if (!site) return [];

  try {
    const locationIds = site.ll2LocationIds.join(",");
    const lspIds = site.lspIds.join(",");
    const response = await fetch(
      `${LL2_API_BASE}/launch/previous/?location__ids=${locationIds}&lsp__ids=${lspIds}&limit=${limit}`,
      {
        next: { revalidate: 3600 },
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      console.error(`Launch Library 2 API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const launches: Launch[] = data.results || [];

    // Filter and transform
    const siteLaunches = launches
      .filter((launch: Launch) => launchMatchesSite(launch, site))
      .map(transformLaunch);

    return siteLaunches.sort((a, b) => b.date_unix - a.date_unix);
  } catch (error) {
    console.error("Failed to fetch past launches:", error);
    return [];
  }
}

// Get the next upcoming launch (optionally for a specific site, or soonest across all)
export async function getNextLaunch(siteId?: string): Promise<EnrichedLaunch | null> {
  const launches = siteId
    ? await getUpcomingLaunches(siteId)
    : await getUpcomingLaunchesAllSites();

  if (launches.length === 0) {
    return null;
  }

  return launches[0];
}

// Get all launches (past and upcoming) for a site
export async function getAllLaunches(siteId?: string): Promise<{
  upcoming: EnrichedLaunch[];
  past: EnrichedLaunch[];
}> {
  const [upcoming, past] = await Promise.all([
    siteId ? getUpcomingLaunches(siteId) : getUpcomingLaunchesAllSites(),
    getPastLaunches(siteId, 10),
  ]);

  return { upcoming, past };
}

