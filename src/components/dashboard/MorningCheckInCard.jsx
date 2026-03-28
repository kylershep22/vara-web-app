// src/components/dashboard/MorningCheckInCard.jsx

import React, { useState } from 'react';
import { Sun, CheckCircle2 } from 'lucide-react';
import { saveMorningCheckIn } from '../../services/wellnessScore.service';

const ENERGY_LEVELS = [
  { value: 1, label: 'Exhausted' },
  { value: 2, label: 'Tired' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Energized' },
];

const MOOD_LEVELS = [
  { value: 1, label: 'Rough' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' },
];

const MorningCheckInCard = ({ userId, checkIn, onComplete }) => {
  const [step, setStep] = useState('energy'); // 'energy' | 'mood' | 'saving'
  const [energyLevel, setEnergyLevel] = useState(null);
  const [saving, setSaving] = useState(false);

  // If already completed today, show completed state
  if (checkIn) {
    const energy = ENERGY_LEVELS.find(e => e.value === checkIn.energyLevel) || ENERGY_LEVELS[2];
    const mood = MOOD_LEVELS.find(m => m.value === checkIn.mood) || MOOD_LEVELS[2];

    return (
      <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border-l-4 border-amber-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} className="text-evergreen-teal flex-shrink-0" />
          <span className="text-sm text-soft-charcoal">
            Morning check-in:{' '}
            <span className="font-medium">{energy.label} energy</span>,{' '}
            <span className="font-medium">{mood.label} mood</span>
          </span>
        </div>
      </div>
    );
  }

  const handleEnergySelect = (value) => {
    setEnergyLevel(value);
    setTimeout(() => setStep('mood'), 300);
  };

  const handleMoodSelect = async (moodValue) => {
    if (energyLevel === null || saving) return;
    setSaving(true);
    try {
      await saveMorningCheckIn(userId, energyLevel, moodValue);
      if (onComplete) onComplete({ energyLevel, mood: moodValue });
    } catch (err) {
      console.error('Failed to save morning check-in:', err);
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border-l-4 border-amber-400 relative">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Sun size={18} className="text-amber-400 flex-shrink-0" />
        <h3 className="text-sm font-semibold text-soft-charcoal">
          {step === 'energy' ? 'Good morning!' : 'Almost done!'}
        </h3>
      </div>

      {/* Question */}
      <p className="text-sm text-muted-sage-gray mb-4">
        {step === 'energy'
          ? "How's your energy level right now?"
          : "And how's your mood?"}
      </p>

      {/* Energy Chips */}
      {step === 'energy' && (
        <div className="flex flex-wrap gap-2">
          {ENERGY_LEVELS.map((level) => (
            <button
              key={level.value}
              onClick={() => handleEnergySelect(level.value)}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-all
                ${energyLevel === level.value
                  ? 'bg-evergreen-teal text-white'
                  : 'bg-teal-light text-evergreen-teal hover:bg-evergreen-teal hover:text-white'}
              `}
            >
              {level.label}
            </button>
          ))}
        </div>
      )}

      {/* Mood Chips */}
      {step === 'mood' && (
        <div className="flex flex-wrap gap-2">
          {MOOD_LEVELS.map((level) => (
            <button
              key={level.value}
              onClick={() => handleMoodSelect(level.value)}
              disabled={saving}
              className={`
                px-3 py-1.5 rounded-full text-sm font-medium transition-all
                bg-teal-light text-evergreen-teal hover:bg-evergreen-teal hover:text-white
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {level.label}
            </button>
          ))}
        </div>
      )}

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mt-4">
        <div
          className={`h-2 rounded-full transition-all ${
            step === 'energy' ? 'w-5 bg-evergreen-teal' : 'w-2 bg-evergreen-teal'
          }`}
        />
        <div
          className={`h-2 rounded-full transition-all ${
            step === 'mood' ? 'w-5 bg-evergreen-teal' : 'w-2 bg-divider'
          }`}
        />
      </div>

      {/* Saving overlay */}
      {saving && (
        <div className="absolute inset-0 bg-white/90 rounded-vara-lg flex items-center justify-center">
          <span className="text-sm text-muted-sage-gray">Saving...</span>
        </div>
      )}
    </div>
  );
};

export default MorningCheckInCard;
