// Centralized launch site configuration for multi-site support
//
// DATA SOURCES:
// - Trajectory points: SpaceX webcast telemetry (speed/altitude/time overlays),
//   FAA Environmental Impact Statements, NOTAM flight restriction zones, FlightClub.io
//   reconstructions. Points represent ground track at T+0, T+1m, T+2m, T+3m, T+4m, T+5m.
// - Azimuths: Orbital mechanics (azimuth = f(inclination, latitude)) verified against
//   NOTAM closure corridors and webcast trajectory data.
// - Visibility modifiers: NOAA 1991-2020 Climate Normals (KVBG, KXMR, KBRO stations),
//   FAA METAR/TAF climatologies, Bortle Dark-Sky Scale / Falchi et al. 2016 light
//   pollution atlas.
// - Coordinates: Official pad coordinates from FAA licensing documents.

export interface LaunchSite {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lon: number;
  elevation: number; // meters
  timezone: string;
  // Launch Library 2 API identifiers
  ll2LocationIds: number[];
  ll2PadIds: number[];
  padNamePatterns: string[];
  lspIds: number[]; // Launch service provider IDs (121=SpaceX)
  // Trajectory configuration
  defaultAzimuth: number; // degrees from north
  missionAzimuths: Record<string, number>;
  trajectoryPoints: [number, number][];
  // Site-specific visibility modifiers
  visibilityModifiers: {
    humidityPenalty: number;    // 0-1, higher = more humid climate
    typicalCloudCover: number;  // baseline cloud expectation
    coastalFogFactor: number;   // coastal fog likelihood
    lightPollutionBase: number; // ambient light pollution level
  };
  // UI
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
  directionHint: string;
}

const vandenberg: LaunchSite = {
  id: "vandenberg",
  name: "Vandenberg SFB",
  shortName: "Vandenberg",
  lat: 34.6321,
  lon: -120.6107,
  elevation: 112,
  timezone: "America/Los_Angeles",
  ll2LocationIds: [11],
  ll2PadIds: [16, 11],  // SLC-4E (16), SLC-6 (11)
  padNamePatterns: ["slc-4", "vandenberg"],
  lspIds: [121],
  // SSO azimuth from orbital mechanics: arcsin(cos(97.6°)/cos(34.6°)) → 180° - (-9.3°) = 189.3°
  // FCC filings show actual flight tracks at 188-192°; VAFB corridor allows 147-240°
  // Using 190° as representative center of observed SSO flight tracks
  defaultAzimuth: 190,
  missionAzimuths: {
    polar: 180,       // 90° inclination → exactly due south (180°)
    sso: 190,         // 97.6° inclination → arcsin(cos(97.6)/cos(34.6)) = 189.3°, rounded
    retrograde: 190,
    starlink: 190,    // Vandenberg Starlink = polar shell (97.6° incl), same as SSO
    nrol: 190,        // Most NRO missions from VAFB are SSO; varies by mission (160-190°)
  },
  // Ground track at T+0, T+1m, T+2m, T+3m, T+4m, T+5m
  // Azimuth 190°: nearly due south, slight westward drift (~10° west of south)
  // Source: SpaceX webcast telemetry + NOTAM corridor + orbital mechanics
  trajectoryPoints: [
    [34.632, -120.611],   // T+0: Liftoff SLC-4E
    [34.579, -120.622],   // T+1m: Max-Q region, ~12km alt, ~6km downrange
    [34.190, -120.705],   // T+2m: Approaching MECO, ~50km alt, ~50km downrange
    [33.791, -120.790],   // T+3m: MECO/stage sep/SES-1, ~75km alt, ~95km downrange
    [32.951, -120.968],   // T+4m: Upper stage burn, ~130km alt, ~190km downrange
    [31.889, -121.194],   // T+5m: Upper stage climbing, ~170km alt, ~310km downrange
  ],
  // NOAA Climate Normals (KVBG): annual mean RH 72-75%, cloud cover 45-50%,
  // 65-85 fog days/yr (marine layer), but excellent when clear (Bortle 3-4)
  visibilityModifiers: {
    humidityPenalty: 0.05,      // Low: clean Pacific air, excellent transparency when fog clears
    typicalCloudCover: 0.25,    // 45-50% annual, but evening launches avoid marine stratus (burns off by afternoon)
    coastalFogFactor: 0.15,     // Highest: 65-85 fog days/yr, KVBG METAR <1mi vis 8-12% of observations
    lightPollutionBase: 0.05,   // Low: Bortle 3-4, surrounded by military land + Pacific Ocean
  },
  mapCenter: { lat: 34.6321, lng: -120.6107 },
  mapZoom: 5,
  directionHint: "south-southwest",  // Rockets head SSW (190°) from VAFB
};

const capeCanaveral: LaunchSite = {
  id: "cape-canaveral",
  name: "Cape Canaveral SFS",
  shortName: "Cape Canaveral",
  lat: 28.5620,
  lon: -80.5772,
  elevation: 3,
  timezone: "America/New_York",
  ll2LocationIds: [12],
  ll2PadIds: [87, 80],  // LC-39A (87), SLC-40 (80)
  padNamePatterns: ["slc-40", "lc-39", "cape canaveral", "kennedy"],
  lspIds: [121],
  // Default 43° for Starlink 53° inclination (dominant mission type from Cape)
  // Orbital mechanics: arcsin(cos(53°)/cos(28.5°)) = arcsin(0.6018/0.8784) = 43.3°
  // Eastern Range permits 35-120° (east over Atlantic)
  defaultAzimuth: 43,
  missionAzimuths: {
    iss: 45,           // 51.6° inclination → arcsin(cos(51.6)/cos(28.5)) = 45.1°
    crew: 45,          // Crew Dragon to ISS, same inclination
    starlink: 43,      // 53.0° inclination → arcsin(cos(53)/cos(28.5)) = 43.3°
    starlink_v2: 56,   // 43.0° inclination → arcsin(cos(43)/cos(28.5)) = 56.4°
    gto: 90,           // Geostationary transfer → due east (maximize Earth rotation boost)
    geo: 90,           // Direct GEO insertion → due east
    polar: 180,        // Rare from Cape; due south (requires dogleg to avoid land overflight)
  },
  // Ground track for Starlink 53° mission (azimuth 43°, NORTHEAST over Atlantic)
  // Orbital mechanics: cos(43°)=0.731 north, sin(43°)=0.682 east per km downrange
  // Source: orbital mechanics + SpaceX webcast telemetry + NOTAM closure zones
  trajectoryPoints: [
    [28.562, -80.577],   // T+0: Liftoff LC-39A / SLC-40
    [28.601, -80.535],   // T+1m: Max-Q, ~12km alt, ~6km downrange
    [28.923, -80.194],   // T+2m: Approaching MECO, ~55km alt, ~55km downrange
    [29.219, -79.880],   // T+3m: MECO/stage sep/SES-1, ~78km alt, ~100km downrange
    [29.745, -79.323],   // T+4m: Upper stage burn, ~135km alt, ~180km downrange
    [30.862, -78.139],   // T+5m: Upper stage climbing, ~175km alt, ~350km downrange
  ],
  // NOAA Climate Normals: annual mean RH 74-78%, cloud cover 55-60%,
  // only 15-25 fog days/yr, but worst light pollution (Bortle 5-6, Orlando metro dome)
  visibilityModifiers: {
    humidityPenalty: 0.20,      // Highest: subtropical maritime, persistent high dew points
    typicalCloudCover: 0.40,    // 55-60% annual mean, but evening launches avoid afternoon convection
    coastalFogFactor: 0.05,     // Low: only 15-25 fog days/yr (mostly winter pre-dawn)
    lightPollutionBase: 0.10,   // Highest: Bortle 5-6, Orlando metro light dome
  },
  mapCenter: { lat: 28.5620, lng: -80.5772 },
  mapZoom: 5,
  directionHint: "east-northeast",  // Starlink missions head NE, not SE
};

const bocaChica: LaunchSite = {
  id: "boca-chica",
  name: "Starbase",
  shortName: "Starbase",
  lat: 25.9972,
  lon: -97.1571,
  elevation: 2,
  timezone: "America/Chicago",
  ll2LocationIds: [143],
  ll2PadIds: [187, 188],
  padNamePatterns: ["starbase", "boca chica"],
  lspIds: [121],
  // 97° = 7° south of due east, per FAA EIS for Starship/Super Heavy (June 2022)
  // Threads between Cuba and Yucatan on longer flights
  defaultAzimuth: 97,
  missionAzimuths: {
    orbital: 97,       // Per FAA Programmatic EA, nominal eastward trajectory
    starship: 97,      // All Starship flights (IFT-1 through IFT-6+) use ~97° azimuth
  },
  // Ground track for Starship (azimuth ~97°, east over Gulf of Mexico)
  // Starship flight profile: MECO ~T+2:40, hot-staging, slower initial TWR than F9
  // Source: IFT-3 through IFT-6 webcast telemetry + FAA EIS trajectory data
  trajectoryPoints: [
    [25.997, -97.157],   // T+0: Liftoff from Starbase
    [25.994, -97.127],   // T+1m: Max-Q region, ~8km alt (slower than F9)
    [25.959, -96.810],   // T+2m: Accelerating, ~40km alt
    [25.909, -96.364],   // T+3m: Hot-staging/booster sep, ~75km alt
    [25.810, -95.470],   // T+4m: Starship upper stage, ~110km alt
    [25.712, -94.578],   // T+5m: Upper stage climbing, ~150km alt
  ],
  // NOAA Climate Normals: annual mean RH 74-77%, cloud cover 50-55%,
  // 20-30 fog days/yr, moderate light pollution (Bortle 4, Brownsville/Matamoros)
  visibilityModifiers: {
    humidityPenalty: 0.15,      // Mid-range: Gulf moisture, less than Florida
    typicalCloudCover: 0.35,    // 50-55% annual, less convective than Florida
    coastalFogFactor: 0.08,     // Moderate: 20-30 fog days/yr (Nov-Feb, advection fog)
    lightPollutionBase: 0.05,   // Bortle 4: Brownsville (~185K) + Matamoros (~520K) nearby
  },
  mapCenter: { lat: 25.9972, lng: -97.1571 },
  mapZoom: 5,
  directionHint: "east-southeast",
};

export const LAUNCH_SITES: Record<string, LaunchSite> = {
  vandenberg,
  "cape-canaveral": capeCanaveral,
  "boca-chica": bocaChica,
};

export function getLaunchSite(id: string): LaunchSite | undefined {
  return LAUNCH_SITES[id];
}

export function getSiteForPad(padId: number, padName?: string): LaunchSite | undefined {
  // First try matching by pad ID
  for (const site of Object.values(LAUNCH_SITES)) {
    if (site.ll2PadIds.includes(padId)) {
      return site;
    }
  }
  // Fallback: match by pad name patterns
  if (padName) {
    const nameLower = padName.toLowerCase();
    for (const site of Object.values(LAUNCH_SITES)) {
      if (site.padNamePatterns.some((p) => nameLower.includes(p))) {
        return site;
      }
    }
  }
  return undefined;
}

export function getAllSiteIds(): string[] {
  return Object.keys(LAUNCH_SITES);
}
