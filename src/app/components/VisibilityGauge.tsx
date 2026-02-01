"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface VisibilityWindow {
  start: Date | string | null;
  end: Date | string | null;
  startFormatted: string | null;
  endFormatted: string | null;
  duration: number;
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

interface VisibilityGaugeProps {
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
}

// Factor configuration with icons and labels
const FACTORS = {
  sky: {
    label: "Sky",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
    getStatus: (score: number, cloudPct: number) => {
      if (score >= 0.8) return { status: "Clear skies", color: "text-mission-green" };
      if (score >= 0.5) return { status: `${Math.round(cloudPct)}% clouds`, color: "text-amber" };
      return { status: "Overcast", color: "text-red-400" };
    },
  },
  timing: {
    label: "Timing",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    getStatus: (score: number, solarElev: number) => {
      if (score >= 0.85) return { status: "Twilight", color: "text-mission-green" };
      if (score >= 0.7) return { status: "Night", color: "text-nasa-blue" };
      if (score >= 0.3) return { status: "Dawn/Dusk", color: "text-amber" };
      return { status: "Daylight", color: "text-red-400" };
    },
  },
  distance: {
    label: "Distance",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    getStatus: (score: number, distMiles: number) => {
      if (score >= 0.7) return { status: `${distMiles} mi - Optimal`, color: "text-mission-green" };
      if (score >= 0.3) return { status: `${distMiles} mi`, color: "text-amber" };
      if (score > 0) return { status: `${distMiles} mi - Far`, color: "text-red-400" };
      return { status: "Too far", color: "text-red-400" };
    },
  },
  clarity: {
    label: "Clarity",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    getStatus: (score: number, visKm: number) => {
      const visMiles = Math.round(visKm * 0.621371);
      if (score >= 0.8) return { status: "Crystal clear", color: "text-mission-green" };
      if (score >= 0.5) return { status: `${visMiles} mi visibility`, color: "text-amber" };
      return { status: "Hazy", color: "text-red-400" };
    },
  },
};

export default function VisibilityGauge({
  percentage,
  rating,
  optimalWindow,
  recommendations = [],
  viewingLocation,
  factors,
  fatalBlocker,
  loading = false,
}: VisibilityGaugeProps) {
  const [displayPercentage, setDisplayPercentage] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const steps = 40;
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
  }, [percentage]);

  const getColor = (pct: number) => {
    if (pct >= 70) return "#00FF41";
    if (pct >= 50) return "#FFB800";
    if (pct >= 30) return "#FF6B35";
    return "#ff4444";
  };

  const getRatingLabel = (r: string) => {
    switch (r) {
      case "excellent": return "Excellent";
      case "good": return "Good";
      case "fair": return "Fair";
      default: return "Poor";
    }
  };

  const color = getColor(displayPercentage);

  // Get factor statuses
  const subScores = factors?.subScores || { cloud: 0.5, sun: 0.5, distance: 0.5, clarity: 0.5 };
  const rawData = factors?.rawData || { cloudFraction: 50, solarElevation: 0, distanceKm: 500, surfaceVisibilityKm: 16 };
  const distanceMiles = viewingLocation?.distance || Math.round(rawData.distanceKm * 0.621371);

  if (loading) {
    return (
      <div className="retro-panel-orange p-6 h-full">
        <div className="flex items-center justify-center py-16">
          <motion.div
            className="w-12 h-12 border-4 border-retro-orange border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="retro-panel-orange p-5 h-full flex flex-col"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3
            className="text-lg font-bold tracking-wide text-off-white"
            style={{ fontFamily: "var(--font-orbitron)" }}
          >
            Can You See It?
          </h3>
          <p className="text-xs text-off-white/50 mt-0.5">
            {viewingLocation ? `From ${viewingLocation.name}` : "From your location"}
          </p>
        </div>
        <div className="w-2 h-2 rounded-full bg-retro-orange pulse-glow" />
      </div>

      {/* Main Score Display */}
      <div className="flex items-center gap-6 mb-5">
        {/* Circular Progress */}
        <div className="relative">
          <svg width="90" height="90" viewBox="0 0 90 90">
            {/* Background circle */}
            <circle
              cx="45"
              cy="45"
              r="38"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <motion.circle
              cx="45"
              cy="45"
              r="38"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 38}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 38 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 38 * (1 - displayPercentage / 100) }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              style={{
                filter: `drop-shadow(0 0 8px ${color})`,
                transform: "rotate(-90deg)",
                transformOrigin: "center",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-2xl font-bold font-mono"
              style={{ color, textShadow: `0 0 12px ${color}` }}
            >
              {displayPercentage}%
            </span>
          </div>
        </div>

        {/* Rating & Summary */}
        <div className="flex-1">
          <div
            className="text-lg font-semibold mb-1"
            style={{ color }}
          >
            {getRatingLabel(rating)}
          </div>
          {fatalBlocker ? (
            <p className="text-sm text-red-400 leading-snug">
              {fatalBlocker}
            </p>
          ) : (
            <p className="text-sm text-off-white/70 leading-snug">
              {percentage >= 70
                ? "Great conditions for viewing!"
                : percentage >= 50
                ? "Decent chance to spot the launch"
                : percentage >= 30
                ? "Challenging but possible"
                : "Unlikely to see the launch"}
            </p>
          )}
        </div>
      </div>

      {/* Factor Breakdown */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {/* Sky */}
        <FactorCard
          icon={FACTORS.sky.icon}
          label={FACTORS.sky.label}
          {...FACTORS.sky.getStatus(subScores.cloud, rawData.cloudFraction)}
          score={subScores.cloud}
        />

        {/* Timing */}
        <FactorCard
          icon={FACTORS.timing.icon}
          label={FACTORS.timing.label}
          {...FACTORS.timing.getStatus(subScores.sun, rawData.solarElevation)}
          score={subScores.sun}
        />

        {/* Distance */}
        <FactorCard
          icon={FACTORS.distance.icon}
          label={FACTORS.distance.label}
          {...FACTORS.distance.getStatus(subScores.distance, distanceMiles)}
          score={subScores.distance}
        />

        {/* Clarity */}
        <FactorCard
          icon={FACTORS.clarity.icon}
          label={FACTORS.clarity.label}
          {...FACTORS.clarity.getStatus(subScores.clarity, rawData.surfaceVisibilityKm)}
          score={subScores.clarity}
        />
      </div>

      {/* Viewing Window */}
      {optimalWindow && optimalWindow.startFormatted && optimalWindow.endFormatted && (
        <div className="bg-space-navy/50 border border-mission-green/30 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-mission-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-off-white/60 uppercase tracking-wider">Look for it</span>
          </div>
          <p className="font-mono text-mission-green text-lg">
            {optimalWindow.startFormatted} - {optimalWindow.endFormatted}
          </p>
        </div>
      )}

      {/* Tip */}
      {recommendations.length > 0 && !fatalBlocker && (
        <p className="text-xs text-off-white/50 mt-auto leading-relaxed">
          <span className="text-retro-orange">Tip:</span> {recommendations[0]}
        </p>
      )}
    </motion.div>
  );
}

// Factor Card Component
function FactorCard({
  icon,
  label,
  status,
  color,
  score,
}: {
  icon: React.ReactNode;
  label: string;
  status: string;
  color: string;
  score: number;
}) {
  return (
    <div className="bg-space-navy/40 rounded-lg p-2.5 border border-nasa-blue/20">
      <div className="flex items-center gap-2 mb-1.5">
        <span className={color}>{icon}</span>
        <span className="text-xs text-off-white/50 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${color}`}>{status}</span>
        <div className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-1.5 h-3 rounded-sm ${
                score >= (i + 1) / 3
                  ? score >= 0.7
                    ? "bg-mission-green"
                    : score >= 0.4
                    ? "bg-amber"
                    : "bg-red-400"
                  : "bg-white/10"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
