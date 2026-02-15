"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Feedback storage key
const FEEDBACK_STORAGE_KEY = "falconwatch_visibility_feedback";

interface VisibilityWindow {
  startFormatted: string | null;
  endFormatted: string | null;
  description: string;
}

interface SubScores {
  cloud: number;
  sun: number;
  distance: number;
  clarity: number;
}

interface RawData {
  cloudFraction: number;
  solarElevation: number;
  distanceKm: number;
  surfaceVisibilityKm: number;
}


interface ViewingLocationInput {
  name: string;
  lat: number;
  lon: number;
}

interface VisibilityHeroProps {
  percentage: number;
  rating: "poor" | "fair" | "good" | "excellent";
  optimalWindow?: VisibilityWindow;
  recommendations?: string[];
  viewingLocation?: {
    name: string;
    distance: number;
  };
  factors?: {
    subScores: SubScores;
    rawData: RawData;
  };
  fatalBlocker?: string | null;
  loading?: boolean;
  launchDate?: Date | null;
  missionName?: string;
  siteName?: string;
  locationSet?: boolean;
  onSetLocation?: (location: ViewingLocationInput) => void;
}

// Countdown component integrated into hero
function MiniCountdown({ targetDate }: { targetDate: Date }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });

  useEffect(() => {
    const calc = () => {
      const diff = targetDate.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        secs: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div
      className="flex items-center justify-center gap-0.5 sm:gap-1 font-mono text-off-white/90"
      role="timer"
      aria-live="polite"
      aria-label={`Time until launch: ${timeLeft.days} days, ${timeLeft.hours} hours, ${timeLeft.mins} minutes, ${timeLeft.secs} seconds`}
    >
      <span className="text-xl sm:text-2xl md:text-3xl font-bold" aria-hidden="true">{timeLeft.days}</span>
      <span className="text-xs sm:text-sm text-off-white/60" aria-hidden="true">d</span>
      <span className="mx-0.5 sm:mx-1 text-off-white/30" aria-hidden="true">:</span>
      <span className="text-xl sm:text-2xl md:text-3xl font-bold" aria-hidden="true">{String(timeLeft.hours).padStart(2, '0')}</span>
      <span className="text-xs sm:text-sm text-off-white/60" aria-hidden="true">h</span>
      <span className="mx-0.5 sm:mx-1 text-off-white/30" aria-hidden="true">:</span>
      <span className="text-xl sm:text-2xl md:text-3xl font-bold" aria-hidden="true">{String(timeLeft.mins).padStart(2, '0')}</span>
      <span className="text-xs sm:text-sm text-off-white/60" aria-hidden="true">m</span>
      <span className="mx-0.5 sm:mx-1 text-off-white/30" aria-hidden="true">:</span>
      <span className="text-xl sm:text-2xl md:text-3xl font-bold" aria-hidden="true">{String(timeLeft.secs).padStart(2, '0')}</span>
      <span className="text-xs sm:text-sm text-off-white/60" aria-hidden="true">s</span>
    </div>
  );
}

// Factor pill component - compact on mobile
function FactorPill({
  icon,
  label,
  status,
  isGood
}: {
  icon: React.ReactNode;
  label: string;
  status: string;
  isGood: boolean;
}) {
  return (
    <div
      className={`
        flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm
        ${isGood
          ? 'bg-mission-green/10 border border-mission-green/30'
          : 'bg-red-500/10 border border-red-500/30'
        }
      `}
      title={`${label}: ${status} - ${isGood ? 'Good' : 'Poor'}`}
    >
      {icon}
      {/* Hide label on very small screens, show on sm+ */}
      <span className="hidden sm:inline text-off-white/60">{label}:</span>
      <span className={`font-medium ${isGood ? 'text-mission-green' : 'text-red-400'}`}>
        {status}
      </span>
      {/* Status indicator */}
      <span
        className={`text-xs font-semibold ${isGood ? 'text-mission-green/70' : 'text-red-400/70'}`}
        aria-label={isGood ? 'Good conditions' : 'Poor conditions'}
      >
        {isGood ? '✓' : '!'}
      </span>
    </div>
  );
}

// What You'll See - visual description component
function WhatYoullSee({
  percentage,
  timingStatus,
  distanceMiles,
  fatalBlocker,
}: {
  percentage: number;
  timingStatus: string;
  distanceMiles: number;
  fatalBlocker?: string | null;
}) {
  if (fatalBlocker) {
    return (
      <p className="text-off-white/60 text-sm">
        Unfortunately, conditions aren&apos;t favorable for viewing. {fatalBlocker}
      </p>
    );
  }

  const isTwilight = timingStatus === "Twilight";
  const isNight = timingStatus === "Night";
  const isDawn = timingStatus === "Dawn/Dusk";
  const isClose = distanceMiles < 200;
  const isMedium = distanceMiles >= 200 && distanceMiles < 400;

  return (
    <div className="space-y-3 text-sm text-off-white/80">
      {/* Main visual description */}
      <p>
        {percentage >= 70 ? (
          <>
            <span className="text-mission-green font-medium">Spectacular view expected!</span>{" "}
            {isTwilight ? (
              "During twilight, you'll see the rocket's exhaust plume brilliantly illuminated against the darkening sky—often called a 'jellyfish' effect as the plume expands in the upper atmosphere."
            ) : isNight ? (
              "Against the dark night sky, the rocket will appear as a bright, moving point of light with a visible exhaust trail stretching behind it."
            ) : (
              "Look for a bright ascending light with a visible exhaust plume trailing behind it."
            )}
          </>
        ) : percentage >= 40 ? (
          <>
            <span className="text-amber font-medium">Good chance to spot it.</span>{" "}
            {isClose ? (
              "At your distance, you may see the rocket as a bright moving object. Best viewed with binoculars."
            ) : isMedium ? (
              "You'll likely see it as a small bright dot moving across the sky. Binoculars recommended."
            ) : (
              "The rocket may appear as a small moving light on the horizon. Use binoculars or a camera with zoom."
            )}
          </>
        ) : (
          <>
            <span className="text-off-white/60">Challenging viewing conditions.</span>{" "}
            With some luck and good positioning, you might catch a glimpse of the rocket as a faint moving light.
          </>
        )}
      </p>

      {/* Timeline */}
      <div className="flex items-start gap-2 text-xs text-off-white/50">
        <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          The rocket typically becomes visible 2-3 minutes after liftoff and remains visible for 3-5 minutes as it ascends.
        </span>
      </div>
    </div>
  );
}

// User feedback component
function VisibilityFeedback({
  missionName,
  predictedPercentage,
  launchDate,
}: {
  missionName?: string;
  predictedPercentage: number;
  launchDate?: Date | null;
}) {
  const [feedbackGiven, setFeedbackGiven] = useState<"yes" | "no" | null>(null);
  const [showThanks, setShowThanks] = useState(false);

  // Check if we've already given feedback for this mission
  useEffect(() => {
    if (!missionName || typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
      if (stored) {
        const feedbackData = JSON.parse(stored);
        const missionFeedback = feedbackData[missionName];
        if (missionFeedback) {
          setFeedbackGiven(missionFeedback.sawIt ? "yes" : "no");
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
  }, [missionName]);

  const handleFeedback = useCallback((sawIt: boolean) => {
    if (!missionName) return;

    try {
      const stored = localStorage.getItem(FEEDBACK_STORAGE_KEY);
      const feedbackData = stored ? JSON.parse(stored) : {};

      feedbackData[missionName] = {
        sawIt,
        predictedPercentage,
        timestamp: Date.now(),
        launchDate: launchDate?.toISOString(),
      };

      localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(feedbackData));
      setFeedbackGiven(sawIt ? "yes" : "no");
      setShowThanks(true);

      // Hide thanks message after 3 seconds
      setTimeout(() => setShowThanks(false), 3000);
    } catch (e) {
      // Ignore storage errors
    }
  }, [missionName, predictedPercentage, launchDate]);

  // Don't show if launch is more than 1 hour in the future
  if (launchDate && launchDate.getTime() - Date.now() > 60 * 60 * 1000) {
    return null;
  }

  if (feedbackGiven && !showThanks) {
    return (
      <div className="text-center py-3 text-sm text-off-white/50">
        <span className="inline-flex items-center gap-2">
          <svg className="w-4 h-4 text-mission-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Thanks for your feedback!
        </span>
      </div>
    );
  }

  return (
    <div className="border-t border-nasa-blue/20 pt-4 mt-4">
      <AnimatePresence mode="wait">
        {showThanks ? (
          <motion.div
            key="thanks"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-center py-2"
          >
            <span className="inline-flex items-center gap-2 text-mission-green text-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Thanks! Your feedback helps improve predictions.
            </span>
          </motion.div>
        ) : (
          <motion.div
            key="question"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <p className="text-sm text-off-white/60 mb-3">
              Did you see the launch?
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => handleFeedback(true)}
                className="retro-button-green flex items-center gap-2 px-4 py-2.5 rounded text-sm font-mono uppercase tracking-wider transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
                Yes, I saw it!
              </button>
              <button
                onClick={() => handleFeedback(false)}
                className="retro-button-red flex items-center gap-2 px-4 py-2.5 rounded text-sm font-mono uppercase tracking-wider transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
                No, missed it
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function VisibilityHero({
  percentage,
  rating,
  optimalWindow,
  recommendations = [],
  viewingLocation,
  factors,
  fatalBlocker,
  loading = false,
  launchDate,
  missionName,
  siteName,
  locationSet = true,
  onSetLocation,
}: VisibilityHeroProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [displayPercentage, setDisplayPercentage] = useState(0);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ name: string; admin1?: string; country: string; latitude: number; longitude: number }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef<AbortController>(undefined);
  const heroInputRef = useRef<HTMLInputElement>(null);

  // Location search handler — uses our own API route (handles both city names and ZIP codes)
  const handleLocationSearch = async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setSearchError("");
      setIsSearching(false);
      return;
    }
    // Don't search partial ZIP codes
    if (/^\d{1,4}$/.test(trimmed)) {
      setSearchResults([]);
      setSearchError("");
      setIsSearching(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setIsSearching(true);
    setSearchError("");
    try {
      const response = await fetch(
        `/api/geocode?q=${encodeURIComponent(trimmed)}`,
        { signal: abortRef.current.signal }
      );
      const data = await response.json();
      if (!data.results || data.results.length === 0) {
        setSearchError(
          /^\d{5}$/.test(trimmed)
            ? "ZIP code not found. Try a city name instead."
            : "No locations found. Try a different search."
        );
        setSearchResults([]);
      } else {
        setSearchResults(data.results);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setSearchError("Search failed. Please try again.");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleHeroInputChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchError("");
      setIsSearching(false);
      return;
    }
    if (/^\d{1,4}$/.test(trimmed)) {
      setSearchResults([]);
      setSearchError("");
      setIsSearching(false);
      return;
    }
    if (trimmed.length >= 2) setIsSearching(true);
    debounceRef.current = setTimeout(() => handleLocationSearch(value), 300);
  };

  const handleSelectLocation = (result: { name: string; admin1?: string; country: string; latitude: number; longitude: number }) => {
    const locationName = result.admin1
      ? `${result.name}, ${result.admin1}`
      : `${result.name}, ${result.country}`;

    if (onSetLocation) {
      onSetLocation({
        name: locationName,
        lat: result.latitude,
        lon: result.longitude,
      });
    }
    setShowLocationSearch(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Animate percentage
  useEffect(() => {
    if (!locationSet) return; // Don't animate if no location set
    const duration = 1000;
    const steps = 30;
    const increment = percentage / steps;
    let current = 0;

    const interval = setInterval(() => {
      current += increment;
      if (current >= percentage) {
        setDisplayPercentage(percentage);
        clearInterval(interval);
      } else {
        setDisplayPercentage(Math.round(current));
      }
    }, duration / steps);

    return () => clearInterval(interval);
  }, [percentage, locationSet]);

  // Determine the verdict - neutral, professional language
  const verdictText = fatalBlocker
    ? "Limited"
    : percentage >= 70
      ? "Favorable"
      : percentage >= 40
        ? "Possible"
        : "Unlikely";

  const verdictColor = fatalBlocker
    ? "#ff4444"
    : percentage >= 70
      ? "#00FF41"
      : percentage >= 40
        ? "#FFB800"
        : "#ff4444";

  // Get factor data
  const subScores = factors?.subScores || { cloud: 0.5, sun: 0.5, distance: 0.5, clarity: 0.5 };
  const rawData = factors?.rawData || { cloudFraction: 50, solarElevation: 0, distanceKm: 500, surfaceVisibilityKm: 16 };

  // Determine factor statuses
  const skyGood = subScores.cloud >= 0.5;
  const skyStatus = subScores.cloud >= 0.8 ? "Clear" : subScores.cloud >= 0.5 ? `${Math.round(rawData.cloudFraction)}% clouds` : "Overcast";

  const timingGood = subScores.sun >= 0.5;
  // Better labels: Twilight (best), Night (good), Low Sun (ok), Bright (bad)
  const timingStatus = subScores.sun >= 0.85 ? "Twilight" : subScores.sun >= 0.7 ? "Night" : subScores.sun >= 0.5 ? "Dusk" : subScores.sun >= 0.3 ? "Low Sun" : "Bright";

  const distanceGood = subScores.distance >= 0.3;
  const distanceMiles = viewingLocation?.distance || Math.round(rawData.distanceKm * 0.621371);

  const clarityGood = subScores.clarity >= 0.5;

  if (loading) {
    return (
      <div className="retro-panel-orange p-8 md:p-12">
        <div className="flex flex-col items-center justify-center py-8">
          <motion.div
            className="w-16 h-16 border-4 border-retro-orange border-t-transparent rounded-full mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-off-white/50 text-sm">Calculating visibility...</p>
        </div>
      </div>
    );
  }

  // No location set - prompt user
  if (!locationSet) {
    return (
      <div className="retro-panel p-6 md:p-8">
        <div className="max-w-lg mx-auto">
          {/* Mission info if available */}
          {missionName && launchDate && (
            <div className="text-center mb-6">
              <p className="text-xs uppercase tracking-widest text-off-white/40 mb-1">Next Launch</p>
              <h2
                className="text-lg md:text-xl font-bold text-off-white mb-2"
                style={{ fontFamily: "var(--font-orbitron)" }}
              >
                {missionName}
              </h2>
              <MiniCountdown targetDate={launchDate} />
            </div>
          )}

          <div className="border-t border-nasa-blue/20 pt-6">
            <div className="text-center mb-4">
              <svg className="w-8 h-8 mx-auto mb-3 text-nasa-blue/60" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <label
                htmlFor="hero-location-search"
                className="block text-sm font-mono uppercase tracking-wider text-off-white/70 mb-2"
              >
                Set Your Location
              </label>
              <p id="hero-location-desc" className="text-sm text-off-white/60">
                Enter your city to see visibility conditions for the launch.
              </p>
            </div>

            <div className="relative">
              <input
                ref={heroInputRef}
                id="hero-location-search"
                type="search"
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={searchQuery}
                onChange={(e) => handleHeroInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (searchResults.length === 1) {
                      handleSelectLocation(searchResults[0]);
                    } else if (searchQuery.trim().length >= 2) {
                      if (debounceRef.current) clearTimeout(debounceRef.current);
                      handleLocationSearch(searchQuery);
                    }
                  }
                }}
                placeholder="Search city or ZIP code..."
                className="retro-input w-full pr-10"
                autoFocus
                aria-describedby="hero-location-desc"
              />
              {isSearching ? (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 animate-spin text-off-white/40" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); setSearchResults([]); setSearchError(""); heroInputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-off-white/40 hover:text-off-white/70 transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <p className="text-xs text-off-white/30 mt-2 text-center">
              City name or 5-digit ZIP code
            </p>

            {searchError && (
              <p className="text-xs text-retro-orange mt-2 text-center" role="alert">{searchError}</p>
            )}

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="mt-4">
                <p className="text-xs text-off-white/50 mb-2 uppercase tracking-wider">
                  Select your location:
                </p>
                <div className="border border-nasa-blue/30 rounded-lg overflow-hidden bg-space-navy/50">
                  {searchResults.map((result, index) => (
                    <button
                      key={`${result.latitude}-${result.longitude}-${index}`}
                      onClick={() => handleSelectLocation(result)}
                      className="w-full text-left px-4 py-3 hover:bg-mission-green/20 text-off-white/80 hover:text-mission-green transition-all text-sm border-b border-nasa-blue/10 last:border-0 flex items-center justify-between group cursor-pointer"
                    >
                      <span>
                        <span className="font-medium">{result.name}</span>
                        {result.admin1 && <span className="text-off-white/50">, {result.admin1}</span>}
                        <span className="text-off-white/40"> — {result.country}</span>
                      </span>
                      <svg
                        className="w-4 h-4 text-off-white/30 group-hover:text-mission-green group-hover:translate-x-1 transition-all"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No launch scheduled state
  if (!launchDate) {
    return (
      <div className="retro-panel-orange p-8 md:p-12">
        <div className="text-center py-8">
          <motion.div
            className="text-4xl md:text-5xl font-bold text-amber mb-4"
            style={{ fontFamily: "var(--font-orbitron)" }}
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            Awaiting Mission
          </motion.div>
          <p className="text-off-white/60 max-w-md mx-auto">
            No upcoming launches scheduled. Check back soon for the next SpaceX mission.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="retro-panel-orange overflow-hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Main Hero Section */}
      <div className="p-4 sm:p-6 md:p-8 lg:p-10">
        {/* Top Row: Mission Name + Status + Location */}
        {/* Mission name and location */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          {missionName && (
            <div>
              <h2
                className="text-lg md:text-xl font-bold text-off-white tracking-wide"
                style={{ fontFamily: "var(--font-orbitron)" }}
              >
                {missionName}
              </h2>
              {siteName && (
                <p className="text-xs text-off-white/50 mt-1">From {siteName}</p>
              )}
            </div>
          )}
          {viewingLocation && (
            <div className="flex items-center gap-2 text-sm text-off-white/60">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{viewingLocation.name}</span>
            </div>
          )}
        </div>

        {/* THE VERDICT - Most Important Element */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6 mb-6 lg:mb-8">
          {/* Left: Can You See It? */}
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-off-white/40 mb-2">
              Visibility Assessment
            </p>
            <div className="flex items-baseline gap-4">
              <motion.h1
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-none"
                style={{
                  color: verdictColor,
                  fontFamily: "var(--font-orbitron)",
                  textShadow: `0 0 30px ${verdictColor}40`,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                {verdictText}
              </motion.h1>
              <div className="flex flex-col">
                <span
                  className="text-2xl md:text-3xl font-bold font-mono"
                  style={{ color: verdictColor }}
                >
                  {displayPercentage}%
                </span>
                <span className="text-xs text-off-white/40 uppercase tracking-wider">
                  {rating}
                </span>
              </div>
            </div>

            {/* Fatal blocker message */}
            {fatalBlocker && (
              <p className="mt-3 text-red-400 text-sm max-w-md">
                {fatalBlocker}
              </p>
            )}

            {/* Conditions summary */}
            {!fatalBlocker && percentage >= 40 && (
              <p className="mt-3 text-off-white/60 text-sm max-w-md">
                {percentage >= 70
                  ? "Conditions are favorable for visibility from your location."
                  : "Moderate conditions. Clear skies and an unobstructed horizon will improve viewing."}
              </p>
            )}
          </div>

          {/* Right: Countdown + When to Look */}
          <div className="lg:text-right">
            {launchDate && (
              <div className="mb-4">
                <p className="text-xs uppercase tracking-widest text-off-white/50 mb-2">
                  T-Minus
                </p>
                <MiniCountdown targetDate={launchDate} />
              </div>
            )}

            {optimalWindow?.startFormatted && optimalWindow?.endFormatted && !fatalBlocker && (
              <div className="bg-space-navy/50 rounded-lg px-3 py-2 sm:px-4 sm:py-3 border border-mission-green/30 inline-block max-w-full">
                <p className="text-xs uppercase tracking-widest text-mission-green/70 mb-1">
                  Look for it
                </p>
                <p className="font-mono text-lg sm:text-xl text-mission-green font-bold">
                  {optimalWindow.startFormatted} - {optimalWindow.endFormatted}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Factor Pills - Quick Status */}
        {/* Weather factors header - only show if we have location */}
        {viewingLocation && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-off-white/40">
              Weather at {viewingLocation.name} on {launchDate ? launchDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'launch day'}
            </span>
            <div className="flex-1 h-px bg-off-white/10" />
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <FactorPill
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>}
            label="Sky"
            status={skyStatus}
            isGood={skyGood}
          />
          <FactorPill
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
            label="Timing"
            status={timingStatus}
            isGood={timingGood}
          />
          <FactorPill
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            label="Distance"
            status={`${distanceMiles} mi`}
            isGood={distanceGood}
          />
          {/* Only show air clarity if sky isn't completely overcast - otherwise irrelevant */}
          {skyGood && (
            <FactorPill
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>}
              label="Air"
              status={clarityGood ? "Clear" : "Hazy"}
              isGood={clarityGood}
            />
          )}
        </div>
      </div>

      {/* Expandable Details Section */}
      <div className="border-t border-retro-orange/20">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-6 py-3 flex items-center justify-between text-sm text-off-white/60 hover:text-off-white/80 hover:bg-retro-orange/5 transition-colors"
        >
          <span className="uppercase tracking-wider">
            {isExpanded ? "Hide Details" : "View Details & Tips"}
          </span>
          <motion.svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </motion.svg>
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 space-y-6">
                {/* What You'll See - Visual Description */}
                <div className="bg-space-navy/50 rounded-lg p-4 border border-nasa-blue/20">
                  <h4 className="text-sm uppercase tracking-widest text-off-white/50 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    What You&apos;ll See
                  </h4>
                  <WhatYoullSee
                    percentage={percentage}
                    timingStatus={timingStatus}
                    distanceMiles={distanceMiles}
                    fatalBlocker={fatalBlocker}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Detailed Factors */}
                  <div>
                    <h4 className="text-sm uppercase tracking-widest text-off-white/50 mb-3">
                      Viewing Conditions
                    </h4>
                    <div className="space-y-3">
                      <DetailRow
                        label="Cloud Cover"
                        value={`${Math.round(rawData.cloudFraction)}%`}
                        score={subScores.cloud}
                      />
                      <DetailRow
                        label="Light Conditions"
                        value={timingStatus}
                        score={subScores.sun}
                      />
                      <DetailRow
                        label="Distance"
                        value={`${distanceMiles} miles`}
                        score={subScores.distance}
                      />
                      <DetailRow
                        label="Atmospheric Clarity"
                        value={`${Math.round(rawData.surfaceVisibilityKm * 0.621371)} mi visibility`}
                        score={subScores.clarity}
                      />
                    </div>
                  </div>

                  {/* Tips */}
                  <div>
                    <h4 className="text-sm uppercase tracking-widest text-off-white/50 mb-3">
                      Viewing Tips
                    </h4>
                    <ul className="space-y-2">
                      {recommendations.length > 0 ? (
                        recommendations.slice(0, 3).map((rec, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-off-white/70">
                            <span className="text-retro-orange mt-0.5">•</span>
                            <span>{rec}</span>
                          </li>
                        ))
                      ) : (
                        <>
                          <li className="flex items-start gap-2 text-sm text-off-white/70">
                            <span className="text-retro-orange mt-0.5">•</span>
                            <span>Find a location with a clear view of the western horizon</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm text-off-white/70">
                            <span className="text-retro-orange mt-0.5">•</span>
                            <span>The rocket becomes visible 2-3 minutes after launch</span>
                          </li>
                          <li className="flex items-start gap-2 text-sm text-off-white/70">
                            <span className="text-retro-orange mt-0.5">•</span>
                            <span>Look for a bright moving light trailing a glowing plume</span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                </div>

                {/* User Feedback - appears when launch is imminent or past */}
                <VisibilityFeedback
                  missionName={missionName}
                  predictedPercentage={percentage}
                  launchDate={launchDate}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Detail row with progress bar
function DetailRow({ label, value, score }: { label: string; value: string; score: number }) {
  const getColor = (s: number) => {
    if (s >= 0.7) return "bg-mission-green";
    if (s >= 0.4) return "bg-amber";
    return "bg-red-400";
  };

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-off-white/60">{label}</span>
        <span className="text-off-white">{value}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${getColor(score)}`}
          initial={{ width: 0 }}
          animate={{ width: `${score * 100}%` }}
          transition={{ duration: 0.5, delay: 0.2 }}
        />
      </div>
    </div>
  );
}
