// src/pages/Settings/Settings.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import SidebarLayout from "../../components/layout/SidebarLayout";
import {
  User,
  Bell,
  Settings as SettingsIcon,
  CreditCard,
  Sparkles,
  Camera,
  Shield,
  Globe,
  Sun,
  Moon,
  Link,
  Database,
  Trash2,
  FileText,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useSubscription } from "../../hooks/useSubscription";
import logger from "../../utils/logger";
import { db } from "../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

const tzGuess = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export default function Settings() {
  const { user } = useAuth();
  const toast = useToast();
  const fileInputRef = useRef();
  const { status: subscriptionStatus, formattedType, description: subscriptionDescription } = useSubscription();

  const [formData, setFormData] = useState({
    // Identity
    name: "",
    displayName: "",
    email: "",

    // Notifications & AI
    notificationsEnabled: true,
    reminderTime: "08:00",
    tone: "gentle",
    intensity: "standard",
    aiPreferences: "standard",

    // Privacy & discoverability
    privacy: "public", // public | connections | private
    searchable: true,

    // Locale & appearance
    timeZone: tzGuess,
    theme: "system", // system | light | dark

    // Billing (display only here)
    subscriptionPlan: "Free",
    renewalDate: "",
    billingInfo: "",

    // Avatar
    avatarUrl: "",

    // Legacy / misc fields you already persisted
    age: "",
    gender: "",
    maritalStatus: "",
    hasKids: "",
    city: "",
    state: "",
    country: "",
    career: "",
    careerGoals: "",
    wellnessFocus: "",
    challenge: "",
    coachingStyle: "",
    availability: "",
    prefersCommunitySupport: false,
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load user doc
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setFormData((prev) => ({
            ...prev,
            ...data,
            name: data.name || data.displayName || "",
            displayName: data.displayName || data.name || "",
            email: user.email || data.email || "",
            timeZone: data.timeZone || tzGuess,
            theme: data.theme || "system",
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            email: user.email || "",
            timeZone: tzGuess,
          }));
        }
      } catch (e) {
        logger.error("Failed to load settings", e, { userId: user.uid });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.uid, user?.email]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    try {
      const storage = getStorage();
      const avatarRef = storageRef(storage, `avatars/${user.uid}/${file.name}`);
      await uploadBytes(avatarRef, file);
      const downloadURL = await getDownloadURL(avatarRef);
      setFormData((prev) => ({ ...prev, avatarUrl: downloadURL }));
      toast.success("Avatar uploaded successfully!");
      logger.info("Avatar uploaded", { userId: user.uid, fileName: file.name });
    } catch (err) {
      logger.error("Avatar upload failed", err, { userId: user.uid });
      toast.error("Failed to upload avatar. Please try again.");
    }
  };

  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!user?.uid) return;
    setSaving(true);
    try {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, {
        ...formData,
        // keep only fields that belong here if you later need stricter control
      });
      toast.success("Settings saved successfully!");
      logger.info("Settings saved", { userId: user.uid });
    } catch (err) {
      logger.error("Failed to save settings", err, { userId: user.uid });
      toast.error("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-[60vh] flex items-center justify-center text-[#3E3E3E]">
          Loading…
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-[#F3F4EF]">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-5 h-5 text-[#1B5E57]" />
              <h1 className="text-xl font-semibold text-[#3E3E3E]">
                Settings
              </h1>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] text-white hover:brightness-110 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>

          {/* Account Card */}
          <SectionCard
            icon={<User className="w-5 h-5 text-[#1B5E57]" />}
            title="Account"
            subtitle="Manage your identity and avatar."
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={formData.avatarUrl || "/placeholder-avatar.png"}
                  alt="Avatar"
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-[#D5E3D1] bg-white"
                />
                <button
                  type="button"
                  onClick={handleAvatarUpload}
                  className="absolute -bottom-2 -right-2 bg-[#1B5E57] p-2 rounded-xl text-white hover:brightness-110 shadow"
                  title="Upload new avatar"
                >
                  <Camera size={16} />
                </button>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                <div>
                  <label className="block text-sm font-medium text-[#3E3E3E] mb-1">
                    Display Name
                  </label>
                  <input
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#D5E3D1] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="How your name appears in the app"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#3E3E3E] mb-1">
                    Email
                  </label>
                  <input
                    value={formData.email}
                    readOnly
                    className="w-full px-3 py-2 border border-[#D5E3D1] rounded-lg bg-gray-50 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#3E3E3E] mb-1">
                    City
                  </label>
                  <input
                    name="city"
                    value={formData.city || ""}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-[#D5E3D1] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="City"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#3E3E3E] mb-1">
                      State
                    </label>
                    <input
                      name="state"
                      value={formData.state || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-[#D5E3D1] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#3E3E3E] mb-1">
                      Country
                    </label>
                    <input
                      name="country"
                      value={formData.country || ""}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-[#D5E3D1] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="Country"
                    />
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Privacy & Visibility */}
          <SectionCard
            icon={<Shield className="w-5 h-5 text-[#1B5E57]" />}
            title="Privacy & Visibility"
            subtitle="Control who can see your profile and whether you appear in search."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#3E3E3E] mb-1">
                  Profile visibility
                </label>
                <select
                  name="privacy"
                  value={formData.privacy}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#D5E3D1] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="public">Public 🌐</option>
                  <option value="connections">Connections 👥</option>
                  <option value="private">Private 🔒</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="searchable"
                    checked={!!formData.searchable}
                    onChange={handleChange}
                    className="rounded text-emerald-600"
                  />
                  <span className="text-sm text-[#3E3E3E]">
                    Allow people to find me in search
                  </span>
                </label>
              </div>
            </div>
          </SectionCard>

          {/* Notifications */}
          <SectionCard
            icon={<Bell className="w-5 h-5 text-[#1B5E57]" />}
            title="Notifications"
            subtitle="Daily reminders and app notifications."
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <label className="flex items-center gap-3 md:col-span-2">
                <input
                  type="checkbox"
                  name="notificationsEnabled"
                  checked={!!formData.notificationsEnabled}
                  onChange={handleChange}
                  className="rounded text-emerald-600"
                />
                <span className="text-sm text-[#3E3E3E]">
                  Enable notifications
                </span>
              </label>
              <div>
                <label className="block text-sm font-medium text-[#3E3E3E] mb-1">
                  Reminder time
                </label>
                <input
                  type="time"
                  name="reminderTime"
                  value={formData.reminderTime}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#D5E3D1] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </SectionCard>

          {/* AI Companion */}
          <SectionCard
            icon={<Sparkles className="w-5 h-5 text-[#1B5E57]" />}
            title="AI Companion"
            subtitle="Tune the tone and intensity of your AI coach."
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#3E3E3E] mb-1">
                  Tone
                </label>
                <select
                  name="tone"
                  value={formData.tone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#D5E3D1] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="gentle">Gentle</option>
                  <option value="encouraging">Encouraging</option>
                  <option value="direct">Direct</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3E3E3E] mb-1">
                  Intensity
                </label>
                <select
                  name="intensity"
                  value={formData.intensity}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#D5E3D1] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="low">Low</option>
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#3E3E3E] mb-1">
                  Style
                </label>
                <select
                  name="aiPreferences"
                  value={formData.aiPreferences}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#D5E3D1] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="standard">Standard</option>
                  <option value="wellness-focused">Wellness-focused</option>
                  <option value="coach-like">Coach-like</option>
                </select>
              </div>
            </div>
          </SectionCard>

          {/* Appearance */}
          <SectionCard
            icon={<Sun className="w-5 h-5 text-[#1B5E57]" />}
            title="Appearance"
            subtitle="Choose how Vara looks on your device."
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="col-span-2">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="theme"
                      value="system"
                      checked={formData.theme === "system"}
                      onChange={handleChange}
                    />
                    <span className="text-sm text-[#3E3E3E]">System</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="theme"
                      value="light"
                      checked={formData.theme === "light"}
                      onChange={handleChange}
                    />
                    <span className="text-sm text-[#3E3E3E] flex items-center gap-1">
                      <Sun className="w-4 h-4" /> Light
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="theme"
                      value="dark"
                      checked={formData.theme === "dark"}
                      onChange={handleChange}
                    />
                    <span className="text-sm text-[#3E3E3E] flex items-center gap-1">
                      <Moon className="w-4 h-4" /> Dark
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Time & Locale */}
          <SectionCard
            icon={<Globe className="w-5 h-5 text-[#1B5E57]" />}
            title="Time & Locale"
            subtitle="Set your time zone for reminders and insights."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#3E3E3E] mb-1">
                  Time zone
                </label>
                <select
                  name="timeZone"
                  value={formData.timeZone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-[#D5E3D1] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {POPULAR_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </SectionCard>

          {/* Subscription */}
          <SectionCard
            icon={<CreditCard className="w-5 h-5 text-[#1B5E57]" />}
            title="Subscription"
            subtitle="Plan details and billing info."
          >
            <div className="bg-white/80 border border-[#D5E3D1] rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Current Plan</p>
                  <p className="font-semibold text-[#1B5E57]">{formattedType || "Loading..."}</p>
                  {subscriptionDescription && (
                    <p className="text-sm text-gray-500">{subscriptionDescription}</p>
                  )}
                </div>
                {subscriptionStatus?.type === 'premium' && (
                  <span className="text-2xl">⭐</span>
                )}
                {subscriptionStatus?.type === 'coaching' && (
                  <span className="text-2xl">💚</span>
                )}
              </div>

              {subscriptionStatus?.type !== 'coaching' && (
                <div className="pt-3 border-t border-[#D5E3D1] space-y-2">
                  {subscriptionStatus?.type === 'premium' ? (
                    <p className="text-sm text-gray-600">
                      Manage your subscription in the{" "}
                      <span className="font-medium">App Store</span> on your iOS device.
                    </p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">
                        Subscribe via our iOS app to unlock all features.
                      </p>
                      <p className="text-sm text-[#1B5E57] font-medium">
                        Monthly: $10.99 | Annual: $111.99 (Save 15%)
                      </p>
                    </>
                  )}
                </div>
              )}

              {subscriptionStatus?.type !== 'coaching' && (
                <div className="pt-3 border-t border-[#D5E3D1]">
                  <p className="text-sm text-gray-600 mb-2">Have an invite code?</p>
                  <button
                    type="button"
                    className="text-sm text-[#1B5E57] font-medium hover:underline"
                    onClick={() => {
                      alert('To redeem an invite code, please use the Vara iOS app.');
                    }}
                  >
                    Redeem Code →
                  </button>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Connected Apps (placeholders) */}
          <SectionCard
            icon={<Link className="w-5 h-5 text-[#1B5E57]" />}
            title="Connected Apps"
            subtitle="Connect health data sources (coming soon)."
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <IntegrationTile name="Apple Health" status="Not connected" />
              <IntegrationTile name="Google Fit" status="Not connected" />
            </div>
          </SectionCard>

          {/* Data & Export */}
          <SectionCard
            icon={<Database className="w-5 h-5 text-[#1B5E57]" />}
            title="Data & Export"
            subtitle="Download a copy of your data."
          >
            <button
              type="button"
              className="px-3 py-2 rounded-lg border border-[#D5E3D1] hover:bg-[#F3F4EF]"
              // onClick={() => ... export flow ...}
            >
              Request data export
            </button>
          </SectionCard>

          {/* Legal */}
          <SectionCard
            icon={<FileText className="w-5 h-5 text-[#1B5E57]" />}
            title="Legal"
            subtitle="Review our policies and terms."
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <RouterLink
                to="/privacy"
                className="px-4 py-2 rounded-lg border border-[#D5E3D1] hover:bg-[#F3F4EF] text-center text-sm font-medium text-[#3E3E3E] transition"
              >
                Privacy Policy
              </RouterLink>
              <RouterLink
                to="/terms"
                className="px-4 py-2 rounded-lg border border-[#D5E3D1] hover:bg-[#F3F4EF] text-center text-sm font-medium text-[#3E3E3E] transition"
              >
                Terms of Service
              </RouterLink>
            </div>
          </SectionCard>

          {/* Danger Zone (stub) */}
          <SectionCard
            icon={<Trash2 className="w-5 h-5 text-red-500" />}
            title="Danger Zone"
            subtitle="Permanently delete your account and data."
          >
            <button
              type="button"
              className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
              disabled
              title="Contact support to delete your account"
            >
              Delete account
            </button>
          </SectionCard>

          {/* Sticky Save (mobile friendly) */}
          <div className="md:hidden sticky bottom-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] text-white shadow-lg"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

/* ---------- Helpers & small components ---------- */

const POPULAR_TIMEZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Australia/Sydney",
];

function SectionCard({ icon, title, subtitle, children }) {
  return (
    <section className="bg-white rounded-2xl p-6 shadow-sm border border-[#D5E3D1]">
      <div className="flex items-start gap-3 mb-4">
        {icon}
        <div>
          <h2 className="text-lg font-semibold text-[#3E3E3E]">{title}</h2>
          {subtitle && (
            <p className="text-sm text-[#9AAE8C]">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function IntegrationTile({ name, status }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#D5E3D1]">
      <div>
        <p className="text-sm font-medium text-[#3E3E3E]">{name}</p>
        <p className="text-xs text-[#9AAE8C]">{status}</p>
      </div>
      <button
        type="button"
        className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
        disabled
        title="Coming soon"
      >
        Connect
      </button>
    </div>
  );
}






