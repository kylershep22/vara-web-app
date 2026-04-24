/**
 * AIConsentContext
 * Tracks whether the user has granted consent for Vara's OpenAI-powered
 * features (daily plan, AI chat, journal tools). Consent is persisted on
 * `users/{uid}.aiConsent`. Call `requireConsent(callback)` at any AI
 * entry point — it invokes the callback directly if consent is granted,
 * otherwise it shows the consent modal and defers the callback until
 * the user taps Enable.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import AIConsentModal from '../components/ai/AIConsentModal';
import { logger } from '../utils/logger';

interface AIConsentContextValue {
  hasConsent: boolean | null;
  requireConsent: (callback?: () => void) => void;
  setConsent: (value: boolean) => Promise<void>;
}

const AIConsentContext = createContext<AIConsentContextValue | undefined>(undefined);

export const AIConsentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [hasConsent, setHasConsent] = useState<boolean | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const pendingCbRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user?.uid || !db) {
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
        logger.warn('AIConsent: failed to load consent state', err);
        setHasConsent(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const setConsent = useCallback(
    async (value: boolean) => {
      if (!user?.uid || !db) return;
      await updateDoc(doc(db, 'users', user.uid), {
        aiConsent: !!value,
        updatedAt: serverTimestamp(),
      });
      setHasConsent(!!value);
    },
    [user?.uid]
  );

  const requireConsent = useCallback(
    (callback?: () => void) => {
      if (hasConsent) {
        callback?.();
        return;
      }
      pendingCbRef.current = callback ?? null;
      setModalVisible(true);
    },
    [hasConsent]
  );

  const handleEnable = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      await setConsent(true);
      const cb = pendingCbRef.current;
      pendingCbRef.current = null;
      setModalVisible(false);
      cb?.();
    } catch (err) {
      logger.error('AIConsent: failed to save consent', err);
    } finally {
      setSaving(false);
    }
  }, [saving, setConsent]);

  const handleDecline = useCallback(() => {
    pendingCbRef.current = null;
    setModalVisible(false);
  }, []);

  return (
    <AIConsentContext.Provider value={{ hasConsent, requireConsent, setConsent }}>
      {children}
      <AIConsentModal
        visible={modalVisible}
        saving={saving}
        onEnable={handleEnable}
        onDecline={handleDecline}
      />
    </AIConsentContext.Provider>
  );
};

export function useAIConsent(): AIConsentContextValue {
  const ctx = useContext(AIConsentContext);
  if (!ctx) {
    throw new Error('useAIConsent must be used within AIConsentProvider');
  }
  return ctx;
}
