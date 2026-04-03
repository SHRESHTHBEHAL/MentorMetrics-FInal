"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function syncAuthCookie(isAuthenticated: boolean) {
  if (typeof document === "undefined") return;

  const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
  const cookieValue = isAuthenticated
    ? `mm-authenticated=1; Path=/; Max-Age=2592000; SameSite=Lax${secureFlag}`
    : `mm-authenticated=; Path=/; Max-Age=0; SameSite=Lax${secureFlag}`;

  document.cookie = cookieValue;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Fallback timeout - if Supabase doesn't respond in 5s, assume no session
      setLoading(false);
    }, 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(timeoutId);
      setUser(session?.user ?? null);
      syncAuthCookie(Boolean(session?.user));
      setLoading(false);
    }).catch(() => {
      clearTimeout(timeoutId);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      syncAuthCookie(Boolean(session?.user));
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    syncAuthCookie(Boolean(data.session?.user));
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    syncAuthCookie(Boolean(data.session?.user));
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    syncAuthCookie(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
