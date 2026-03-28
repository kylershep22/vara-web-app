// src/components/brain/AMCCChallengeCard.jsx
// "Do one hard thing" daily challenge with AMCC (anterior midcingulate cortex) framing.
// Tracks type, reflection, and consecutive-day streak.

import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, Flame } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getYesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

const CHALLENGE_TYPES = [
  { id: 'cold', label: 'Cold exposure' },
  { id: 'movement', label: 'Difficult movement' },
  { id: 'conversation', label: 'Uncomfortable conversation' },
  { id: 'skill', label: 'Skill practice' },
];

export default function AMCCChallengeCard() {
  const { user } = useAuth();
  const [selectedType, setSelectedType] = useState('');
  const [reflection, setReflection] = useState('');
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [savedData, setSavedData] = useState(null);

  const todayKey = getTodayKey();
  const docId = user ? `${user.uid}_${todayKey}` : null;

  // Load today's data + compute streak
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'brainMetrics', docId));
        if (cancelled) return;

        if (snap.exists() && snap.data().amccCompleted) {
          const data = snap.data();
          setSavedData(data);
          setSelectedType(data.amccType || '');
          setReflection(data.amccReflection || '');
          setCompleted(true);
        }

        // Compute streak: walk backwards from yesterday
        let s = snap.exists() && snap.data().amccCompleted ? 1 : 0;
        let dayOffset = 1;
        while (true) {
          const d = new Date();
          d.setDate(d.getDate() - dayOffset);
          const key = d.toISOString().slice(0, 10);
          const daySnap = await getDoc(doc(db, 'brainMetrics', `${user.uid}_${key}`));
          if (!daySnap.exists() || !daySnap.data().amccCompleted) break;
          s++;
          dayOffset++;
          if (dayOffset > 365) break; // safety limit
        }
        if (!cancelled) setStreak(s);
      } catch (e) {
        console.error('AMCCChallengeCard load error', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [user, docId]);

  async function handleComplete() {
    if (!user || !selectedType) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'brainMetrics', docId), {
        userId: user.uid,
        date: todayKey,
        amccType: selectedType,
        amccReflection: reflection,
        amccCompleted: true,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSavedData({ amccType: selectedType, amccReflection: reflection });
      setCompleted(true);
      setStreak((prev) => prev + 1);
    } catch (e) {
      console.error('AMCCChallengeCard save error', e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-vara-lg shadow-vara-md border border-divider p-vara-lg flex items-center justify-center min-h-[200px]">
        <div className="w-6 h-6 border-2 border-evergreen-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const typeLabel = CHALLENGE_TYPES.find((t) => t.id === selectedType)?.label || selectedType;

  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md border border-divider p-vara-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-vara-base">
        <Target size={16} className="text-evergreen-teal shrink-0" />
        <p className="text-[15px] font-semibold text-soft-charcoal">Daily Challenge</p>
        {streak > 0 && (
          <div className="ml-auto flex items-center gap-1 text-[12px] font-semibold text-sunrise-amber">
            <Flame size={13} />
            {streak}-day streak
          </div>
        )}
      </div>

      {completed ? (
        <div className="space-y-vara-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-evergreen-teal shrink-0" />
            <span className="text-[13px] font-semibold text-evergreen-teal">Challenge complete!</span>
          </div>
          <div className="bg-teal-light rounded-vara-md p-vara-sm">
            <p className="text-[12px] font-semibold text-soft-charcoal mb-vara-xs">{typeLabel}</p>
            {savedData?.amccReflection && (
              <p className="text-[12px] text-muted-sage-gray leading-relaxed">{savedData.amccReflection}</p>
            )}
          </div>
          <button
            onClick={() => setCompleted(false)}
            className="text-[12px] text-muted-sage-gray hover:text-evergreen-teal transition-colors"
          >
            Edit
          </button>
        </div>
      ) : (
        <div className="space-y-vara-md">
          <p className="text-[13px] text-muted-sage-gray">
            Do one hard thing today to strengthen your anterior midcingulate cortex.
          </p>

          {/* Type selector */}
          <div className="grid grid-cols-2 gap-vara-sm">
            {CHALLENGE_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={`py-vara-sm px-vara-sm rounded-vara-md text-[12px] font-medium text-left transition-colors border ${
                  selectedType === t.id
                    ? 'border-evergreen-teal bg-teal-light text-evergreen-teal'
                    : 'border-divider text-soft-charcoal hover:border-silver-sage'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Reflection */}
          {selectedType && (
            <textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Optional: describe what you did or how it felt…"
              rows={2}
              className="w-full text-[13px] px-vara-base py-vara-sm border border-divider rounded-vara-lg outline-none focus:ring-2 focus:ring-silver-sage resize-none text-soft-charcoal placeholder:text-muted-sage-gray"
            />
          )}

          <button
            onClick={handleComplete}
            disabled={saving || !selectedType}
            className="w-full py-vara-sm rounded-vara-lg bg-evergreen-teal text-white text-[14px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Complete challenge'}
          </button>
        </div>
      )}
    </div>
  );
}
