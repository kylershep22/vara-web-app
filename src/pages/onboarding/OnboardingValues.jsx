import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { saveSelectedValues, completeOnboarding } from '../../services/db/onboarding.service';

const TOTAL_STEPS = 6;

const VALUES = [
  'Health', 'Family', 'Growth', 'Creativity',
  'Connection', 'Purpose', 'Joy', 'Resilience',
  'Balance', 'Courage', 'Kindness', 'Focus',
  'Freedom', 'Gratitude', 'Integrity', 'Peace',
];

export default function OnboardingValues() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  function toggleValue(value) {
    setSelected((prev) => {
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      if (prev.length >= 3) return prev;
      return [...prev, value];
    });
  }

  async function handleFinish() {
    if (!user?.uid || selected.length === 0) return;
    setSaving(true);
    try {
      const habitCreated = sessionStorage.getItem('onboardingHabitCreated') === 'true';
      await saveSelectedValues(user.uid, selected);
      await completeOnboarding(user.uid, habitCreated);
      sessionStorage.removeItem('onboardingActivity');
      sessionStorage.removeItem('onboardingHabitCreated');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Failed to save values:', err);
      navigate('/dashboard', { replace: true });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-white to-dew-sage-light flex items-center justify-center p-vara-base">
      <div className="max-w-md w-full">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all bg-evergreen-teal ${
                i === TOTAL_STEPS - 1 ? 'w-6' : 'w-2'
              }`}
            />
          ))}
        </div>

        <h1 className="text-vara-2xl font-semibold text-soft-charcoal text-center mb-2">
          What matters most to you?
        </h1>
        <p className="text-vara-sm text-muted-sage-gray text-center mb-8">
          Pick 2-3 values. We'll use these to personalize your experience.
        </p>

        {/* Values grid */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {VALUES.map((value) => {
            const isSelected = selected.includes(value);
            return (
              <button
                key={value}
                onClick={() => toggleValue(value)}
                className={`py-3 px-4 rounded-xl border-2 text-sm font-medium text-center transition-all ${
                  isSelected
                    ? 'border-evergreen-teal bg-teal-light/30 text-evergreen-teal'
                    : 'border-divider text-soft-charcoal hover:border-silver-sage'
                } ${selected.length >= 3 && !isSelected ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {value}
              </button>
            );
          })}
        </div>

        {/* Selected summary */}
        {selected.length > 0 && (
          <div className="bg-white rounded-vara-lg p-vara-base border border-divider mb-6 text-center">
            <p className="text-vara-sm text-muted-sage-gray mb-1">Your values</p>
            <p className="text-vara-base font-medium text-soft-charcoal">
              {selected.join(' · ')}
            </p>
          </div>
        )}

        <button
          onClick={handleFinish}
          disabled={selected.length === 0 || saving}
          className="w-full py-4 rounded-vara-lg bg-evergreen-teal text-white font-medium text-vara-base hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40"
        >
          {saving ? 'Setting up...' : 'Begin'}
          <ArrowRight size={20} />
        </button>

        <p className="text-center text-vara-xs text-muted-sage-gray mt-4">
          {selected.length}/3 selected
        </p>
      </div>
    </div>
  );
}
