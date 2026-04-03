"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, Users, Settings, Video } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/live", label: "Live Coaching", icon: Video },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/mentors", label: "Mentors", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function SideNavBar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex flex-col h-screen w-64 bg-neutral-100 border-r-2 border-black fixed left-0 top-0 z-50">
      <div className="px-6 py-8">
        <h1 className="text-xl font-black tracking-tighter">MENTORMETRICS</h1>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">AI COACHING</p>
      </div>
      <nav className="flex-grow flex flex-col gap-0 mt-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center px-6 py-4 border-b-2 transition-all ${
                isActive
                  ? "bg-primary text-white border-black"
                  : "text-black border-transparent hover:border-black hover:bg-neutral-200"
              }`}
            >
              <item.icon className="mr-3 w-5 h-5" />
              <span className="text-sm font-bold uppercase">{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-6">
        <Link href="/upload">
          <button className="w-full bg-primary text-white font-bold py-4 border-2 border-black uppercase text-sm tracking-widest hover:bg-black transition-colors">
            New Session
          </button>
        </Link>
      </div>
    </aside>
  );
}
