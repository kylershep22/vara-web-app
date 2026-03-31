// src/pages/onboarding/OnboardingCheckIn.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { saveOnboardingCheckIn } from '../../services/db/onboarding.service';

const scales = [
  { key: 'energy', label: 'Energy', question: 'How is your energy today?', low: 'Exhausted', high: 'Energized' },
  { key: 'focus', label: 'Focus', question: 'How is your focus?', low: 'Scattered', high: 'Sharp' },
  { key: 'mood', label: 'Mood', question: 'How is your mood?', low: 'Low', high: 'Great' },
];

function DotScaleSelector({ value, onChange, low, high }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-vara-base font-medium transition-all ${
              value === v
                ? 'bg-evergreen-teal text-white scale-110 shadow-vara-sm'
                : 'bg-dew-sage-light text-muted-sage-gray hover:bg-silver-sage hover:text-soft-charcoal'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-muted-sage-gray px-1">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

export default function OnboardingCheckIn() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [values, setValues] = useState({ energy: 3, focus: 3, mood: 3 });
  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    setSaving(true);
    try {
      if (user?.uid) {
        await saveOnboardingCheckIn(user.uid, {
          ...values,
          timestamp: new Date().toISOString(),
        });
      }
      navigate('/onboarding/insight');
    } catch (err) {
      console.error('Failed to save check-in:', err);
      navigate('/onboarding/insight');
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
                i === 1 ? 'w-6 bg-evergreen-teal' : i < 1 ? 'bg-evergreen-teal' : 'bg-silver-sage'
              }`}
            />
          ))}
        </div>

        <h2 className="text-vara-xl font-semibold text-soft-charcoal mb-2 text-center">
          Quick Check-In
        </h2>
        <p className="text-vara-sm text-muted-sage-gray mb-8 text-center">
          How are you feeling right now? This helps us personalize your experience.
        </p>

        <div className="space-y-8">
          {scales.map((scale) => (
            <div key={scale.key}>
              <h3 className="text-vara-base font-medium text-soft-charcoal mb-3">
                {scale.question}
              </h3>
              <DotScaleSelector
                value={values[scale.key]}
                onChange={(v) => setValues((prev) => ({ ...prev, [scale.key]: v }))}
                low={scale.low}
                high={scale.high}
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-10">
          <button
            onClick={() => navigate('/onboarding/welcome')}
            className="px-4 py-3 rounded-vara-md text-muted-sage-gray hover:text-soft-charcoal"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={handleNext}
            disabled={saving}
            className="flex-1 py-4 rounded-vara-lg bg-evergreen-teal text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Continue'}
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
