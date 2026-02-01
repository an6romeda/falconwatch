/**
 * Client-side visibility data storage with automatic 30-day purge
 */

interface VisibilityRecord {
  launchId: string;
  visible: boolean;
  percentage: number;
  launchDate: number; // Unix timestamp
  expiresAt: number; // Unix timestamp (30 days after launch)
}

const STORAGE_KEY = "falconwatch_visibility_history";
const EXPIRY_DAYS = 30;

/**
 * Get all visibility records from localStorage
 */
export function getVisibilityRecords(): VisibilityRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as VisibilityRecord[];
  } catch {
    return [];
  }
}

/**
 * Save a visibility record for a launch
 */
export function saveVisibilityRecord(
  launchId: string,
  visible: boolean,
  percentage: number,
  launchDate: Date
): void {
  if (typeof window === "undefined") return;

  const records = getVisibilityRecords();
  const launchTimestamp = launchDate.getTime();
  const expiresAt = launchTimestamp + EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  // Check if record already exists
  const existingIndex = records.findIndex((r) => r.launchId === launchId);

  const newRecord: VisibilityRecord = {
    launchId,
    visible,
    percentage,
    launchDate: launchTimestamp,
    expiresAt,
  };

  if (existingIndex >= 0) {
    records[existingIndex] = newRecord;
  } else {
    records.push(newRecord);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/**
 * Get visibility record for a specific launch
 */
export function getVisibilityRecord(
  launchId: string
): VisibilityRecord | null {
  const records = getVisibilityRecords();
  return records.find((r) => r.launchId === launchId) || null;
}

/**
 * Purge expired visibility records (30 days after launch)
 */
export function purgeExpiredRecords(): number {
  if (typeof window === "undefined") return 0;

  const records = getVisibilityRecords();
  const now = Date.now();

  const validRecords = records.filter((record) => record.expiresAt > now);
  const purgedCount = records.length - validRecords.length;

  if (purgedCount > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(validRecords));
  }

  return purgedCount;
}

/**
 * Get visibility statistics
 */
export function getVisibilityStats(): {
  totalLaunches: number;
  visibleLaunches: number;
  averagePercentage: number;
} {
  const records = getVisibilityRecords();

  if (records.length === 0) {
    return { totalLaunches: 0, visibleLaunches: 0, averagePercentage: 0 };
  }

  const visibleLaunches = records.filter((r) => r.visible).length;
  const averagePercentage =
    records.reduce((sum, r) => sum + r.percentage, 0) / records.length;

  return {
    totalLaunches: records.length,
    visibleLaunches,
    averagePercentage: Math.round(averagePercentage),
  };
}

/**
 * Clear all visibility records
 */
export function clearVisibilityRecords(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Initialize visibility storage - call on app mount
 * Automatically purges expired records
 */
export function initVisibilityStorage(): void {
  purgeExpiredRecords();
}
