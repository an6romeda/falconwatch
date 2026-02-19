"use client";

import { useRef } from "react";
import { motion } from "framer-motion";

const SITE_LABELS: Record<string, string> = {
  vandenberg: "Vandenberg",
  "cape-canaveral": "Cape Canaveral",
  "boca-chica": "Starbase",
};

interface Launch {
  id: string;
  name: string;
  date_utc: string;
  date_unix: number;
  links: {
    patch: { small: string | null };
    webcast: string | null;
  };
  rocketData?: {
    name: string;
    type: string;
  };
  siteId?: string;
  spacexUrl?: string | null;
}

interface LaunchCarouselProps {
  launches: Launch[];
  loading?: boolean;
  vertical?: boolean;
  onLaunchSelect?: (index: number) => void;
  selectedIndex?: number;
}

export default function LaunchCarousel({ launches, loading = false, vertical = false, onLaunchSelect, selectedIndex = -1 }: LaunchCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (loading) {
    return (
      <div className="retro-panel p-4 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-nasa-blue blink" />
          <h3 className="font-mono text-sm uppercase tracking-widest text-off-white/60">
            Upcoming Launches
          </h3>
        </div>
        <div className={vertical ? "flex flex-col gap-3 flex-1 overflow-hidden" : "flex gap-4 overflow-hidden"}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`bg-nasa-blue/10 rounded-lg animate-pulse ${vertical ? "h-16 w-full flex-shrink-0" : "flex-shrink-0 w-64 h-32"}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!launches || launches.length === 0) {
    return (
      <div className="retro-panel p-4 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-nasa-blue" />
          <h3 className="font-mono text-sm uppercase tracking-widest text-off-white/60">
            Upcoming Launches
          </h3>
        </div>
        <p className="text-sm text-off-white/50 text-center py-6 flex-1 flex items-center justify-center">
          No additional launches scheduled
        </p>
      </div>
    );
  }

  return (
    <div className="retro-panel p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-nasa-blue" />
        <h3 className="font-mono text-sm uppercase tracking-widest text-off-white">
          Upcoming Launches
        </h3>

        {/* Scroll buttons - only for horizontal mode */}
        {!vertical && (
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => scroll("left")}
              className="p-1.5 rounded bg-nasa-blue/20 hover:bg-nasa-blue/40 transition-colors"
              aria-label="Scroll left"
            >
              <svg className="w-4 h-4 text-off-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => scroll("right")}
              className="p-1.5 rounded bg-nasa-blue/20 hover:bg-nasa-blue/40 transition-colors"
              aria-label="Scroll right"
            >
              <svg className="w-4 h-4 text-off-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Carousel container */}
      <div
        ref={scrollRef}
        className={
          vertical
            ? "flex flex-col gap-2 overflow-y-auto flex-1 min-h-0 pr-1 themed-scrollbar"
            : "flex gap-4 overflow-x-auto pb-2 scroll-smooth themed-scrollbar"
        }
        role="list"
        aria-label="Upcoming launches list"
      >
        {launches.map((launch, index) => {
          const launchDate = new Date(launch.date_utc);
          const now = new Date();
          const daysUntil = Math.ceil((launchDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

          return (
            <motion.div
              key={launch.id}
              className={`
                ${vertical
                  ? "p-2.5 rounded-lg transition-colors flex-shrink-0"
                  : "flex-shrink-0 w-64 p-4 rounded-lg transition-colors"}
                ${index === selectedIndex
                  ? "bg-retro-orange/15 border border-retro-orange/50 shadow-[0_0_10px_rgba(255,107,53,0.2)]"
                  : "bg-nasa-blue/10 hover:bg-nasa-blue/20 border border-nasa-blue/30"}
                ${onLaunchSelect ? "cursor-pointer" : ""}
              `}
              initial={{ opacity: 0, y: vertical ? 10 : 0, x: vertical ? 0 : 20 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ delay: index * 0.05 }}
              role="listitem"
              onClick={() => onLaunchSelect?.(index)}
            >
              <div className="flex items-center gap-3">
                {/* Mission patch */}
                {launch.links.patch.small ? (
                  <img
                    src={launch.links.patch.small}
                    alt={`${launch.name} mission patch`}
                    className={vertical ? "w-10 h-10 object-contain flex-shrink-0" : "w-12 h-12 object-contain flex-shrink-0"}
                  />
                ) : (
                  <div className={`rounded bg-nasa-blue/20 flex items-center justify-center flex-shrink-0 ${vertical ? "w-10 h-10" : "w-12 h-12"}`}>
                    <span className={vertical ? "text-lg text-nasa-blue" : "text-xl text-nasa-blue"}>
                      {launch.name.charAt(0)}
                    </span>
                  </div>
                )}

                {/* Launch info */}
                <div className="flex-1 min-w-0">
                  {launch.spacexUrl ? (
                    <a
                      href={launch.spacexUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-sm text-off-white hover:text-retro-orange transition-colors truncate block"
                      title={launch.name}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {launch.name}
                    </a>
                  ) : (
                    <span
                      className="font-mono text-sm text-off-white truncate block"
                      title={launch.name}
                    >
                      {launch.name}
                    </span>
                  )}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-off-white/50">
                      {launchDate.toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-off-white/30">•</span>
                    <span className={`text-xs font-mono ${daysUntil <= 3 ? "text-retro-orange" : "text-off-white/50"}`}>
                      {daysUntil === 0 ? "TODAY" : daysUntil === 1 ? "TOMORROW" : `${daysUntil}d`}
                    </span>
                    {launch.siteId && SITE_LABELS[launch.siteId] && (
                      <>
                        <span className="text-off-white/30">•</span>
                        <span className="text-xs text-off-white/40">
                          {SITE_LABELS[launch.siteId]}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Webcast link - inline for vertical mode */}
                {vertical && launch.links.webcast && (
                  <a
                    href={launch.links.webcast}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded bg-retro-orange/20 hover:bg-retro-orange/30 transition-colors flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Watch ${launch.name} live`}
                  >
                    <svg className="w-4 h-4 text-retro-orange" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M10 16.5v-9l6 4.5-6 4.5z" />
                    </svg>
                  </a>
                )}
              </div>

              {/* Extended info for horizontal mode only */}
              {!vertical && (
                <>
                  <div className="mt-3 pt-3 border-t border-nasa-blue/20">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-off-white/50">
                          {launchDate.toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        {launch.siteId && SITE_LABELS[launch.siteId] && (
                          <>
                            <span className="text-off-white/30">•</span>
                            <span className="text-xs text-off-white/40">
                              {SITE_LABELS[launch.siteId]}
                            </span>
                          </>
                        )}
                      </div>
                      <span className={`text-xs font-mono ${daysUntil <= 3 ? "text-retro-orange" : "text-off-white/50"}`}>
                        {daysUntil === 0 ? "TODAY" : daysUntil === 1 ? "TOMORROW" : `${daysUntil}d`}
                      </span>
                    </div>
                    <p className="text-xs text-off-white/40 mt-1">
                      {launchDate.toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                        timeZoneName: "short",
                      })}
                    </p>
                  </div>

                  {launch.links.webcast && (
                    <a
                      href={launch.links.webcast}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center gap-1 text-xs text-retro-orange hover:text-retro-orange/80 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 16.5v-9l6 4.5-6 4.5z" />
                      </svg>
                      <span>Watch Live</span>
                    </a>
                  )}
                </>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Scroll indicator for mobile - horizontal mode only */}
      {!vertical && (
        <div className="md:hidden flex justify-center mt-2">
          <span className="text-xs text-off-white/30">Swipe to see more</span>
        </div>
      )}
    </div>
  );
}
