import type { Metadata } from "next";
import { Inter, Space_Mono, Orbitron } from "next/font/google";
import "./globals.css";
import { AccessibilityProvider } from "./contexts/AccessibilityContext";
import ErrorBoundary from "./components/ErrorBoundary";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "FalconWatch | Unofficial SpaceX Launch Tracker",
  description:
    "Track SpaceX launches from Vandenberg, Cape Canaveral, and Starbase. Real-time countdown, weather data, and visibility predictions from your location.",
  keywords: [
    "SpaceX",
    "launch tracker",
    "rocket launch",
    "Falcon 9",
    "Starship",
    "Vandenberg",
    "Cape Canaveral",
    "Starbase",
    "visibility",
  ],
  authors: [{ name: "FalconWatch" }],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "FalconWatch | Unofficial SpaceX Launch Tracker",
    description:
      "Track SpaceX launches from Vandenberg SFB and calculate visibility from your location.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${spaceMono.variable} ${orbitron.variable} antialiased`}
      >
        <AccessibilityProvider>
          <a href="#main-content" className="skip-to-main">
            Skip to main content
          </a>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </AccessibilityProvider>
      </body>
    </html>
  );
}
