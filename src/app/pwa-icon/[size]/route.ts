import { ImageResponse } from "next/og";
import { createElement } from "react";

const supportedSizes = new Set([180, 192, 512]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ size: string }> },
) {
  const requested = Number((await params).size);
  const size = supportedSizes.has(requested) ? requested : 512;
  return new ImageResponse(
    createElement(
      "div",
      {
        style: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#20372d",
          color: "#f7f5f0",
          fontFamily: "sans-serif",
          fontSize: Math.round(size * 0.54),
          fontWeight: 700,
          letterSpacing: "-0.08em",
          paddingRight: Math.round(size * 0.04),
        },
      },
      "L",
    ),
    { width: size, height: size },
  );
}
