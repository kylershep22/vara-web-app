import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';
import AIConsentModal from '../components/ai/AIConsentModal';

const AIConsentContext = createContext(null);

export function AIConsentProvider({ children }) {
  const { user } = useAuth();
  const [hasConsent, setHasConsent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const pendingCbRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.uid) {
      setHasConsent(null);
      return;
    }
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (cancelled) return;
        setHasConsent(!!snap.data()?.aiConsent);
      } catch (err) {
        if (cancelled) return;
        console.warn('AIConsent: failed to load consent state', err);
        setHasConsent(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const requireConsent = useCallback(
    (cb) => {
      if (hasConsent) {
        cb?.();
        return;
      }
      pendingCbRef.current = cb || null;
      setModalOpen(true);
    },
    [hasConsent]
  );

  const setConsent = useCallback(
    async (value) => {
      if (!user?.uid) return;
      await updateDoc(doc(db, 'users', user.uid), { aiConsent: !!value });
      setHasConsent(!!value);
    },
    [user?.uid]
  );

  const handleEnable = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await setConsent(true);
      const cb = pendingCbRef.current;
      pendingCbRef.current = null;
      setModalOpen(false);
      cb?.();
    } catch (err) {
      console.error('AIConsent: failed to save consent', err);
    } finally {
      setSaving(false);
    }
  }, [saving, setConsent]);

  const handleDecline = useCallback(() => {
    pendingCbRef.current = null;
    setModalOpen(false);
  }, []);

  const value = { hasConsent, requireConsent, setConsent };

  return (
    <AIConsentContext.Provider value={value}>
      {children}
      <AIConsentModal
        isOpen={modalOpen}
        saving={saving}
        onEnable={handleEnable}
        onDecline={handleDecline}
      />
    </AIConsentContext.Provider>
  );
}

export function useAIConsent() {
  const ctx = useContext(AIConsentContext);
  if (!ctx) {
    throw new Error('useAIConsent must be used within AIConsentProvider');
  }
  return ctx;
}
