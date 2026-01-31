import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../hooks/useSubscription';
import Paywall from './subscription/Paywall';

export default function ProtectedRoute({ children }) {
  const { user, isAuthReady } = useAuth();
  const { status, loading: subscriptionLoading } = useSubscription();

  // Don't render anything until Firebase is done initializing
  if (!isAuthReady) {
    return <div className="p-10 text-center text-lg text-gray-600">Checking authentication...</div>;
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" />;
  }

  // BETA: Subscription checks disabled during TestFlight testing
  // TODO: Re-enable when ready to launch
  //
  // // Show loading while checking subscription
  // if (subscriptionLoading) {
  //   return <div className="p-10 text-center text-lg text-gray-600">Loading...</div>;
  // }
  //
  // // Show paywall if subscription is expired (hard paywall)
  // if (status && !status.canAccessApp) {
  //   return <Paywall />;
  // }

  return children;
}
