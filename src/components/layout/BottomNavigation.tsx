"use client";

import { BookOpenText, Search, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "오늘", icon: BookOpenText },
  { href: "/search", label: "검색", icon: Search },
  { href: "/settings", label: "설정", icon: Settings },
] as const;

export function BottomNavigation() {
  const pathname = usePathname();
  return (
    <nav className="app-navigation" aria-label="주요 메뉴">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={active ? "nav-link active" : "nav-link"}
          >
            <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
