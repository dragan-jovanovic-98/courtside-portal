import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Courtside AI — Client Portal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          fontFamily: "Inter, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://courtside-portal.vercel.app/courtside.png"
            alt=""
            width={80}
            height={80}
          />
          <span
            style={{
              fontSize: 52,
              fontWeight: 700,
              color: "#18181b",
              letterSpacing: "-0.02em",
            }}
          >
            Courtside AI
          </span>
        </div>
        <span
          style={{
            fontSize: 26,
            color: "#71717a",
            fontWeight: 400,
          }}
        >
          AI Voice Agent Client Portal
        </span>
      </div>
    ),
    { ...size }
  );
}
