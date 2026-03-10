// src/components/shared/FeatureGate.jsx
// Wrapper that conditionally renders children based on feature unlock status
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getFeaturesForPillar, ALL_FEATURES } from '../../constants/featureUnlock';
import { Lock } from 'lucide-react';

export default function FeatureGate({ featureId, fallback, children }) {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState(true); // Default to unlocked to avoid flash
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!user?.uid) { setLoading(false); return; }

      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        const data = snap.data();

        // If user hasn't completed onboarding or has no pillar, show everything
        if (!data?.hasCompletedOnboarding || !data?.selectedPillar) {
          setUnlocked(true);
          setLoading(false);
          return;
        }

        // Check if user has manually unlocked all features
        if (data?.allFeaturesUnlocked) {
          setUnlocked(true);
          setLoading(false);
          return;
        }

        // Calculate days since onboarding
        const completedAt = data.onboardingCompletedAt?.toDate?.() || new Date(data.onboardingCompletedAt);
        const daysSinceStart = Math.floor((Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24));

        const unlockedFeatures = getFeaturesForPillar(data.selectedPillar, daysSinceStart);
        setUnlocked(unlockedFeatures.includes(featureId));
      } catch (err) {
        console.error('FeatureGate error:', err);
        setUnlocked(true); // Fail open
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uid, featureId]);

  if (loading) return null;

  if (!unlocked) {
    if (fallback) return fallback;

    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-dew-sage-light rounded-vara-md text-muted-sage-gray">
        <Lock size={16} />
        <span className="text-vara-sm">This feature unlocks as you continue your journey.</span>
      </div>
    );
  }

  return children;
}
