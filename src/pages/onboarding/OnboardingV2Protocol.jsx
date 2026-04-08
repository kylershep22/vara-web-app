/**
 * Onboarding V2 - Protocol Screen
 * Screen 3 of 3: Guided protocol experience.
 * After completion: marks onboarding as done and redirects to dashboard.
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { markProtocolCompleted } from '../../services/db/brainStateCheckIn.service';
import { completeOnboarding } from '../../services/db/onboarding.service';
import TodaysProtocolCard from '../../components/dashboard/TodaysProtocolCard';

export default function OnboardingV2Protocol() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const brainState = location.state?.brainState;
  const [completing, setCompleting] = useState(false);

  const handleMarkCompleted = async () => {
    if (!user?.uid || completing) return;
    setCompleting(true);
    try {
      // 1. Mark protocol completed
      await markProtocolCompleted(user.uid);

      // 2. Complete onboarding
      await completeOnboarding(user.uid);

      // 3. Navigate to dashboard
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      setCompleting(false);
    }
  };

  // Fallback if navigated directly without brain state
  if (!brainState) {
    navigate('/onboarding/welcome', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-warm-white flex flex-col">
      {/* Back button */}
      <button
        onClick={() => navigate('/onboarding/check-in')}
        className="self-start p-4 text-evergreen-teal hover:opacity-80"
      >
        <ChevronLeft size={28} />
      </button>

      <div className="flex-1 px-6 pt-8 max-w-md mx-auto w-full">
        {/* Protocol card with instructions pre-expanded */}
        <TodaysProtocolCard
          brainState={brainState}
          protocolCompleted={completing}
          onComplete={handleMarkCompleted}
        />

        {completing && (
          <div className="flex items-center justify-center py-vara-lg">
            <span className="text-vara-base font-medium text-evergreen-teal">Saved.</span>
          </div>
        )}
      </div>
    </div>
  );
}
