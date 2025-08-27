// src/pages/SleepRecovery.jsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import {
  Moon,
  NotebookPen,
  Star,
  Wind,
  BookOpenCheck,
  History as HistoryIcon,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Sparkles,
  Coffee,
  Monitor,
  StretchHorizontal,
  Music2,
  AlarmClock,
  Sunrise,
  Save,
  TimerReset,
  Loader
} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import { db } from '../firebase';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from 'firebase/firestore';

import { useAuth } from '../context/AuthContext';

const TEAL = '#1B5E57';
const CHARCOAL = '#3E3E3E';
const SAGE = '#D5E3D1';
const OLIVE = '#9AAE8C';

const DEFAULT_BEDTIME_STEPS = [
  { id: cryptoRandomId(), label: 'Dim lights / blue‑light blockers', type: 'environment', minutes: 5, enabled: true },
  { id: cryptoRandomId(), label: 'Light stretch or mobility', type: 'movement', minutes: 10, enabled: true },
  { id: cryptoRandomId(), label: 'Breathwork (4‑7‑8 or box)', type: 'breathwork', minutes: 5, enabled: true },
  { id: cryptoRandomId(), label: 'Read a physical book', type: 'reading', minutes: 10, enabled: true },
  { id: cryptoRandomId(), label: 'Gratitude reflection', type: 'reflection', minutes: 5, enabled: true }
];

const DEFAULT_WAKE_STEPS = [
  { id: cryptoRandomId(), label: 'Get light within 30 minutes', type: 'light', minutes: 5, enabled: true },
  { id: cryptoRandomId(), label: 'Hydrate', type: 'hydrate', minutes: 2, enabled: true },
  { id: cryptoRandomId(), label: '2‑minute breath reset', type: 'breathwork', minutes: 2, enabled: true },
  { id: cryptoRandomId(), label: 'Quick plan for the day', type: 'plan', minutes: 3, enabled: true }
];

function cryptoRandomId() {
  // Reliable unique-ish id without external deps
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function minutesToLabel(m) {
  if (!m && m !== 0) return '';
  return m === 1 ? '1 min' : `${m} mins`;
}

function parseTimeToMinutes(str) {
  // expects "HH:MM" (24h) from <input type="time">
  if (!str || !/^\d{2}:\d{2}$/.test(str)) return null;
  const [h, m] = str.split(':').map(Number);
  return h * 60 + m;
}

function durationBetweenTimes(startHHMM, endHHMM) {
  // handles crossing midnight
  const start = parseTimeToMinutes(startHHMM);
  const end = parseTimeToMinutes(endHHMM);
  if (start == null || end == null) return null;
  let diff = end - start;
  if (diff < 0) diff += 24 * 60;
  return diff; // minutes
}

export default function SleepRecovery() {
  const { user, isAuthReady } = useAuth();
  const navigate = useNavigate();

  const [activeRoutineTab, setActiveRoutineTab] = useState('bedtime'); // 'bedtime' | 'wake'
  const [bedtimeSteps, setBedtimeSteps] = useState([]);
  const [wakeSteps, setWakeSteps] = useState([]);
  const [savingRoutine, setSavingRoutine] = useState(false);
  const [loadingRoutines, setLoadingRoutines] = useState(true);

  // Sleep Log state
  const [rating, setRating] = useState(7);
  const [bedtime, setBedtime] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [followedRoutine, setFollowedRoutine] = useState(false);
  const [notes, setNotes] = useState('');
  const [flagCaffeineLate, setFlagCaffeineLate] = useState(false);
  const [flagScreensLate, setFlagScreensLate] = useState(false);
  const [flagLateMeal, setFlagLateMeal] = useState(false);
  const [flagWorkoutLate, setFlagWorkoutLate] = useState(false);
  const [savingLog, setSavingLog] = useState(false);

  // History
  const [sleepLogs, setSleepLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Library audio
  const [audioItems, setAudioItems] = useState([]);
  const [loadingAudio, setLoadingAudio] = useState(true);
  const audioRef = useRef(null);
  const [currentAudioId, setCurrentAudioId] = useState(null);

  // Derived values
  const totalBedtimeMinutes = useMemo(
    () => bedtimeSteps.filter(s => s.enabled).reduce((sum, s) => sum + (Number(s.minutes) || 0), 0),
    [bedtimeSteps]
  );
  const totalWakeMinutes = useMemo(
    () => wakeSteps.filter(s => s.enabled).reduce((sum, s) => sum + (Number(s.minutes) || 0), 0),
    [wakeSteps]
  );
  const sleptMinutes = useMemo(() => durationBetweenTimes(bedtime, wakeTime), [bedtime, wakeTime]);
  const sleptHoursLabel = useMemo(() => {
    if (sleptMinutes == null) return '';
    const h = Math.floor(sleptMinutes / 60);
    const m = sleptMinutes % 60;
    return `${h}h ${m}m`;
    }, [sleptMinutes]
  );

  // ----- Load Routines -----
  useEffect(() => {
    if (!isAuthReady || !user) return;
    (async () => {
      setLoadingRoutines(true);
      try {
        const routinesRef = doc(db, 'sleepRoutines', user.uid);
        const snap = await getDoc(routinesRef);
        if (snap.exists()) {
          const data = snap.data();
          setBedtimeSteps(
            Array.isArray(data.bedtimeRoutine) && data.bedtimeRoutine.length > 0
              ? data.bedtimeRoutine
              : DEFAULT_BEDTIME_STEPS
          );
          setWakeSteps(
            Array.isArray(data.wakeRoutine) && data.wakeRoutine.length > 0
              ? data.wakeRoutine
              : DEFAULT_WAKE_STEPS
          );
        } else {
          setBedtimeSteps(DEFAULT_BEDTIME_STEPS);
          setWakeSteps(DEFAULT_WAKE_STEPS);
        }
      } catch (e) {
        console.error('Load routines error', e);
        setBedtimeSteps(DEFAULT_BEDTIME_STEPS);
        setWakeSteps(DEFAULT_WAKE_STEPS);
      } finally {
        setLoadingRoutines(false);
      }
    })();
  }, [isAuthReady, user]);

  // ----- Save Routines -----
  const saveRoutines = async () => {
    if (!user) return;
    setSavingRoutine(true);
    try {
      const routinesRef = doc(db, 'sleepRoutines', user.uid);
      await setDoc(
        routinesRef,
        {
          bedtimeRoutine: bedtimeSteps,
          wakeRoutine: wakeSteps,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    } catch (e) {
      console.error('Save routines error', e);
    } finally {
      setSavingRoutine(false);
    }
  };

  // ----- Load Sleep Logs -----
  useEffect(() => {
    if (!isAuthReady || !user) return;
    (async () => {
      setLoadingLogs(true);
      try {
        const q = query(
          collection(db, 'sleepLogs'),
          where('userId', '==', user.uid),
          orderBy('loggedAt', 'desc'),
          limit(30)
        );
        const snap = await getDocs(q);
        const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setSleepLogs(rows);
      } catch (e) {
        console.error('Load logs error', e);
      } finally {
        setLoadingLogs(false);
      }
    })();
  }, [isAuthReady, user]);

  // ----- Save Sleep Log -----
  const saveSleepLog = async () => {
    if (!user) return;
    setSavingLog(true);
    try {
      const payload = {
        userId: user.uid,
        rating: Number(rating),
        bedtime: bedtime || null,        // "HH:MM"
        wakeTime: wakeTime || null,      // "HH:MM"
        sleptMinutes: sleptMinutes ?? null,
        notes: notes?.trim() || '',
        flags: {
          caffeineLate: !!flagCaffeineLate,
          screensLate: !!flagScreensLate,
          lateMeal: !!flagLateMeal,
          workoutLate: !!flagWorkoutLate
        },
        followedRoutine: !!followedRoutine,
        loggedAt: serverTimestamp()
      };
      await addDoc(collection(db, 'sleepLogs'), payload);

      // refresh list
      const q = query(
        collection(db, 'sleepLogs'),
        where('userId', '==', user.uid),
        orderBy('loggedAt', 'desc'),
        limit(30)
      );
      const snap = await getDocs(q);
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setSleepLogs(rows);

      // reset quick inputs (keep times to make daily logging faster)
      setRating(7);
      setNotes('');
      setFlagCaffeineLate(false);
      setFlagScreensLate(false);
      setFlagLateMeal(false);
      setFlagWorkoutLate(false);
      setFollowedRoutine(false);
    } catch (e) {
      console.error('Save log error', e);
    } finally {
      setSavingLog(false);
    }
  };

  // ----- Load Library Audio (Sleep category or tag) -----
  useEffect(() => {
    (async () => {
      setLoadingAudio(true);
      try {
        const results = [];

        // 1) category == 'sleep'
        const qCat = query(collection(db, 'wellnessLibrary'), where('category', '==', 'sleep'));
        const snapCat = await getDocs(qCat);
        snapCat.forEach(docu => results.push({ id: docu.id, ...docu.data() }));

        // 2) tags array contains 'sleep' (best effort—duplicates will be deduped)
        const qTag = query(collection(db, 'wellnessLibrary'), where('tags', 'array-contains', 'sleep'));
        const snapTag = await getDocs(qTag);
        snapTag.forEach(docu => results.push({ id: docu.id, ...docu.data() }));

        // Deduplicate by id
        const dedup = Object.values(results.reduce((acc, item) => {
          acc[item.id] = acc[item.id] || item;
          return acc;
        }, {}));

        // Filter to audio only if the library is mixed media
        const filtered = dedup.filter(it => {
          const t = (it.type || '').toLowerCase();
          return t.includes('audio') || t.includes('sound') || t.includes('music') || t.includes('sleep');
        });

        setAudioItems(filtered);
      } catch (e) {
        console.error('Load audio error', e);
        setAudioItems([]);
      } finally {
        setLoadingAudio(false);
      }
    })();
  }, []);

  // ----- Trends / Insights -----
  const trendStats = useMemo(() => {
    if (!sleepLogs || sleepLogs.length === 0) {
      return null;
    }

    const toNumber = v => (typeof v === 'number' ? v : v == null ? null : Number(v));

    const last14 = sleepLogs.slice(0, 14);
    const last7 = sleepLogs.slice(0, 7);
    const prev7 = sleepLogs.slice(7, 14);

    const avg = arr => {
      const nums = arr.map(x => toNumber(x.rating)).filter(v => typeof v === 'number' && !isNaN(v));
      if (nums.length === 0) return null;
      return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
    };

    const avgHours = arr => {
      const nums = arr
        .map(x => toNumber(x.sleptMinutes))
        .filter(v => typeof v === 'number' && !isNaN(v))
        .map(v => v / 60);
      if (nums.length === 0) return null;
      return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
    };

    const a7 = avg(last7);
    const p7 = avg(prev7);
    const a14 = avg(last14);
    const hours14 = avgHours(last14);

    // Simple flag correlations
    const flagAverage = (arr, getter) => {
      const subset = arr.filter(getter);
      return avg(subset);
    };

    const withScreens = flagAverage(last14, x => x?.flags?.screensLate);
    const withoutScreens = avg(last14.filter(x => !x?.flags?.screensLate));

    const withCaffeine = flagAverage(last14, x => x?.flags?.caffeineLate);
    const withoutCaffeine = avg(last14.filter(x => !x?.flags?.caffeineLate));

    const withLateMeal = flagAverage(last14, x => x?.flags?.lateMeal);
    const withoutLateMeal = avg(last14.filter(x => !x?.flags?.lateMeal));

    const withWorkoutLate = flagAverage(last14, x => x?.flags?.workoutLate);
    const withoutWorkoutLate = avg(last14.filter(x => !x?.flags?.workoutLate));

    const withRoutine = flagAverage(last14, x => x?.followedRoutine);
    const withoutRoutine = avg(last14.filter(x => !x?.followedRoutine));

    return {
      avg7: a7,
      prev7: p7,
      avg14: a14,
      hours14,
      diffs: {
        screens: (withScreens && withoutScreens) ? (Number(withScreens) - Number(withoutScreens)).toFixed(1) : null,
        caffeine: (withCaffeine && withoutCaffeine) ? (Number(withCaffeine) - Number(withoutCaffeine)).toFixed(1) : null,
        lateMeal: (withLateMeal && withoutLateMeal) ? (Number(withLateMeal) - Number(withoutLateMeal)).toFixed(1) : null,
        workoutLate: (withWorkoutLate && withoutWorkoutLate) ? (Number(withWorkoutLate) - Number(withoutWorkoutLate)).toFixed(1) : null,
        routine: (withRoutine && withoutRoutine) ? (Number(withRoutine) - Number(withoutRoutine)).toFixed(1) : null
      }
    };
  }, [sleepLogs]);

  // ----- UI helpers for routines -----
  const addStep = (kind) => {
    const newStep = {
      id: cryptoRandomId(),
      label: kind === 'wake' ? 'New wake step' : 'New bedtime step',
      type: 'custom',
      minutes: 5,
      enabled: true
    };
    if (kind === 'wake') {
      setWakeSteps(prev => [...prev, newStep]);
    } else {
      setBedtimeSteps(prev => [...prev, newStep]);
    }
  };

  const updateStep = (kind, id, patch) => {
    const apply = (arr) => arr.map(s => (s.id === id ? { ...s, ...patch } : s));
    if (kind === 'wake') setWakeSteps(prev => apply(prev));
    else setBedtimeSteps(prev => apply(prev));
  };

  const removeStep = (kind, id) => {
    const apply = (arr) => arr.filter(s => s.id !== id);
    if (kind === 'wake') setWakeSteps(prev => apply(prev));
    else setBedtimeSteps(prev => apply(prev));
  };

  const moveStep = (kind, id, dir) => {
    const apply = (arr) => {
      const idx = arr.findIndex(s => s.id === id);
      if (idx < 0) return arr;
      const newArr = [...arr];
      const swapWith = dir === 'up' ? idx - 1 : idx + 1;
      if (swapWith < 0 || swapWith >= newArr.length) return arr;
      const temp = newArr[idx];
      newArr[idx] = newArr[swapWith];
      newArr[swapWith] = temp;
      return newArr;
    };
    if (kind === 'wake') setWakeSteps(prev => apply(prev));
    else setBedtimeSteps(prev => apply(prev));
  };

  // ----- Audio playback -----
  const playAudio = (id, url) => {
    if (!audioRef.current) return;
    if (currentAudioId === id && !audioRef.current.paused) {
      audioRef.current.pause();
      setCurrentAudioId(null);
      return;
    }
    audioRef.current.src = url;
    audioRef.current.play().catch(err => console.error('Audio play error', err));
    setCurrentAudioId(id);
  };

  // ----- Render -----
  return (
    <SidebarLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-2">
          <Moon size={28} className="text-[#1B5E57]" />
          <h1 className="text-2xl font-semibold text-[#3E3E3E]">Sleep & Recovery</h1>
        </div>
        <p className="text-[#9AAE8C] mb-6">
          Design your ideal night and morning routines, log your sleep quality, and spot patterns that help you recover better.
        </p>

        {/* Sleep Log & Rating */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[#3E3E3E] mb-3 flex items-center gap-2">
            <NotebookPen size={20} className="text-[#1B5E57]" />
            Sleep Log & Rating
          </h2>

          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-[#3E3E3E] mb-2">Quality rating (1–10)</label>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">1</span>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={rating}
                    onChange={e => setRating(Number(e.target.value))}
                    className="w-full accent-[#1B5E57]"
                  />
                  <span className="text-xs text-gray-500">10</span>
                  <div className="min-w-10 text-center font-semibold text-[#1B5E57]">{rating}</div>
                </div>
              </div>

              {/* Times */}
              <div>
                <label className="block text-sm font-medium text-[#3E3E3E] mb-2">Bedtime</label>
                <input
                  type="time"
                  value={bedtime}
                  onChange={e => setBedtime(e.target.value)}
                  className="w-full rounded-xl border border-[#D5E3D1] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B5E57]/30"
                />
                <label className="block text-sm font-medium text-[#3E3E3E] mb-2 mt-4">Wake time</label>
                <input
                  type="time"
                  value={wakeTime}
                  onChange={e => setWakeTime(e.target.value)}
                  className="w-full rounded-xl border border-[#D5E3D1] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B5E57]/30"
                />
                <div className="text-xs text-gray-500 mt-2">
                  {sleptMinutes != null ? `Estimated duration: ${sleptHoursLabel}` : 'Enter both times to estimate duration'}
                </div>
              </div>

              {/* Flags */}
              <div>
                <label className="block text-sm font-medium text-[#3E3E3E] mb-2">Last evening factors</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="accent-[#1B5E57]" checked={flagScreensLate} onChange={e => setFlagScreensLate(e.target.checked)} />
                    <span className="text-sm text-[#3E3E3E] flex items-center gap-1"><Monitor size={14} /> Screens late</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="accent-[#1B5E57]" checked={flagCaffeineLate} onChange={e => setFlagCaffeineLate(e.target.checked)} />
                    <span className="text-sm text-[#3E3E3E] flex items-center gap-1"><Coffee size={14} /> Caffeine late</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="accent-[#1B5E57]" checked={flagLateMeal} onChange={e => setFlagLateMeal(e.target.checked)} />
                    <span className="text-sm text-[#3E3E3E] flex items-center gap-1"><StretchHorizontal size={14} /> Late/heavy meal</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="accent-[#1B5E57]" checked={flagWorkoutLate} onChange={e => setFlagWorkoutLate(e.target.checked)} />
                    <span className="text-sm text-[#3E3E3E] flex items-center gap-1"><Sparkles size={14} /> Late workout</span>
                  </label>
                  <label className="flex items-center gap-2 col-span-2">
                    <input type="checkbox" className="accent-[#1B5E57]" checked={followedRoutine} onChange={e => setFollowedRoutine(e.target.checked)} />
                    <span className="text-sm text-[#3E3E3E] flex items-center gap-1"><CheckCircle2 size={14} /> I followed my bedtime routine</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-[#3E3E3E] mb-2">Notes (optional)</label>
              <textarea
                rows={3}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Anything notable about last night?"
                className="w-full rounded-xl border border-[#D5E3D1] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B5E57]/30"
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={saveSleepLog}
                disabled={savingLog || !user}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] text-white font-medium shadow-sm disabled:opacity-50"
              >
                {savingLog ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
                Save Today’s Log
              </button>
              <button
                onClick={() => {
                  setRating(7);
                  setNotes('');
                  setFlagCaffeineLate(false);
                  setFlagScreensLate(false);
                  setFlagLateMeal(false);
                  setFlagWorkoutLate(false);
                  setFollowedRoutine(false);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#D5E3D1] text-[#3E3E3E] bg-white"
              >
                <TimerReset size={16} />
                Reset
              </button>
            </div>
          </div>
        </section>

        {/* Routine Builder (Bedtime / Wake) */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-[#3E3E3E] flex items-center gap-2">
              <Star size={20} className="text-[#1B5E57]" />
              Routines
            </h2>
            <div className="bg-[#D5E3D1] rounded-full p-1 flex">
              <button
                className={`px-3 py-1 rounded-full text-sm font-medium ${activeRoutineTab === 'bedtime' ? 'bg-[#1B5E57] text-white' : 'text-[#3E3E3E]'}`}
                onClick={() => setActiveRoutineTab('bedtime')}
              >
                Bedtime
              </button>
              <button
                className={`px-3 py-1 rounded-full text-sm font-medium ${activeRoutineTab === 'wake' ? 'bg-[#1B5E57] text-white' : 'text-[#3E3E3E]'}`}
                onClick={() => setActiveRoutineTab('wake')}
              >
                Wake‑Up
              </button>
            </div>
          </div>

          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm">
            {loadingRoutines ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader className="animate-spin" size={16} />
                Loading your routines…
              </div>
            ) : (
              <>
                <RoutineList
                  kind={activeRoutineTab}
                  steps={activeRoutineTab === 'wake' ? wakeSteps : bedtimeSteps}
                  onAdd={() => addStep(activeRoutineTab)}
                  onUpdate={updateStep}
                  onRemove={removeStep}
                  onMove={moveStep}
                  totalMinutes={activeRoutineTab === 'wake' ? totalWakeMinutes : totalBedtimeMinutes}
                />

                <div className="mt-4">
                  <button
                    onClick={saveRoutines}
                    disabled={savingRoutine || !user}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] text-white font-medium shadow-sm disabled:opacity-50"
                  >
                    {savingRoutine ? <Loader className="animate-spin" size={16} /> : <Save size={16} />}
                    Save {activeRoutineTab === 'wake' ? 'Wake‑Up' : 'Bedtime'} Routine
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Bedtime Breathwork / Stories / Soundscapes */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[#3E3E3E] mb-3 flex items-center gap-2">
            <Wind size={20} className="text-[#1B5E57]" />
            Sleep Sounds & Stories
          </h2>
          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm">
            {loadingAudio ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader className="animate-spin" size={16} />
                Loading audio…
              </div>
            ) : audioItems.length === 0 ? (
              <div className="text-sm text-gray-600">
                No sleep‑focused audio found in your Wellness Library yet. Add items in the Library, and they will appear here.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {audioItems.map(item => (
                    <div key={item.id} className="border border-[#D5E3D1] rounded-xl p-4 bg-white/70">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-[#3E3E3E]">{item.title || 'Untitled Audio'}</div>
                          <div className="text-xs text-gray-500">
                            {(item.duration && typeof item.duration === 'number') ? minutesToLabel(item.duration) : '—'}
                          </div>
                        </div>
                        <button
                          onClick={() => playAudio(item.id, item.url || item.audioUrl || '')}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#D5E3D1] text-[#3E3E3E] bg-white hover:bg-gray-50"
                        >
                          <Music2 size={16} />
                          {currentAudioId === item.id ? 'Pause' : 'Play'}
                        </button>
                      </div>
                      {item.description ? (
                        <p className="text-sm text-gray-600 mt-2 line-clamp-3">{item.description}</p>
                      ) : null}
                      {item.tags && Array.isArray(item.tags) && item.tags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {item.tags.slice(0, 6).map(t => (
                            <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-[#D5E3D1] text-[#1B5E57]">{t}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
                <audio ref={audioRef} className="hidden" />
              </>
            )}
          </div>
        </section>

        {/* History & Trends */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[#3E3E3E] mb-3 flex items-center gap-2">
            <HistoryIcon size={20} className="text-[#1B5E57]" />
            Recent Sleep History & Trends
          </h2>

          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm">
            {loadingLogs ? (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Loader className="animate-spin" size={16} />
                Loading history…
              </div>
            ) : sleepLogs.length === 0 ? (
              <div className="text-sm text-gray-600">No logs yet. Save a sleep log above and your history and trends will appear here.</div>
            ) : (
              <>
                {/* Trend chips */}
                {trendStats && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    <TrendChip label="Avg last 7 days" value={trendStats.avg7} />
                    <TrendChip label="Prev 7 days" value={trendStats.prev7} muted />
                    <TrendChip label="Avg last 14" value={trendStats.avg14} />
                    <TrendChip label="Avg hours (14d)" value={trendStats.hours14} />
                    {trendStats.diffs?.routine && (
                      <TrendChip
                        label="Routine vs not"
                        value={`${trendStats.diffs.routine} Δ`}
                        tooltip="Positive means routine days rated higher"
                      />
                    )}
                    {trendStats.diffs?.screens && (
                      <TrendChip
                        label="Screens late impact"
                        value={`${trendStats.diffs.screens} Δ`}
                        tooltip="Negative means screens late correlate with worse sleep"
                      />
                    )}
                    {trendStats.diffs?.caffeine && (
                      <TrendChip label="Caffeine late impact" value={`${trendStats.diffs.caffeine} Δ`} />
                    )}
                    {trendStats.diffs?.lateMeal && (
                      <TrendChip label="Late meal impact" value={`${trendStats.diffs.lateMeal} Δ`} />
                    )}
                    {trendStats.diffs?.workoutLate && (
                      <TrendChip label="Late workout impact" value={`${trendStats.diffs.workoutLate} Δ`} />
                    )}
                  </div>
                )}

                {/* Compact “sparkline” style bars (no external chart lib) */}
                <div className="mb-4">
                  <div className="text-xs text-gray-600 mb-2">Last 14 days (higher is better)</div>
                  <div className="flex items-end gap-1 h-20">
                    {sleepLogs.slice(0, 14).reverse().map((log, idx) => {
                      const val = Math.max(1, Math.min(10, Number(log.rating) || 1));
                      const height = (val / 10) * 80; // up to 80px
                      return (
                        <div
                          key={log.id}
                          title={`Day ${14 - idx}: ${val}/10`}
                          className="w-3 rounded-t"
                          style={{ height: `${height}px`, background: 'linear-gradient(180deg, #1B5E57, #B8CDBA)' }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-auto rounded-xl border border-[#D5E3D1]">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[#F8FBF7]">
                      <tr className="text-left text-[#3E3E3E]">
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2">Rating</th>
                        <th className="px-4 py-2">Duration</th>
                        <th className="px-4 py-2">Flags</th>
                        <th className="px-4 py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sleepLogs.slice(0, 14).map(row => {
                        const d = row.loggedAt?.toDate?.() || (row.loggedAt instanceof Timestamp ? row.loggedAt.toDate() : null);
                        const dateLabel = d ? d.toLocaleDateString() : '—';
                        const duration = typeof row.sleptMinutes === 'number'
                          ? `${Math.floor(row.sleptMinutes / 60)}h ${row.sleptMinutes % 60}m`
                          : '—';
                        const flags = [
                          row.flags?.screensLate ? 'screens' : null,
                          row.flags?.caffeineLate ? 'caffeine' : null,
                          row.flags?.lateMeal ? 'late meal' : null,
                          row.flags?.workoutLate ? 'late workout' : null,
                          row.followedRoutine ? 'routine ✔' : null
                        ].filter(Boolean).join(', ');
                        return (
                          <tr key={row.id} className="border-t border-[#D5E3D1]">
                            <td className="px-4 py-2 text-[#3E3E3E]">{dateLabel}</td>
                            <td className="px-4 py-2 font-medium text-[#1B5E57]">{row.rating ?? '—'}</td>
                            <td className="px-4 py-2 text-[#3E3E3E]">{duration}</td>
                            <td className="px-4 py-2 text-[#3E3E3E]">{flags || '—'}</td>
                            <td className="px-4 py-2 text-[#3E3E3E]">
                              <span className="line-clamp-2">{row.notes || '—'}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Evening Reflection Hand‑Off */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-[#3E3E3E] mb-3 flex items-center gap-2">
            <BookOpenCheck size={20} className="text-[#1B5E57]" />
            Evening Reflection (via Journal)
          </h2>
          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm flex items-center justify-between gap-4">
            <p className="text-[#3E3E3E] text-sm">
              Keep journaling centralized. We’ll send you to your Journal with a sleep‑focused prompt so everything stays in one place.
            </p>
            <button
              onClick={() => {
                navigate('/journal', {
                  state: {
                    suggestedPrompt:
                      'Quick sleep reflection: 1) What helped me wind down tonight? 2) Any stressors I can offload for tomorrow? 3) One gratitude.'
                  }
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#D5E3D1] hover:bg-gray-50 text-[#3E3E3E]"
            >
              <NotebookPen size={16} />
              Open Journal with Prompt
            </button>
          </div>
        </section>
      </div>
    </SidebarLayout>
  );
}

/* ------------------------- Subcomponents ------------------------- */

function RoutineList({ kind, steps, onAdd, onUpdate, onRemove, onMove, totalMinutes }) {
  const headerIcon = kind === 'wake' ? <Sunrise size={16} className="text-[#1B5E57]" /> : <Moon size={16} className="text-[#1B5E57]" />;
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="text-sm text-[#3E3E3E] flex items-center gap-2">
          {headerIcon}
          <span className="font-medium">{kind === 'wake' ? 'Wake‑Up' : 'Bedtime'} routine</span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-600">~ {minutesToLabel(totalMinutes)} active</span>
        </div>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#D5E3D1] text-[#3E3E3E] bg-white hover:bg-gray-50"
        >
          <Plus size={16} />
          Add step
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {steps.length === 0 ? (
          <div className="text-sm text-gray-600">No steps yet—add your first step.</div>
        ) : (
          steps.map((s, idx) => (
            <div key={s.id} className="border border-[#D5E3D1] rounded-xl p-3 bg-white/70">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                <div className="md:col-span-5">
                  <label className="text-xs text-gray-600 block mb-1">Label</label>
                  <input
                    type="text"
                    value={s.label}
                    onChange={e => onUpdate(kind, s.id, { label: e.target.value })}
                    className="w-full rounded-lg border border-[#D5E3D1] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B5E57]/30"
                    placeholder={kind === 'wake' ? 'e.g., Morning light' : 'e.g., Read fiction'}
                  />
                </div>

                <div className="md:col-span-3">
                  <label className="text-xs text-gray-600 block mb-1">Type</label>
                  <select
                    value={s.type}
                    onChange={e => onUpdate(kind, s.id, { type: e.target.value })}
                    className="w-full rounded-lg border border-[#D5E3D1] px-3 py-2 bg-white"
                  >
                    <option value="custom">Custom</option>
                    <option value="breathwork">Breathwork</option>
                    <option value="movement">Movement</option>
                    <option value="reading">Reading</option>
                    <option value="environment">Environment</option>
                    <option value="reflection">Reflection</option>
                    <option value="light">Morning Light</option>
                    <option value="hydrate">Hydrate</option>
                    <option value="plan">Plan</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-gray-600 block mb-1">Minutes</label>
                  <input
                    type="number"
                    min={0}
                    value={s.minutes}
                    onChange={e => onUpdate(kind, s.id, { minutes: Number(e.target.value) })}
                    className="w-full rounded-lg border border-[#D5E3D1] px-3 py-2"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs text-gray-600 block mb-1">Enabled</label>
                  <div className="flex items-center h-[42px]">
                    <input
                      type="checkbox"
                      checked={!!s.enabled}
                      onChange={e => onUpdate(kind, s.id, { enabled: e.target.checked })}
                      className="accent-[#1B5E57] scale-110"
                    />
                  </div>
                </div>

                <div className="md:col-span-12 flex items-center justify-between md:justify-end gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onMove(kind, s.id, 'up')}
                      className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-[#D5E3D1] text-[#3E3E3E] bg-white"
                      title="Move up"
                    >
                      <ArrowUp size={16} /> Up
                    </button>
                    <button
                      onClick={() => onMove(kind, s.id, 'down')}
                      className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-[#D5E3D1] text-[#3E3E3E] bg-white"
                      title="Move down"
                    >
                      <ArrowDown size={16} /> Down
                    </button>
                  </div>
                  <button
                    onClick={() => onRemove(kind, s.id)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white bg-gradient-to-r from-rose-500 to-rose-400"
                    title="Remove"
                  >
                    <Trash2 size={16} /> Remove
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function TrendChip({ label, value, muted = false, tooltip }) {
  return (
    <div
      title={tooltip || ''}
      className={`px-3 py-1.5 rounded-full border ${
        muted ? 'border-[#D5E3D1] bg-white text-gray-600' : 'border-[#B8CDBA] bg-[#F5FFF8] text-[#1B5E57]'
      } text-xs font-medium`}
    >
      {label}: <span className="ml-1 font-semibold">{value ?? '—'}</span>
    </div>
  );
}

