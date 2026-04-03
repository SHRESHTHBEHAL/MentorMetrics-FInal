"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function TopNavBar() {
  const { user, signOut } = useAuth();

  return (
    <header className="flex justify-between items-center w-full px-6 py-4 bg-white border-b-2 border-black sticky top-0 z-40">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-2xl font-black tracking-tighter">MENTORMETRICS</Link>
        <nav className="hidden lg:flex gap-6">
          <Link href="/history" className="text-black font-medium hover:bg-black hover:text-white px-2 py-1 text-xs uppercase tracking-widest">
            History
          </Link>
          <Link href="/library" className="text-black font-medium hover:bg-black hover:text-white px-2 py-1 text-xs uppercase tracking-widest">
            Library
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <Link href="/upload">
              <button className="bg-primary text-white font-bold px-6 py-2 border-2 border-black text-xs uppercase tracking-widest hover:bg-black transition-colors">
                Upload Session
              </button>
            </Link>
            <button onClick={() => signOut()} className="text-xs font-bold uppercase hover:text-primary">
              Sign Out
            </button>
          </>
        ) : (
          <Link href="/login">
            <button className="bg-primary text-white font-bold px-6 py-2 border-2 border-black text-xs uppercase tracking-widest hover:bg-black transition-colors">
              Sign In
            </button>
          </Link>
        )}
      </div>
    </header>
  );
}
