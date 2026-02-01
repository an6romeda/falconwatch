"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface AccessibilitySettings {
  highContrast: boolean;
  fontSize: "normal" | "large" | "x-large";
  reducedMotion: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  toggleHighContrast: () => void;
  setFontSize: (size: "normal" | "large" | "x-large") => void;
  toggleReducedMotion: () => void;
}

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  fontSize: "normal",
  reducedMotion: false,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(
  undefined
);

const STORAGE_KEY = "falconwatch_accessibility";

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as AccessibilitySettings;
          setSettings(parsed);
        } catch (e) {
          // Use defaults
        }
      }

      // Check for system preference for reduced motion
      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (prefersReducedMotion) {
        setSettings((prev) => ({ ...prev, reducedMotion: true }));
      }

      setIsInitialized(true);
    }
  }, []);

  // Apply settings to DOM
  useEffect(() => {
    if (!isInitialized) return;

    const body = document.body;

    // High contrast mode
    if (settings.highContrast) {
      body.classList.add("high-contrast");
    } else {
      body.classList.remove("high-contrast");
    }

    // Font size
    body.classList.remove("font-large", "font-x-large");
    if (settings.fontSize === "large") {
      body.classList.add("font-large");
    } else if (settings.fontSize === "x-large") {
      body.classList.add("font-x-large");
    }

    // Reduced motion
    if (settings.reducedMotion) {
      body.classList.add("reduced-motion");
    } else {
      body.classList.remove("reduced-motion");
    }

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings, isInitialized]);

  const toggleHighContrast = () => {
    setSettings((prev) => ({ ...prev, highContrast: !prev.highContrast }));
  };

  const setFontSize = (size: "normal" | "large" | "x-large") => {
    setSettings((prev) => ({ ...prev, fontSize: size }));
  };

  const toggleReducedMotion = () => {
    setSettings((prev) => ({ ...prev, reducedMotion: !prev.reducedMotion }));
  };

  return (
    <AccessibilityContext.Provider
      value={{
        settings,
        toggleHighContrast,
        setFontSize,
        toggleReducedMotion,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error(
      "useAccessibility must be used within an AccessibilityProvider"
    );
  }
  return context;
}
