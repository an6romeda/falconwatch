import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Statement | FalconWatch",
  description: "How FalconWatch handles your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-space-navy">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-off-white/50 hover:text-off-white transition-colors mb-12"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to FalconWatch
        </a>

        <h1
          className="text-2xl font-bold tracking-widest text-retro-orange mb-2"
          style={{ fontFamily: "var(--font-orbitron)" }}
        >
          PRIVACY STATEMENT
        </h1>
        <div className="space-y-8 text-off-white/80 text-[15px] leading-relaxed">
          <p className="text-off-white/30">
            Last updated February 2026
          </p>

          <p>
            FalconWatch exists to track rockets, not you. We don&apos;t use
            cookies, analytics, or tracking, and we never sell or share your
            data. Here&apos;s what we do collect and why.
          </p>

          <section>
            <h2 className="text-sm font-mono uppercase tracking-widest text-off-white mb-3">
              Your preferences
            </h2>
            <p>
              Settings like your viewing location and accessibility preferences
              are saved in your browser&apos;s local storage so the site
              remembers them between visits. This data stays on your device.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-mono uppercase tracking-widest text-off-white mb-3">
              Location searches
            </h2>
            <p>
              If you search for a location or share your current position,
              the query is sent through our server to a geocoding service to
              find your coordinates. We don&apos;t store your searches.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-mono uppercase tracking-widest text-off-white mb-3">
              Visibility and weather
            </h2>
            <p>
              If you share a viewing location, those coordinates are sent
              through our server to <strong>Open-Meteo</strong> to pull weather
              data for your visibility prediction. We don&apos;t store
              your coordinates.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-mono uppercase tracking-widest text-off-white mb-3">
              Email alerts
            </h2>
            <p>
              If you subscribe, we collect your email address to send you
              launch alerts. Your email is stored encrypted in our database.
              You can update which launch sites you receive alerts for at any
              time via the &ldquo;Manage Preferences&rdquo; link in any alert
              email, or by re-subscribing with the same email. When you
              unsubscribe, your data is permanently deleted from our database.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-mono uppercase tracking-widest text-off-white mb-3">
              Third-party services
            </h2>
            <p>
              External services FalconWatch uses and what data they receive.
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 text-off-white/70">
              <li>
                <strong>Open-Meteo</strong> &mdash; receives city search
                queries and coordinates through our server to provide weather
                forecasts and geocoding
              </li>
              <li>
                <strong>Zippopotam.us</strong> &mdash; receives ZIP codes
                through our server to resolve them to coordinates
              </li>
              <li>
                <strong>OpenStreetMap</strong> &mdash; receives coordinates
                through our server for reverse geocoding; map tiles load
                directly from your browser to render the visibility map
              </li>
              <li>
                <strong>Resend</strong> &mdash; delivers launch alert emails
                and stores your email address
              </li>
              <li>
                <strong>Supabase</strong> &mdash; hosts the database where
                encrypted email subscriptions are stored
              </li>
              <li>
                <strong>Vercel</strong> &mdash; hosts the application and
                may retain standard server logs
              </li>
            </ul>
          </section>

          <p className="text-off-white/50 pt-2">
            Questions about this statement? Reach out on{" "}
            <a
              href="https://github.com/an6romeda/falconwatch"
              target="_blank"
              rel="noopener noreferrer"
              className="text-nasa-blue hover:text-nasa-blue/80 transition-colors"
            >
              GitHub
            </a>.
          </p>
        </div>
      </div>
    </div>
  );
}
