import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FalconWatch - SpaceX Launch Tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #0a0e1a 0%, #0d1b2a 50%, #1b2838 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Stars background */}
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: i % 3 === 0 ? "3px" : "2px",
              height: i % 3 === 0 ? "3px" : "2px",
              background: "white",
              borderRadius: "50%",
              opacity: 0.3 + (i % 5) * 0.1,
              top: `${(i * 37) % 100}%`,
              left: `${(i * 53) % 100}%`,
            }}
          />
        ))}

        {/* Glow effect behind title */}
        <div
          style={{
            position: "absolute",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,107,53,0.08) 0%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Rocket emoji */}
        <div style={{ fontSize: "64px", marginBottom: "16px", display: "flex" }}>
          🚀
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: "72px",
            fontWeight: 800,
            color: "#FF6B35",
            letterSpacing: "0.15em",
            lineHeight: 1,
            marginBottom: "20px",
            display: "flex",
          }}
        >
          FALCONWATCH
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: "28px",
            color: "rgba(255,255,255,0.7)",
            letterSpacing: "0.05em",
            marginBottom: "40px",
            display: "flex",
          }}
        >
          Can you see the launch from your city?
        </div>

        {/* Site badges */}
        <div style={{ display: "flex", gap: "16px" }}>
          {["Vandenberg", "Cape Canaveral", "Starbase"].map((site) => (
            <div
              key={site}
              style={{
                padding: "10px 24px",
                border: "1px solid rgba(11,61,145,0.6)",
                borderRadius: "8px",
                color: "rgba(255,255,255,0.5)",
                fontSize: "18px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                background: "rgba(11,61,145,0.15)",
                display: "flex",
              }}
            >
              {site}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
