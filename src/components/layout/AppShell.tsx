"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { BottomNavigation } from "./BottomNavigation";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function AppShell({ children }: { children: ReactNode }) {
  const isOnline = useOnlineStatus();
  return (
    <div className="app-shell">
      <header className="desktop-header">
        <Link href="/" className="wordmark" aria-label="Logbook 오늘 기록">
          Logbook
        </Link>
        {!isOnline ? <span className="offline-badge">오프라인</span> : null}
        <BottomNavigation />
      </header>
      <main className="app-main">{children}</main>
      <div className="mobile-navigation">
        {!isOnline ? <span className="offline-banner">오프라인 모드</span> : null}
        <BottomNavigation />
      </div>
    </div>
  );
}
