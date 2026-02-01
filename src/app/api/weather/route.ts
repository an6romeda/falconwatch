import { NextRequest, NextResponse } from "next/server";
import {
  getAllWeather,
  getWeather,
  getWeatherForecast,
  getWeatherForCoords,
  type LocationKey,
} from "@/lib/weather";
import { checkRateLimit } from "@/lib/rateLimit";
import { validateCoords } from "@/lib/security";

export const revalidate = 600; // Revalidate every 10 minutes

export async function GET(request: NextRequest) {
  // Rate limit: 60 requests per minute per IP
  const rateCheck = checkRateLimit(request, 60, 60_000);
  if (!rateCheck.allowed) return rateCheck.response!;

  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location") as LocationKey | null;
  const site = searchParams.get("site") as LocationKey | null;
  const forecast = searchParams.get("forecast");
  const timestamp = searchParams.get("timestamp");

  // Custom location parameters
  const customLat = searchParams.get("lat");
  const customLon = searchParams.get("lon");
  const customName = searchParams.get("name");

  try {
    // If requesting weather for custom coordinates
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

      const customWeather = await getWeatherForCoords(
        lat,
        lon,
        customName || "Custom Location"
      );

      return NextResponse.json({
        success: true,
        data: customWeather,
        type: "custom",
      });
    }

    // If requesting weather for a specific launch site
    if (site) {
      const siteWeather = await getWeather(site);
      return NextResponse.json({
        success: true,
        data: siteWeather,
        type: "site",
        site,
      });
    }

    // If requesting forecast for a specific time
    if (forecast && location && timestamp) {
      const targetTimestamp = parseInt(timestamp, 10);
      if (isNaN(targetTimestamp)) {
        return NextResponse.json(
          { success: false, error: "Invalid timestamp" },
          { status: 400 }
        );
      }

      const forecastData = await getWeatherForecast(location, targetTimestamp);

      return NextResponse.json({
        success: true,
        data: forecastData,
        type: "forecast",
      });
    }

    // Get current weather for launch site + default viewer location
    // Use the site param to determine which launch site, defaults to vandenberg
    const siteKey: LocationKey = (searchParams.get("launchSite") as LocationKey) || "vandenberg";
    const weather = await getAllWeather(siteKey);

    return NextResponse.json({
      success: true,
      data: weather,
    });
  } catch (error) {
    console.error("Failed to fetch weather:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch weather data",
        data: { launchSite: null, phoenix: null },
      },
      { status: 500 }
    );
  }
}
