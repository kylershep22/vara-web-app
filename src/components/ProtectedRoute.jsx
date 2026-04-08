import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import { hasCompletedOnboarding } from '../services/db/onboarding.service';
import Paywall from './subscription/Paywall';

export default function ProtectedRoute({ children }) {
  const { user, isAuthReady } = useAuth();
  const { status, loading: subscriptionLoading } = useSubscription();
  const location = useLocation();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (!user?.uid) { setOnboardingChecked(true); return; }

    // Skip onboarding check if already on an onboarding page
    if (location.pathname.startsWith('/onboarding')) {
      setOnboardingChecked(true);
      return;
    }

    // Reset while re-checking so stale needsOnboarding doesn't cause a redirect
    setOnboardingChecked(false);

    (async () => {
      try {
        const completed = await hasCompletedOnboarding(user.uid);
        setNeedsOnboarding(!completed);
      } catch {
        // Fail open - don't block users if check fails
        setNeedsOnboarding(false);
      } finally {
        setOnboardingChecked(true);
      }
    })();
  }, [user?.uid, location.pathname]);

  // Don't render anything until Firebase is done initializing
  if (!isAuthReady) {
    return <div className="p-10 text-center text-lg text-muted-sage-gray">Checking authentication...</div>;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Wait for onboarding check
  if (!onboardingChecked) {
    return <div className="p-10 text-center text-lg text-muted-sage-gray">Loading...</div>;
  }

  // Redirect new users to onboarding
  if (needsOnboarding && !location.pathname.startsWith('/onboarding')) {
    return <Navigate to="/onboarding/welcome" replace />;
  }

  // BETA: Subscription checks disabled during TestFlight testing
  // TODO: Re-enable when ready to launch
  //
  // // Show loading while checking subscription
  // if (subscriptionLoading) {
  //   return <div className="p-10 text-center text-lg text-muted-sage-gray">Loading...</div>;
  // }
  //
  // // Show paywall if subscription is expired (hard paywall)
  // if (status && !status.canAccessApp) {
  //   return <Paywall />;
  // }

  return children;
}
