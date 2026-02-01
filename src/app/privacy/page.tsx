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
          <p>
            FalconWatch exists to track rockets, not you. Here&apos;s what
            happens with data when you use the site.
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
              If you search for a city or ZIP code, that query is sent through
              our server to a geocoding service (<strong>Open-Meteo</strong> for
              city names, <strong>Zippopotam.us</strong> for ZIP codes) so we can
              find the coordinates. If you use &ldquo;use my current
              location,&rdquo; your browser asks permission first, then sends the
              coordinates through our server to{" "}
              <strong>OpenStreetMap Nominatim</strong> to resolve a city name.
              We proxy these requests so those services see the query but not
              your IP address. We don&apos;t store any searches.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-mono uppercase tracking-widest text-off-white mb-3">
              Visibility and weather
            </h2>
            <p>
              If you share a viewing location, those coordinates are sent
              through our server to <strong>Open-Meteo</strong> to pull weather
              data for your visibility prediction. The coordinates are not stored
              but may appear briefly in server logs maintained by our
              host (Vercel).
            </p>
          </section>

          <section>
            <h2 className="text-sm font-mono uppercase tracking-widest text-off-white mb-3">
              Email alerts
            </h2>
            <p>
              If you subscribe, your email is encrypted (AES-256-GCM) before
              storage and only decrypted to send you a launch notification
              through <strong>Resend</strong>. When you unsubscribe, your data
              is permanently deleted.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-mono uppercase tracking-widest text-off-white mb-3">
              The trajectory map
            </h2>
            <p>
              Map tiles load directly from{" "}
              <strong>OpenStreetMap</strong> tile servers to render the map. On
              first visit, this shows the launch site area. If you&apos;ve
              shared a viewing location, the map adjusts to show both areas.
              See{" "}
              <a
                href="https://wiki.osmfoundation.org/wiki/Privacy_Policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-nasa-blue hover:text-nasa-blue/80 transition-colors"
              >
                OpenStreetMap&apos;s privacy policy
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-sm font-mono uppercase tracking-widest text-off-white mb-3">
              Third-party services
            </h2>
            <p>
              Every external service FalconWatch talks to, and why. All
              connections use HTTPS.
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
                directly from your browser to render the trajectory map
              </li>
              <li>
                <strong>The Space Devs</strong> &mdash; provides launch
                schedule data; no user data is sent
              </li>
              <li>
                <strong>Resend</strong> &mdash; receives your email address
                at the moment of sending a launch alert
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

          <p className="text-sm text-off-white/50 pt-2">
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

          <p className="text-xs text-off-white/30 pt-4">
            Last updated February 2026
          </p>
        </div>
      </div>
    </div>
  );
}
