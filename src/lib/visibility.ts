// Advanced Visibility Calculation Algorithm for SpaceX Launches
// Based on comprehensive meteorological and observational factors
//
// DATA SOURCES:
// - Visibility distances: SpaceX SAOCOM-1A (Oct 2018) twilight sightings from Phoenix (~500mi),
//   Arabsat-6A Falcon Heavy twilight sightings from SE US, r/spacex observer reports (2017-2025),
//   Space Shuttle STS-era visibility records (500-600mi twilight), SpaceArchive.info compilation.
// - Solar elevation scoring: Wikipedia "Twilight phenomenon", real-world observation that nautical
//   twilight (-6° to -12°) produces the "space jellyfish" effect (observer in darkness, plume
//   illuminated at 80-200km altitude by sunlight).
// - Atmospheric science: Koschmieder visibility equation, aerosol hygroscopic growth factors
//   (Seinfeld & Pandis), NOAA surface visibility climatology.

import { WeatherData, ExtendedWeatherData } from "./weather";
import { getLaunchSite, type LaunchSite } from "./launchSites";

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

// Earth constants
const EARTH_RADIUS_KM = 6371;

// Visibility range configuration (in km)
// Sources:
// - Twilight F9: SAOCOM-1A (Oct 2018) confirmed from Phoenix at ~800km, reports from
//   Albuquerque (~1100km) are less reliable. Conservative 800km well-documented.
// - Twilight FH: Arabsat-6A (Apr 2019) seen across SE US, ~1000km confirmed.
// - Twilight Starship: No twilight Starship launch yet; estimated from plume physics
//   (33 Raptors, ~16.7M lbf → plume 3-4x Falcon 9 volume). Shuttle (comparable thrust
//   with SRBs) documented at 800-965km twilight.
// - Night: Plume visible only from combustion luminosity (no solar illumination).
//   Roughly half of twilight distances based on observer reports.
// - Day: Bright sky washes out plume contrast. 100-150mi practical max for informed observer.
//   Community consensus: easily visible <50mi, possible with effort 50-125mi.
export const VISIBILITY_CONFIG = {
  maxVisibleDistance: {
    // Twilight conditions (optimal - "space jellyfish" effect)
    twilight: {
      falcon9: 800,      // km (~500 mi) — well documented, conservative end of 800-1000km range
      falconHeavy: 1000, // km (~620 mi) — consistent with Arabsat-6A and similar
      starship: 1200,    // km (~745 mi) — conservative estimate, could be 1500+ based on plume physics
      smallRocket: 350,  // km (~220 mi) — e.g. Electron, much dimmer
      default: 800,
    },
    // Night conditions (after astronomical twilight, sun below -18°)
    night: {
      falcon9: 450,      // km (~280 mi) — no solar illumination, exhaust glow only
      falconHeavy: 550,  // km (~340 mi)
      starship: 700,     // km (~435 mi) — massive plume partially compensates for no sunlight
      smallRocket: 200,  // km (~125 mi)
      default: 450,
    },
    // Daytime conditions (poor - contrast issues with bright sky)
    day: {
      falcon9: 200,      // km (~125 mi) — matches community reports closely
      falconHeavy: 250,  // km (~155 mi)
      starship: 300,     // km (~185 mi)
      smallRocket: 80,   // km (~50 mi)
      default: 200,
    },
  },
  // Optimal viewing distance range
  optimalMin: 130,     // km (~80 miles) — close enough for detail without neck strain
  optimalMax: 650,     // km (~400 miles) — comfortable naked-eye viewing under good conditions
};

// Plume altitude where it becomes visible (approximate)
const PLUME_VISIBILITY_ALTITUDE_KM = 40; // ~130,000 ft

// Visibility timing by rocket type (milliseconds)
// Source: SpaceX webcast telemetry data (MECO times, stage sep, SES-1)
// Falcon 9: MECO at T+2:30-2:40, stage sep T+2:38-2:43, SES-1 T+2:46-2:53
// Starship: Super Heavy MECO at T+2:40-2:50, hot-staging
const VISIBILITY_TIMING = {
  falcon9: {
    timeToAltitude: 1 * 60 * 1000,       // ~60s to ~12km where plume becomes visible at distance
    firstStageDuration: 2.5 * 60 * 1000, // First stage burn visible (~T+0 to T+2:40)
    secondStageDuration: 4 * 60 * 1000,  // Second stage visible after sep (twilight jellyfish)
    totalDuration: 6 * 60 * 1000,        // Total viewing window
  },
  falconHeavy: {
    timeToAltitude: 1 * 60 * 1000,       // Similar to F9 (more thrust but more mass)
    firstStageDuration: 2.5 * 60 * 1000, // Side booster sep at ~T+2:30 adds visual interest
    secondStageDuration: 5 * 60 * 1000,  // Brighter upper stage plume
    totalDuration: 7 * 60 * 1000,
  },
  starship: {
    timeToAltitude: 1 * 60 * 1000,       // Massive plume visible almost immediately
    firstStageDuration: 2.75 * 60 * 1000, // Super Heavy burns ~2:40-2:50, hot-staging
    secondStageDuration: 6 * 60 * 1000,  // Starship upper stage (6 Raptor Vacuum engines)
    totalDuration: 8 * 60 * 1000,        // Very long visibility due to plume size
  },
  smallRocket: {
    timeToAltitude: 2 * 60 * 1000,       // Slower ascent, dimmer
    firstStageDuration: 2 * 60 * 1000,
    secondStageDuration: 3 * 60 * 1000,
    totalDuration: 4 * 60 * 1000,
  },
  default: {
    timeToAltitude: 1 * 60 * 1000,
    firstStageDuration: 2.5 * 60 * 1000,
    secondStageDuration: 4 * 60 * 1000,
    totalDuration: 6 * 60 * 1000,
  },
};

// Weight configuration (sum = 1.0)
// Adjusted based on real-world impact:
// - Clouds: blocks view entirely if overcast
// - Sun/timing: 5-10x difference in viewing distance (twilight vs day)
// - Distance: already factored into dynamic max distance by lighting
const WEIGHTS = {
  cloud: 0.35,      // Most critical - clouds block everything
  sun: 0.25,        // Huge impact on visibility range and quality
  distance: 0.15,   // Important but max distance already varies by lighting
  clarity: 0.10,    // Haze/smog affects daytime more
  plume: 0.05,      // Plume persistence is secondary
  bearing: 0.04,    // Viewing angle matters less than other factors
  brightness: 0.04, // Rocket type has modest impact
  obstruction: 0.02,// Local obstructions rarely the limiting factor
};

// Tuning parameters (can be adjusted based on real observations)
export const TUNING = {
  weights: WEIGHTS,
  maxVisibleDistance: VISIBILITY_CONFIG.maxVisibleDistance,
  plumeAltitudeKm: PLUME_VISIBILITY_ALTITUDE_KM,
  confidenceBand: 10, // ± percentage
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ViewingLocation {
  lat: number;
  lon: number;
  name: string;
  elevation?: number; // meters above sea level
  isUrban?: boolean;  // urban vs rural (affects obstruction)
}

export interface SubScores {
  cloud: number;      // 0-1: cloud cover impact
  sun: number;        // 0-1: daylight/contrast factor
  distance: number;   // 0-1: distance from launch
  bearing: number;    // 0-1: trajectory viewing angle
  clarity: number;    // 0-1: atmospheric clarity (visibility + AQI)
  plume: number;      // 0-1: plume persistence (RH + winds)
  brightness: number; // 0-1: rocket/phase brightness
  obstruction: number;// 0-1: local obstructions
}

export interface VisibilityFactors {
  subScores: SubScores;
  weights: typeof WEIGHTS;
  rawData: {
    cloudFraction: number;
    cloudBase: number | null;
    solarElevation: number;
    distanceKm: number;
    bearingDeg: number;
    surfaceVisibilityKm: number;
    aqi: number | null;
    upperWindSpeed: number | null;
    upperHumidity: number | null;
    rocketType: string;
    obstructionFactor: number;
  };
}

export interface LimitingFactor {
  factor: string;
  description: string;
  severity: "critical" | "major" | "minor";
}

export interface VisibilityWindow {
  start: Date | null;
  end: Date | null;
  startFormatted: string | null;
  endFormatted: string | null;
  duration: number;
  description: string;
}

export interface VisibilityResult {
  percentage: number;
  rating: "poor" | "fair" | "good" | "excellent";
  confidence: { low: number; high: number };
  factors: VisibilityFactors;
  limitingFactors: LimitingFactor[];
  optimalWindow: VisibilityWindow;
  recommendations: string[];
  viewingLocation: {
    name: string;
    distance: number; // miles for display
    distanceKm: number;
    bearing: number;
  };
  fatalBlocker: string | null;
}

// ============================================================================
// SOLAR POSITION CALCULATIONS
// ============================================================================

/**
 * Calculate solar elevation angle at a given location and time
 * Returns elevation in degrees (-90 to +90)
 */
export function calculateSolarElevation(
  lat: number,
  lon: number,
  timestamp: number
): number {
  // Julian day calculation
  const JD = timestamp / 86400 + 2440587.5;
  const n = JD - 2451545.0;

  // Mean solar longitude
  const L = (280.460 + 0.9856474 * n) % 360;

  // Mean anomaly
  const g = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180;

  // Ecliptic longitude
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * Math.PI / 180;

  // Obliquity of ecliptic
  const epsilon = (23.439 - 0.0000004 * n) * Math.PI / 180;

  // Right ascension and declination
  const declination = Math.asin(Math.sin(epsilon) * Math.sin(lambda));

  // Hour angle
  const LST = (280.46061837 + 360.98564736629 * (JD - 2451545.0) + lon) % 360;
  const RA = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda)) * 180 / Math.PI;
  const HA = (LST - RA) * Math.PI / 180;

  // Solar elevation
  const latRad = lat * Math.PI / 180;
  const elevation = Math.asin(
    Math.sin(latRad) * Math.sin(declination) +
    Math.cos(latRad) * Math.cos(declination) * Math.cos(HA)
  ) * 180 / Math.PI;

  return elevation;
}

/**
 * Get twilight type based on solar elevation
 */
function getTwilightType(solarElevation: number): string {
  if (solarElevation > 0) return "day";
  if (solarElevation > -6) return "civil";
  if (solarElevation > -12) return "nautical";
  if (solarElevation > -18) return "astronomical";
  return "night";
}

// ============================================================================
// GEOGRAPHIC CALCULATIONS
// ============================================================================

/**
 * Calculate great-circle distance between two points in kilometers
 */
function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => deg * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate bearing from point A to point B in degrees (0-360)
 */
function calculateBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => deg * Math.PI / 180;
  const toDeg = (rad: number) => rad * 180 / Math.PI;

  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  const bearing = toDeg(Math.atan2(y, x));
  return (bearing + 360) % 360;
}

/**
 * Convert kilometers to miles
 */
function kmToMiles(km: number): number {
  return km * 0.621371;
}

// ============================================================================
// SUB-SCORE CALCULATIONS
// ============================================================================

/**
 * CloudScore: 1 - cloud_fraction, with ceiling weighting
 * Heavy low cloud (below plume altitude) -> 0
 */
function calculateCloudScore(
  cloudFraction: number,  // 0-100 percentage
  cloudBase: number | null, // meters, null if clear
  plumeAltitude: number = PLUME_VISIBILITY_ALTITUDE_KM * 1000 // meters
): { score: number; isFatal: boolean; reason: string | null } {
  const cloudFrac = cloudFraction / 100;

  // If overcast with low ceiling, visibility is blocked
  if (cloudFrac > 0.8 && cloudBase !== null && cloudBase < plumeAltitude) {
    return {
      score: 0,
      isFatal: true,
      reason: "Overcast conditions with low cloud ceiling blocking view"
    };
  }

  // Heavy low cloud adjustment
  if (cloudBase !== null && cloudBase < 3000 && cloudFrac > 0.6) {
    return {
      score: Math.max(0, 0.2 * (1 - cloudFrac)),
      isFatal: false,
      reason: "Low cloud cover significantly reducing visibility"
    };
  }

  // Standard cloud score
  const score = 1 - cloudFrac;

  return {
    score,
    isFatal: false,
    reason: cloudFrac > 0.5 ? "Moderate cloud cover may affect visibility" : null
  };
}

/**
 * SunScore: Daylight contrast factor
 * Based on real-world observations:
 * - The "jellyfish effect" occurs when observer is in Earth's shadow but the rocket
 *   plume at high altitude (80-200km) is still illuminated by sunlight. The plume
 *   expands to multiple km diameter in near-vacuum, creating a brilliant iridescent cloud.
 * - Optimal window: 30-60 min after sunset / before sunrise (nautical twilight, sun -6° to -12°)
 * - Twilight launches visible 5-10x farther than daytime launches
 * Sources: Wikipedia "Twilight phenomenon", SAOCOM-1A observation reports,
 *   The Planetary Society launch viewing guides, SpaceArchive.info
 */
function calculateSunScore(solarElevation: number): number {
  // Optimal: nautical twilight (-6 to -12 degrees)
  // "Sweet spot" - observer in full darkness, rocket plume brilliantly solar-illuminated
  // Produces the famous "space jellyfish" effect. Documented to enable 500+ mile sightings.
  if (solarElevation <= -6 && solarElevation >= -12) {
    return 1.0;
  }

  // Excellent: late civil twilight (-3 to -6 degrees)
  // Sky fairly dark, excellent contrast with illuminated plume
  if (solarElevation <= -3 && solarElevation > -6) {
    return 0.95;
  }

  // Very good: early civil twilight (0 to -3 degrees)
  // Sky still has some brightness, slightly reduced contrast vs late civil
  if (solarElevation <= 0 && solarElevation > -3) {
    return 0.85;
  }

  // Very good: astronomical twilight (-12 to -18)
  // Sky very dark; plume at extreme altitude (200+ km) still catches sunlight
  // but illumination cone narrows, so the window of dramatic plume is shorter
  if (solarElevation <= -12 && solarElevation >= -18) {
    return 0.85;
  }

  // Good: full night (< -18 degrees)
  // No solar illumination of plume; visible only from exhaust combustion glow.
  // Still visible but not the dramatic jellyfish effect.
  if (solarElevation < -18) {
    return 0.65;
  }

  // Marginal: golden hour (sun 0° to 10° above horizon)
  // Bright sky reduces contrast significantly. Close-range still visible.
  if (solarElevation > 0 && solarElevation <= 10) {
    return 0.30;
  }

  // Poor: daytime (sun 10° to 40° above horizon)
  // Bright sky significantly washes out rocket visibility
  if (solarElevation > 10 && solarElevation <= 40) {
    return 0.15;
  }

  // Very poor: midday (sun > 40°)
  // Maximum sky brightness, very difficult to see rocket beyond ~50 miles
  return 0.05;
}

/**
 * DistanceScore: Clamp(1 - distance/maxVisibleDistance, 0, 1)
 */
function calculateDistanceScore(
  distanceKm: number,
  maxVisibleDistance: number
): number {
  if (distanceKm <= 0) return 0;
  if (distanceKm > maxVisibleDistance) return 0;

  // Linear decay with optimal range boost
  const baseScore = 1 - (distanceKm / maxVisibleDistance);

  // Boost for optimal viewing range (80-200km)
  if (distanceKm >= VISIBILITY_CONFIG.optimalMin &&
      distanceKm <= VISIBILITY_CONFIG.optimalMax) {
    return Math.min(1, baseScore * 1.1);
  }

  return Math.max(0, baseScore);
}

/**
 * BearingScore: Based on trajectory direction relative to observer
 * 1.0 = trajectory passes across/toward observer
 * 0.6 = oblique view
 * 0.3 = trajectory going away/not visible
 */
function calculateBearingScore(
  bearingToLaunchSite: number,
  launchAzimuth: number
): number {
  // Calculate the angular difference between observer's view and trajectory
  const viewDirection = (bearingToLaunchSite + 180) % 360; // Direction from observer to launch
  const trajectoryDirection = launchAzimuth;

  let angleDiff = Math.abs(viewDirection - trajectoryDirection);
  if (angleDiff > 180) angleDiff = 360 - angleDiff;

  // If trajectory is roughly perpendicular to view (45-135 degrees off), good side view
  if (angleDiff >= 45 && angleDiff <= 135) {
    return 1.0;
  }

  // If looking roughly along the trajectory direction (toward or away)
  if (angleDiff < 45 || angleDiff > 135) {
    // Toward (approaching): better view
    const normalizedDiff = Math.min(angleDiff, 180 - angleDiff);
    return 0.6 + 0.4 * (normalizedDiff / 45);
  }

  return 0.6;
}

/**
 * ClarityScore: Map visibility (km) and AQI to 0-1
 * visibility >= 40km -> 1
 * visibility <= 5km -> 0
 * AQI > 150 -> major reduction
 */
function calculateClarityScore(
  visibilityKm: number,
  aqi: number | null,
  humidityPenalty: number = 0
): number {
  // Base visibility score
  let visScore: number;
  if (visibilityKm >= 40) {
    visScore = 1.0;
  } else if (visibilityKm <= 5) {
    visScore = 0;
  } else {
    visScore = (visibilityKm - 5) / 35;
  }

  // AQI penalty (if available)
  if (aqi !== null) {
    if (aqi <= 50) {
      // Good air quality - no penalty
    } else if (aqi <= 100) {
      visScore *= 0.9;
    } else if (aqi <= 150) {
      visScore *= 0.7;
    } else if (aqi <= 200) {
      visScore *= 0.4;
    } else {
      visScore *= 0.2;
    }
  }

  // Site-specific humidity penalty (e.g. Florida's humid climate reduces clarity)
  if (humidityPenalty > 0) {
    visScore *= (1 - humidityPenalty);
  }

  return Math.max(0, Math.min(1, visScore));
}

/**
 * PlumeScore: Based on upper-air humidity and winds
 * High RH + low winds -> plume persists longer (higher score)
 * Low RH + high winds -> plume disperses quickly
 */
function calculatePlumeScore(
  upperHumidity: number | null,  // % at ~10km altitude
  upperWindSpeed: number | null  // m/s at ~10km altitude
): number {
  // Default moderate score if data unavailable
  if (upperHumidity === null && upperWindSpeed === null) {
    return 0.6;
  }

  let humidityFactor = 0.5;
  let windFactor = 0.5;

  // Higher humidity helps plume condensation (water vapor from exhaust)
  if (upperHumidity !== null) {
    if (upperHumidity >= 60) {
      humidityFactor = 0.9;
    } else if (upperHumidity >= 40) {
      humidityFactor = 0.7;
    } else if (upperHumidity >= 20) {
      humidityFactor = 0.5;
    } else {
      humidityFactor = 0.3;
    }
  }

  // Moderate winds help spread plume for visibility, but too high disperses it
  if (upperWindSpeed !== null) {
    if (upperWindSpeed <= 10) {
      windFactor = 0.9; // Light winds - plume stays cohesive
    } else if (upperWindSpeed <= 25) {
      windFactor = 1.0; // Moderate - optimal for spread
    } else if (upperWindSpeed <= 50) {
      windFactor = 0.7; // Strong - disperses
    } else {
      windFactor = 0.4; // Very strong - disperses quickly
    }
  }

  return (humidityFactor + windFactor) / 2;
}

/**
 * Detect launch azimuth based on mission name and site
 * Returns azimuth in degrees from north
 */
function detectLaunchAzimuth(missionName: string, site: LaunchSite): number {
  const nameLower = missionName.toLowerCase();

  // Check site-specific mission azimuths first
  if (nameLower.includes("starlink") && site.missionAzimuths.starlink !== undefined) {
    return site.missionAzimuths.starlink;
  }

  if ((nameLower.includes("nrol") || nameLower.includes("usa-")) && site.missionAzimuths.nrol !== undefined) {
    return site.missionAzimuths.nrol;
  }

  if (nameLower.includes("transporter") && site.missionAzimuths.sso !== undefined) {
    return site.missionAzimuths.sso;
  }

  if ((nameLower.includes("sda ") || nameLower.includes("tranche")) && site.missionAzimuths.sso !== undefined) {
    return site.missionAzimuths.sso;
  }

  if ((nameLower.includes("crew") || nameLower.includes("dragon")) && site.missionAzimuths.crew !== undefined) {
    return site.missionAzimuths.crew;
  }

  if (nameLower.includes("iss") && site.missionAzimuths.iss !== undefined) {
    return site.missionAzimuths.iss;
  }

  if ((nameLower.includes("worldview") || nameLower.includes("planet") ||
      nameLower.includes("iceye") || nameLower.includes("capella")) && site.missionAzimuths.sso !== undefined) {
    return site.missionAzimuths.sso;
  }

  if (nameLower.includes("iridium") && site.missionAzimuths.polar !== undefined) {
    return site.missionAzimuths.polar;
  }

  if (nameLower.includes("starship") && site.missionAzimuths.starship !== undefined) {
    return site.missionAzimuths.starship;
  }

  // Default to site's default azimuth
  return site.defaultAzimuth;
}

/**
 * BrightnessScore: Vehicle type and phase
 * Larger rockets with bigger burns score higher
 */
function calculateBrightnessScore(missionName: string): { score: number; rocketType: string } {
  const nameLower = missionName.toLowerCase();

  // Identify rocket type from mission name
  let rocketType = "falcon9";
  let score = 0.85;

  if (nameLower.includes("falcon heavy") || nameLower.includes("fh")) {
    rocketType = "falconHeavy";
    score = 0.95;
  } else if (nameLower.includes("starship")) {
    rocketType = "starship";
    score = 1.0;
  } else if (nameLower.includes("electron") || nameLower.includes("rocket lab")) {
    rocketType = "smallRocket";
    score = 0.4;
  } else if (nameLower.includes("falcon 9") || nameLower.includes("starlink")) {
    rocketType = "falcon9";
    score = 0.85;
  }

  // Starlink missions are routine but still visible
  if (nameLower.includes("starlink")) {
    score = 0.8;
  }

  // High-value missions sometimes have camera-friendly burns
  if (nameLower.includes("crew") || nameLower.includes("dragon")) {
    score = Math.min(1, score + 0.1);
  }

  return { score, rocketType };
}

/**
 * ObstructionScore: Local viewing obstructions
 * 1.0 = rural, open view
 * Reduced for urban areas, trees, buildings
 */
function calculateObstructionScore(
  isUrban: boolean = false,
  userElevation: number = 0, // meters
  lightPollutionBase: number = 0
): number {
  let score = 1.0;

  // Urban penalty (buildings, light pollution)
  if (isUrban) {
    score -= 0.2;
  }

  // Site-specific light pollution penalty
  score -= lightPollutionBase;

  // Elevation benefit (higher = clearer horizon)
  if (userElevation > 1000) {
    score = Math.min(1, score + 0.1);
  } else if (userElevation < 100) {
    score -= 0.05;
  }

  return Math.max(0, Math.min(1, score));
}

// ============================================================================
// TIME FORMATTING
// ============================================================================

function formatTime(date: Date, timezone: string = "America/New_York"): string {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });
}

// ============================================================================
// VISIBILITY WINDOW CALCULATION
// ============================================================================

function calculateVisibilityWindow(
  launchTimeUnix: number,
  solarElevation: number,
  sunScore: number,
  rocketType: string = "falcon9",
  timezone: string = "America/New_York"
): VisibilityWindow {
  const launchDate = new Date(launchTimeUnix * 1000);

  // Get rocket-specific timing
  const timing = VISIBILITY_TIMING[rocketType as keyof typeof VISIBILITY_TIMING]
    || VISIBILITY_TIMING.default;

  const visibilityStart = new Date(launchDate.getTime() + timing.timeToAltitude);
  const visibilityEnd = new Date(visibilityStart.getTime() + timing.totalDuration);

  const twilightType = getTwilightType(solarElevation);

  // Daytime launches have very limited visibility
  if (sunScore < 0.2) {
    return {
      start: null,
      end: null,
      startFormatted: null,
      endFormatted: null,
      duration: 0,
      description: "Daytime launch - rocket exhaust will be very difficult to see against bright sky",
    };
  }

  const startFormatted = formatTime(visibilityStart, timezone);
  const endFormatted = formatTime(visibilityEnd, timezone);

  let description: string;
  if (twilightType === "civil" || twilightType === "nautical") {
    description = `Optimal twilight viewing ${startFormatted} - ${endFormatted}. Plume will be illuminated against dark sky.`;
  } else if (twilightType === "night" || twilightType === "astronomical") {
    description = `Night launch visible ${startFormatted} - ${endFormatted}. Exhaust plume will glow against dark sky.`;
  } else {
    description = `Estimated visible ${startFormatted} - ${endFormatted}. Sun angle may reduce contrast.`;
  }

  return {
    start: visibilityStart,
    end: visibilityEnd,
    startFormatted,
    endFormatted,
    duration: Math.round(timing.totalDuration / 60000), // minutes
    description,
  };
}

// ============================================================================
// SITE-SPECIFIC RECOMMENDATION TEXT
// ============================================================================

function getSiteDirectionText(site: LaunchSite): string {
  switch (site.id) {
    case "cape-canaveral":
      return "Look east-northeast over the Atlantic";  // Starlink 53° missions head NE
    case "boca-chica":
      return "Look east over the Gulf of Mexico";      // Starship heads ~97° (nearly due east)
    case "vandenberg":
    default:
      return "Look south along the coast";   // SSO missions head 190° (nearly due south)
  }
}

function getSiteSpecificTips(site: LaunchSite, missionName: string): string[] {
  const tips: string[] = [];
  switch (site.id) {
    case "cape-canaveral":
      tips.push("Florida humidity (annual mean 74-78% RH) can create haze that reduces clarity, especially in summer.");
      break;
    case "boca-chica":
      if (missionName.toLowerCase().includes("starship")) {
        tips.push("Starship's 33 Raptor engines (16.7M lbf) produce the largest plume of any active rocket — visible from much farther than Falcon 9.");
      }
      tips.push("Gulf moisture may create haze; spring months typically offer the clearest viewing.");
      break;
    case "vandenberg":
      tips.push("Marine fog (65-85 days/yr) may affect the launch site, but typically clears by afternoon for evening launches.");
      if (missionName.toLowerCase().includes("starlink")) {
        tips.push("Vandenberg Starlink missions are polar-orbit (97.6° inclination), heading south along the coast.");
      }
      break;
  }
  return tips;
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

export function calculateVisibility(
  launchTimeUnix: number,
  missionName: string,
  weatherLaunchSite: WeatherData | ExtendedWeatherData | null,
  weatherViewing: WeatherData | ExtendedWeatherData | null,
  viewingLocation?: ViewingLocation,
  siteId?: string
): VisibilityResult {
  // Resolve launch site
  const site = getLaunchSite(siteId || "vandenberg")!;

  // Default viewing location (launch site itself if none set)
  const viewer: ViewingLocation = viewingLocation || {
    lat: site.lat,
    lon: site.lon,
    name: site.name,
    elevation: site.elevation,
    isUrban: false,
  };

  // Calculate geographic factors using site coordinates
  const distanceKm = calculateDistanceKm(
    viewer.lat, viewer.lon,
    site.lat, site.lon
  );
  const bearingToLaunchSite = calculateBearing(
    viewer.lat, viewer.lon,
    site.lat, site.lon
  );

  // Calculate solar position at viewer's location at launch time
  const solarElevation = calculateSolarElevation(viewer.lat, viewer.lon, launchTimeUnix);

  // Determine rocket type
  const { score: brightnessScore, rocketType } = calculateBrightnessScore(missionName);

  // Determine lighting condition and get appropriate max visible distance
  type RocketType = "falcon9" | "falconHeavy" | "starship" | "smallRocket" | "default";
  let lightingCondition: "twilight" | "night" | "day";
  if (solarElevation <= 0 && solarElevation >= -18) {
    lightingCondition = "twilight";
  } else if (solarElevation < -18) {
    lightingCondition = "night";
  } else {
    lightingCondition = "day";
  }

  const distanceTable = VISIBILITY_CONFIG.maxVisibleDistance[lightingCondition];
  const maxVisibleDistance = distanceTable[rocketType as RocketType] || distanceTable.default;

  // Extract weather data with fallbacks
  const cloudFraction = weatherViewing?.clouds ?? 50;
  const extendedWeather = weatherViewing as ExtendedWeatherData | null;
  const cloudBase = extendedWeather?.cloudBase ?? null;
  const surfaceVisibilityKm = (weatherViewing?.visibility ?? 10000) / 1000;
  const aqi = extendedWeather?.aqi ?? null;
  const upperWindSpeed = extendedWeather?.upperWindSpeed ?? null;
  const upperHumidity = extendedWeather?.upperHumidity ?? null;

  // Calculate all sub-scores
  // Detect launch azimuth based on mission type and site
  const launchAzimuth = detectLaunchAzimuth(missionName, site);

  const cloudResult = calculateCloudScore(cloudFraction, cloudBase);
  const sunScore = calculateSunScore(solarElevation);
  const distanceScore = calculateDistanceScore(distanceKm, maxVisibleDistance);
  const bearingScore = calculateBearingScore(bearingToLaunchSite, launchAzimuth);
  const clarityScore = calculateClarityScore(surfaceVisibilityKm, aqi, site.visibilityModifiers.humidityPenalty);
  const plumeScore = calculatePlumeScore(upperHumidity, upperWindSpeed);
  const obstructionScore = calculateObstructionScore(
    viewer.isUrban,
    viewer.elevation,
    site.visibilityModifiers.lightPollutionBase
  );

  const subScores: SubScores = {
    cloud: cloudResult.score,
    sun: sunScore,
    distance: distanceScore,
    bearing: bearingScore,
    clarity: clarityScore,
    plume: plumeScore,
    brightness: brightnessScore,
    obstruction: obstructionScore,
  };

  // Check for fatal blockers
  let fatalBlocker: string | null = null;
  if (cloudResult.isFatal) {
    fatalBlocker = cloudResult.reason;
  } else if (distanceScore === 0 && distanceKm > maxVisibleDistance) {
    const lightingLabel = lightingCondition === "twilight" ? "twilight" : lightingCondition === "night" ? "night" : "daytime";
    fatalBlocker = `Location is ${Math.round(distanceKm * 0.621371)} miles from ${site.name}, beyond the ~${Math.round(maxVisibleDistance * 0.621371)}-mile ${lightingLabel} visibility limit`;
  } else if (sunScore < 0.1) {
    fatalBlocker = "Midday sun makes rocket visibility very difficult - daytime launches only visible within ~125 miles";
  }

  // Calculate weighted score
  let weightedScore = 0;
  if (!fatalBlocker) {
    weightedScore =
      subScores.cloud * WEIGHTS.cloud +
      subScores.sun * WEIGHTS.sun +
      subScores.distance * WEIGHTS.distance +
      subScores.bearing * WEIGHTS.bearing +
      subScores.clarity * WEIGHTS.clarity +
      subScores.plume * WEIGHTS.plume +
      subScores.brightness * WEIGHTS.brightness +
      subScores.obstruction * WEIGHTS.obstruction;
  }

  const percentage = Math.round(weightedScore * 100);

  // Determine rating
  let rating: VisibilityResult["rating"];
  if (percentage >= 70) rating = "excellent";
  else if (percentage >= 50) rating = "good";
  else if (percentage >= 30) rating = "fair";
  else rating = "poor";

  // Identify limiting factors (sorted by impact)
  const limitingFactors: LimitingFactor[] = [];

  const scoredFactors = [
    { name: "cloud", score: subScores.cloud, weight: WEIGHTS.cloud },
    { name: "sun", score: subScores.sun, weight: WEIGHTS.sun },
    { name: "distance", score: subScores.distance, weight: WEIGHTS.distance },
    { name: "clarity", score: subScores.clarity, weight: WEIGHTS.clarity },
    { name: "plume", score: subScores.plume, weight: WEIGHTS.plume },
  ].sort((a, b) => (a.score * a.weight) - (b.score * b.weight));

  // Add top 2 limiting factors
  for (const factor of scoredFactors.slice(0, 2)) {
    if (factor.score < 0.5) {
      const descriptions: Record<string, string> = {
        cloud: `Cloud cover at ${cloudFraction}% is reducing visibility`,
        sun: `Solar angle of ${solarElevation.toFixed(1)}° is not optimal (${getTwilightType(solarElevation)})`,
        distance: `Distance of ${Math.round(distanceKm * 0.621371)} miles from ${site.name}`,
        clarity: `Atmospheric clarity is limited (${Math.round(surfaceVisibilityKm * 0.621371)} miles visibility)`,
        plume: "Atmospheric conditions may cause plume to disperse quickly",
      };
      limitingFactors.push({
        factor: factor.name,
        description: descriptions[factor.name] || `${factor.name} score is low`,
        severity: factor.score < 0.3 ? "major" : "minor",
      });
    }
  }

  if (cloudResult.reason && !cloudResult.isFatal) {
    limitingFactors.unshift({
      factor: "cloud",
      description: cloudResult.reason,
      severity: subScores.cloud < 0.3 ? "major" : "minor",
    });
  }

  // Generate recommendations based on research
  const recommendations: string[] = [];
  const distanceMiles = Math.round(distanceKm * 0.621371);
  const directionText = getSiteDirectionText(site);

  // Timing-based recommendations
  if (lightingCondition === "twilight") {
    if (solarElevation <= -6 && solarElevation >= -12) {
      recommendations.push("Optimal twilight timing! Look for the 'space jellyfish' effect - the plume will glow brilliantly against the dark sky.");
    } else {
      recommendations.push("Good twilight conditions. The rocket plume should be clearly visible, potentially illuminated by sunlight at altitude.");
    }
  } else if (lightingCondition === "night") {
    recommendations.push("Night launch - look for the rocket's exhaust glow against the dark sky. Less dramatic than twilight but still visible.");
  } else {
    recommendations.push("Daytime launch has limited visibility due to bright sky. Twilight launches (30-60 min after sunset) are visible 5-10x farther.");
  }

  // Cloud recommendations
  if (subScores.cloud < 0.5) {
    recommendations.push("Cloud cover may obstruct viewing. Check conditions closer to launch time.");
  }

  // Distance-based recommendations with site-aware direction
  if (distanceMiles <= 200) {
    recommendations.push(`At ${distanceMiles} miles, you're very close. The rocket should be clearly visible rising from the horizon.`);
  } else if (distanceMiles <= 500) {
    recommendations.push(`At ${distanceMiles} miles, you're at an optimal viewing distance. ${directionText}.`);
  } else if (distanceScore > 0) {
    recommendations.push(`At ${distanceMiles} miles, binoculars or a camera with zoom will help spot the rocket.`);
  }

  if (clarityScore < 0.5 && aqi && aqi > 100) {
    recommendations.push("Air quality is reducing visibility. Consider a higher elevation viewing spot.");
  }

  // Site-specific tips
  const siteTips = getSiteSpecificTips(site, missionName);
  recommendations.push(...siteTips);

  if (recommendations.length === 0) {
    recommendations.push(`Conditions look reasonable for viewing. Look ${site.directionHint} after launch.`);
  }

  // Confidence band adjusted by site weather variability
  const siteConfidenceBand = site.visibilityModifiers.typicalCloudCover > 0.35
    ? TUNING.confidenceBand + 5  // Wider band for sites with more variable weather (Florida)
    : TUNING.confidenceBand;

  // Calculate visibility window with rocket-specific timing
  const optimalWindow = calculateVisibilityWindow(launchTimeUnix, solarElevation, sunScore, rocketType, site.timezone);

  // Build result
  const factors: VisibilityFactors = {
    subScores,
    weights: WEIGHTS,
    rawData: {
      cloudFraction,
      cloudBase,
      solarElevation,
      distanceKm,
      bearingDeg: bearingToLaunchSite,
      surfaceVisibilityKm,
      aqi,
      upperWindSpeed,
      upperHumidity,
      rocketType,
      obstructionFactor: 1 - obstructionScore,
    },
  };

  return {
    percentage: fatalBlocker ? Math.min(percentage, 5) : percentage,
    rating: fatalBlocker ? "poor" : rating,
    confidence: {
      low: Math.max(0, percentage - siteConfidenceBand),
      high: Math.min(100, percentage + siteConfidenceBand),
    },
    factors,
    limitingFactors: fatalBlocker
      ? [{ factor: "fatal", description: fatalBlocker, severity: "critical" }]
      : limitingFactors,
    optimalWindow,
    recommendations: fatalBlocker
      ? [fatalBlocker, "Consider a different viewing location or wait for better conditions."]
      : recommendations,
    viewingLocation: {
      name: viewer.name,
      distance: Math.round(kmToMiles(distanceKm)),
      distanceKm: Math.round(distanceKm),
      bearing: Math.round(bearingToLaunchSite),
    },
    fatalBlocker,
  };
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export function getVisibilityColor(percentage: number): string {
  if (percentage >= 70) return "#00FF41"; // Green
  if (percentage >= 50) return "#FFB800"; // Yellow
  if (percentage >= 30) return "#FF6B35"; // Orange
  return "#ff4444"; // Red
}

export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  return kmToMiles(calculateDistanceKm(lat1, lon1, lat2, lon2));
}
