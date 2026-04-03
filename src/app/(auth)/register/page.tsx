"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Mail, Lock, AlertCircle, CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { error } = await signUp(email, password);
      if (error) throw error;

      const nextPath = searchParams.get("next");
      if (nextPath && nextPath.startsWith("/")) {
        router.push(nextPath);
        return;
      }

      setSuccess("Account created. You can now continue to your dashboard.");
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tighter uppercase">MENTORMETRICS</h1>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mt-2">AI COACHING</p>
        </div>

        <div className="bg-white border-2 border-black p-6 md:p-8">
          <h2 className="text-2xl font-black uppercase mb-6">Create Account</h2>

          {error && (
            <div className="bg-red-50 border-2 border-red-600 p-4 mb-6 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-red-600 font-bold text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border-2 border-green-700 p-4 mb-6 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-700 flex-shrink-0" />
              <p className="text-green-700 font-bold text-sm">{success}</p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                required
                placeholder="Email address"
                className="w-full px-12 py-4 border-2 border-black focus:outline-none focus:border-primary text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Password (min 6 characters)"
                className="w-full px-12 py-4 border-2 border-black focus:outline-none focus:border-primary text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-black uppercase py-4 border-2 border-black hover:bg-black transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm font-medium">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-bold underline decoration-2 underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs font-bold uppercase text-neutral-500 hover:text-black transition-colors">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
