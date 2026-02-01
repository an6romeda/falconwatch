/**
 * Security utility functions
 */

/**
 * Constant-time string comparison to prevent timing attacks.
 * Works in both Node.js and Edge runtimes.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const bufA = encoder.encode(a);
  const bufB = encoder.encode(b);

  if (bufA.length !== bufB.length) {
    // Compare against self to burn the same amount of time,
    // then return false
    let dummy = 0;
    for (let i = 0; i < bufA.length; i++) {
      dummy |= bufA[i] ^ bufA[i];
    }
    void dummy;
    return false;
  }

  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

/**
 * Validate that lat/lon coordinates are within valid ranges
 */
export function validateCoords(lat: number, lon: number): boolean {
  return (
    !isNaN(lat) &&
    !isNaN(lon) &&
    isFinite(lat) &&
    isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}
