import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Logbook",
    short_name: "Logbook",
    description: "생각과 작업을 입력 시각과 함께 빠르게 남기는 개인용 로그북",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#0e1110",
    theme_color: "#0e1110",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/pwa-icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
