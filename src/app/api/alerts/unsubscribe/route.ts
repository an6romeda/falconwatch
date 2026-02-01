import { NextRequest, NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/supabaseStore";
import { checkRateLimit } from "@/lib/rateLimit";

/**
 * Generate an HTML confirmation page instead of auto-unsubscribing.
 * This prevents email prefetchers, link scanners, and browser extensions
 * from accidentally unsubscribing users via GET requests.
 */
function generateConfirmationPage(
  token: string | null,
  status: "confirm" | "success" | "invalid" | "notfound"
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
      background: linear-gradient(180deg, rgba(239,68,68,0.9) 0%, rgba(239,68,68,0.7) 100%);
    }
    .btn:hover { opacity: 0.9; }
    .success { color: #00FF41; }
    .error { color: #FF6B35; }
    a { color: #0B3D91; }
  `;

  let content: string;

  switch (status) {
    case "confirm":
      content = `
        <h2>Unsubscribe from Launch Alerts?</h2>
        <p>Click the button below to confirm. Your email and all associated data will be permanently deleted.</p>
        <form method="POST" action="/api/alerts/unsubscribe?token=${token}" style="margin-top: 24px;">
          <button type="submit" class="btn">Confirm Unsubscribe</button>
        </form>
        <p style="margin-top: 24px;"><a href="/">Cancel and return to FalconWatch</a></p>
      `;
      break;
    case "success":
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
        <p>This unsubscribe link is invalid or malformed.</p>
        <p style="margin-top: 24px;"><a href="/">Return to FalconWatch</a></p>
      `;
      break;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unsubscribe - FalconWatch</title>
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

/**
 * DELETE /api/alerts/unsubscribe?token=xxx
 * Programmatic unsubscribe (used by frontend JS)
 */
export async function DELETE(request: NextRequest) {
  const rateCheck = checkRateLimit(request, 10, 60_000);
  if (!rateCheck.allowed) return rateCheck.response!;

  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Unsubscribe token is required" },
        { status: 400 }
      );
    }

    if (!/^[a-f0-9]{64}$/.test(token)) {
      return NextResponse.json(
        { success: false, error: "Invalid unsubscribe token format" },
        { status: 400 }
      );
    }

    const success = await unsubscribeByToken(token);

    if (!success) {
      return NextResponse.json(
        { success: false, error: "Subscription not found or already removed" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Successfully unsubscribed. Your data has been permanently deleted.",
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return NextResponse.json(
      { success: false, error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/alerts/unsubscribe?token=xxx
 * Unsubscribes immediately and shows confirmation.
 */
export async function GET(request: NextRequest) {
  const rateCheck = checkRateLimit(request, 10, 60_000);
  if (!rateCheck.allowed) return rateCheck.response!;

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return new NextResponse(generateConfirmationPage(null, "invalid"), {
      headers: { "Content-Type": "text/html" },
    });
  }

  const success = await unsubscribeByToken(token);

  if (success) {
    return new NextResponse(generateConfirmationPage(token, "success"), {
      headers: { "Content-Type": "text/html" },
    });
  } else {
    return new NextResponse(generateConfirmationPage(token, "notfound"), {
      headers: { "Content-Type": "text/html" },
    });
  }
}

/**
 * POST /api/alerts/unsubscribe?token=xxx
 * Handles the actual unsubscribe from the confirmation form.
 * Returns an HTML result page.
 */
export async function POST(request: NextRequest) {
  const rateCheck = checkRateLimit(request, 10, 60_000);
  if (!rateCheck.allowed) return rateCheck.response!;

  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    return new NextResponse(generateConfirmationPage(null, "invalid"), {
      headers: { "Content-Type": "text/html" },
    });
  }

  const success = await unsubscribeByToken(token);

  if (success) {
    return new NextResponse(generateConfirmationPage(token, "success"), {
      headers: { "Content-Type": "text/html" },
    });
  } else {
    return new NextResponse(generateConfirmationPage(token, "notfound"), {
      headers: { "Content-Type": "text/html" },
    });
  }
}
