// src/components/focus/PomodoroTimer.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Coffee, Droplets, Trees, StretchHorizontal } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const BREAK_ACTIVITIES = [
  { label: 'Stretch and move', icon: StretchHorizontal },
  { label: 'Hydrate', icon: Droplets },
  { label: 'Step outside', icon: Trees },
];

const PomodoroTimer = ({ userId, onSessionComplete }) => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionType, setSessionType] = useState('focus'); // 'focus' | 'short-break' | 'long-break'
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [customDuration, setCustomDuration] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [activityLabel, setActivityLabel] = useState('');
  const [phase, setPhase] = useState('idle'); // 'idle' | 'running' | 'break-prompt' | 'on-break' | 'break-done'
  const [breakDuration, setBreakDuration] = useState(5);

  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  const presets = [
    { label: '25 min', value: 25 },
    { label: '45 min', value: 45 },
    { label: '60 min', value: 60 },
    { label: '90 min', value: 90 }
  ];

  // Calculate total seconds for progress
  const totalSeconds = selectedDuration * 60;
  const currentSeconds = minutes * 60 + seconds;
  const progress = ((totalSeconds - currentSeconds) / totalSeconds) * 100;

  // Timer logic
  useEffect(() => {
    if (isActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            // Timer completed
            handleTimerComplete();
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isActive, isPaused, minutes, seconds]);

  const handleTimerComplete = async () => {
    setIsActive(false);
    playNotificationSound();

    // Log session to Firestore
    if (userId && sessionStartTime && sessionType === 'focus') {
      try {
        await addDoc(collection(db, 'focusSessions'), {
          userId,
          duration: selectedDuration,
          type: 'pomodoro',
          completed: true,
          startedAt: sessionStartTime,
          endedAt: serverTimestamp(),
          interrupted: false,
          activityLabel: activityLabel || null
        });

        if (onSessionComplete) {
          onSessionComplete(selectedDuration);
        }
      } catch (error) {
        console.error('Error logging focus session:', error);
      }
    }

    // Show break prompt or break-done screen
    if (sessionType === 'focus') {
      const suggestedBreak = selectedDuration <= 30 ? 5 : 10;
      setBreakDuration(suggestedBreak);
      setPhase('break-prompt');
    } else {
      // Break timer finished
      setPhase('break-done');
    }
  };

  const playNotificationSound = () => {
    // Use browser notification instead of audio file
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Timer Complete!', {
        body: sessionType === 'focus' ? 'Great work! Time for a break.' : 'Break is over! Ready to focus?',
        icon: '/logo192.png',
        tag: 'pomodoro-timer'
      });
    }

    // Fallback: try to play audio if ref exists (optional)
    if (audioRef.current) {
      audioRef.current.play().catch(() => {
        // Silently fail if audio not available
      });
    }
  };

  const startTimer = () => {
    setIsActive(true);
    setIsPaused(false);
    setPhase('running');
    setSessionStartTime(new Date());
  };

  const pauseTimer = () => {
    setIsPaused(true);
  };

  const resumeTimer = () => {
    setIsPaused(false);
  };

  const resetTimer = () => {
    setIsActive(false);
    setIsPaused(false);
    setMinutes(selectedDuration);
    setSeconds(0);
    setSessionStartTime(null);
    setPhase('idle');
  };

  const startBreak = () => {
    setSessionType('short-break');
    setSelectedDuration(breakDuration);
    setMinutes(breakDuration);
    setSeconds(0);
    setIsActive(true);
    setIsPaused(false);
    setPhase('on-break');
    setSessionStartTime(new Date());
  };

  const skipBreak = () => {
    resetToFocus();
  };

  const resetToFocus = () => {
    setSessionType('focus');
    setSelectedDuration(25);
    setMinutes(25);
    setSeconds(0);
    setIsActive(false);
    setIsPaused(false);
    setPhase('idle');
    setSessionStartTime(null);
    setActivityLabel('');
  };

  const handlePresetClick = (duration) => {
    setSelectedDuration(duration);
    setMinutes(duration);
    setSeconds(0);
    setIsActive(false);
    setIsPaused(false);
    setCustomDuration('');
  };

  const handleCustomDuration = () => {
    const duration = parseInt(customDuration);
    if (duration && duration > 0 && duration <= 180) {
      setSelectedDuration(duration);
      setMinutes(duration);
      setSeconds(0);
      setIsActive(false);
      setIsPaused(false);
    } else {
      alert('Please enter a valid duration between 1-180 minutes');
    }
  };

  const formatTime = (mins, secs) => {
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Break prompt screen
  if (phase === 'break-prompt') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-vara-lg shadow-vara-sm border border-divider p-vara-lg text-center max-w-md mx-auto">
          <Coffee className="mx-auto text-evergreen-teal mb-4" size={40} />
          <h2 className="text-vara-xl font-semibold text-soft-charcoal mb-2">Time for a break</h2>
          <p className="text-muted-sage-gray text-vara-sm mb-6">
            You've earned a {breakDuration}-minute break. Recharge before your next session.
          </p>

          <div className="flex flex-col gap-2 mb-6">
            {BREAK_ACTIVITIES.map(({ label, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-2.5 bg-dew-sage-light rounded-vara-md">
                <Icon size={18} className="text-evergreen-teal" />
                <span className="text-vara-sm text-soft-charcoal">{label}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={startBreak}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-evergreen-teal text-white hover:opacity-90 transition-all shadow-lg font-semibold"
            >
              <Play size={20} />
              Start Break
            </button>
            <button
              onClick={skipBreak}
              className="px-6 py-3 rounded-xl border-2 border-divider text-soft-charcoal hover:bg-dew-sage-light transition-all font-semibold"
            >
              Skip Break
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Break done screen
  if (phase === 'break-done') {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-vara-lg shadow-vara-sm border border-divider p-vara-lg text-center max-w-md mx-auto">
          <Coffee className="mx-auto text-evergreen-teal mb-4" size={40} />
          <h2 className="text-vara-xl font-semibold text-soft-charcoal mb-2">Break complete</h2>
          <p className="text-muted-sage-gray text-vara-sm mb-6">Ready to focus?</p>
          <button
            onClick={resetToFocus}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-evergreen-teal text-white hover:opacity-90 transition-all shadow-lg font-semibold mx-auto"
          >
            <Play size={20} />
            Start Another Session
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Duration Preset Chips */}
      {sessionType === 'focus' && !isActive && (
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {presets.map(preset => (
            <button
              key={preset.value}
              onClick={() => handlePresetClick(preset.value)}
              className={`px-5 py-2 rounded-full font-medium text-vara-sm transition-all ${
                selectedDuration === preset.value
                  ? 'bg-evergreen-teal text-white'
                  : 'bg-white text-soft-charcoal border border-divider hover:border-evergreen-teal'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* Activity Label Input */}
      {sessionType === 'focus' && !isActive && (
        <div className="max-w-sm mx-auto">
          <label className="block text-vara-sm font-medium text-soft-charcoal mb-1.5">
            What are you focusing on?
          </label>
          <input
            type="text"
            value={activityLabel}
            onChange={(e) => setActivityLabel(e.target.value)}
            placeholder="e.g., Deep work, Reading, Planning..."
            className="w-full px-4 py-2.5 rounded-vara-md border border-divider focus:border-evergreen-teal focus:ring-2 focus:ring-evergreen-teal/20 outline-none text-vara-sm"
          />
        </div>
      )}

      {/* Session Type Selector */}
      {!isActive && phase === 'idle' && (
        <div className="flex items-center gap-2 justify-center">
          <button
            onClick={() => setSessionType('focus')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              sessionType === 'focus'
                ? 'bg-evergreen-teal text-white shadow-sm'
                : 'bg-dew-sage-light text-muted-sage-gray hover:bg-silver-sage/30'
            }`}
          >
            Focus
          </button>
          <button
            onClick={() => {
              setSessionType('short-break');
              handlePresetClick(5);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              sessionType === 'short-break'
                ? 'bg-evergreen-teal text-white shadow-sm'
                : 'bg-dew-sage-light text-muted-sage-gray hover:bg-silver-sage/30'
            }`}
          >
            Short Break (5m)
          </button>
          <button
            onClick={() => {
              setSessionType('long-break');
              handlePresetClick(15);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              sessionType === 'long-break'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'bg-dew-sage-light text-muted-sage-gray hover:bg-silver-sage/30'
            }`}
          >
            Long Break (15m)
          </button>
        </div>
      )}

      {/* Circular Timer Display */}
      <div className="flex items-center justify-center">
        <div className="relative w-80 h-80">
          {/* Background Circle */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="160"
              cy="160"
              r="140"
              stroke="#E5E7EB"
              strokeWidth="12"
              fill="none"
            />
            {/* Progress Circle */}
            <circle
              cx="160"
              cy="160"
              r="140"
              stroke={sessionType === 'focus' ? '#1B5E57' : sessionType === 'short-break' ? '#10B981' : '#3B82F6'}
              strokeWidth="12"
              fill="none"
              strokeDasharray={2 * Math.PI * 140}
              strokeDashoffset={2 * Math.PI * 140 * (1 - progress / 100)}
              className="transition-all duration-1000 ease-linear"
              strokeLinecap="round"
            />
          </svg>

          {/* Timer Text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-6xl font-bold text-soft-charcoal mb-2">
              {formatTime(minutes, seconds)}
            </div>
            {activityLabel && isActive && sessionType === 'focus' && (
              <div className="text-sm text-evergreen-teal font-medium mb-1 max-w-[200px] truncate">
                {activityLabel}
              </div>
            )}
            <div className="text-sm text-muted-sage-gray uppercase tracking-wide">
              {phase === 'on-break' ? 'Break' : sessionType.replace('-', ' ')}
            </div>
            <div className="text-xs text-muted-sage-gray/60 mt-1">
              {selectedDuration} minute session
            </div>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-4">
        {!isActive ? (
          <button
            onClick={startTimer}
            className="flex items-center gap-2 px-8 py-4 rounded-xl bg-evergreen-teal text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl font-semibold text-lg"
          >
            <Play size={24} />
            Start
          </button>
        ) : isPaused ? (
          <button
            onClick={resumeTimer}
            className="flex items-center gap-2 px-8 py-4 rounded-xl bg-evergreen-teal text-white hover:opacity-90 transition-all shadow-lg hover:shadow-xl font-semibold text-lg"
          >
            <Play size={24} />
            Resume
          </button>
        ) : (
          <button
            onClick={pauseTimer}
            className="flex items-center gap-2 px-8 py-4 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-lg hover:shadow-xl font-semibold text-lg"
          >
            <Pause size={24} />
            Pause
          </button>
        )}

        <button
          onClick={resetTimer}
          className="flex items-center gap-2 px-6 py-4 rounded-xl border-2 border-divider text-soft-charcoal hover:bg-dew-sage-light transition-all font-semibold"
        >
          <RotateCcw size={20} />
          Reset
        </button>
      </div>

      {/* Custom Duration — shown when idle on focus tab */}
      {sessionType === 'focus' && !isActive && (
        <div className="flex items-center justify-center gap-2">
          <input
            type="number"
            value={customDuration}
            onChange={(e) => setCustomDuration(e.target.value)}
            placeholder="Custom (min)"
            min="1"
            max="180"
            className="w-32 px-3 py-2 rounded-lg border border-divider focus:border-evergreen-teal focus:ring-2 focus:ring-evergreen-teal/20 outline-none"
          />
          <button
            onClick={handleCustomDuration}
            disabled={!customDuration}
            className="px-4 py-2 rounded-lg bg-silver-sage/30 text-soft-charcoal hover:bg-dew-sage-light transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Set
          </button>
        </div>
      )}

      {/* Hidden Audio Element for Notification Sound (optional - no file currently) */}
      <audio ref={audioRef} preload="none" />

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm">
        <p className="font-semibold text-blue-900 mb-1">Focus Tip</p>
        <p className="text-blue-700">
          {sessionType === 'focus'
            ? 'Eliminate distractions. Turn off notifications and close unnecessary tabs.'
            : 'Use your break to rest your eyes, stretch, or take a short walk.'}
        </p>
      </div>
    </div>
  );
};

export default PomodoroTimer;
