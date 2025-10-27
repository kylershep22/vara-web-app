// src/pages/DailyWellness.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SidebarLayout from "../components/layout/SidebarLayout";
import {
  CalendarHeart,
  Brain,
  Wind,
  NotebookPen,
  Zap,
  TrendingUp,
  Loader2,
  CheckCircle2
} from "lucide-react";

import axios from "axios";
import { db } from "../firebase";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { Editor } from "@tinymce/tinymce-react";

/**
 * TODAY page (formerly "Daily Wellness")
 * - AM/PM ritual: Focus → Act → Reflect
 * - AI plan fetch with graceful fallback
 * - Quick actions deep-link to existing pages
 * - Reflection now uses rich text + mood + tags (parity with Journal page)
 * - Draft autosaves per day + period in localStorage
 * - "Save as Today's Plan" writes AI items to Firestore (plans collection)
 */

// Update this if your function URL differs
const API_URL = "/api/ai/dailyPlan";

// localStorage keys
const AMPM_KEY = "vara-today-ampm"; // "am" | "pm"
const REF_DRAFT_KEY = (dateStr, period) => `vara-reflection-html-${dateStr}-${period}`;
const REF_MOOD_KEY = (dateStr, period) => `vara-reflection-mood-${dateStr}-${period}`;
const REF_TAGS_KEY = (dateStr, period) => `vara-reflection-tags-${dateStr}-${period}`;

const MOODS = ["😊 Happy", "😢 Sad", "😐 Neutral", "😠 Frustrated", "😌 Calm"];

export default function DailyWellness() {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [planItems, setPlanItems] = useState([]); // JS only

  // Reflection composer (rich) — parity with Journal
  const todayStr = yyyymmdd(new Date());
  const [isEvening, setIsEvening] = useState(() => {
    const saved = localStorage.getItem(AMPM_KEY);
    if (saved === "am") return false;
    if (saved === "pm") return true;
    const hour = new Date().getHours();
    return hour >= 16; // default PM after 4pm
  });
  const period = isEvening ? "pm" : "am";

  const [refHtml, setRefHtml] = useState("");
  const [refMood, setRefMood] = useState("");
  const [refTags, setRefTags] = useState([]);
  const [refTagInput, setRefTagInput] = useState("");
  const [savingRef, setSavingRef] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  // Keep AM/PM preference
  useEffect(() => {
    localStorage.setItem(AMPM_KEY, period);
  }, [period]);

  // Load rich reflection draft/mood/tags for current day/period
  useEffect(() => {
    const html = localStorage.getItem(REF_DRAFT_KEY(todayStr, period));
    const mood = localStorage.getItem(REF_MOOD_KEY(todayStr, period));
    const tagsRaw = localStorage.getItem(REF_TAGS_KEY(todayStr, period));
    setRefHtml(html || "");
    setRefMood(mood || "");
    setRefTags(tagsRaw ? safeParseTags(tagsRaw) : []);
    setRefTagInput("");
  }, [todayStr, period]);

  // Autosave rich reflection draft/mood/tags
  useEffect(() => {
    localStorage.setItem(REF_DRAFT_KEY(todayStr, period), refHtml);
  }, [refHtml, todayStr, period]);

  useEffect(() => {
    if (refMood) localStorage.setItem(REF_MOOD_KEY(todayStr, period), refMood);
    else localStorage.removeItem(REF_MOOD_KEY(todayStr, period));
  }, [refMood, todayStr, period]);

  useEffect(() => {
    if (refTags?.length) localStorage.setItem(REF_TAGS_KEY(todayStr, period), JSON.stringify(refTags));
    else localStorage.removeItem(REF_TAGS_KEY(todayStr, period));
  }, [refTags, todayStr, period]);

  // Fetch AI plan on mount / toggle
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoadingPlan(true);
        const payload = {
          userId: user?.uid ?? null,
          context: { timeOfDay: isEvening ? "evening" : "morning" }
        };
        const res = await axios.post(API_URL, payload);
        if (!ignore) {
          const items = Array.isArray(res?.data?.items) ? res.data.items : [];
          setPlanItems(items.length ? items : defaultPlan(isEvening));
        }
      } catch (_) {
        if (!ignore) setPlanItems(defaultPlan(isEvening));
      } finally {
        if (!ignore) setLoadingPlan(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, [isEvening, user?.uid]);

  // Quick actions (adjust routes to your app)
  const quickActions = useMemo(
    () => [
      { label: "Meditate", icon: Brain, to: "/library?tab=meditation" },
      { label: "Breathe", icon: Wind, to: "/library?tab=breathwork" },
      { label: "Journal", icon: NotebookPen, to: "/journal" },
      { label: "Log Progress", icon: TrendingUp, to: "/goals-habits" }
    ],
    []
  );

  // Save reflection to Firestore (rich + mood + tags)
  const saveReflection = async () => {
    if (!user?.uid || !stripHtml(refHtml).trim()) return;
    try {
      setSavingRef(true);
      const refDoc = await addDoc(collection(db, "journal_entries"), {
        userId: user.uid,
        entryType: "reflection",
        text: refHtml,                   // HTML from TinyMCE
        tags: refTags,                   // array of strings
        mood: refMood,                   // string or ""
        period,                          // 'am' | 'pm'
        yyyymmdd: todayStr,              // YYYY-MM-DD
        createdAt: Timestamp.now()       // concrete timestamp for immediate visibility
      });
      // Clear local state + draft for this day/period
      localStorage.removeItem(REF_DRAFT_KEY(todayStr, period));
      localStorage.removeItem(REF_MOOD_KEY(todayStr, period));
      localStorage.removeItem(REF_TAGS_KEY(todayStr, period));
      setRefHtml("");
      setRefMood("");
      setRefTags([]);
      setRefTagInput("");
      console.log("Saved daily reflection id:", refDoc.id);
    } finally {
      setSavingRef(false);
    }
  };

  // Save AI plan as today's locked plan in Firestore
  const savePlan = async () => {
    if (!user?.uid || !planItems.length) return;
    try {
      setSavingPlan(true);
      await addDoc(collection(db, "plans"), {
        userId: user.uid,
        items: planItems,
        yyyymmdd: todayStr,
        period,
        createdAt: serverTimestamp(),
        source: "ai" // helpful for analytics
      });
    } finally {
      setSavingPlan(false);
    }
  };

  // Tag helpers
  const addRefTag = () => {
    const cleaned = (refTagInput || "").trim().toLowerCase();
    if (!cleaned) return;
    if (!refTags.includes(cleaned)) {
      setRefTags([...refTags, cleaned]);
    }
    setRefTagInput("");
  };
  const removeRefTag = (t) => setRefTags(refTags.filter((x) => x !== t));

  return (
    <SidebarLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <CalendarHeart size={28} className="text-[#1B5E57]" />
            <h1 className="text-2xl font-semibold text-[#3E3E3E]">Today</h1>
          </div>

          {/* AM / PM toggle */}
          <div className="inline-flex items-center rounded-xl border border-[#D5E3D1] overflow-hidden">
            <button
              type="button"
              onClick={() => setIsEvening(false)}
              className={`px-3 py-1 text-sm font-medium transition ${
                !isEvening ? "bg-[#1B5E57] text-white" : "text-[#3E3E3E] hover:bg-[#D5E3D1]"
              }`}
            >
              Morning
            </button>
            <button
              type="button"
              onClick={() => setIsEvening(true)}
              className={`px-3 py-1 text-sm font-medium transition ${
                isEvening ? "bg-[#1B5E57] text-white" : "text-[#3E3E3E] hover:bg-[#D5E3D1]"
              }`}
            >
              Evening
            </button>
          </div>
        </div>

        <p className="text-[#9AAE8C] mb-6">A simple ritual to focus, act, and reflect—one day at a time.</p>

        {/* Focus: AI Plan */}
        <section className="mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#3E3E3E] mb-3 flex items-center gap-2">
              <Zap size={20} className="text-[#1B5E57]" />
              {isEvening ? "Evening Wind-Down (AI-Recommended)" : "Today’s Focus (AI-Recommended)"}
            </h2>

            {/* Save plan button */}
            <button
              onClick={savePlan}
              disabled={!user || !planItems.length || savingPlan}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition mb-3 ${
                !user || !planItems.length || savingPlan
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : "bg-[#1B5E57] text-white hover:bg-[#164e48]"
              }`}
              title={!user ? "Sign in to save your plan" : "Save as Today's Plan"}
            >
              <CheckCircle2 size={16} />
              {savingPlan ? "Saving…" : "Save as Today’s Plan"}
            </button>
          </div>

          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm space-y-2">
            {loadingPlan ? (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="animate-spin" size={18} /> Building your plan…
              </div>
            ) : (
              <>
                <ul className="list-disc ml-5 text-[#3E3E3E] space-y-1">
                  {planItems.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
                <p className="text-sm text-gray-500">Based on your goals and recent activity.</p>
              </>
            )}
          </div>
        </section>

        {/* Act: Quick Actions */}
        <section className="mb-8">
          <h3 className="text-lg font-semibold text-[#3E3E3E] mb-4">Do Now</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {quickActions.map((action, i) => (
              <Link
                key={i}
                to={action.to}
                className="flex flex-col items-center gap-2 bg-[#D5E3D1] hover:bg-[#B8CDBA] text-[#1B5E57] px-4 py-3 rounded-xl font-medium shadow-sm transition"
              >
                <action.icon size={24} />
                <span className="text-sm">{action.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Reflect (rich) */}
        <section className="mb-12">
          <h3 className="text-lg font-semibold text-[#3E3E3E] mb-3">
            {isEvening ? "Daily Reflection" : "Set Your Intention"}
          </h3>
          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm space-y-3">
            <p className="text-[#3E3E3E]">
              {isEvening
                ? "What’s one thing you’re grateful for or proud of today?"
                : "What would make today feel meaningful?"}
            </p>

            {/* Rich editor */}
            <Editor
              apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
              value={refHtml}
              init={{
                height: 160,
                menubar: false,
                plugins: "lists link emoticons",
                toolbar: "undo redo | bold italic underline | bullist numlist | link emoticons",
              }}
              onEditorChange={setRefHtml}
            />

            {/* Mood + tags */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Mood"
                className="border border-[#D5E3D1] rounded px-3 py-2 text-sm"
                value={refMood}
                onChange={(e) => setRefMood(e.target.value)}
              >
                <option value="">Select Mood</option>
                {MOODS.map((m, i) => (
                  <option key={i} value={m}>{m}</option>
                ))}
              </select>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={refTagInput}
                  onChange={(e) => setRefTagInput(e.target.value)}
                  placeholder="Add tag…"
                  className="border border-[#D5E3D1] rounded px-3 py-2 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && addRefTag()}
                />
                <button
                  onClick={addRefTag}
                  className="bg-[#1B5E57] text-white px-3 py-2 rounded text-xs hover:bg-[#164e48]"
                >
                  Add
                </button>
              </div>

              {refTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {refTags.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => removeRefTag(t)}
                      className="bg-[#D5E3D1] text-[#1B5E57] text-xs px-2 py-1 rounded-full"
                      title="Remove tag"
                      type="button"
                    >
                      #{t} ✕
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end mt-2 gap-2">
              <button
                onClick={() => {
                  setRefHtml("");
                  setRefMood("");
                  setRefTags([]);
                  setRefTagInput("");
                  localStorage.removeItem(REF_DRAFT_KEY(todayStr, period));
                  localStorage.removeItem(REF_MOOD_KEY(todayStr, period));
                  localStorage.removeItem(REF_TAGS_KEY(todayStr, period));
                }}
                className="px-3 py-2 border border-[#D5E3D1] rounded-lg text-sm text-[#3E3E3E] hover:bg-[#F3F6F2] transition"
              >
                Clear
              </button>
              <button
                onClick={saveReflection}
                disabled={!stripHtml(refHtml).trim() || savingRef || !user}
                className={`px-4 py-2 rounded-lg text-sm transition ${
                  !stripHtml(refHtml).trim() || savingRef || !user
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-[#1B5E57] text-white hover:bg-[#164e48]"
                }`}
                title={!user ? "Sign in to save reflections" : "Save reflection"}
              >
                {savingRef ? "Saving…" : "Save"}
              </button>
            </div>
            {!user && <p className="text-xs text-gray-500">Sign in to save reflections.</p>}
          </div>
        </section>

        {/* Optional: Progress blurb */}
        <section className="mb-16">
          <h3 className="text-lg font-semibold text-[#3E3E3E] mb-3">Streak & Wins</h3>
          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm text-sm text-gray-600">
            Keep eyes on the win: complete your plan and log one reflection to extend your streak.
          </div>
        </section>
      </div>
    </SidebarLayout>
  );
}

// --- helpers ---
function yyyymmdd(d = new Date()) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultPlan(isEvening) {
  return isEvening
    ? [
        "Do 1–2 minutes of box breathing to unwind",
        "Capture 1 win and 1 lesson in your journal",
        "Prepare tomorrow’s top 3"
      ]
    : [
        "2 minutes of mindful breathing to center",
        "Move your body for 10–20 minutes",
        "Write 3 gratitudes or your main intention"
      ];
}

// Strip HTML to validate non-empty content
function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html || "";
  return tmp.textContent || tmp.innerText || "";
}

function safeParseTags(json) {
  try { const v = JSON.parse(json); return Array.isArray(v) ? v : []; }
  catch { return []; }
}





