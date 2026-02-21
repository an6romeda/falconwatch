import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getAllActiveSubscriptions, updateLastNotified } from "@/lib/supabaseStore";
import { getUpcomingLaunchesAllSites } from "@/lib/spacex";
import { LAUNCH_SITES } from "@/lib/launchSites";
import { timingSafeEqual } from "@/lib/security";

// Lazy initialization to avoid build-time errors
let resendInstance: Resend | null = null;
function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

// Vercel Cron configuration
export const runtime = "edge";
export const maxDuration = 60;

interface Launch {
  id: string;
  name: string;
  date_utc: string;
  date_unix: number;
  siteId?: string;
}

/**
 * Check if a launch is within the reminder window
 * For daily cron with 24hr reminder: check if launch is 12-36 hours away
 */
function isWithinReminderWindow(
  launchTime: number,
  reminderMinutes: number
): boolean {
  const now = Date.now();
  const launchMs = launchTime * 1000;
  const hoursUntilLaunch = (launchMs - now) / (1000 * 60 * 60);

  // For 24-hour reminder (1440 min), check if launch is 12-36 hours away
  // This gives a wide window for the daily cron to catch it
  const reminderHours = reminderMinutes / 60;
  const windowStart = reminderHours - 12; // 12 hours before reminder time
  const windowEnd = reminderHours + 12;   // 12 hours after reminder time

  return hoursUntilLaunch >= windowStart && hoursUntilLaunch <= windowEnd;
}

/**
 * Format launch time for email
 */
function formatLaunchTime(dateUtc: string): string {
  const date = new Date(dateUtc);
  return date.toLocaleString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

const SITE_VIEWING_TIPS: Record<string, string> = {
  vandenberg: "unobstructed view to the south",
  "cape-canaveral": "unobstructed view to the east-northeast",
  "boca-chica": "unobstructed view to the east",
};

/**
 * Generate email HTML
 */
function generateEmailHtml(
  launch: Launch,
  unsubscribeToken: string,
  baseUrl: string,
  siteId: string
): string {
  const unsubscribeUrl = `${baseUrl}/api/alerts/unsubscribe?token=${unsubscribeToken}`;
  const preferencesUrl = `${baseUrl}/api/alerts/preferences?token=${unsubscribeToken}`;
  const site = LAUNCH_SITES[siteId];
  const siteName = site?.name || "Unknown Site";
  const viewingDirection = SITE_VIEWING_TIPS[siteId] || "unobstructed view of the sky";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Launch Alert - ${launch.name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0e1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td style="padding: 30px; background: linear-gradient(135deg, rgba(11, 61, 145, 0.3) 0%, rgba(10, 14, 26, 0.9) 100%); border: 1px solid rgba(11, 61, 145, 0.4); border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #FF6B35; font-size: 28px; font-weight: bold; letter-spacing: 2px;">
                FALCONWATCH
              </h1>
              <p style="margin: 10px 0 0; color: #E8E8E8; font-size: 14px; opacity: 0.7;">
                LAUNCH ALERT
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 40px 30px; background: rgba(10, 14, 26, 0.95); border-left: 1px solid rgba(11, 61, 145, 0.4); border-right: 1px solid rgba(11, 61, 145, 0.4);">
              <h2 style="margin: 0 0 20px; color: #00FF41; font-size: 18px; text-transform: uppercase; letter-spacing: 1px;">
                Launching Tomorrow
              </h2>

              <h3 style="margin: 0 0 10px; color: #E8E8E8; font-size: 24px; font-weight: bold;">
                ${launch.name}
              </h3>

              <p style="margin: 0 0 5px; color: #E8E8E8; font-size: 14px; opacity: 0.6; text-transform: uppercase; letter-spacing: 1px;">
                from ${siteName}
              </p>

              <p style="margin: 0 0 30px; color: #E8E8E8; font-size: 16px; opacity: 0.8;">
                Scheduled: ${formatLaunchTime(launch.date_utc)}
              </p>

              <a href="https://falconwatch.app" style="display: inline-block; padding: 15px 30px; background: linear-gradient(180deg, rgba(255, 107, 53, 0.9) 0%, rgba(255, 107, 53, 0.7) 100%); color: #FFFFFF; text-decoration: none; border-radius: 6px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; font-size: 14px;">
                View Launch Details
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 30px; background: rgba(10, 14, 26, 0.95); border: 1px solid rgba(11, 61, 145, 0.4); border-radius: 0 0 12px 12px; text-align: center;">
              <p style="margin: 0 0 10px; color: #E8E8E8; font-size: 12px; opacity: 0.5;">
                You received this email because you subscribed to FalconWatch launch alerts.
              </p>
              <a href="${preferencesUrl}" style="color: #0B3D91; font-size: 12px; text-decoration: underline;">
                Manage Preferences
              </a>
              <span style="color: #E8E8E8; opacity: 0.3; margin: 0 8px;">|</span>
              <a href="${unsubscribeUrl}" style="color: #0B3D91; font-size: 12px; text-decoration: underline;">
                Unsubscribe
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export async function GET(request: NextRequest) {
  // Verify cron secret with constant-time comparison to prevent timing attacks
  const authHeader = request.headers.get("authorization") || "";
  const expectedAuth = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || !timingSafeEqual(authHeader, expectedAuth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get upcoming launches from all sites
    const launches = await getUpcomingLaunchesAllSites();
    if (!launches || launches.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No upcoming launches",
        emailsSent: 0,
      });
    }

    // Get all subscriptions
    const subscriptions = await getAllActiveSubscriptions();
    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No active subscriptions",
        emailsSent: 0,
      });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://falconwatch.app";
    let emailsSent = 0;
    const errors: string[] = [];
    // Check each launch against each subscription
    for (const launch of launches) {

      const launchSiteId = launch.siteId || "vandenberg";
      const site = LAUNCH_SITES[launchSiteId];
      const siteName = site?.shortName || launchSiteId;

      for (const subscription of subscriptions) {
        // Skip if subscription is for a specific launch and doesn't match
        if (subscription.launchId && subscription.launchId !== launch.id) {
          continue;
        }

        // Skip if subscriber has site preferences and this launch doesn't match
        if (subscription.siteIds && !subscription.siteIds.includes(launchSiteId)) {
          continue;
        }

        // Skip if already notified in the last 20 hours (avoid duplicate emails)
        if (subscription.lastNotifiedAt) {
          const hoursSinceNotified = (Date.now() - subscription.lastNotifiedAt.getTime()) / (1000 * 60 * 60);
          if (hoursSinceNotified < 20) {
            continue;
          }
        }

        // Check if within reminder window
        if (isWithinReminderWindow(launch.date_unix, subscription.reminderMinutes)) {
          try {
            const { error: sendError } = await getResend().emails.send({
              from: "FalconWatch <alerts@falconwatch.app>",
              to: subscription.email,
              subject: `Launch Tomorrow from ${siteName}: ${launch.name}`,
              html: generateEmailHtml(
                launch,
                subscription.unsubscribeToken,
                baseUrl,
                launchSiteId
              ),
            });
            if (sendError) {
              console.error(`Resend error:`, sendError);
              errors.push(`Failed to send to one subscriber: ${sendError.message}`);
            } else {
              // Track when we last notified this subscriber
              await updateLastNotified(subscription.id);
              emailsSent++;
              // Pace sends to stay under Resend rate limit (2/sec)
              await new Promise((r) => setTimeout(r, 600));
            }
          } catch (emailError) {
            console.error(`Failed to send email to subscription:`, emailError);
            errors.push(`Failed to send to one subscriber`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${launches.length} launches, ${subscriptions.length} subscriptions`,
      emailsSent,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Cron job error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process alerts",
      },
      { status: 500 }
    );
  }
}
