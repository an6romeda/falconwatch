import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSubscription, isSubscribed, updateSubscriptionSites } from "@/lib/supabaseStore";
import { checkRateLimit } from "@/lib/rateLimit";

// Validation schema
const subscribeSchema = z.object({
  email: z.string().email("Invalid email address"),
  reminderMinutes: z.number().int().min(5).max(1440), // 5 min to 24 hours
  launchId: z.string().nullable().optional(),
  siteIds: z
    .array(z.enum(["vandenberg", "cape-canaveral", "boca-chica"]))
    .min(1)
    .optional(),
});

export async function POST(request: NextRequest) {
  // Rate limit: 5 subscribe attempts per minute per IP
  const rateCheck = checkRateLimit(request, 5, 60_000);
  if (!rateCheck.allowed) return rateCheck.response!;

  try {
    const body = await request.json();

    // Validate input
    const result = subscribeSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid input. Please check your email and try again.",
        },
        { status: 400 }
      );
    }

    const { email, reminderMinutes, launchId, siteIds } = result.data;

    // Check if already subscribed — update preferences instead of rejecting
    const alreadySubscribed = await isSubscribed(email);
    if (alreadySubscribed) {
      if (siteIds) {
        const updated = await updateSubscriptionSites(email, siteIds);
        if (!updated) {
          return NextResponse.json(
            { success: false, error: "Failed to update preferences. Please try again." },
            { status: 500 }
          );
        }
        return NextResponse.json({
          success: true,
          updated: true,
          message: "Preferences updated",
        });
      }
      return NextResponse.json({
        success: true,
        updated: true,
        message: "Already subscribed",
      });
    }

    // Create subscription
    const { success } = await createSubscription(
      email,
      reminderMinutes,
      launchId || null,
      siteIds || null
    );

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create subscription. Please try again.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      updated: false,
      message: "Successfully subscribed to launch alerts",
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
