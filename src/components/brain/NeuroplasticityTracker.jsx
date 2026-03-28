// src/components/brain/NeuroplasticityTracker.jsx
// Tracks novel activities / learning experiences each day.
// Shows today's count, a log-experience modal, and a 7-day dot trend.

import React, { useState, useEffect } from 'react';
import { Brain, Plus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getLast7Keys() {
  const keys = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

export default function NeuroplasticityTracker() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [weekData, setWeekData] = useState({});

  const todayKey = getTodayKey();
  const docId = user ? `${user.uid}_${todayKey}` : null;

  // Load today's count + last 7 days
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);

    const last7 = getLast7Keys();

    Promise.all(
      last7.map((key) => getDoc(doc(db, 'brainMetrics', `${user.uid}_${key}`)))
    ).then((snaps) => {
      if (cancelled) return;
      const data = {};
      snaps.forEach((snap, i) => {
        data[last7[i]] = snap.exists() ? (snap.data().neuroplasticityCount || 0) : 0;
      });
      setWeekData(data);
      setCount(data[todayKey] || 0);
      setLoading(false);
    }).catch(() => setLoading(false));

    return () => { cancelled = true; };
  }, [user, todayKey]);

  async function handleLog() {
    if (!user || !description.trim()) return;
    setSaving(true);
    const newCount = count + 1;
    try {
      await setDoc(doc(db, 'brainMetrics', docId), {
        userId: user.uid,
        date: todayKey,
        neuroplasticityCount: newCount,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setCount(newCount);
      setWeekData((prev) => ({ ...prev, [todayKey]: newCount }));
      setDescription('');
      setShowModal(false);
    } catch (e) {
      console.error('NeuroplasticityTracker save error', e);
    } finally {
      setSaving(false);
    }
  }

  const last7Keys = getLast7Keys();
  const maxCount = Math.max(1, ...Object.values(weekData));

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
        <Brain size={16} className="text-evergreen-teal shrink-0" />
        <p className="text-[15px] font-semibold text-soft-charcoal">Growth Signals</p>
      </div>

      {/* Today's count */}
      <div className="flex items-end gap-vara-sm mb-vara-lg">
        <span className="text-5xl font-bold text-evergreen-teal leading-none">{count}</span>
        <span className="text-[13px] text-muted-sage-gray mb-1">new experiences today</span>
      </div>

      {/* Log button */}
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 w-full py-vara-sm px-vara-base rounded-vara-lg border border-evergreen-teal text-evergreen-teal text-[13px] font-semibold hover:bg-teal-light transition-colors mb-vara-lg"
      >
        <Plus size={15} />
        Log a new experience
      </button>

      {/* 7-day dots */}
      <div>
        <p className="text-[11px] text-muted-sage-gray mb-vara-sm">This week</p>
        <div className="flex gap-vara-xs items-end">
          {last7Keys.map((key) => {
            const val = weekData[key] || 0;
            const isToday = key === todayKey;
            const heightFraction = val / maxCount;
            const heightPx = Math.max(6, Math.round(heightFraction * 28));
            return (
              <div key={key} className="flex flex-col items-center gap-vara-2xs flex-1">
                <div
                  className={`w-full rounded-vara-sm transition-all ${
                    isToday ? 'bg-evergreen-teal' : val > 0 ? 'bg-silver-sage' : 'bg-gray-100'
                  }`}
                  style={{ height: `${heightPx}px` }}
                />
                <span className="text-[9px] text-muted-sage-gray">
                  {new Date(key + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Log modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-vara-base">
          <div className="bg-white rounded-vara-xl shadow-vara-lg p-vara-lg w-full max-w-sm">
            <div className="flex items-center justify-between mb-vara-base">
              <p className="text-[15px] font-semibold text-soft-charcoal">Log an experience</p>
              <button onClick={() => setShowModal(false)} className="text-muted-sage-gray hover:opacity-70">
                <X size={18} />
              </button>
            </div>
            <p className="text-[13px] text-muted-sage-gray mb-vara-base">
              What new or challenging thing did you try or learn?
            </p>
            <textarea
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Tried a new recipe, learned a guitar chord, took a different route to work…"
              rows={3}
              className="w-full text-[13px] px-vara-base py-vara-sm border border-divider rounded-vara-lg outline-none focus:ring-2 focus:ring-silver-sage resize-none text-soft-charcoal placeholder:text-muted-sage-gray"
            />
            <button
              onClick={handleLog}
              disabled={saving || !description.trim()}
              className="mt-vara-base w-full py-vara-sm rounded-vara-lg bg-evergreen-teal text-white text-[14px] font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? 'Logging…' : 'Log experience'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
