"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Library,
  Disc3,
  Settings,
  Archive,
  Activity,
} from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/library", label: "Library", icon: Library },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/deals", label: "Blu-ray Deals", icon: Disc3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function NavSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Top navbar - arr style */}
      <header className="fixed top-0 left-0 right-0 h-[60px] bg-navbar border-b border-border z-50 flex items-center px-4">
        <Link href="/" className="flex items-center gap-2.5 mr-8">
          <Archive className="w-7 h-7 text-primary" />
          <span className="text-[17px] font-bold text-foreground-bright tracking-tight">
            AniArchive
          </span>
        </Link>

        <nav className="flex items-center gap-0.5 h-full">
          {links.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-4 h-full text-[13px] font-medium border-b-2 transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-foreground-bright hover:border-muted/30"
                )}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted">v0.1.0</span>
        </div>
      </header>
    </>
  );
}
