import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { createHabit } from '../../services/db/habits.service';

const TOTAL_STEPS = 6;

export default function OnboardingConfirmation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);

  const activityRaw = sessionStorage.getItem('onboardingActivity');
  const activity = activityRaw ? JSON.parse(activityRaw) : null;

  async function handleAddHabit() {
    if (!user?.uid || !activity) return;
    setCreating(true);
    try {
      await createHabit(user.uid, {
        name: activity.name,
        type: 'daily',
        frequency: 1,
        category: 'Mindfulness',
        active: true,
        streak: 0,
      });
      sessionStorage.setItem('onboardingHabitCreated', 'true');
    } catch (err) {
      console.error('Failed to create onboarding habit:', err);
    } finally {
      setCreating(false);
      navigate('/onboarding/values');
    }
  }

  function handleSkip() {
    sessionStorage.setItem('onboardingHabitCreated', 'false');
    navigate('/onboarding/values');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-white to-dew-sage-light flex items-center justify-center p-vara-base">
      <div className="max-w-md w-full text-center">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i <= 4 ? 'bg-evergreen-teal' : 'bg-divider'
              } ${i === 4 ? 'w-6' : 'w-2'}`}
            />
          ))}
        </div>

        {/* Success icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-evergreen-teal/10 mb-6">
          <CheckCircle className="text-evergreen-teal" size={40} />
        </div>

        <h1 className="text-vara-2xl font-semibold text-soft-charcoal mb-3">
          Nice work!
        </h1>
        <p className="text-vara-base text-muted-sage-gray mb-8 leading-relaxed">
          {activity
            ? `You just completed "${activity.name}". Small steps like this build lasting change.`
            : "You've taken your first step toward lasting wellness."}
        </p>

        {/* Habit offer */}
        {activity && (
          <div className="bg-white rounded-vara-lg p-vara-lg border border-divider mb-8 text-left">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="text-sunrise-amber" size={16} />
              <h3 className="text-vara-sm font-medium text-soft-charcoal">Add to your routine?</h3>
            </div>
            <p className="text-vara-sm text-muted-sage-gray mb-4">
              Make "{activity.name}" a daily habit to keep building momentum.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleAddHabit}
                disabled={creating}
                className="flex-1 py-3 rounded-lg bg-evergreen-teal text-white font-medium text-vara-sm hover:opacity-90 transition disabled:opacity-60"
              >
                {creating ? 'Adding...' : 'Yes, add it'}
              </button>
              <button
                onClick={handleSkip}
                className="flex-1 py-3 rounded-lg border border-divider text-soft-charcoal font-medium text-vara-sm hover:bg-dew-sage-light transition"
              >
                Maybe later
              </button>
            </div>
          </div>
        )}

        {!activity && (
          <button
            onClick={handleSkip}
            className="w-full py-4 rounded-vara-lg bg-evergreen-teal text-white font-medium text-vara-base hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
