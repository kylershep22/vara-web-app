// src/pages/onboarding/OnboardingActivity.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Wind, BookOpen, Heart } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { saveCompletedActivity } from '../../services/db/onboarding.service';

const activities = [
  {
    id: 'breathing',
    name: 'Box Breathing',
    type: 'breathwork',
    icon: Wind,
    duration: 60,
    description: 'A simple 4-count breathing pattern to center yourself.',
    instructions: 'Breathe in for 4 counts, hold for 4, out for 4, hold for 4. Repeat.',
  },
  {
    id: 'reflection',
    name: 'Quick Reflection',
    type: 'journal',
    icon: BookOpen,
    duration: 120,
    description: "Write one thing you're grateful for today.",
    instructions: "Take a moment to reflect. What's one thing, big or small, that you appreciate right now?",
    hasInput: true,
  },
  {
    id: 'intention',
    name: 'Set an Intention',
    type: 'mindfulness',
    icon: Heart,
    duration: 60,
    description: 'Choose one word to guide your day.',
    instructions: 'Pick a word that captures how you want to show up today. Examples: calm, focused, kind, strong.',
    hasInput: true,
  },
];

function BreathingExercise({ onComplete }) {
  const [phase, setPhase] = useState('ready'); // ready | inhale | hold1 | exhale | hold2 | done
  const [count, setCount] = useState(4);
  const [cycles, setCycles] = useState(0);
  const timerRef = useRef(null);

  const phaseLabels = { inhale: 'Breathe In', hold1: 'Hold', exhale: 'Breathe Out', hold2: 'Hold' };
  const phaseOrder = ['inhale', 'hold1', 'exhale', 'hold2'];

  useEffect(() => {
    if (phase === 'ready' || phase === 'done') return;

    timerRef.current = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          const idx = phaseOrder.indexOf(phase);
          if (idx === 3) {
            setCycles((cy) => {
              if (cy >= 2) {
                setPhase('done');
                onComplete?.();
                return cy + 1;
              }
              return cy + 1;
            });
            setPhase('inhale');
          } else {
            setPhase(phaseOrder[idx + 1]);
          }
          return 4;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase, onComplete]);

  if (phase === 'ready') {
    return (
      <button
        onClick={() => setPhase('inhale')}
        className="w-full py-4 rounded-vara-lg bg-evergreen-teal text-white font-medium hover:opacity-90"
      >
        Start Breathing
      </button>
    );
  }

  if (phase === 'done') {
    return (
      <div className="text-center py-4">
        <p className="text-vara-base text-evergreen-teal font-medium">Complete!</p>
        <p className="text-vara-sm text-muted-sage-gray mt-1">3 cycles of box breathing done.</p>
      </div>
    );
  }

  return (
    <div className="text-center py-6">
      <div className={`w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 transition-all duration-1000 ${
        phase === 'inhale' ? 'scale-125 bg-evergreen-teal/20' :
        phase === 'exhale' ? 'scale-75 bg-evergreen-teal/10' :
        'scale-100 bg-evergreen-teal/15'
      }`}>
        <span className="text-vara-2xl font-semibold text-evergreen-teal">{count}</span>
      </div>
      <p className="text-vara-base font-medium text-soft-charcoal">{phaseLabels[phase]}</p>
      <p className="text-vara-xs text-muted-sage-gray mt-1">Cycle {Math.min(cycles + 1, 3)} of 3</p>
    </div>
  );
}

export default function OnboardingActivity() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);

  const handleComplete = () => setCompleted(true);

  const handleNext = async () => {
    setSaving(true);
    try {
      if (user?.uid && selectedActivity) {
        await saveCompletedActivity(user.uid, {
          id: selectedActivity.id,
          name: selectedActivity.name,
          type: selectedActivity.type,
          duration: selectedActivity.duration,
          completedAt: new Date().toISOString(),
          response: inputValue || null,
        });
      }
      sessionStorage.setItem('onboardingActivity', JSON.stringify({ name: selectedActivity?.name, type: selectedActivity?.type }));
      navigate('/onboarding/confirmation');
    } catch (err) {
      console.error('Failed to save activity:', err);
      sessionStorage.setItem('onboardingActivity', JSON.stringify({ name: selectedActivity?.name, type: selectedActivity?.type }));
      navigate('/onboarding/confirmation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-mist-white flex items-center justify-center p-vara-base">
      <div className="max-w-md w-full">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === 3 ? 'w-6 bg-evergreen-teal' : i < 3 ? 'bg-evergreen-teal' : 'bg-silver-sage'
              }`}
            />
          ))}
        </div>

        <h2 className="text-vara-xl font-semibold text-soft-charcoal mb-2 text-center">
          Try Something Quick
        </h2>
        <p className="text-vara-sm text-muted-sage-gray mb-6 text-center">
          Pick a quick activity to experience Vara. This takes under 2 minutes.
        </p>

        {!selectedActivity ? (
          <div className="space-y-3">
            {activities.map((act) => {
              const Icon = act.icon;
              return (
                <button
                  key={act.id}
                  onClick={() => setSelectedActivity(act)}
                  className="w-full text-left px-4 py-4 rounded-vara-lg bg-white border border-divider hover:border-evergreen-teal/50 transition-all flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-full bg-teal-light flex items-center justify-center flex-shrink-0">
                    <Icon className="text-evergreen-teal" size={20} />
                  </div>
                  <div>
                    <h4 className="text-vara-sm font-medium text-soft-charcoal">{act.name}</h4>
                    <p className="text-vara-xs text-muted-sage-gray">{act.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-vara-lg border border-divider p-vara-lg">
            <div className="flex items-center gap-2 mb-4">
              <selectedActivity.icon className="text-evergreen-teal" size={20} />
              <h3 className="text-vara-base font-medium text-soft-charcoal">{selectedActivity.name}</h3>
            </div>
            <p className="text-vara-sm text-muted-sage-gray mb-4">{selectedActivity.instructions}</p>

            {selectedActivity.id === 'breathing' ? (
              <BreathingExercise onComplete={handleComplete} />
            ) : (
              <>
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-divider rounded-vara-md focus:outline-none focus:ring-2 focus:ring-evergreen-teal mb-3 text-vara-sm"
                  placeholder={selectedActivity.id === 'reflection' ? "I'm grateful for..." : 'My word for today is...'}
                />
                {inputValue.trim() && !completed && (
                  <button
                    onClick={handleComplete}
                    className="w-full py-3 rounded-vara-md bg-evergreen-teal text-white font-medium hover:opacity-90"
                  >
                    Done
                  </button>
                )}
              </>
            )}

            {completed && selectedActivity.id !== 'breathing' && (
              <div className="text-center py-2">
                <p className="text-vara-sm text-evergreen-teal font-medium">Wonderful!</p>
              </div>
            )}

            <button
              onClick={() => { setSelectedActivity(null); setCompleted(false); setInputValue(''); }}
              className="mt-3 text-vara-xs text-muted-sage-gray hover:text-soft-charcoal"
            >
              Choose a different activity
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 mt-8">
          <button
            onClick={() => navigate('/onboarding/insight')}
            className="px-4 py-3 rounded-vara-md text-muted-sage-gray hover:text-soft-charcoal"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={handleNext}
            disabled={saving}
            className="flex-1 py-4 rounded-vara-lg bg-evergreen-teal text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? 'Saving...' : completed ? 'Continue' : 'Skip Activity'}
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
