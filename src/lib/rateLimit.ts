/**
 * In-memory sliding window rate limiter
 *
 * Note: On serverless platforms (Vercel), each instance has its own memory.
 * This catches burst abuse within a single warm instance but won't limit
 * across instances. For production hardening, use Upstash or similar.
 */

import { NextRequest, NextResponse } from "next/server";

const windows = new Map<string, number[]>();

/**
 * Get client IP from request headers
 */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Lazy cleanup of expired entries (1% chance per call)
 */
function maybeCleanup(windowMs: number): void {
  if (Math.random() > 0.01) return;
  const now = Date.now();
  for (const [key, timestamps] of windows) {
    const valid = timestamps.filter((t) => now - t < windowMs);
    if (valid.length === 0) {
      windows.delete(key);
    } else {
      windows.set(key, valid);
    }
  }
}

/**
 * Check rate limit for a request
 *
 * @param request - The incoming request
 * @param limit - Max requests per window (default: 30)
 * @param windowMs - Window size in ms (default: 60 seconds)
 * @returns Object with `allowed` boolean and optional `response` to return if blocked
 */
export function checkRateLimit(
  request: NextRequest,
  limit: number = 30,
  windowMs: number = 60_000
): { allowed: boolean; response?: NextResponse } {
  const ip = getClientIp(request);
  const key = `${ip}:${request.nextUrl.pathname}`;
  const now = Date.now();

  maybeCleanup(windowMs);

  const timestamps = windows.get(key) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= limit) {
    return {
      allowed: false,
      response: NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(windowMs / 1000)),
          },
        }
      ),
    };
  }

  validTimestamps.push(now);
  windows.set(key, validTimestamps);

  return { allowed: true };
}
