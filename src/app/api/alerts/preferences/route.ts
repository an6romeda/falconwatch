import { NextRequest, NextResponse } from "next/server";
import { getSubscriptionByToken, updateSubscriptionByToken, unsubscribeByToken } from "@/lib/supabaseStore";
import { checkRateLimit } from "@/lib/rateLimit";
import { LAUNCH_SITES } from "@/lib/launchSites";

const VALID_SITE_IDS = Object.keys(LAUNCH_SITES);

const SITE_LABELS: Record<string, string> = {
  vandenberg: "Vandenberg",
  "cape-canaveral": "Cape Canaveral",
  "boca-chica": "Starbase",
};

function generatePreferencesPage(
  token: string | null,
  status: "form" | "success" | "invalid" | "notfound" | "unsubscribed",
  currentSites?: string[] | null
): string {
  const baseStyle = `
    body {
      margin: 0; padding: 0;
      background-color: #0a0e1a; color: #E8E8E8;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
    }
    .container { text-align: center; max-width: 420px; padding: 40px 20px; }
    h1 { color: #FF6B35; font-size: 28px; letter-spacing: 2px; margin-bottom: 8px; }
    .subtitle { color: #E8E8E8; opacity: 0.5; font-size: 13px; margin-bottom: 32px; }
    p { line-height: 1.6; opacity: 0.8; }
    .btn {
      display: inline-block; padding: 14px 32px; border: none; border-radius: 6px;
      font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;
      cursor: pointer; text-decoration: none; color: #FFFFFF;
      background: linear-gradient(180deg, rgba(255,107,53,0.9) 0%, rgba(255,107,53,0.7) 100%);
    }
    .btn:hover { opacity: 0.9; }
    .btn-danger {
      background: linear-gradient(180deg, rgba(239,68,68,0.9) 0%, rgba(239,68,68,0.7) 100%);
      font-size: 12px; padding: 10px 20px; margin-top: 16px;
    }
    .success { color: #00FF41; }
    .error { color: #FF6B35; }
    a { color: #0B3D91; }
    .site-grid { display: flex; flex-direction: column; gap: 10px; margin: 24px 0; text-align: left; }
    .site-label {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      border: 1px solid rgba(11, 61, 145, 0.4); border-radius: 8px;
      cursor: pointer; transition: border-color 0.2s, background 0.2s;
    }
    .site-label:hover { border-color: rgba(255, 107, 53, 0.5); }
    .site-label input { width: 18px; height: 18px; accent-color: #FF6B35; cursor: pointer; }
    .site-label span { font-size: 15px; }
    .warning { color: #FF6B35; font-size: 13px; margin-top: 8px; display: none; }
  `;

  let content: string;

  switch (status) {
    case "form": {
      const sites = currentSites || [];
      const checkboxes = VALID_SITE_IDS.map((id) => {
        const checked = sites.includes(id) ? "checked" : "";
        const label = SITE_LABELS[id] || id;
        return `
          <label class="site-label">
            <input type="checkbox" name="sites" value="${id}" ${checked}>
            <span>${label}</span>
          </label>`;
      }).join("");

      content = `
        <h2>Manage Alert Preferences</h2>
        <p>Select which launch sites you want to receive alerts for.</p>
        <form method="POST" action="/api/alerts/preferences?token=${token}" id="pref-form">
          <div class="site-grid">
            ${checkboxes}
          </div>
          <p class="warning" id="warning">Please select at least one site, or unsubscribe below.</p>
          <button type="submit" class="btn">Save Preferences</button>
        </form>
        <form method="POST" action="/api/alerts/preferences?token=${token}&action=unsubscribe" style="margin-top: 24px;">
          <button type="submit" class="btn btn-danger">Unsubscribe from All</button>
        </form>
        <p style="margin-top: 24px;"><a href="/">Return to FalconWatch</a></p>
        <script>
          document.getElementById('pref-form').addEventListener('submit', function(e) {
            var checked = document.querySelectorAll('input[name="sites"]:checked');
            if (checked.length === 0) {
              e.preventDefault();
              document.getElementById('warning').style.display = 'block';
            }
          });
        </script>
      `;
      break;
    }
    case "success":
      content = `
        <h2 class="success">Preferences Updated</h2>
        <p>Your launch alert preferences have been saved.</p>
        <p style="margin-top: 24px;"><a href="/">Return to FalconWatch</a></p>
      `;
      break;
    case "unsubscribed":
      content = `
        <h2 class="success">Unsubscribed</h2>
        <p>You won&rsquo;t receive any more launch alerts.</p>
        <p style="margin-top: 24px;"><a href="/">Return to FalconWatch</a></p>
      `;
      break;
    case "notfound":
      content = `
        <h2 class="error">Not Found</h2>
        <p>This subscription was not found or was already removed.</p>
        <p style="margin-top: 24px;"><a href="/">Return to FalconWatch</a></p>
      `;
      break;
    case "invalid":
      content = `
        <h2 class="error">Invalid Link</h2>
        <p>This preferences link is invalid or malformed.</p>
        <p style="margin-top: 24px;"><a href="/">Return to FalconWatch</a></p>
      `;
      break;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Manage Preferences - FalconWatch</title>
  <style>${baseStyle}</style>
</head>
<body>
  <div class="container">
    <h1>FALCONWATCH</h1>
    <p class="subtitle">LAUNCH ALERTS</p>
    ${content}
  </div>
</body>
</html>`;
}

function htmlResponse(html: string, status = 200): NextResponse {
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html" },
  });
}

/**
 * GET /api/alerts/preferences?token=xxx
 * Show current site preferences as a toggleable form
 */
export async function GET(request: NextRequest) {
  const rateCheck = checkRateLimit(request, 10, 60_000);
  if (!rateCheck.allowed) return rateCheck.response!;

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return htmlResponse(generatePreferencesPage(null, "invalid"));
  }

  const subscription = await getSubscriptionByToken(token);
  if (!subscription) {
    return htmlResponse(generatePreferencesPage(token, "notfound"));
  }

  return htmlResponse(generatePreferencesPage(token, "form", subscription.siteIds));
}

/**
 * POST /api/alerts/preferences?token=xxx
 * Update site preferences from the form, or unsubscribe if action=unsubscribe
 */
export async function POST(request: NextRequest) {
  const rateCheck = checkRateLimit(request, 10, 60_000);
  if (!rateCheck.allowed) return rateCheck.response!;

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const action = searchParams.get("action");

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return htmlResponse(generatePreferencesPage(null, "invalid"));
  }

  // Handle unsubscribe action
  if (action === "unsubscribe") {
    const success = await unsubscribeByToken(token);
    return htmlResponse(
      generatePreferencesPage(token, success ? "unsubscribed" : "notfound")
    );
  }

  // Parse form body for selected sites
  const formData = await request.formData();
  const selectedSites = formData.getAll("sites").map(String).filter((id) => VALID_SITE_IDS.includes(id));

  if (selectedSites.length === 0) {
    // Re-show form with current data — shouldn't happen due to client validation
    const subscription = await getSubscriptionByToken(token);
    return htmlResponse(generatePreferencesPage(token, "form", subscription?.siteIds));
  }

  const updated = await updateSubscriptionByToken(token, selectedSites);
  if (!updated) {
    return htmlResponse(generatePreferencesPage(token, "notfound"));
  }

  return htmlResponse(generatePreferencesPage(token, "success"));
}
