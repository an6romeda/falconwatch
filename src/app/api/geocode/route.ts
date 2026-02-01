import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";

export async function GET(request: NextRequest) {
  // Rate limit: 30 requests per minute per IP
  const rateCheck = checkRateLimit(request, 30, 60_000);
  if (!rateCheck.allowed) return rateCheck.response!;

  const query = request.nextUrl.searchParams.get("q")?.trim();
  const lat = request.nextUrl.searchParams.get("lat");
  const lon = request.nextUrl.searchParams.get("lon");

  // Reverse geocode mode: lat/lon → place name (proxied through server)
  if (lat && lon) {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (isNaN(latNum) || isNaN(lonNum) || latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latNum}&lon=${lonNum}&format=json&zoom=10`,
        {
          signal: AbortSignal.timeout(5000),
          headers: { "User-Agent": "FalconWatch/1.0 (https://falconwatch.app)" },
        }
      );

      if (!res.ok) {
        return NextResponse.json({ name: null });
      }

      const data = await res.json();
      const city =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.county;
      const state = data.address?.state;

      let name: string | null = null;
      if (city && state) {
        name = `${city}, ${state}`;
      } else if (city) {
        name = city;
      }

      return NextResponse.json({ name });
    } catch {
      return NextResponse.json({ name: null });
    }
  }

  // Forward geocode mode: query → results
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const isZip = /^\d{5}$/.test(query);

  try {
    if (isZip) {
      // ZIP code → zippopotam.us (no CORS issues server-side)
      const res = await fetch(`https://api.zippopotam.us/us/${query}`, {
        signal: AbortSignal.timeout(5000),
      });

      if (!res.ok) {
        return NextResponse.json({ results: [], error: "ZIP code not found" });
      }

      const data = await res.json();
      const results = (data.places || []).map(
        (place: {
          "place name": string;
          "state abbreviation": string;
          latitude: string;
          longitude: string;
        }) => ({
          name: place["place name"],
          admin1: place["state abbreviation"],
          country: "US",
          latitude: parseFloat(place.latitude),
          longitude: parseFloat(place.longitude),
        })
      );

      return NextResponse.json({ results });
    } else {
      // City name → Open-Meteo geocoding
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (!res.ok) {
        return NextResponse.json(
          { results: [], error: "Search failed" },
          { status: 502 }
        );
      }

      const data = await res.json();
      return NextResponse.json({ results: data.results || [] });
    }
  } catch {
    return NextResponse.json(
      { results: [], error: "Search failed" },
      { status: 502 }
    );
  }
}
