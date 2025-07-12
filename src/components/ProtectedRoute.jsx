import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, isAuthReady } = useAuth();

  // Don't render anything until Firebase is done initializing
  if (!isAuthReady) {
    return <div className="p-10 text-center text-lg text-gray-600">Checking authentication...</div>;
  }

  return user ? children : <Navigate to="/login" />;
}

