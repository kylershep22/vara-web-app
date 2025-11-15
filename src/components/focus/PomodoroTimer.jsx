// src/components/focus/PomodoroTimer.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Coffee } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const PomodoroTimer = ({ userId, onSessionComplete }) => {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionType, setSessionType] = useState('focus'); // 'focus' | 'short-break' | 'long-break'
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [customDuration, setCustomDuration] = useState('');
  const [sessionStartTime, setSessionStartTime] = useState(null);

  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  const presets = [
    { label: '10 min', value: 10 },
    { label: '15 min', value: 15 },
    { label: '25 min', value: 25 },
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
          interrupted: false
        });

        if (onSessionComplete) {
          onSessionComplete(selectedDuration);
        }
      } catch (error) {
        console.error('Error logging focus session:', error);
      }
    }

    // Auto-suggest break
    if (sessionType === 'focus') {
      const breakDuration = selectedDuration >= 60 ? 15 : 5;
      alert(`🎉 Great work! Take a ${breakDuration}-minute break.`);
    }
  };

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    }
  };

  const startTimer = () => {
    setIsActive(true);
    setIsPaused(false);
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

  return (
    <div className="space-y-6">
      {/* Session Type Selector */}
      <div className="flex items-center gap-2 justify-center">
        <button
          onClick={() => setSessionType('focus')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            sessionType === 'focus'
              ? 'bg-[#1B5E57] text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
              ? 'bg-green-500 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Long Break (15m)
        </button>
      </div>

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
            <div className="text-6xl font-bold text-gray-900 mb-2">
              {formatTime(minutes, seconds)}
            </div>
            <div className="text-sm text-gray-500 uppercase tracking-wide">
              {sessionType.replace('-', ' ')}
            </div>
            <div className="text-xs text-gray-400 mt-1">
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
            className="flex items-center gap-2 px-8 py-4 rounded-xl bg-[#1B5E57] text-white hover:bg-[#174C46] transition-all shadow-lg hover:shadow-xl font-semibold text-lg"
          >
            <Play size={24} />
            Start
          </button>
        ) : isPaused ? (
          <button
            onClick={resumeTimer}
            className="flex items-center gap-2 px-8 py-4 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-all shadow-lg hover:shadow-xl font-semibold text-lg"
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
          className="flex items-center gap-2 px-6 py-4 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 transition-all font-semibold"
        >
          <RotateCcw size={20} />
          Reset
        </button>
      </div>

      {/* Preset Durations */}
      {sessionType === 'focus' && (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700 mb-3">Quick Presets</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {presets.map(preset => (
                <button
                  key={preset.value}
                  onClick={() => handlePresetClick(preset.value)}
                  disabled={isActive}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedDuration === preset.value
                      ? 'bg-[#1B5E57] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Duration */}
          <div className="flex items-center justify-center gap-2">
            <input
              type="number"
              value={customDuration}
              onChange={(e) => setCustomDuration(e.target.value)}
              placeholder="Custom (min)"
              min="1"
              max="180"
              disabled={isActive}
              className="w-32 px-3 py-2 rounded-lg border border-gray-300 focus:border-[#1B5E57] focus:ring-2 focus:ring-[#1B5E57]/20 outline-none disabled:opacity-50"
            />
            <button
              onClick={handleCustomDuration}
              disabled={isActive || !customDuration}
              className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Set
            </button>
          </div>
        </div>
      )}

      {/* Hidden Audio Element for Notification Sound */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm">
        <p className="font-semibold text-blue-900 mb-1">💡 Focus Tip</p>
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
