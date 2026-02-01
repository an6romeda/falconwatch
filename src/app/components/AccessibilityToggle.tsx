"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccessibility } from "../contexts/AccessibilityContext";

export default function AccessibilityToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const { settings, toggleHighContrast, setFontSize, toggleReducedMotion } =
    useAccessibility();

  return (
    <div className="relative">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg hover:bg-nasa-blue/20 transition-colors"
        aria-label="Accessibility settings"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg
          className="w-5 h-5 text-off-white/70"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for closing */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 top-full mt-2 w-64 bg-space-navy/95 border border-nasa-blue/40 rounded-lg shadow-xl z-50 backdrop-blur-sm"
              role="menu"
              aria-label="Accessibility options"
            >
              <div className="p-3 border-b border-nasa-blue/30">
                <h4 className="text-xs font-mono uppercase tracking-wider text-off-white/60">
                  Accessibility
                </h4>
              </div>

              <div className="p-3 space-y-4">
                {/* High Contrast Toggle */}
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="high-contrast"
                    className="text-sm text-off-white"
                  >
                    High Contrast
                  </label>
                  <button
                    id="high-contrast"
                    role="switch"
                    aria-checked={settings.highContrast}
                    onClick={toggleHighContrast}
                    className={`
                      relative w-11 h-6 rounded-full transition-colors
                      ${settings.highContrast ? "bg-mission-green" : "bg-nasa-blue/30"}
                    `}
                  >
                    <span
                      className={`
                        absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform
                        ${settings.highContrast ? "translate-x-5" : "translate-x-0"}
                      `}
                    />
                    <span className="sr-only">
                      {settings.highContrast ? "Enabled" : "Disabled"}
                    </span>
                  </button>
                </div>

                {/* Font Size */}
                <div>
                  <label className="block text-sm text-off-white mb-2">
                    Font Size
                  </label>
                  <div className="flex gap-2" role="radiogroup" aria-label="Font size">
                    {(["normal", "large", "x-large"] as const).map((size) => (
                      <button
                        key={size}
                        role="radio"
                        aria-checked={settings.fontSize === size}
                        onClick={() => setFontSize(size)}
                        className={`
                          flex-1 px-3 py-2 text-xs rounded border transition-colors
                          ${
                            settings.fontSize === size
                              ? "border-retro-orange bg-retro-orange/20 text-off-white"
                              : "border-nasa-blue/30 text-off-white/60 hover:border-nasa-blue/50"
                          }
                        `}
                      >
                        {size === "normal" ? "A" : size === "large" ? "A+" : "A++"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reduced Motion Toggle */}
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="reduced-motion"
                    className="text-sm text-off-white"
                  >
                    Reduce Motion
                  </label>
                  <button
                    id="reduced-motion"
                    role="switch"
                    aria-checked={settings.reducedMotion}
                    onClick={toggleReducedMotion}
                    className={`
                      relative w-11 h-6 rounded-full transition-colors
                      ${settings.reducedMotion ? "bg-mission-green" : "bg-nasa-blue/30"}
                    `}
                  >
                    <span
                      className={`
                        absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform
                        ${settings.reducedMotion ? "translate-x-5" : "translate-x-0"}
                      `}
                    />
                    <span className="sr-only">
                      {settings.reducedMotion ? "Enabled" : "Disabled"}
                    </span>
                  </button>
                </div>
              </div>

              <div className="p-3 border-t border-nasa-blue/30">
                <p className="text-xs text-off-white/40">
                  Settings are saved locally
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
