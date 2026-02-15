// Pure utility functions for computing visibility radius on the client side.
// No API calls — safe to import in "use client" components.

import { VISIBILITY_CONFIG } from "./visibility";

type LightingCondition = "twilight" | "night" | "day";
type RocketType = "falcon9" | "falconHeavy" | "starship" | "smallRocket" | "default";

/**
 * Determine the lighting condition from a solar elevation angle (degrees).
 * Matches the logic in calculateVisibility().
 */
export function getLightingCondition(solarElevation: number): LightingCondition {
  if (solarElevation <= 0 && solarElevation >= -18) return "twilight";
  if (solarElevation < -18) return "night";
  return "day";
}

/**
 * Return a human-readable label for the lighting condition.
 */
export function getLightingLabel(condition: LightingCondition): string {
  switch (condition) {
    case "twilight": return "twilight";
    case "night": return "night";
    case "day": return "daytime";
  }
}

/**
 * Detect the rocket type key from a mission name string.
 * Same heuristics as calculateBrightnessScore() in visibility.ts.
 */
export function detectRocketType(missionName: string): RocketType {
  const n = missionName.toLowerCase();
  if (n.includes("falcon heavy") || n.includes("fh")) return "falconHeavy";
  if (n.includes("starship")) return "starship";
  if (n.includes("electron") || n.includes("rocket lab")) return "smallRocket";
  return "falcon9";
}

/**
 * Look up the maximum visible distance (km) for a given solar elevation
 * and rocket type. This is the radius to draw on the map.
 */
export function getMaxVisibleRadiusKm(
  solarElevation: number,
  rocketType: string,
): number {
  const condition = getLightingCondition(solarElevation);
  const table = VISIBILITY_CONFIG.maxVisibleDistance[condition];
  return (table[rocketType as RocketType] ?? table.default);
}
