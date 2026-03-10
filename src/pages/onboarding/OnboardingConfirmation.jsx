// src/pages/onboarding/OnboardingConfirmation.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { completeOnboarding } from '../../services/db/onboarding.service';

export default function OnboardingConfirmation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    setSaving(true);
    try {
      if (user?.uid) {
        await completeOnboarding(user.uid, false);
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      navigate('/dashboard', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-white to-dew-sage-light flex items-center justify-center p-vara-base">
      <div className="max-w-md w-full text-center">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === 4 ? 'w-6 bg-evergreen-teal' : 'bg-evergreen-teal'
              }`}
            />
          ))}
        </div>

        {/* Success icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-evergreen-teal/10 mb-6">
          <CheckCircle className="text-evergreen-teal" size={40} />
        </div>

        <h1 className="text-vara-2xl font-semibold text-soft-charcoal mb-3">
          You're All Set!
        </h1>
        <p className="text-vara-base text-muted-sage-gray mb-8 leading-relaxed">
          Your personalized wellness path is ready. We'll guide you gently,
          unlocking new features as you build your practice.
        </p>

        {/* What's next preview */}
        <div className="bg-white rounded-vara-lg p-vara-base border border-divider mb-8 text-left">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-sunrise-amber" size={16} />
            <h3 className="text-vara-sm font-medium text-soft-charcoal">What's next</h3>
          </div>
          <ul className="space-y-2 text-vara-sm text-muted-sage-gray">
            <li className="flex items-start gap-2">
              <span className="text-evergreen-teal mt-0.5">1.</span>
              <span>Explore your personalized dashboard</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-evergreen-teal mt-0.5">2.</span>
              <span>Set your first habit or goal</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-evergreen-teal mt-0.5">3.</span>
              <span>New features unlock as you engage</span>
            </li>
          </ul>
        </div>

        <button
          onClick={handleFinish}
          disabled={saving}
          className="w-full py-4 rounded-vara-lg bg-evergreen-teal text-white font-medium text-vara-base hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? 'Setting up...' : 'Go to Dashboard'}
          <ArrowRight size={20} />
        </button>
      </div>
    </div>
  );
}
