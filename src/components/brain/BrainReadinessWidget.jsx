// src/components/brain/BrainReadinessWidget.jsx
// Daily check-in for sleep quality, hydration, and stress level.
// Computes a 0-100 brain readiness score and saves to Firestore.

import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function scoreColor(score) {
  if (score >= 70) return 'text-evergreen-teal';
  if (score >= 40) return 'text-sunrise-amber';
  return 'text-soft-coral';
}

function computeReadiness(sleep, hydration, stress) {
  return Math.round(((sleep + hydration + (6 - stress)) / 15) * 100);
}

const ROWS = [
  { key: 'sleep', label: 'Sleep Quality' },
  { key: 'hydration', label: 'Hydration' },
  { key: 'stress', label: 'Stress Level' },
];

export default function BrainReadinessWidget() {
  const { user } = useAuth();
  const [values, setValues] = useState({ sleep: 0, hydration: 0, stress: 0 });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [readinessScore, setReadinessScore] = useState(null);

  const todayKey = getTodayKey();
  const docId = user ? `${user.uid}_${todayKey}` : null;

  // Load today's entry if it exists
  useEffect(() => {
    if (!docId) return;
    let cancelled = false;
    setLoading(true);
    getDoc(doc(db, 'brainMetrics', docId)).then((snap) => {
      if (cancelled) return;
      if (snap.exists()) {
        const data = snap.data();
        if (data.sleepQuality && data.hydrationLevel && data.stressLevel) {
          setValues({
            sleep: data.sleepQuality,
            hydration: data.hydrationLevel,
            stress: data.stressLevel,
          });
          setReadinessScore(data.readinessScore);
          setSaved(true);
        }
      }
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { cancelled = true; };
  }, [docId]);

  const allSelected = values.sleep > 0 && values.hydration > 0 && values.stress > 0;

  async function handleSave() {
    if (!user || !allSelected) return;
    setSaving(true);
    const score = computeReadiness(values.sleep, values.hydration, values.stress);
    try {
      await setDoc(doc(db, 'brainMetrics', docId), {
        userId: user.uid,
        date: todayKey,
        sleepQuality: values.sleep,
        hydrationLevel: values.hydration,
        stressLevel: values.stress,
        readinessScore: score,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setReadinessScore(score);
      setSaved(true);
    } catch (e) {
      console.error('BrainReadinessWidget save error', e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-vara-lg shadow-vara-md border border-divider p-vara-lg flex items-center justify-center min-h-[180px]">
        <div className="w-6 h-6 border-2 border-evergreen-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md border border-divider p-vara-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-vara-lg">
        <Activity size={16} className="text-evergreen-teal shrink-0" />
        <p className="text-[15px] font-semibold text-soft-charcoal">Brain Readiness</p>
        {saved && readinessScore !== null && (
          <span className={`ml-auto text-2xl font-bold ${scoreColor(readinessScore)}`}>
            {readinessScore}
          </span>
        )}
      </div>

      {saved ? (
        <div className="space-y-vara-sm">
          <div className="flex items-center gap-2 text-[13px] text-muted-sage-gray mb-vara-base">
            <CheckCircle2 size={14} className="text-evergreen-teal shrink-0" />
            <span>Check-in complete for today</span>
          </div>
          {ROWS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-[13px] text-soft-charcoal">{label}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <span
                    key={n}
                    className={`w-7 h-7 rounded-vara-sm flex items-center justify-center text-[12px] font-semibold ${
                      values[key] === n
                        ? 'bg-evergreen-teal text-white'
                        : 'bg-gray-100 text-muted-sage-gray'
                    }`}
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          ))}
          <button
            onClick={() => setSaved(false)}
            className="mt-vara-base text-[12px] text-muted-sage-gray hover:text-evergreen-teal transition-colors"
          >
            Edit check-in
          </button>
        </div>
      ) : (
        <div className="space-y-vara-md">
          {ROWS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-vara-sm">
              <span className="text-[13px] text-soft-charcoal shrink-0 w-32">{label}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setValues((prev) => ({ ...prev, [key]: n }))}
                    className={`w-7 h-7 rounded-vara-sm text-[12px] font-semibold transition-colors ${
                      values[key] === n
                        ? 'bg-evergreen-teal text-white'
                        : 'bg-gray-100 text-muted-sage-gray hover:bg-dew-sage'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {allSelected && (
            <div className="pt-vara-sm flex items-center justify-between">
              <span className="text-[13px] text-muted-sage-gray">
                Readiness score:{' '}
                <span className={`font-bold ${scoreColor(computeReadiness(values.sleep, values.hydration, values.stress))}`}>
                  {computeReadiness(values.sleep, values.hydration, values.stress)}
                </span>
              </span>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-vara-base py-vara-xs rounded-vara-lg bg-evergreen-teal text-white text-[13px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
          {!allSelected && (
            <p className="text-[12px] text-muted-sage-gray pt-vara-xs">
              Rate all three to see your score.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
