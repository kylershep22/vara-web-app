import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAdmin } from "../hooks/useAdmin";

export default function AdminRoute({ children }) {
  const { user, isAuthReady } = useAuth();
  const { isAdmin, loading } = useAdmin();

  if (!isAuthReady || loading) {
    return (
      <div className="p-10 text-center text-lg text-muted-sage-gray">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
