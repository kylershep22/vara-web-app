// src/pages/onboarding/OnboardingInsight.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { saveOnboardingInsight, saveSelectedFocus } from '../../services/db/onboarding.service';
import { BRAIN_PILLARS } from '../../constants/featureUnlock';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

const pillarIcons = {
  focus: '🎯',
  energy: '⚡',
  growth: '🌱',
  resilience: '🛡️',
  connection: '🤝',
};

function recommendPillar(checkIn) {
  if (!checkIn) return 'growth';
  const { energy, focus, mood } = checkIn;
  if (energy <= 2) return 'energy';
  if (focus <= 2) return 'focus';
  if (mood <= 2) return 'resilience';
  if (energy >= 4 && focus >= 4) return 'growth';
  return 'connection';
}

function generateInsightText(checkIn, pillar) {
  const texts = {
    focus: "Your focus could use a boost. Let's start with tools to sharpen your concentration.",
    energy: "Looks like your energy is running low. We'll prioritize rest and renewal.",
    growth: "You're in a strong place! Let's channel that into meaningful growth.",
    resilience: "Building inner strength will help you navigate whatever comes your way.",
    connection: "Strengthening your connections can uplift every other area of wellness.",
  };
  return texts[pillar] || texts.growth;
}

export default function OnboardingInsight() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checkIn, setCheckIn] = useState(null);
  const [selectedPillar, setSelectedPillar] = useState(null);
  const [recommended, setRecommended] = useState('growth');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user?.uid) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.data();
        if (data?.onboardingCheckIn) {
          setCheckIn(data.onboardingCheckIn);
          const rec = recommendPillar(data.onboardingCheckIn);
          setRecommended(rec);
          setSelectedPillar(rec);
        }
      } catch (err) {
        console.error('Failed to load check-in:', err);
      }
    })();
  }, [user?.uid]);

  const insightText = generateInsightText(checkIn, recommended);

  const handleNext = async () => {
    setSaving(true);
    try {
      if (user?.uid) {
        const pillarConfig = BRAIN_PILLARS.find(p => p.id === recommended);
        await saveOnboardingInsight(user.uid, {
          text: insightText,
          recommendedFocus: recommended,
          focusExplanation: pillarConfig?.description || '',
        });
        if (selectedPillar) {
          await saveSelectedFocus(user.uid, selectedPillar);
        }
      }
      navigate('/onboarding/activity');
    } catch (err) {
      console.error('Failed to save insight:', err);
      navigate('/onboarding/activity');
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
                i === 2 ? 'w-6 bg-evergreen-teal' : i < 2 ? 'bg-evergreen-teal' : 'bg-silver-sage'
              }`}
            />
          ))}
        </div>

        {/* Insight card */}
        <div className="bg-gradient-to-br from-teal-light to-dew-sage-light rounded-vara-lg p-vara-lg mb-6 border border-divider">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-evergreen-teal" size={20} />
            <h3 className="text-vara-sm font-medium text-evergreen-teal">Your Insight</h3>
          </div>
          <p className="text-vara-base text-soft-charcoal leading-relaxed">
            {insightText}
          </p>
        </div>

        {/* Pillar selection */}
        <h2 className="text-vara-lg font-semibold text-soft-charcoal mb-2">
          Choose Your Focus
        </h2>
        <p className="text-vara-sm text-muted-sage-gray mb-4">
          We recommend <strong className="text-evergreen-teal">{BRAIN_PILLARS.find(p => p.id === recommended)?.title}</strong>, but you can choose any path.
        </p>

        <div className="space-y-2 mb-8">
          {BRAIN_PILLARS.map((pillar) => (
            <button
              key={pillar.id}
              onClick={() => setSelectedPillar(pillar.id)}
              className={`w-full text-left px-4 py-3 rounded-vara-md border transition-all flex items-center gap-3 ${
                selectedPillar === pillar.id
                  ? 'border-evergreen-teal bg-teal-light'
                  : 'border-divider bg-white hover:border-silver-sage'
              }`}
            >
              <span className="text-xl">{pillarIcons[pillar.id]}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-vara-sm font-medium text-soft-charcoal">{pillar.title}</span>
                  {pillar.id === recommended && (
                    <span className="text-[10px] font-medium text-evergreen-teal bg-evergreen-teal/10 px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  )}
                </div>
                <span className="text-vara-xs text-muted-sage-gray">{pillar.subtitle}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/onboarding/check-in')}
            className="px-4 py-3 rounded-vara-md text-muted-sage-gray hover:text-soft-charcoal"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={handleNext}
            disabled={saving || !selectedPillar}
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
