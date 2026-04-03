"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, History, BarChart3, Settings, Video } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/live", label: "Live", icon: Video },
  { href: "/history", label: "History", icon: History },
  { href: "/analytics", label: "Stats", icon: BarChart3 },
  { href: "/settings", label: "Menu", icon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-black flex justify-around items-center py-3 z-50 px-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-1 min-w-[60px] py-1 ${isActive ? "text-primary" : "text-black"}`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase truncate max-w-[60px]">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
