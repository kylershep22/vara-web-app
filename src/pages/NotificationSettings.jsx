import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "../components/layout/SidebarLayout";
import { ArrowLeft, Bell, Moon, Clock, Lightbulb, Users, Award, Volume2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getPreferences, savePreferences } from "../services/db/notificationPreferences.service";

const SOUNDS = [
  { id: "singing-bowl", label: "Singing Bowl" },
  { id: "soft-chime", label: "Soft Chime" },
  { id: "nature-bell", label: "Nature Bell" },
  { id: "stream", label: "Stream" },
];

export default function NotificationSettings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    getPreferences(user.uid).then(setPrefs);
  }, [user?.uid]);

  async function save(patch) {
    const updated = { ...prefs, ...patch };
    setPrefs(updated);
    setSaving(true);
    try {
      await savePreferences(user.uid, updated);
    } catch (err) {
      console.error("Failed to save preferences:", err);
    } finally {
      setSaving(false);
    }
  }

  if (!prefs) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-evergreen-teal border-t-transparent rounded-full animate-spin" />
        </div>
      </SidebarLayout>
    );
  }

  const disabled = !prefs.allNotificationsEnabled;

  return (
    <SidebarLayout>
      <div className="max-w-2xl mx-auto px-vara-base py-vara-lg">
        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-2 text-sm text-muted-sage-gray hover:text-soft-charcoal mb-6"
        >
          <ArrowLeft size={16} /> Back to Settings
        </button>

        <h1 className="text-vara-2xl font-semibold text-soft-charcoal mb-vara-lg flex items-center gap-3">
          <Bell size={24} className="text-evergreen-teal" />
          Notification Settings
        </h1>

        <div className="space-y-6">
          {/* 1. Master Toggle */}
          <Section title="All Notifications" icon={Bell}>
            <Toggle
              checked={prefs.allNotificationsEnabled}
              onChange={(v) => save({ allNotificationsEnabled: v })}
              label="Enable all notifications"
            />
          </Section>

          {/* 2. Quiet Hours */}
          <Section title="Quiet Hours" icon={Moon} disabled={disabled}>
            <Toggle
              checked={prefs.quietHours.enabled}
              onChange={(v) => save({ quietHours: { ...prefs.quietHours, enabled: v } })}
              label="Enable quiet hours"
              disabled={disabled}
            />
            {prefs.quietHours.enabled && !disabled && (
              <div className="flex gap-4 mt-3">
                <TimeInput
                  label="Start"
                  value={prefs.quietHours.startTime}
                  onChange={(v) => save({ quietHours: { ...prefs.quietHours, startTime: v } })}
                />
                <TimeInput
                  label="End"
                  value={prefs.quietHours.endTime}
                  onChange={(v) => save({ quietHours: { ...prefs.quietHours, endTime: v } })}
                />
              </div>
            )}
          </Section>

          {/* 3. Daily Rhythm */}
          <Section title="Daily Rhythm" icon={Clock} disabled={disabled}>
            <Toggle
              checked={prefs.dailyRhythm.enabled}
              onChange={(v) => save({ dailyRhythm: { ...prefs.dailyRhythm, enabled: v } })}
              label="Daily reminder"
              disabled={disabled}
            />
            {prefs.dailyRhythm.enabled && !disabled && (
              <div className="mt-3">
                <TimeInput
                  label="Reminder time"
                  value={prefs.dailyRhythm.reminderTime || { hour: 9, minute: 0 }}
                  onChange={(v) => save({ dailyRhythm: { ...prefs.dailyRhythm, reminderTime: v } })}
                />
              </div>
            )}
          </Section>

          {/* 4. Insights & Learning */}
          <Section title="Insights & Learning" icon={Lightbulb} disabled={disabled}>
            <Toggle
              checked={prefs.insightsLearning.enabled}
              onChange={(v) => save({ insightsLearning: { ...prefs.insightsLearning, enabled: v } })}
              label="Wellness insights"
              disabled={disabled}
            />
            {prefs.insightsLearning.enabled && !disabled && (
              <div className="flex gap-2 mt-3">
                {["twice_weekly", "three_weekly"].map((freq) => (
                  <button
                    key={freq}
                    onClick={() => save({ insightsLearning: { ...prefs.insightsLearning, frequency: freq } })}
                    className={`px-4 py-2 rounded-lg text-sm border-2 transition ${
                      prefs.insightsLearning.frequency === freq
                        ? "border-evergreen-teal bg-teal-light/30 text-evergreen-teal font-medium"
                        : "border-divider text-soft-charcoal"
                    }`}
                  >
                    {freq === "twice_weekly" ? "2x per week" : "3x per week"}
                  </button>
                ))}
              </div>
            )}
          </Section>

          {/* 5. Social & Connection */}
          <Section title="Social & Connection" icon={Users} disabled={disabled}>
            <div className="space-y-3">
              <Toggle
                checked={prefs.socialConnection.directMessages}
                onChange={(v) => save({ socialConnection: { ...prefs.socialConnection, directMessages: v } })}
                label="Direct messages"
                disabled={disabled}
              />
              <Toggle
                checked={prefs.socialConnection.connectionRequests}
                onChange={(v) => save({ socialConnection: { ...prefs.socialConnection, connectionRequests: v } })}
                label="Connection requests"
                disabled={disabled}
              />
              <Toggle
                checked={prefs.socialConnection.communityDigest}
                onChange={(v) => save({ socialConnection: { ...prefs.socialConnection, communityDigest: v } })}
                label="Community digest"
                disabled={disabled}
              />
            </div>
          </Section>

          {/* 6. Milestones & Reflection */}
          <Section title="Milestones & Reflection" icon={Award} disabled={disabled}>
            <Toggle
              checked={prefs.milestonesReflection.enabled}
              onChange={(v) => save({ milestonesReflection: { enabled: v } })}
              label="Milestone celebrations"
              disabled={disabled}
            />
          </Section>

          {/* 7. Completion Sound */}
          <Section title="Completion Sound" icon={Volume2}>
            <Toggle
              checked={prefs.completionSound.enabled}
              onChange={(v) => save({ completionSound: { ...prefs.completionSound, enabled: v } })}
              label="Play sound on completion"
            />
            {prefs.completionSound.enabled && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                {SOUNDS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => save({ completionSound: { ...prefs.completionSound, sound: s.id } })}
                    className={`py-2 px-3 rounded-lg text-sm border-2 transition ${
                      prefs.completionSound.sound === s.id
                        ? "border-evergreen-teal bg-teal-light/30 text-evergreen-teal font-medium"
                        : "border-divider text-soft-charcoal"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </Section>
        </div>

        {saving && (
          <p className="text-xs text-muted-sage-gray text-center mt-4">Saving...</p>
        )}
      </div>
    </SidebarLayout>
  );
}

/* ── Shared Components ─────────────────────────────────────────── */

function Section({ title, icon: Icon, disabled, children }) {
  return (
    <div className={`bg-white rounded-vara-lg border border-divider p-vara-lg ${disabled ? "opacity-50" : ""}`}>
      <h3 className="text-vara-base font-semibold text-soft-charcoal flex items-center gap-2 mb-4">
        <Icon size={18} className="text-evergreen-teal" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <label className={`flex items-center justify-between ${disabled ? "pointer-events-none" : "cursor-pointer"}`}>
      <span className="text-sm text-soft-charcoal">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          checked ? "bg-evergreen-teal" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </label>
  );
}

function TimeInput({ label, value, onChange }) {
  const timeStr = `${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}`;
  return (
    <div>
      <label className="block text-xs text-muted-sage-gray mb-1">{label}</label>
      <input
        type="time"
        value={timeStr}
        onChange={(e) => {
          const [h, m] = e.target.value.split(":").map(Number);
          onChange({ hour: h, minute: m });
        }}
        className="border border-divider rounded-lg px-3 py-2 text-sm text-soft-charcoal"
      />
    </div>
  );
}
