"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SITE_OPTIONS = [
  { id: "vandenberg", label: "Vandenberg" },
  { id: "cape-canaveral", label: "Cape Canaveral" },
  { id: "boca-chica", label: "Starbase" },
] as const;

interface EmailSubscribeProps {
  compact?: boolean;
}

export default function EmailSubscribe({ compact = false }: EmailSubscribeProps) {
  const [email, setEmail] = useState("");
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const toggleSite = (siteId: string) => {
    setSelectedSites((prev) =>
      prev.includes(siteId)
        ? prev.filter((s) => s !== siteId)
        : [...prev, siteId]
    );
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!validateEmail(email)) {
      setErrorMessage("Please enter a valid email address");
      return;
    }

    if (selectedSites.length === 0) {
      setErrorMessage("Please select at least one launch site");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/alerts/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          reminderMinutes: 1440, // 24 hours before launch
          launchId: null, // Subscribe to all launches
          siteIds: selectedSites,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus("error");
        setErrorMessage(data.error || "Failed to subscribe. Please try again.");
      }
    } catch (error) {
      setStatus("error");
      setErrorMessage("Network error. Please check your connection.");
    }
  };

  if (compact) {
    return (
      <div className="retro-panel p-5 h-full flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-retro-orange blink" />
          <h3 className="font-mono text-sm uppercase tracking-widest text-off-white">
            Email Alerts
          </h3>
        </div>

        <AnimatePresence mode="wait">
          {status === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-2"
            >
              <div className="flex items-center justify-center gap-2 text-mission-green">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm">Subscribed!</span>
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onSubmit={handleSubmit}
              className="space-y-2"
            >
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="retro-input flex-1 text-sm py-2"
                  disabled={status === "loading"}
                  aria-label="Email address for launch alerts"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="retro-button-orange px-4 py-2 text-sm disabled:opacity-50"
                >
                  {status === "loading" ? "..." : "Subscribe"}
                </button>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {SITE_OPTIONS.map((site) => (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => toggleSite(site.id)}
                    className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border rounded transition-colors cursor-pointer ${
                      selectedSites.includes(site.id)
                        ? "border-retro-orange/60 bg-retro-orange/20 text-retro-orange"
                        : "border-off-white/20 bg-transparent text-off-white/40"
                    }`}
                  >
                    {site.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-off-white/30 text-center">
                By clicking Subscribe, you agree to our{" "}
                <a href="/privacy" className="text-nasa-blue/60 hover:text-nasa-blue transition-colors">
                  Privacy Statement
                </a>.
              </p>
            </motion.form>
          )}
        </AnimatePresence>

        {errorMessage && (
          <p className="text-xs text-retro-orange mt-2">{errorMessage}</p>
        )}
      </div>
    );
  }

  // Full version
  return (
    <div className="retro-panel p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 rounded-full bg-retro-orange blink" />
        <h3 className="font-mono text-sm uppercase tracking-widest text-off-white">
          Email Launch Alerts
        </h3>
      </div>

      <p className="text-sm text-off-white/70 mb-3">
        Get notified before SpaceX launches.
      </p>

      <AnimatePresence mode="wait">
        {status === "success" ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="text-center py-4"
          >
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-mission-green/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-mission-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 className="text-lg font-mono text-mission-green mb-2">Successfully Subscribed!</h4>
            <p className="text-sm text-off-white/60">
              You&apos;ll receive an email before launches from{" "}
              {selectedSites
                .map((id) => SITE_OPTIONS.find((s) => s.id === id)?.label)
                .filter(Boolean)
                .join(", ")}
              .
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="mt-4 text-sm text-nasa-blue hover:text-nasa-blue/80 transition-colors"
            >
              Subscribe another email
            </button>
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onSubmit={handleSubmit}
            className="space-y-3"
          >
            <div>
              <label htmlFor="email" className="block text-xs font-mono uppercase tracking-wider text-off-white/60 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="retro-input w-full"
                disabled={status === "loading"}
                required
                aria-describedby={errorMessage ? "email-error" : undefined}
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-off-white/60 mb-1.5">
                Launch Sites
              </label>
              <div className="flex gap-2 flex-wrap">
                {SITE_OPTIONS.map((site) => (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => toggleSite(site.id)}
                    className={`px-3 py-1.5 text-xs font-mono uppercase tracking-wider border rounded transition-colors cursor-pointer ${
                      selectedSites.includes(site.id)
                        ? "border-retro-orange/60 bg-retro-orange/20 text-retro-orange"
                        : "border-off-white/20 bg-transparent text-off-white/40"
                    }`}
                  >
                    {site.label}
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && (
              <p id="email-error" className="text-sm text-retro-orange" role="alert">
                {errorMessage}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "loading"}
              className="retro-button-orange w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {status === "loading" ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Subscribing...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Subscribe</span>
                </>
              )}
            </button>

            <p className="text-xs text-off-white/40 text-center">
              By clicking Subscribe, you agree to our{" "}
              <a href="/privacy" className="text-nasa-blue/60 hover:text-nasa-blue transition-colors">
                Privacy Statement
              </a>. Unsubscribe anytime.
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
