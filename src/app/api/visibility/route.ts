import { NextRequest, NextResponse } from "next/server";
import { calculateVisibility } from "@/lib/visibility";
import {
  getAllWeather,
  getWeatherForecast,
  getWeatherForCoords,
  getWeatherForecastForCoords,
  type LocationKey,
} from "@/lib/weather";
import { checkRateLimit } from "@/lib/rateLimit";
import { validateCoords } from "@/lib/security";

export const revalidate = 300; // Revalidate every 5 minutes

// Valid launch site IDs that map to weather locations
const VALID_SITE_IDS: LocationKey[] = ["vandenberg", "cape-canaveral", "boca-chica"];

export async function GET(request: NextRequest) {
  // Rate limit: 30 requests per minute per IP
  const rateCheck = checkRateLimit(request, 30, 60_000);
  if (!rateCheck.allowed) return rateCheck.response!;

  const { searchParams } = new URL(request.url);
  const launchTime = searchParams.get("launchTime");
  const missionName = searchParams.get("missionName") || "Unknown Mission";
  const siteId = searchParams.get("siteId") || "vandenberg";

  // Custom viewing location parameters
  const customLat = searchParams.get("lat");
  const customLon = searchParams.get("lon");
  const locationName = searchParams.get("locationName") || "Custom Location";

  if (!launchTime) {
    return NextResponse.json(
      {
        success: false,
        error: "launchTime parameter is required (Unix timestamp)",
      },
      { status: 400 }
    );
  }

  try {
    const launchTimestamp = parseInt(launchTime, 10);
    if (isNaN(launchTimestamp)) {
      return NextResponse.json(
        { success: false, error: "Invalid launchTime" },
        { status: 400 }
      );
    }

    const now = Math.floor(Date.now() / 1000);

    // Determine if we should use current weather or forecast
    const hoursUntilLaunch = (launchTimestamp - now) / 3600;

    // Resolve the weather location key for the launch site
    const weatherSiteKey: LocationKey = VALID_SITE_IDS.includes(siteId as LocationKey)
      ? (siteId as LocationKey)
      : "vandenberg";

    let weatherLaunchSite, weatherViewing;

    // Parse and validate custom location if provided
    let viewingLocation = null;
    if (customLat && customLon) {
      const lat = parseFloat(customLat);
      const lon = parseFloat(customLon);

      if (!validateCoords(lat, lon)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid coordinates. Latitude must be -90 to 90, longitude -180 to 180.",
          },
          { status: 400 }
        );
      }

      viewingLocation = { lat, lon, name: locationName };
    }

    if (hoursUntilLaunch <= 0 || hoursUntilLaunch > 120) {
      // Launch is in the past or too far in the future (>5 days)
      // Use current weather as approximation
      const currentWeather = await getAllWeather(weatherSiteKey);
      weatherLaunchSite = currentWeather.launchSite;

      // Get weather for custom location or use Phoenix default
      if (viewingLocation) {
        weatherViewing = await getWeatherForCoords(
          viewingLocation.lat,
          viewingLocation.lon,
          viewingLocation.name
        );
      } else {
        weatherViewing = currentWeather.phoenix;
      }
    } else {
      // Use forecast data for the launch time
      weatherLaunchSite = await getWeatherForecast(weatherSiteKey, launchTimestamp);

      // Get forecast for viewing location at launch time
      if (viewingLocation) {
        weatherViewing = await getWeatherForecastForCoords(
          viewingLocation.lat,
          viewingLocation.lon,
          viewingLocation.name,
          launchTimestamp
        );
      } else {
        weatherViewing = await getWeatherForecast("phoenix", launchTimestamp);
      }
    }

    // Calculate visibility with site-aware algorithm
    const visibility = calculateVisibility(
      launchTimestamp,
      missionName,
      weatherLaunchSite,
      weatherViewing,
      viewingLocation || undefined,
      siteId
    );

    return NextResponse.json({
      success: true,
      data: {
        ...visibility,
        launchTime: launchTimestamp,
        missionName,
        siteId,
        weather: {
          launchSite: weatherLaunchSite,
          viewing: weatherViewing,
        },
      },
    });
  } catch (error) {
    console.error("Failed to calculate visibility:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to calculate visibility",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Rate limit: 30 requests per minute per IP
  const rateCheck = checkRateLimit(request, 30, 60_000);
  if (!rateCheck.allowed) return rateCheck.response!;

  try {
    const body = await request.json();
    const {
      launchTime,
      missionName,
      weatherLaunchSite,
      weatherViewing,
      viewingLocation,
      siteId,
    } = body;

    if (!launchTime) {
      return NextResponse.json(
        {
          success: false,
          error: "launchTime is required",
        },
        { status: 400 }
      );
    }

    // Validate viewing location coordinates if provided
    if (viewingLocation) {
      if (!validateCoords(viewingLocation.lat, viewingLocation.lon)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid viewing location coordinates",
          },
          { status: 400 }
        );
      }
    }

    // Calculate visibility with provided weather data and optional custom location
    const visibility = calculateVisibility(
      launchTime,
      missionName || "Unknown Mission",
      weatherLaunchSite || null,
      weatherViewing || null,
      viewingLocation || undefined,
      siteId || "vandenberg"
    );

    return NextResponse.json({
      success: true,
      data: visibility,
    });
  } catch (error) {
    console.error("Failed to calculate visibility:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to calculate visibility",
      },
      { status: 500 }
    );
  }
}
