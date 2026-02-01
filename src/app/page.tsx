"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import StarField from "./components/StarField";
import LaunchCard from "./components/LaunchCard";
import VisibilityHero from "./components/VisibilityHero";
import TrajectoryMap from "./components/TrajectoryMap";
import LaunchCarousel from "./components/LaunchCarousel";
import EmailSubscribe from "./components/EmailSubscribe";
import AccessibilityToggle from "./components/AccessibilityToggle";
import { type ViewingLocation } from "./components/LocationSettings";
import { initVisibilityStorage } from "../lib/clientVisibility";

// SWR fetcher with error handling
const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  });

interface Launch {
  id: string;
  name: string;
  date_utc: string;
  date_unix: number;
  date_local: string;
  details: string | null;
  links: {
    patch: { small: string | null };
    webcast: string | null;
  };
  flight_number: number;
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
  siteId?: string;
  spacexUrl?: string | null;
}

interface VisibilityData {
  percentage: number;
  rating: "poor" | "fair" | "good" | "excellent";
  optimalWindow: {
    start: string | null;
    end: string | null;
    startFormatted: string | null;
    endFormatted: string | null;
    duration: number;
    description: string;
  };
  recommendations: string[];
  viewingLocation: {
    name: string;
    distance: number;
  };
  factors?: {
    subScores: {
      cloud: number;
      sun: number;
      distance: number;
      clarity: number;
    };
    rawData: {
      cloudFraction: number;
      solarElevation: number;
      distanceKm: number;
      surfaceVisibilityKm: number;
    };
  };
  fatalBlocker?: string | null;
}

export default function Home() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [viewingLocation, setViewingLocation] = useState<ViewingLocation | null>(null);
  const [hasUserSetLocation, setHasUserSetLocation] = useState(false);
  const [selectedLaunchIndex, setSelectedLaunchIndex] = useState(0);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize visibility storage and load saved location on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Initialize visibility storage (purges old records)
      initVisibilityStorage();

      // Load and validate saved location
      const saved = localStorage.getItem("falconwatch_viewing_location");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (
            parsed &&
            typeof parsed.name === "string" &&
            typeof parsed.lat === "number" &&
            typeof parsed.lon === "number" &&
            isFinite(parsed.lat) &&
            isFinite(parsed.lon) &&
            parsed.lat >= -90 &&
            parsed.lat <= 90 &&
            parsed.lon >= -180 &&
            parsed.lon <= 180
          ) {
            setViewingLocation({ name: parsed.name, lat: parsed.lat, lon: parsed.lon });
            setHasUserSetLocation(true);
          } else {
            localStorage.removeItem("falconwatch_viewing_location");
          }
        } catch {
          localStorage.removeItem("falconwatch_viewing_location");
        }
      }
    }
  }, []);

  // Handle location change with user flag
  const handleLocationChange = (location: ViewingLocation) => {
    setViewingLocation(location);
    setHasUserSetLocation(true);
  };

  // Fetch launches from all sites
  const { data: launchData, isLoading: launchLoading } = useSWR(
    "/api/launches?type=upcoming&site=all",
    fetcher,
    {
      refreshInterval: 300000,
      onSuccess: () => setLastRefresh(new Date()),
    }
  );

  // Get the selected launch (default: soonest across all sites)
  const allLaunches: Launch[] = launchData?.success && launchData.data?.length > 0
    ? launchData.data
    : [];
  const selectedLaunch: Launch | null = allLaunches[selectedLaunchIndex] || allLaunches[0] || null;
  const selectedSiteId = selectedLaunch?.siteId || "vandenberg";

  // Fetch weather for the selected launch's site
  const { data: weatherData } = useSWR(
    selectedSiteId ? `/api/weather?launchSite=${selectedSiteId}` : "/api/weather",
    fetcher,
    { refreshInterval: 600000 }
  );

  // Fetch weather for user's viewing location (only when user has set a location)
  const { data: userWeatherData } = useSWR(
    viewingLocation
      ? `/api/weather?lat=${viewingLocation.lat}&lon=${viewingLocation.lon}&name=${encodeURIComponent(viewingLocation.name)}`
      : null,
    fetcher,
    { refreshInterval: 600000 }
  );

  // Fetch visibility for the selected launch with custom location and siteId
  const { data: visibilityData, isLoading: visibilityLoading } = useSWR(
    selectedLaunch && viewingLocation
      ? `/api/visibility?launchTime=${selectedLaunch.date_unix}&missionName=${encodeURIComponent(selectedLaunch.name)}&siteId=${selectedSiteId}&lat=${viewingLocation.lat}&lon=${viewingLocation.lon}&locationName=${encodeURIComponent(viewingLocation.name)}`
      : null,
    fetcher,
    { refreshInterval: 300000 }
  );

  const visibility: VisibilityData | null = visibilityData?.success
    ? visibilityData.data
    : null;

  const weather = weatherData?.data || { launchSite: null };

  // Handle launch selection from carousel
  const handleLaunchSelect = (index: number) => {
    // Index is relative to carousel (which shows launches after the first)
    // So carousel index 0 = allLaunches[1], etc.
    setSelectedLaunchIndex(index + 1);
  };

  // Format current time for header (user's local timezone)
  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="min-h-screen relative">
      {/* Animated star background */}
      <StarField />

      {/* Main content */}
      <div className="relative z-10">
        {/* Header - Clean and minimal */}
        <header className="border-b border-nasa-blue/30 bg-space-navy/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-retro-orange/20 flex items-center justify-center border border-retro-orange/40">
                  <span className="text-xl">🚀</span>
                </div>
                <h1
                  className="text-lg font-bold tracking-widest text-retro-orange hidden sm:block"
                  style={{ fontFamily: "var(--font-orbitron)" }}
                >
                  FALCONWATCH
                </h1>
              </div>

              {/* Right side - Time + Accessibility */}
              <div className="flex items-center gap-4">
                {/* Time and Date */}
                <div className="text-right">
                  <div className="font-mono text-lg text-off-white">
                    {formattedTime}
                  </div>
                  <div className="text-sm text-off-white/50 hidden sm:block">
                    {formattedDate}
                  </div>
                </div>
                <AccessibilityToggle />
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main id="main-content" className="max-w-6xl mx-auto px-4 py-6 space-y-6">
          {/* HERO: Visibility - THE most important feature */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <VisibilityHero
              percentage={visibility?.percentage || 0}
              rating={visibility?.rating || "poor"}
              optimalWindow={visibility?.optimalWindow}
              recommendations={visibility?.recommendations}
              viewingLocation={visibility?.viewingLocation}
              factors={visibility?.factors}
              fatalBlocker={visibility?.fatalBlocker}
              loading={viewingLocation ? (visibilityLoading || launchLoading) : false}
              launchDate={selectedLaunch ? new Date(selectedLaunch.date_utc) : null}
              missionName={selectedLaunch?.name}
              siteName={selectedSiteId !== "vandenberg" ? (selectedLaunch?.launchpadData?.full_name || selectedSiteId) : undefined}
              locationSet={!!viewingLocation}
              onSetLocation={handleLocationChange}
            />
          </motion.section>

          {/* Row 2: Map | Mission Details - context and details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <TrajectoryMap
                visibilityPercentage={visibility?.percentage || 50}
                viewingLocation={viewingLocation}
                onLocationChange={handleLocationChange}
                siteId={selectedSiteId}
              />
            </motion.section>

            {selectedLaunch && !launchLoading && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                <LaunchCard mission={selectedLaunch} lastRefresh={lastRefresh} />
              </motion.section>
            )}
          </div>

          {/* Row 3: Upcoming Launches | Email Subscribe */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="h-80"
            >
              <LaunchCarousel
                launches={allLaunches.slice(1, 6)}
                loading={launchLoading}
                vertical
                onLaunchSelect={handleLaunchSelect}
                selectedIndex={selectedLaunchIndex > 0 ? selectedLaunchIndex - 1 : -1}
              />
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="h-80"
            >
              <EmailSubscribe />
            </motion.section>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-nasa-blue/20 mt-12 py-8">
          <div className="max-w-6xl mx-auto px-4 space-y-3">
            <div className="grid grid-cols-3 items-center text-sm text-off-white/50">
              <div className="flex items-center gap-4">
                <a href="https://thespacedevs.com/" target="_blank" rel="noopener noreferrer" className="hover:text-off-white transition-colors">The Space Devs</a>
                <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" className="hover:text-off-white transition-colors">Open-Meteo</a>
              </div>
              <p className="text-center">&copy; {new Date().getFullYear()} FalconWatch</p>
              <p className="text-right">Not affiliated with SpaceX</p>
            </div>
            <div className="text-center">
              <a href="/privacy" className="text-sm text-off-white/50 hover:text-off-white transition-colors">Privacy Statement</a>
            </div>
          </div>
        </footer>
      </div>

      {/* CRT scanline overlay for retro aesthetic */}
      <div className="fixed inset-0 pointer-events-none z-50 scanlines opacity-40" />
    </div>
  );
}
