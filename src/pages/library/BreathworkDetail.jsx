import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import SidebarLayout from '../../components/layout/SidebarLayout';
import { Wind, ArrowLeft, Play, Square, RotateCcw } from 'lucide-react';

const breathworkItems = [
  {
    id: 'box-breathing',
    title: 'Box Breathing (4-4-4-4)',
    description: 'A calming breathing pattern to reduce anxiety and center yourself.',
    duration: '5 min',
    durationSeconds: 300,
    type: 'Audio',
    purpose: 'Calm & Focus',
    instructions: [
      'Inhale slowly through your nose for 4 seconds',
      'Hold your breath for 4 seconds',
      'Exhale slowly through your mouth for 4 seconds',
      'Hold your breath for 4 seconds',
      'Repeat the cycle for the full session',
    ],
  },
  {
    id: 'morning-energizer',
    title: 'Morning Energizer',
    description: 'A breathwork routine to stimulate your energy and clarity.',
    duration: '6 min',
    durationSeconds: 360,
    type: 'Video',
    purpose: 'Energy & Clarity',
    instructions: [
      'Take a deep breath in through your nose, filling your lungs completely',
      'Exhale forcefully through your mouth',
      'Follow with 3 quick, rhythmic breaths in and out through the nose',
      'Hold briefly at the top of your inhale',
      'Repeat the pattern, gradually increasing pace',
    ],
  },
  {
    id: 'evening-unwind',
    title: 'Evening Unwind',
    description: 'Wind down with gentle breath awareness.',
    duration: '7 min',
    durationSeconds: 420,
    type: 'Audio',
    purpose: 'Relaxation',
    instructions: [
      'Find a comfortable seated or lying position',
      'Close your eyes and bring awareness to your natural breath',
      'Slowly extend your exhale to be longer than your inhale',
      'Breathe in for 4 counts, out for 6 counts',
      'Let each exhale release tension from your body',
    ],
  },
];

export default function BreathworkDetail() {
  const { id } = useParams();
  const item = breathworkItems.find((b) => b.id === id);

  const [timerState, setTimerState] = useState('idle'); // idle | running | complete
  const [secondsLeft, setSecondsLeft] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startTimer = () => {
    if (!item) return;
    setSecondsLeft(item.durationSeconds);
    setTimerState('running');
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setTimerState('complete');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerState('idle');
    setSecondsLeft(0);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (!item) {
    return (
      <SidebarLayout>
        <div className="px-vara-base py-vara-lg max-w-3xl mx-auto text-center">
          <h1 className="text-vara-xl font-semibold text-soft-charcoal mb-4">Content not found</h1>
          <p className="text-muted-sage-gray mb-6">The breathwork session you're looking for doesn't exist.</p>
          <Link to="/library/breathwork" className="text-evergreen-teal hover:underline font-medium">
            &larr; Back to Breathwork
          </Link>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="px-vara-base py-vara-lg max-w-3xl mx-auto">
        {/* Back Link */}
        <Link
          to="/library/breathwork"
          className="inline-flex items-center gap-1.5 text-vara-sm text-evergreen-teal hover:underline mb-vara-lg"
        >
          <ArrowLeft size={16} />
          Back to Breathwork
        </Link>

        {/* Hero Section */}
        <div className="bg-white rounded-vara-lg border border-divider p-vara-lg shadow-vara-sm mb-vara-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-evergreen-teal/10 flex items-center justify-center">
              <Wind size={32} className="text-evergreen-teal" />
            </div>
            <div>
              <h1 className="text-vara-xl font-semibold text-soft-charcoal">{item.title}</h1>
              <p className="text-vara-sm text-muted-sage-gray mt-1">{item.description}</p>
            </div>
          </div>

          {/* Metadata Chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="bg-evergreen-teal/[0.06] text-evergreen-teal text-xs font-medium py-1 px-3 rounded-vara-pill">
              {item.duration}
            </span>
            <span className="bg-evergreen-teal/[0.06] text-evergreen-teal text-xs font-medium py-1 px-3 rounded-vara-pill">
              {item.purpose}
            </span>
            <span className="bg-evergreen-teal/[0.06] text-evergreen-teal text-xs font-medium py-1 px-3 rounded-vara-pill">
              {item.type}
            </span>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-vara-lg border border-divider p-vara-lg shadow-vara-sm mb-vara-lg">
          <h2 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-base">Instructions</h2>
          <ol className="space-y-3">
            {item.instructions.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-evergreen-teal/10 text-evergreen-teal text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-vara-sm text-soft-charcoal leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Timer / Start Session */}
        <div className="bg-white rounded-vara-lg border border-divider p-vara-lg shadow-vara-sm text-center">
          {timerState === 'idle' && (
            <>
              <h2 className="text-vara-lg font-semibold text-soft-charcoal mb-4">Ready to begin?</h2>
              <button
                onClick={startTimer}
                className="inline-flex items-center gap-2 bg-evergreen-teal text-white font-medium py-3 px-6 rounded-vara-pill hover:bg-evergreen-teal/90 transition"
              >
                <Play size={18} />
                Start Session
              </button>
            </>
          )}

          {timerState === 'running' && (
            <>
              <p className="text-vara-xs text-muted-sage-gray mb-2">Time remaining</p>
              <p className="text-5xl font-bold text-evergreen-teal mb-6 font-mono">
                {formatTime(secondsLeft)}
              </p>
              <button
                onClick={stopTimer}
                className="inline-flex items-center gap-2 bg-coral-sunset text-white font-medium py-3 px-6 rounded-vara-pill hover:bg-coral-sunset/90 transition"
              >
                <Square size={18} />
                Stop
              </button>
            </>
          )}

          {timerState === 'complete' && (
            <>
              <h2 className="text-vara-xl font-semibold text-evergreen-teal mb-2">Session Complete</h2>
              <p className="text-vara-sm text-muted-sage-gray mb-6">Great work! Take a moment to notice how you feel.</p>
              <button
                onClick={startTimer}
                className="inline-flex items-center gap-2 bg-evergreen-teal text-white font-medium py-3 px-6 rounded-vara-pill hover:bg-evergreen-teal/90 transition"
              >
                <RotateCcw size={18} />
                Practice Again
              </button>
            </>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
