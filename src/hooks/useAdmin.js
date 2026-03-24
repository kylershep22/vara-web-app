import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Hook that checks if the current user has admin role.
 * Uses a real-time listener so role changes take effect immediately.
 */
export function useAdmin() {
  const { user, isAuthReady } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady || !user?.uid) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const ref = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(ref, (snap) => {
      setIsAdmin(snap.exists() && snap.data().role === "admin");
      setLoading(false);
    }, () => {
      setIsAdmin(false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, isAuthReady]);

  return { isAdmin, loading };
}
