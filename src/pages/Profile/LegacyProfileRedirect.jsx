import React from "react";
import { Navigate, useParams } from "react-router-dom";

export default function LegacyProfileRedirect() {
  const { uid } = useParams();
  return <Navigate to={`/u/${uid}`} replace />;
}
