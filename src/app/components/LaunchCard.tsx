"use client";

import { motion } from "framer-motion";
import { DataRow, LEDText } from "./RetroDisplay";

const SITE_NAMES: Record<string, string> = {
  vandenberg: "Vandenberg",
  "cape-canaveral": "Cape Canaveral",
  "boca-chica": "Starbase",
};

interface LaunchCardProps {
  mission: {
    name: string;
    date_utc: string;
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
  } | null;
  lastRefresh?: Date | null;
}

export default function LaunchCard({ mission, lastRefresh }: LaunchCardProps) {
  if (!mission) {
    return (
      <div className="retro-panel p-6">
        <div className="flex items-center gap-3 border-b border-nasa-blue/30 pb-3 mb-4">
          <h3 className="font-mono text-lg uppercase tracking-wider text-off-white">
            Mission Data
          </h3>
        </div>
        <div className="text-center py-8">
          <LEDText text="No Mission Scheduled" color="amber" size="lg" />
          <p className="text-off-white/50 text-sm mt-2">
            Check back for upcoming SpaceX launches
          </p>
        </div>
      </div>
    );
  }

  // Format date in user's local timezone
  const launchDate = new Date(mission.date_utc);
  const localDate = launchDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const localTime = launchDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });

  const payload = mission.payloadData?.[0];
  const customers = payload?.customers?.join(", ") || "SpaceX";

  const formatLastRefresh = () => {
    if (!lastRefresh) return null;
    const now = new Date();
    const diffMs = now.getTime() - lastRefresh.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins === 1) return "1 min ago";
    if (diffMins < 60) return `${diffMins} min ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "1 hour ago";
    return `${diffHours} hours ago`;
  };

  return (
    <motion.div
      className="retro-panel p-6 h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-nasa-blue/30 pb-3 mb-4">
        <div>
          <h3 className="font-mono text-lg uppercase tracking-wider text-off-white">
            Mission Data
          </h3>
          <p className="text-xs text-off-white/50 mt-1">
            Flight #{mission.flight_number}
          </p>
        </div>
        <div
          className="w-2 h-2 rounded-full bg-mission-green pulse-glow"
        />
      </div>

      {/* Mission patch and name */}
      <div className="flex items-start gap-4 mb-4">
        {mission.links.patch.small ? (
          <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-space-navy/50 p-2">
            <img
              src={mission.links.patch.small}
              alt={`${mission.name} patch`}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-nasa-blue/20 flex items-center justify-center">
            <span className="text-2xl font-display text-nasa-blue">
              {mission.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="flex-1">
          {mission.spacexUrl ? (
            <a
              href={mission.spacexUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-display text-off-white hover:text-retro-orange transition-colors mb-1 block"
              style={{ fontFamily: "var(--font-orbitron)" }}
            >
              {mission.name}
            </a>
          ) : (
            <span
              className="text-lg font-display text-off-white mb-1 block"
              style={{ fontFamily: "var(--font-orbitron)" }}
            >
              {mission.name}
            </span>
          )}
          <p className="text-sm text-off-white/60">{customers}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-mono text-mission-green">
              {localTime}
            </span>
            <span className="text-off-white/40">|</span>
            <span className="text-sm text-off-white/60">{localDate}</span>
          </div>
        </div>
      </div>

      {/* Mission details */}
      <div className="space-y-1 border-t border-nasa-blue/20 pt-4">
        <DataRow
          label="Vehicle"
          value={mission.rocketData?.name || "Falcon 9"}
        />
        <DataRow
          label="Launch Site"
          value={mission.siteId ? SITE_NAMES[mission.siteId] || mission.launchpadData?.name || "Unknown" : mission.launchpadData?.name || "SLC-4E"}
        />
        {payload && (
          <>
            <DataRow
              label="Payload Type"
              value={payload.type || "Satellite"}
            />
            {payload.orbit && (
              <DataRow label="Target Orbit" value={payload.orbit} />
            )}
          </>
        )}
      </div>

      {/* Mission description */}
      {mission.details && (
        <div className="mt-4 pt-4 border-t border-nasa-blue/20">
          <p className="text-sm text-off-white/70 leading-relaxed">
            {mission.details}
          </p>
        </div>
      )}

      {/* Webcast link */}
      {mission.links.webcast && (
        <div className="mt-4 pt-4 border-t border-nasa-blue/20">
          <a
            href={mission.links.webcast}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-retro-orange hover:text-retro-orange/80 transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
            <span className="font-mono text-sm uppercase tracking-wider">
              Watch Webcast
            </span>
          </a>
        </div>
      )}

      {/* Last refresh */}
      {lastRefresh && (
        <div className="mt-4 pt-3 border-t border-nasa-blue/10 flex justify-end">
          <span className="text-xs text-off-white/40 font-mono">
            Updated {formatLastRefresh()}
          </span>
        </div>
      )}
    </motion.div>
  );
}
