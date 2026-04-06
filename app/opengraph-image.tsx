import { ImageResponse } from "next/og"

export const runtime = "edge"
export const alt = "Lacoda Capital Holdings — The Operating System for Asset Management"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          alignItems: "center",
          background: "#09090b",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(20,184,166,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.06) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Teal glow top-left */}
        <div
          style={{
            position: "absolute",
            top: -120,
            left: -80,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(20,184,166,0.15) 0%, transparent 70%)",
          }}
        />

        {/* Logo + text container */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            padding: "0 80px",
            gap: 72,
          }}
        >
          {/* Logo SVG */}
          <svg
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: 140, height: 140, flexShrink: 0 }}
          >
            <defs>
              <linearGradient id="g" x1="3.5" y1="2" x2="36.5" y2="39" gradientUnits="userSpaceOnUse">
                <stop stopColor="#14b8a6" />
                <stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
            {/* Outer hexagon */}
            <path
              d="M20 2L36.5 11.5V29.5L20 39L3.5 29.5V11.5L20 2Z"
              stroke="url(#g)"
              strokeWidth="2"
              fill="none"
            />
            {/* Inner nodes */}
            <circle cx="20" cy="12" r="3" fill="url(#g)" />
            <circle cx="12" cy="24" r="3" fill="url(#g)" />
            <circle cx="28" cy="24" r="3" fill="url(#g)" />
            {/* Connecting lines */}
            <path
              d="M20 12L12 24M20 12L28 24M12 24L28 24"
              stroke="url(#g)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            {/* Center */}
            <circle cx="20" cy="20" r="2" fill="url(#g)" />
          </svg>

          {/* Accent divider */}
          <div
            style={{
              width: 2,
              height: 160,
              background: "linear-gradient(to bottom, transparent, #14b8a6, #06b6d4, transparent)",
              flexShrink: 0,
            }}
          />

          {/* Text */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                fontSize: 52,
                fontWeight: 700,
                color: "#f4f4f5",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
              }}
            >
              Lacoda Capital
              <br />
              Holdings
            </div>
            <div
              style={{
                fontSize: 24,
                color: "#a1a1aa",
                fontWeight: 400,
                letterSpacing: "-0.01em",
              }}
            >
              The Operating System for Asset Management
            </div>
            {/* Teal accent line */}
            <div
              style={{
                marginTop: 8,
                height: 3,
                width: 80,
                background: "linear-gradient(to right, #14b8a6, #06b6d4)",
                borderRadius: 2,
              }}
            />
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
