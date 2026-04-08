import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification
} from "firebase/auth";
import { auth } from "../firebase";
import { db } from "../firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

/** --- Tiny external store for non-hook consumers --- **/
let _snapshot = { user: null, isAuthReady: false };
const _listeners = new Set();

const notify = () => {
  for (const l of _listeners) l(_snapshot);
};

export const authStore = {
  getState: () => _snapshot,
  subscribe: (listener) => {
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  }
};
/** --------------------------------------------------- **/

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);

      // Track last active time for analytics (DAU/WAU/MAU)
      if (u) {
        updateDoc(doc(db, 'users', u.uid), {
          lastActiveAt: serverTimestamp(),
        }).catch(() => {
          // Silently ignore — user doc may not exist yet during signup
        });
      }

      // keep the external store in sync
      _snapshot = { user: u, isAuthReady: true };
      notify();
    });
    return () => unsubscribe();
  }, []);

  const signup = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password);

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const logout = () => {
    try { sessionStorage.removeItem('onboarding_complete'); } catch {}
    return signOut(auth);
  };

  const sendVerificationEmail = (user) => {
    const actionCodeSettings = {
      url: `${window.location.origin}/login`,
      handleCodeInApp: false,
    };
    return sendEmailVerification(user, actionCodeSettings);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthReady, signup, login, logout, sendVerificationEmail }}>
      {children}
    </AuthContext.Provider>
  );
};



