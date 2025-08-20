import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function MyProfileRedirect() {
  const { user, isAuthReady } = useAuth();
  if (!isAuthReady) return null; // or a tiny spinner
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/u/${user.uid}`} replace />;
}
