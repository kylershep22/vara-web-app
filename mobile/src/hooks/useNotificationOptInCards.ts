/**
 * useNotificationOptInCards Hook
 * Evaluates conditions for showing progressive notification opt-in cards
 * on the Dashboard. Uses featureDiscovery engagement metrics and AsyncStorage
 * for dismiss tracking.
 *
 * Cards:
 *  - Insights: 3+ active days in first 14 days, not already enabled, not dismissed 2x
 *  - Milestones: 14+ calendar days since createdAt AND 5+ habits+journals, not already enabled
 *  - Community digest: first social interaction (evaluated but shown as toast, not card)
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useNotificationPreferences } from './useNotificationPreferences';
import { useFeatureDiscovery } from './useFeatureDiscovery';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

type OptInCardType = 'insights' | 'milestones';

interface DismissState {
  count: number;
  lastDismissedAt: number | null;
}

const DISMISS_PREFIX = '@vara_notif_optin_dismiss_';
const MAX_DISMISSALS = 2;
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

interface UseNotificationOptInCardsReturn {
  /** The single card to show (at most one at a time), or null */
  activeCard: OptInCardType | null;
  /** Handle opt-in for a card type */
  onOptIn: (type: OptInCardType) => Promise<void>;
  /** Handle dismiss for a card type */
  onDismiss: (type: OptInCardType) => Promise<void>;
  loading: boolean;
}

export function useNotificationOptInCards(): UseNotificationOptInCardsReturn {
  const { user } = useAuth();
  const { preferences, updateCategory } = useNotificationPreferences();
  const { engagement } = useFeatureDiscovery();
  const [activeCard, setActiveCard] = useState<OptInCardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountAgeDays, setAccountAgeDays] = useState<number>(0);

  // Load account age
  useEffect(() => {
    if (!user?.uid) return;
    const loadAccountAge = async () => {
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const createdAt = userSnap.data().createdAt?.toDate?.();
          if (createdAt) {
            const days = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
            setAccountAgeDays(days);
          }
        }
      } catch {
        // Ignore
      }
    };
    loadAccountAge();
  }, [user?.uid]);

  // Evaluate which card to show
  useEffect(() => {
    if (!user?.uid || !preferences || !engagement) {
      setLoading(false);
      return;
    }

    const evaluate = async () => {
      try {
        // Check insights card
        if (!preferences.insightsLearning?.enabled) {
          const insightsDismiss = await getDismissState('insights');
          if (canShowCard(insightsDismiss)) {
            // Condition: 3+ active days (sessionCount as proxy) within first 14 days
            const activeDays = engagement.sessionCount || 0;
            if (activeDays >= 3 && accountAgeDays <= 14) {
              setActiveCard('insights');
              setLoading(false);
              return;
            }
          }
        }

        // Check milestones card (only if insights not shown)
        if (!preferences.milestonesReflection?.enabled) {
          const milestonesDismiss = await getDismissState('milestones');
          if (canShowCard(milestonesDismiss)) {
            // Condition: 14+ days AND 5+ combined habits + journal entries
            const totalItems = (engagement.habitsCompleted || 0) + (engagement.journalEntriesCount || 0);
            if (accountAgeDays >= 14 && totalItems >= 5) {
              setActiveCard('milestones');
              setLoading(false);
              return;
            }
          }
        }

        setActiveCard(null);
      } catch {
        setActiveCard(null);
      } finally {
        setLoading(false);
      }
    };

    evaluate();
  }, [user?.uid, preferences, engagement, accountAgeDays]);

  const onOptIn = useCallback(async (type: OptInCardType) => {
    if (!preferences) return;

    if (type === 'insights') {
      await updateCategory('insightsLearning', { ...preferences.insightsLearning, enabled: true });
    } else if (type === 'milestones') {
      await updateCategory('milestonesReflection', { enabled: true });
    }
    setActiveCard(null);
  }, [preferences, updateCategory]);

  const onDismiss = useCallback(async (type: OptInCardType) => {
    const key = DISMISS_PREFIX + type;
    const state = await getDismissState(type);
    const newState: DismissState = {
      count: state.count + 1,
      lastDismissedAt: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(newState));
    setActiveCard(null);
  }, []);

  return { activeCard, onOptIn, onDismiss, loading };
}

async function getDismissState(type: string): Promise<DismissState> {
  try {
    const raw = await AsyncStorage.getItem(DISMISS_PREFIX + type);
    if (!raw) return { count: 0, lastDismissedAt: null };
    return JSON.parse(raw) as DismissState;
  } catch {
    return { count: 0, lastDismissedAt: null };
  }
}

function canShowCard(state: DismissState): boolean {
  // Permanently hidden after max dismissals
  if (state.count >= MAX_DISMISSALS) return false;

  // 14-day cooldown
  if (state.lastDismissedAt) {
    if (Date.now() - state.lastDismissedAt < COOLDOWN_MS) return false;
  }

  return true;
}

export default useNotificationOptInCards;
