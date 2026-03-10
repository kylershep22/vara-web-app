// src/pages/onboarding/OnboardingWelcome.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf, ArrowRight } from 'lucide-react';

export default function OnboardingWelcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-mist-white to-dew-sage-light flex items-center justify-center p-vara-base">
      <div className="max-w-md w-full text-center">
        {/* Logo / brand mark */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-evergreen-teal/10 mb-8">
          <Leaf className="text-evergreen-teal" size={40} />
        </div>

        <h1 className="text-vara-2xl font-semibold text-soft-charcoal mb-3">
          Welcome to Vara
        </h1>
        <p className="text-vara-base text-muted-sage-gray mb-8 leading-relaxed">
          Your personal wellness companion. Let's take a minute to understand
          where you are today, so we can guide you to where you want to be.
        </p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === 0 ? 'w-6 bg-evergreen-teal' : 'bg-silver-sage'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => navigate('/onboarding/check-in')}
          className="w-full py-4 rounded-vara-lg bg-evergreen-teal text-white font-medium text-vara-base hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          Get Started
          <ArrowRight size={20} />
        </button>

        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 text-vara-sm text-muted-sage-gray hover:text-soft-charcoal"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
