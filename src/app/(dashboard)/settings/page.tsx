"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { Save, Bell, Shield, User as UserIcon } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function SettingsPage() {
  const { user } = useAuth();
  
  const [displayName, setDisplayName] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [weeklyReports, setWeeklyReports] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [saveError, setSaveError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/settings/${user.id}`);
        if (res.ok) {
          const data = await res.json();
          setDisplayName(data.display_name || "");
          setNotificationsEnabled(data.notifications_enabled ?? true);
          setWeeklyReports(data.weekly_reports ?? false);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/settings/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          display_name: displayName.trim() || null,
          notifications_enabled: notificationsEnabled,
          weekly_reports: weeklyReports,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Failed to save" }));
        throw new Error(err.detail || "Failed to save settings");
      }

      setSaveSuccess("Settings saved successfully!");
      setTimeout(() => setSaveSuccess(""), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 max-w-4xl flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <div className="mb-8 md:mb-12">
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase mb-2">Settings</h1>
        <p className="text-on-surface-variant font-medium">Manage your account preferences and notifications.</p>
      </div>

      {saveSuccess && (
        <div className="bg-green-50 border-2 border-green-700 p-4 mb-6 flex items-center gap-3">
          <p className="text-green-700 font-bold text-sm">{saveSuccess}</p>
        </div>
      )}

      {saveError && (
        <div className="bg-red-50 border-2 border-red-600 p-4 mb-6 flex items-center gap-3">
          <p className="text-red-600 font-bold text-sm">{saveError}</p>
        </div>
      )}

      <div className="space-y-8">
        <section className="bg-white border-2 border-black p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-black">
            <UserIcon className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-black uppercase tracking-widest">Profile Details</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Email Address</label>
              <input 
                type="email" 
                disabled 
                value={user?.email || "anonymous@mentormetrics.com"} 
                className="w-full px-4 py-3 border-2 border-neutral-300 bg-neutral-100 text-neutral-500 font-medium cursor-not-allowed"
              />
              <p className="text-xs font-bold text-neutral-400 mt-2 uppercase">Email cannot be changed directly.</p>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-neutral-500 mb-2">Display Name</label>
              <input 
                type="text" 
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="w-full px-4 py-3 border-2 border-black focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </section>

        <section className="bg-white border-2 border-black p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-black">
            <Bell className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-black uppercase tracking-widest">Notifications</h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-lg uppercase">Pipeline Alerts</p>
                <p className="text-sm text-neutral-500">Get notified when a video finishes processing.</p>
              </div>
              <button 
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                className={`w-14 h-8 flex items-center border-2 border-black transition-colors ${notificationsEnabled ? 'bg-primary' : 'bg-neutral-200'}`}
              >
                <div className={`w-6 h-6 bg-white border-2 border-black bg-white transform transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="h-px bg-neutral-200 w-full" />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-lg uppercase">Weekly Digest</p>
                <p className="text-sm text-neutral-500">Receive a weekly summary of mentor performance rates.</p>
              </div>
              <button 
                onClick={() => setWeeklyReports(!weeklyReports)}
                className={`w-14 h-8 flex items-center border-2 border-black transition-colors ${weeklyReports ? 'bg-primary' : 'bg-neutral-200'}`}
              >
                <div className={`w-6 h-6 bg-white border-2 border-black bg-white transform transition-transform ${weeklyReports ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </section>

        <section className="bg-white border-2 border-black p-6 md:p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-black">
            <Shield className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-black uppercase tracking-widest">Security</h2>
          </div>
          <button
            onClick={async () => {
              if (!user?.email) return;
              const { supabase } = await import("@/lib/supabase");
              const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: `${window.location.origin}/login`,
              });
              if (error) {
                setSaveError(error.message);
              } else {
                setSaveSuccess("Password reset email sent. Check your inbox.");
                setTimeout(() => setSaveSuccess(""), 5000);
              }
            }}
            className="bg-white text-black font-bold px-6 py-3 border-2 border-black text-sm uppercase tracking-widest hover:bg-neutral-100 transition-colors"
          >
            Reset Password
          </button>
        </section>

        <div className="flex justify-end mt-8">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-primary text-white font-black px-8 py-4 border-4 border-black text-lg uppercase tracking-widest hover:bg-black transition-colors disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
