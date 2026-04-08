/**
 * Onboarding V2 - Welcome Screen
 * Screen 1 of 3: Brand introduction with CTA.
 * Matches mobile OnboardingV2WelcomeScreen.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function OnboardingV2Welcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-warm-white flex flex-col items-center justify-center px-6">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md w-full">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-evergreen-teal flex items-center justify-center shadow-vara-md mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
            <path d="M10 21h4" />
          </svg>
        </div>

        {/* Headline */}
        <h1 className="text-vara-2xl font-semibold text-evergreen-teal text-center mb-4">
          Vara works with your brain, not against it.
        </h1>

        {/* Subtext */}
        <p className="text-vara-base text-soft-charcoal text-center px-2">
          Build habits that last by first supporting how your brain actually works.
        </p>
      </div>

      {/* CTA */}
      <div className="w-full max-w-md pb-8 pt-4">
        <button
          onClick={() => navigate('/onboarding/check-in')}
          className="w-full py-3.5 bg-evergreen-teal text-white font-semibold rounded-vara-md hover:bg-teal-700 transition-colors text-vara-base"
        >
          Let's begin
        </button>
      </div>
    </div>
  );
}
