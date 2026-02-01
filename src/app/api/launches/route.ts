import { NextRequest, NextResponse } from "next/server";
import {
  getUpcomingLaunches,
  getUpcomingLaunchesAllSites,
  getPastLaunches,
  type EnrichedLaunch,
} from "@/lib/spacex";
import { checkRateLimit } from "@/lib/rateLimit";

export const revalidate = 300; // Revalidate every 5 minutes

export async function GET(request: NextRequest) {
  // Rate limit: 60 requests per minute per IP
  const rateCheck = checkRateLimit(request, 60, 60_000);
  if (!rateCheck.allowed) return rateCheck.response!;

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "upcoming";
  const site = searchParams.get("site") || "all";

  try {
    let launches: EnrichedLaunch[];

    if (type === "past") {
      launches = await getPastLaunches(site === "all" ? undefined : site, 10);
    } else {
      if (site === "all") {
        launches = await getUpcomingLaunchesAllSites();
      } else {
        launches = await getUpcomingLaunches(site);
      }
    }

    return NextResponse.json({
      success: true,
      data: launches,
      count: launches.length,
      type,
      site,
      source: "Launch Library 2 (The Space Devs)",
    });
  } catch (error) {
    console.error("Failed to fetch launches:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch launch data",
        data: [],
      },
      { status: 500 }
    );
  }
}
