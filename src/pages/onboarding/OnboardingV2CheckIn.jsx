/**
 * Onboarding V2 - Check-In Screen
 * Screen 2 of 3: Single-tap brain state selection.
 * Reuses BrainStateCheckin from Dashboard.
 * Auto-advances to protocol screen after selection.
 */

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { saveCheckIn } from '../../services/db/brainStateCheckIn.service';
import { BRAIN_STATES } from '../../constants/brainStateProtocols';

export default function OnboardingV2CheckIn() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showCaptured, setShowCaptured] = useState(false);
  const hasNavigated = useRef(false);

  const handleSelect = async (state) => {
    if (!user?.uid || hasNavigated.current || loading) return;
    setLoading(true);
    try {
      await saveCheckIn(user.uid, state);
      setShowCaptured(true);

      // Wait for "Captured." animation, then navigate
      setTimeout(() => {
        if (!hasNavigated.current) {
          hasNavigated.current = true;
          navigate('/onboarding/protocol', { state: { brainState: state } });
        }
      }, 2200);
    } catch (error) {
      console.error('Error saving onboarding check-in:', error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-white flex flex-col">
      {/* Back button */}
      <button
        onClick={() => navigate('/onboarding/welcome')}
        className="self-start p-4 text-evergreen-teal hover:opacity-80"
      >
        <ChevronLeft size={28} />
      </button>

      <div className="flex-1 px-6 pt-8 max-w-md mx-auto w-full">
        <h1 className="text-vara-xl font-semibold text-evergreen-teal mb-2">
          How's your brain feeling right now?
        </h1>
        <p className="text-vara-sm text-muted-sage-gray mb-8">
          This is what you'll do each day. Just one tap.
        </p>

        {showCaptured ? (
          <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider">
            <div className="flex items-center justify-center py-vara-lg">
              <span className="text-vara-base font-medium text-evergreen-teal">Captured.</span>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider">
            <div className="flex flex-col gap-vara-sm">
              {BRAIN_STATES.map((item) => (
                <button
                  key={item.state}
                  onClick={() => handleSelect(item.state)}
                  disabled={loading}
                  className="flex items-center gap-3 px-vara-base py-vara-sm rounded-vara-md text-left transition-colors bg-gray-50 hover:bg-gray-100"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <span className="text-vara-sm font-semibold text-soft-charcoal block">
                      {item.label}
                    </span>
                    <span className="text-vara-xs text-muted-sage-gray">
                      {item.description}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {loading && !showCaptured && (
              <div className="absolute inset-0 bg-white/90 flex items-center justify-center rounded-vara-lg">
                <span className="text-vara-sm text-muted-sage-gray">Saving...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
