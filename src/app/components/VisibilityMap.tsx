"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import LocationSettings from "./LocationSettings";
import "leaflet/dist/leaflet.css";

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
);

// Site configurations for the map
// Trajectory points represent ground track at T+0, T+1m, T+2m, T+3m, T+4m, T+5m
// Source: SpaceX webcast telemetry, FAA EIS, NOTAM closure zones
const SITE_CONFIGS: Record<string, {
  name: string;
  padLabel: string;
  center: { lat: number; lng: number };
  trajectoryPoints: [number, number][];
}> = {
  vandenberg: {
    name: "Vandenberg SFB",
    padLabel: "Launch Site SLC-4E",
    center: { lat: 34.6321, lng: -120.6107 },
    // SSO azimuth 190° (nearly due south, slight westward drift)
    trajectoryPoints: [
      [34.632, -120.611],   // T+0: Liftoff
      [34.579, -120.622],   // T+1m: ~12km alt
      [34.190, -120.705],   // T+2m: ~50km alt
      [33.791, -120.790],   // T+3m: MECO/sep ~75km
      [32.951, -120.968],   // T+4m: ~130km alt
      [31.889, -121.194],   // T+5m: ~170km alt
    ],
  },
  "cape-canaveral": {
    name: "Cape Canaveral SFS",
    padLabel: "Launch Complex 39A / SLC-40",
    center: { lat: 28.5620, lng: -80.5772 },
    // Starlink 53° incl: azimuth 43° (northeast over Atlantic)
    trajectoryPoints: [
      [28.562, -80.577],   // T+0: Liftoff
      [28.601, -80.535],   // T+1m: ~12km alt
      [28.923, -80.194],   // T+2m: ~55km alt
      [29.219, -79.880],   // T+3m: MECO/sep ~78km
      [29.745, -79.323],   // T+4m: ~135km alt
      [30.862, -78.139],   // T+5m: ~175km alt
    ],
  },
  "boca-chica": {
    name: "Starbase",
    padLabel: "Starbase Launch Site",
    center: { lat: 25.9972, lng: -97.1571 },
    // Starship: azimuth ~97° (east over Gulf of Mexico)
    trajectoryPoints: [
      [25.997, -97.157],   // T+0: Liftoff
      [25.994, -97.127],   // T+1m: ~8km alt
      [25.959, -96.810],   // T+2m: ~40km alt
      [25.909, -96.364],   // T+3m: hot-staging ~75km
      [25.810, -95.470],   // T+4m: ~110km alt
      [25.712, -94.578],   // T+5m: ~150km alt
    ],
  },
};

interface ViewingLocation {
  name: string;
  lat: number;
  lon: number;
}

interface VisibilityMapProps {
  visibilityPercentage?: number;
  viewingLocation?: ViewingLocation | null;
  onLocationChange?: (location: ViewingLocation) => void;
  siteId?: string;
  visibilityRadiusKm?: number;
  radiusLabel?: string;
}

export default function VisibilityMap({
  visibilityPercentage = 50,
  viewingLocation,
  onLocationChange,
  siteId = "vandenberg",
  visibilityRadiusKm = 800,
  radiusLabel,
}: VisibilityMapProps) {
  const [isClient, setIsClient] = useState(false);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);

  // Get site config, falling back to vandenberg
  const siteConfig = useMemo(() =>
    SITE_CONFIGS[siteId] || SITE_CONFIGS.vandenberg,
    [siteId]
  );

  useEffect(() => {
    setIsClient(true);
    import("leaflet").then((leaflet) => {
      setL(leaflet.default);
    });
  }, []);

  // Calculate distance
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 3959; // Earth radius in miles
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const launchSite = siteConfig.center;

  const distance = viewingLocation
    ? calculateDistance(
        launchSite.lat,
        launchSite.lng,
        viewingLocation.lat,
        viewingLocation.lon
      )
    : null;

  if (!isClient || !L) {
    return (
      <div className="retro-panel p-4 h-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono text-sm uppercase tracking-widest text-off-white">
            Visibility Map
          </h3>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-nasa-blue blink" />
            <span className="text-xs text-off-white/50">Loading</span>
          </div>
        </div>
        <div className="bg-space-navy/50 rounded-lg flex items-center justify-center h-80">
          <motion.div
            className="w-10 h-10 border-3 border-nasa-blue border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
      </div>
    );
  }

  // Create custom icons
  const launchSiteIcon = L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: #FF6B35;
        border: 2px solid #fff;
        border-radius: 50%;
        box-shadow: 0 0 15px rgba(255, 107, 53, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-bottom: 10px solid white;
          margin-top: -2px;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  const viewingIcon = L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background: #00FF41;
        border: 2px solid #fff;
        border-radius: 50%;
        box-shadow: 0 0 15px rgba(0, 255, 65, 0.8);
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  // Convert km prop to meters for Leaflet Circle
  const visibilityRadius = visibilityRadiusKm * 1000;

  // Calculate map center - use launch site if no viewing location
  const centerLat = viewingLocation
    ? (launchSite.lat + viewingLocation.lat) / 2
    : launchSite.lat;
  const centerLng = viewingLocation
    ? (launchSite.lng + viewingLocation.lon) / 2
    : launchSite.lng;

  return (
    <motion.div
      className="retro-panel p-4 h-full relative z-20 flex flex-col"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h3 className="font-mono text-sm uppercase tracking-widest text-off-white">
          Visibility Map
        </h3>
        <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-retro-orange" />
            <span className="text-off-white/50">Launch</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-mission-green" />
            <span className="text-off-white/50">You</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full border border-dashed border-nasa-blue bg-nasa-blue/10" />
            <span className="text-off-white/50 hidden sm:inline">{radiusLabel || `~${Math.round(visibilityRadiusKm * 0.621371)}mi visibility`}</span>
            <span className="text-off-white/50 sm:hidden">Visibility</span>
          </div>
        </div>
      </div>

      <div
        className="rounded-lg overflow-hidden border border-nasa-blue/30 flex-1 min-h-56"
        role="img"
        aria-label={viewingLocation
          ? `Interactive map showing launch visibility from ${siteConfig.name} and your viewing location at ${viewingLocation.name}, ${distance} miles away`
          : `Interactive map showing launch visibility from ${siteConfig.name}`}
      >
        <MapContainer
          center={[centerLat, centerLng]}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
          zoomControl={true}
          scrollWheelZoom={true}
          key={siteId} // Force re-render when site changes
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Visibility radius from launch site */}
          <Circle
            center={[launchSite.lat, launchSite.lng]}
            radius={visibilityRadius}
            pathOptions={{
              color: "rgba(11, 61, 145, 0.8)",
              fillColor: "rgba(11, 61, 145, 0.1)",
              fillOpacity: 0.3,
              weight: 2,
              dashArray: "10, 5",
            }}
          />

          {/* Trajectory line */}
          <Polyline
            positions={siteConfig.trajectoryPoints}
            pathOptions={{
              color: "#FF6B35",
              weight: 3,
              opacity: 0.8,
              dashArray: "10, 10",
            }}
          />

          {/* Animated trajectory highlight */}
          <Polyline
            positions={siteConfig.trajectoryPoints.slice(0, 3)}
            pathOptions={{
              color: "#FFB800",
              weight: 5,
              opacity: 0.6,
            }}
          />

          {/* Launch site marker */}
          <Marker
            position={[launchSite.lat, launchSite.lng]}
            icon={launchSiteIcon}
          >
            <Popup>
              <div className="text-center">
                <strong className="text-retro-orange">{siteConfig.name}</strong>
                <br />
                <span className="text-xs">{siteConfig.padLabel}</span>
              </div>
            </Popup>
          </Marker>

          {/* Viewing location marker - only if location is set */}
          {viewingLocation && (
            <>
              <Marker
                position={[viewingLocation.lat, viewingLocation.lon]}
                icon={viewingIcon}
              >
                <Popup>
                  <div className="text-center">
                    <strong className="text-mission-green">
                      {viewingLocation.name}
                    </strong>
                    <br />
                    <span className="text-xs">Your Viewing Location</span>
                    <br />
                    <span className="text-xs">~{distance} miles from launch</span>
                  </div>
                </Popup>
              </Marker>

              {/* Line connecting launch site to viewing location */}
              <Polyline
                positions={[
                  [launchSite.lat, launchSite.lng],
                  [viewingLocation.lat, viewingLocation.lon],
                ]}
                pathOptions={{
                  color: "#00FF41",
                  weight: 2,
                  opacity: 0.5,
                  dashArray: "5, 5",
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      {/* Bottom controls */}
      <div className="mt-3 space-y-2">
        {/* Location info row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            {onLocationChange && viewingLocation && (
              <LocationSettings
                currentLocation={viewingLocation}
                onLocationChange={onLocationChange}
              />
            )}
            {viewingLocation && distance && (
              <>
                <span className="text-off-white/50 hidden sm:inline">|</span>
                <span className="font-mono text-off-white">{distance} mi</span>
              </>
            )}
            {!viewingLocation && (
              <span className="text-off-white/50 text-xs">Set your location above to see distance</span>
            )}
          </div>
          {distance && (
            <span className="text-xs text-off-white/40">
              {distance >= 80 && distance <= 400 ? "Optimal viewing distance" : distance < 80 ? "Very close" : "Far — may be difficult to see"}
            </span>
          )}
        </div>
        {/* Visibility explanation - hidden on mobile, shown on larger screens */}
        <p className="text-xs text-off-white/30 hidden sm:block">
          Blue circle shows estimated max viewing distance based on lighting conditions and rocket type. Actual visibility varies with weather and atmospheric clarity.
        </p>
      </div>
    </motion.div>
  );
}
