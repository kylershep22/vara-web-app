// src/components/brain/NervousSystemTools.jsx
// Two guided nervous system regulation exercises:
//   1. Physiological Sigh (double inhale + long exhale breathing cycles)
//   2. Panoramic Vision (60-second soft gaze exercise)
// Each session use is saved to brainMetrics.

import React, { useState, useEffect, useRef } from 'react';
import { Wind, Eye, Square } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { doc, setDoc, serverTimestamp, increment } from 'firebase/firestore';

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

// --- Physiological Sigh ---
const SIGH_PHASES = [
  { label: 'Inhale through nose', duration: 2000 },
  { label: 'Second quick inhale', duration: 1000 },
  { label: 'Long exhale through mouth', duration: 4000 },
  { label: 'Rest', duration: 1000 },
];

function PhysiologicalSigh({ onSessionEnd }) {
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [phaseLabel, setPhaseLabel] = useState('');
  const timerRef = useRef(null);
  const cycleRef = useRef(0);
  const phaseRef = useRef(0);

  function startCycle() {
    function runPhase(idx) {
      if (idx >= SIGH_PHASES.length) {
        const newCycles = cycleRef.current + 1;
        cycleRef.current = newCycles;
        setCycles(newCycles);
        phaseRef.current = 0;
        runPhase(0);
        return;
      }
      phaseRef.current = idx;
      setPhaseIdx(idx);
      setPhaseLabel(SIGH_PHASES[idx].label);
      timerRef.current = setTimeout(() => runPhase(idx + 1), SIGH_PHASES[idx].duration);
    }
    runPhase(0);
  }

  function handleStart() {
    cycleRef.current = 0;
    setCycles(0);
    setPhaseIdx(0);
    setRunning(true);
    startCycle();
  }

  function handleStop() {
    clearTimeout(timerRef.current);
    setRunning(false);
    setPhaseLabel('');
    if (cycleRef.current > 0) onSessionEnd();
  }

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <div className="bg-teal-light rounded-vara-md p-vara-base">
      <div className="flex items-center gap-2 mb-vara-sm">
        <Wind size={14} className="text-evergreen-teal shrink-0" />
        <p className="text-[14px] font-semibold text-soft-charcoal">Physiological Sigh</p>
      </div>
      <p className="text-[12px] text-muted-sage-gray mb-vara-base">
        Double inhale through your nose, then a long exhale through your mouth. Resets your nervous system fast.
      </p>

      {running ? (
        <div className="text-center space-y-vara-sm">
          <p className="text-[22px] font-bold text-evergreen-teal">{cycles}</p>
          <p className="text-[11px] text-muted-sage-gray uppercase tracking-wide">cycles</p>
          <div className="text-[13px] font-medium text-soft-charcoal min-h-[20px]">{phaseLabel}</div>
          <button
            onClick={handleStop}
            className="flex items-center gap-1 mx-auto mt-vara-sm px-vara-base py-vara-xs rounded-vara-lg border border-soft-coral text-soft-coral text-[13px] font-semibold hover:bg-soft-coral/10 transition-colors"
          >
            <Square size={12} />
            Stop
          </button>
        </div>
      ) : (
        <button
          onClick={handleStart}
          className="w-full py-vara-xs rounded-vara-lg bg-evergreen-teal text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
        >
          Start breathing
        </button>
      )}
    </div>
  );
}

// --- Panoramic Vision ---
const PANORAMIC_DURATION = 60; // seconds

function PanoramicVision({ onSessionEnd }) {
  const [running, setRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(PANORAMIC_DURATION);
  const intervalRef = useRef(null);

  function handleStart() {
    setSecondsLeft(PANORAMIC_DURATION);
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          onSessionEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function handleStop() {
    clearInterval(intervalRef.current);
    setRunning(false);
    setSecondsLeft(PANORAMIC_DURATION);
    onSessionEnd();
  }

  useEffect(() => () => clearInterval(intervalRef.current), []);

  return (
    <div className="bg-teal-light rounded-vara-md p-vara-base">
      <div className="flex items-center gap-2 mb-vara-sm">
        <Eye size={14} className="text-evergreen-teal shrink-0" />
        <p className="text-[14px] font-semibold text-soft-charcoal">Panoramic Vision</p>
      </div>
      <p className="text-[12px] text-muted-sage-gray mb-vara-base">
        Soften your gaze and allow your vision to expand to the periphery. Reduces visual tunnel and calms the nervous system.
      </p>

      {running ? (
        <div className="text-center space-y-vara-sm">
          <p className="text-[22px] font-bold text-evergreen-teal">{secondsLeft}s</p>
          <p className="text-[12px] text-muted-sage-gray leading-snug">
            Relax your eyes. Let your field of view widen naturally.
          </p>
          <button
            onClick={handleStop}
            className="flex items-center gap-1 mx-auto mt-vara-sm px-vara-base py-vara-xs rounded-vara-lg border border-soft-coral text-soft-coral text-[13px] font-semibold hover:bg-soft-coral/10 transition-colors"
          >
            <Square size={12} />
            Stop
          </button>
        </div>
      ) : (
        <button
          onClick={handleStart}
          className="w-full py-vara-xs rounded-vara-lg bg-evergreen-teal text-white text-[13px] font-semibold hover:opacity-90 transition-opacity"
        >
          Start exercise
        </button>
      )}
    </div>
  );
}

// --- Main component ---
export default function NervousSystemTools() {
  const { user } = useAuth();
  const [sessionCount, setSessionCount] = useState(0);

  const todayKey = getTodayKey();
  const docId = user ? `${user.uid}_${todayKey}` : null;

  async function saveSessionUse() {
    if (!user) return;
    try {
      await setDoc(doc(db, 'brainMetrics', docId), {
        userId: user.uid,
        date: todayKey,
        nervousSystemToolUses: increment(1),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setSessionCount((prev) => prev + 1);
    } catch (e) {
      console.error('NervousSystemTools save error', e);
    }
  }

  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md border border-divider p-vara-lg">
      {/* Header */}
      <div className="flex items-center gap-2 mb-vara-lg">
        <Wind size={16} className="text-evergreen-teal shrink-0" />
        <p className="text-[15px] font-semibold text-soft-charcoal">Nervous System Tools</p>
        {sessionCount > 0 && (
          <span className="ml-auto text-[12px] text-muted-sage-gray">
            {sessionCount} session{sessionCount !== 1 ? 's' : ''} today
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-vara-base">
        <PhysiologicalSigh onSessionEnd={saveSessionUse} />
        <PanoramicVision onSessionEnd={saveSessionUse} />
      </div>
    </div>
  );
}
