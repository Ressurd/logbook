import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ServiceWorkerRegistration } from "@/components/layout/ServiceWorkerRegistration";

export const metadata: Metadata = {
  applicationName: "Logbook",
  title: {
    default: "Logbook",
    template: "%s · Logbook",
  },
  description: "생각과 작업을 입력 시각과 함께 빠르게 남기는 개인용 로그북",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Logbook",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/pwa-icon/512", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/pwa-icon/180", type: "image/png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0e1110",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
