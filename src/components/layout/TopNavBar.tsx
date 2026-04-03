"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function TopNavBar() {
  const { user, signOut } = useAuth();

  return (
    <header className="flex justify-between items-center w-full px-4 md:px-6 py-3 md:py-4 bg-white border-b-2 border-black sticky top-0 z-40">
      <div className="flex items-center gap-4 md:gap-8">
        <Link href="/" className="text-lg md:text-2xl font-black tracking-tighter">MENTORMETRICS</Link>
        <nav className="hidden lg:flex gap-6">
          <Link href="/history" className="text-black font-medium hover:bg-black hover:text-white px-2 py-1 text-xs uppercase tracking-widest">
            History
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        {user ? (
          <>
            <Link href="/upload" className="hidden sm:block">
              <button className="bg-primary text-white font-bold px-4 md:px-6 py-2 border-2 border-black text-xs uppercase tracking-widest hover:bg-black transition-colors">
                Upload
              </button>
            </Link>
            <button onClick={() => signOut()} className="text-xs font-bold uppercase hover:text-primary">
              Sign Out
            </button>
          </>
        ) : (
          <Link href="/login">
            <button className="bg-primary text-white font-bold px-4 md:px-6 py-2 border-2 border-black text-xs uppercase tracking-widest hover:bg-black transition-colors">
              Sign In
            </button>
          </Link>
        )}
      </div>
    </header>
  );
}
