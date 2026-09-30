/**
 * useDashboard
 * State management and event handlers for the DashboardScreen.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useWindowDimensions } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { doc, getDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { setUserPrivate } from '../services/firebase/userPrivate.service';
import { getMergedUserData } from '../services/firebase/userMigrationRead';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useGoals } from './useGoals';
import { useFeatureDiscovery } from './useFeatureDiscovery';
import { useNotificationOptInCards } from './useNotificationOptInCards';
import {
  calculateWellnessScore,
  refreshWellnessScore,
  getTodayWellnessScore,
  getTodayEntry,
  getWellnessScoreEnabled,
  setWellnessScoreEnabled,
} from '../services/firebase';
import { generateDailyPlan } from '../services/api/ai.service';
import { DailyWellnessScore, FourThreeTwoOneEntry } from '../types';
import { logger } from '../utils/logger';
import { DASHBOARD_V2 } from '../constants/dashboardConfig';
import { getProtocolById } from '../constants/brainStateProtocols';
import { normalizeProtocolId } from '../utils/protocolIdNormalizer';
import {
  getTodayBrainStateCheckIn,
  getTodayDailyReflection,
  saveDailyReflection,
} from '../services/firebase';
import { BrainState, BrainStateCheckIn as BrainStateCheckInType, DailyReflection as DailyReflectionType, DailyReflectionValue } from '../types';
import { getNudgeSuggestion, NudgeSuggestion } from '../utils/getNudgeSuggestion';
import { getDashboardCardOrder, type DashboardCardId } from '../utils/getDashboardCardOrder';

const SMALL_SCREEN_WIDTH = 375;
const MEDIUM_SCREEN_WIDTH = 414;

export function useDashboard() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const { width: screenWidth } = useWindowDimensions();
  const goalsResult = useGoals();
  const goals = DASHBOARD_V2 ? [] : goalsResult.goals;
  const goalsLoading = DASHBOARD_V2 ? false : goalsResult.loading;
  const goalsError = DASHBOARD_V2 ? null : goalsResult.error;
  // No habits or journal subscription (V1-HABITS-RETIREMENT). Today reads
  // neither, and the journal read was the only thing the error banner could
  // report (TODAY-BANNER-JOURNAL-ONLY). The banner stays, inert: goalsError is
  // null under DASHBOARD_V2, so dataErrors is always empty.

  // Collect any data-fetch errors for the UI to display
  const dataErrors = useMemo(() => {
    const errors: string[] = [];
    if (goalsError) errors.push('goals');
    return errors;
  }, [goalsError]);

  // sessionCount still feeds the notification opt-in card below; only the
  // unlock toasts are off (ruling F of the V1 SCOPE REVISION block).
  const { trackEngagement, evaluateTriggers } = useFeatureDiscovery();
  const { activeCard: notifOptInCard, onOptIn: handleNotifOptIn, onDismiss: handleNotifDismiss } = useNotificationOptInCards();

  const [refreshing, setRefreshing] = useState(false);
  const [completedToday] = useState<Set<string>>(new Set());
  const [dailyPlan, setDailyPlan] = useState<string | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [isPlanExpanded, setIsPlanExpanded] = useState(false);

  // Wellness Score state
  const [wellnessScore, setWellnessScore] = useState<DailyWellnessScore | null>(null);
  const [wellnessScoreLoading, setWellnessScoreLoading] = useState(true);
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [fourThreeTwoOneEntry, setFourThreeTwoOneEntry] = useState<FourThreeTwoOneEntry | null>(null);

  // Wellness Score opt-in state
  const [wellnessScoreEnabled, setWellnessScoreEnabledState] = useState<boolean | null>(null);
  const [showOptInPrompt, setShowOptInPrompt] = useState(true);

  // Welcome-back card state
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  // Dashboard V2: Brain State Check-In
  const [brainStateCheckIn, setBrainStateCheckIn] = useState<BrainStateCheckInType | null>(null);

  // Dashboard V2: Daily Reflection
  // Written by the handlers below but no longer read: showDailyReflection, the
  // only reader, depended on habits and left with them (V1-HABITS-RETIREMENT).
  const [, setDailyReflection] = useState<DailyReflectionType | null>(null);
  const [, setDailyReflectionDismissed] = useState(false);

  // Event code card state
  const [showEventCodeCard, setShowEventCodeCard] = useState(false);
  const [eventCodeSheetVisible, setEventCodeSheetVisible] = useState(false);

  // Nudge card state
  const [nudgeSuggestion, setNudgeSuggestion] = useState<NudgeSuggestion | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [visitedFeatures] = useState<Set<string>>(() => new Set());

  // Responsive day count
  const daysToShow = useMemo(() => {
    if (screenWidth < SMALL_SCREEN_WIDTH) return 5;
    if (screenWidth < MEDIUM_SCREEN_WIDTH) return 6;
    return 7;
  }, [screenWidth]);

  const isCompactMode = screenWidth < SMALL_SCREEN_WIDTH;

  // Today's date string (local timezone)
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    let timeGreeting: string;
    if (DASHBOARD_V2) {
      if (hour >= 5 && hour < 12) timeGreeting = 'Good morning';
      else if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
      else if (hour >= 17 && hour < 22) timeGreeting = 'Good evening';
      else timeGreeting = 'Good evening';
    } else {
      timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    }
    const firstName = user?.displayName?.split(' ')[0];
    if (DASHBOARD_V2) {
      return firstName ? `${timeGreeting}, ${firstName}.` : `${timeGreeting}.`;
    }
    return firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;
  }, [user?.displayName]);

  // Visible days for weekly habit tracker
  const visibleDays = useMemo(() => {
    const days = [];
    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toISOString().split('T')[0],
        dayName: isCompactMode
          ? date.toLocaleDateString('en-US', { weekday: 'narrow' })
          : date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isToday: date.toISOString().split('T')[0] === today,
      });
    }
    return days;
  }, [daysToShow, today, isCompactMode]);

  // Track lastActiveAt and check for returning user
  useEffect(() => {
    if (!user?.uid || !db) return;
    const checkAndUpdate = async () => {
      try {
        const userRef = doc(db, 'users', user.uid);
        // MIGRATION_FALLBACK — eventData and eventPromptDismissed moved to
        // userPrivate in slice 2. `lastActiveAt` and `createdAt` deliberately
        // did NOT (see the UserPrivate "deliberately not moved" note), and the
        // merged read never lets the private store's own createdAt shadow the
        // account's — which is what the account-age window below depends on.
        // The merged map spans two documents, so it is untyped; the two
        // timestamp shapes this reads (Firestore Timestamp / raw seconds) are
        // the same ones the single-document read handled before.
        const data = (await getMergedUserData(user.uid)) as
          | Record<string, any>
          | null;
        if (data?.lastActiveAt) {
          const lastActive = data.lastActiveAt.toDate ? data.lastActiveAt.toDate() : new Date(data.lastActiveAt);
          const daysSince = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince >= 3 && !DASHBOARD_V2) {
            setShowWelcomeBack(true);
          }
        }
        // Event code prompt: show for users < 48 hours old with no eventData and not dismissed
        if (data) {
          const createdAtMs = data.createdAt?.toMillis?.() || (data.createdAt?.seconds ? data.createdAt.seconds * 1000 : 0);
          const hoursSinceCreation = (Date.now() - createdAtMs) / (1000 * 60 * 60);
          const hasEventData = !!data.eventData;
          const hasDismissed = !!data.eventPromptDismissed;
          if (hoursSinceCreation < 48 && !hasEventData && !hasDismissed) {
            setShowEventCodeCard(true);
          }
        }

        await updateDoc(userRef, { lastActiveAt: serverTimestamp() });
      } catch (error) {
        logger.log('Error updating lastActiveAt:', error);
      }
    };
    checkAndUpdate();
  }, [user?.uid]);

  // Load daily plan from storage
  useEffect(() => {
    if (DASHBOARD_V2) return;
    const loadDailyPlan = async () => {
      try {
        const storedPlan = await SecureStore.getItemAsync(`dailyPlan_${today}`);
        if (storedPlan) setDailyPlan(storedPlan);
      } catch (error) {
        logger.error('Error loading daily plan:', error);
      }
    };
    loadDailyPlan();
  }, [today]);

  // Load wellness score opt-in preference
  useEffect(() => {
    if (DASHBOARD_V2) return;
    const loadWellnessPreference = async () => {
      if (!user?.uid) return;
      try {
        const enabled = await getWellnessScoreEnabled(user.uid);
        setWellnessScoreEnabledState(enabled);
      } catch (error) {
        logger.error('Error loading wellness score preference:', error);
        setWellnessScoreEnabledState(false);
      }
    };
    loadWellnessPreference();
  }, [user?.uid]);

  // Track new session for feature discovery
  useEffect(() => {
    if (user?.uid) {
      trackEngagement('sessionCount').then(() => evaluateTriggers()).catch(logger.error);
    }
  }, [user?.uid]);

  // V2: Load brain state check-in.
  //
  // Sub-step 2.7 round 2 — Observation 8: switched from useEffect on
  // [user?.uid, today] to useFocusEffect. The previous one-shot
  // useEffect only fired on mount and on user/day changes — when a
  // user completed CheckInFlow (a slide-from-bottom modal) and
  // navigated back, the dashboard re-rendered but the effect deps
  // hadn't changed, so the brainStateCheckIn state stayed stale at
  // its mount-time value (typically null pre-checkin). The dashboard
  // rendered the chip picker as if no check-in had occurred, even
  // though writeStandardFlowSession had successfully written the
  // protocolSessions doc + legacy brainStateCheckIns doc with the
  // final re-check state.
  //
  // useFocusEffect fires on every focus event including the initial
  // focus — covers both the original "mount" case and the new
  // "returning from modal" case in one mechanism. The
  // [user?.uid, today] deps still gate the work; they're now passed
  // to useCallback so the focus handler is stable across renders.
  //
  // Sub-step 2.5 removed the loading state — chip taps navigate to
  // CheckInFlow which handles its own loading UX; this read path is
  // just a fetch on focus.
  useFocusEffect(
    useCallback(() => {
      if (!DASHBOARD_V2 || !user?.uid) return;
      const loadBrainStateCheckIn = async () => {
        try {
          const existing = await getTodayBrainStateCheckIn(user.uid);
          setBrainStateCheckIn(existing);
          const existingReflection = await getTodayDailyReflection(user.uid);
          setDailyReflection(existingReflection);
        } catch (error) {
          logger.error('Error loading brain state check-in:', error);
        }
      };
      loadBrainStateCheckIn();
    }, [user?.uid, today])
  );

  // V1: Load wellness score, morning check-in, and 4-3-2-1 entry
  useEffect(() => {
    if (DASHBOARD_V2) return;
    const loadWellnessData = async () => {
      if (!user?.uid) return;
      setWellnessScoreLoading(true);
      try {
        const todayFourThreeTwoOne = await getTodayEntry(user.uid);
        setFourThreeTwoOneEntry(todayFourThreeTwoOne);

        const existingScore = await getTodayWellnessScore(user.uid);
        if (existingScore) {
          setWellnessScore(existingScore);
        } else {
          const newScore = await calculateWellnessScore(user.uid);
          setWellnessScore(newScore);
        }
      } catch (error) {
        logger.error('Error loading wellness data:', error);
      } finally {
        setWellnessScoreLoading(false);
      }
    };
    loadWellnessData();
  }, [user?.uid, today]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleGenerateDailyPlan = useCallback(async () => {
    setGeneratingPlan(true);
    try {
      const response = await generateDailyPlan({
        // No `tasks` here. DailyPlanRequest.tasks is optional, and the mobile
        // app has no live task collection to fill it from: the legacy `tasks`
        // subscription this hook used to hold was dormant under DASHBOARD_V2
        // and is retired. Sending an always-empty array said "this user has no
        // tasks" when the truth is "this app does not read tasks".
        userId: user!.uid,
        goals: goals.slice(0, 5),
      });
      setDailyPlan(response.plan);
      await SecureStore.setItemAsync(`dailyPlan_${today}`, response.plan);
    } catch (error) {
      logger.error('Error generating daily plan:', error);
      alert('Failed to generate daily plan. Please try again.');
    } finally {
      setGeneratingPlan(false);
    }
  }, [user, goals, today]);

  // Sub-step 2.5: handleBrainStateCheckIn removed — chip taps now
  // navigate to CheckInFlow, which handles the Firestore write
  // (writeStandardFlowSession) inside its terminal useEffect. The
  // dashboard's brainStateCheckIn state updates via the next refetch
  // after the user returns from the flow.
  //
  // Engagement tracking ('brainStateCheckInsCompleted') for the
  // chip-tap path no longer fires from this hook. If/when telemetry
  // for completed flows is wired (Phase 5 / Phase 6), the natural
  // home is CheckInFlowScreen's onComplete handler.

  // Sub-step 2.7 fix (Observation 3): handleMarkProtocolCompleted
  // removed alongside TodaysProtocolCard's V1 self-attest UI. Protocol
  // completion now happens through CheckInFlow's terminal write
  // (writeStandardFlowSession), which calls markProtocolCompleted on
  // flow_complete via the legacy parallel write. The dashboard's
  // brainStateCheckIn state updates via the next refetch after the
  // user returns from the flow.
  const todaysProtocol = useMemo(() => {
    if (!brainStateCheckIn) return null;
    // Sub-step 2.5 migration: read the protocolId off the legacy
    // brainStateCheckIns doc (saveBrainStateCheckIn writes it via
    // selectProtocol now) and resolve it to a Protocol via
    // getProtocolById. normalizeProtocolId handles legacy v1 IDs
    // ('extended-exhale' → 'extended-exhale-2', etc.) for existing
    // TestFlight users whose docs predate Phase 1's id-suffix scheme.
    const rawId = (brainStateCheckIn as { protocolId?: string }).protocolId;
    if (!rawId) return null;
    const normalized = normalizeProtocolId(rawId);
    if (!normalized) return null;
    return getProtocolById(normalized);
  }, [brainStateCheckIn]);

  // Card order based on brain state
  const cardOrder = useMemo((): DashboardCardId[] => {
    const state = brainStateCheckIn?.brainState ?? null;
    return getDashboardCardOrder(state);
  }, [brainStateCheckIn]);

  // Compute nudge suggestion after check-in + protocol
  useEffect(() => {
    if (!user || !db || !brainStateCheckIn?.brainState || nudgeDismissed) {
      setNudgeSuggestion(null);
      return;
    }

    // Only show nudge after protocol is done or not available
    if (todaysProtocol && !brainStateCheckIn.protocolCompleted) {
      setNudgeSuggestion(null);
      return;
    }

    const checkCompletedFeatures = async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const completed = new Set<string>(visitedFeatures);

      try {
        // Check journal
        const journalSnap = await getDocs(
          query(collection(db, 'journalEntries'), where('userId', '==', user.uid), where('createdAt', '>=', new Date(todayStr)), limit(1))
        );
        if (journalSnap.size > 0) completed.add('journal');

        // Check focus sessions
        const focusSnap = await getDocs(
          query(collection(db, 'focusSessions'), where('userId', '==', user.uid), where('startedAt', '>=', new Date(todayStr)), limit(1))
        );
        if (focusSnap.size > 0) completed.add('focus');

        // Check brain metrics
        const metricsSnap = await getDocs(
          query(collection(db, 'brainMetrics'), where('userId', '==', user.uid), where('date', '==', todayStr), limit(1))
        );
        if (metricsSnap.size > 0) completed.add('brainHealth');
      } catch (error) {
        // Non-blocking — if checks fail, just show a nudge anyway
      }

      const suggestion = getNudgeSuggestion(brainStateCheckIn.brainState as any, completed as any);
      setNudgeSuggestion(suggestion);
    };

    checkCompletedFeatures();
  }, [user, db, brainStateCheckIn, todaysProtocol, nudgeDismissed, visitedFeatures]);

  const handleDailyReflection = useCallback(async (value: DailyReflectionValue) => {
    if (!user?.uid) return;
    try {
      const reflection = await saveDailyReflection(user.uid, value);
      setDailyReflection(reflection);
    } catch (error) {
      logger.error('Error saving daily reflection:', error);
    }
  }, [user]);

  const handleDailyReflectionSkip = useCallback(() => {
    setDailyReflectionDismissed(true);
  }, []);

  const handleEventCodeDismiss = useCallback(async () => {
    setShowEventCodeCard(false);
    if (user?.uid && db) {
      try {
        await setUserPrivate(user.uid, { eventPromptDismissed: true });
      } catch (err) {
        logger.error('Error dismissing event prompt:', err);
      }
    }
  }, [user]);

  const handleEventCodeSuccess = useCallback(() => {
    setShowEventCodeCard(false);
    setEventCodeSheetVisible(false);
  }, []);

  const dismissNudge = useCallback(() => {
    setNudgeDismissed(true);
    setNudgeSuggestion(null);
  }, []);

  const markFeatureVisited = useCallback((feature: string) => {
    visitedFeatures.add(feature);
  }, [visitedFeatures]);

  const handleRefreshWellnessScore = useCallback(async () => {
    if (!user?.uid) return;
    setWellnessScoreLoading(true);
    try {
      const newScore = await refreshWellnessScore(user.uid);
      setWellnessScore(newScore);
    } catch (error) {
      logger.error('Error refreshing wellness score:', error);
    } finally {
      setWellnessScoreLoading(false);
    }
  }, [user]);

  const handleFourThreeTwoOneChange = useCallback(async (entry: FourThreeTwoOneEntry) => {
    setFourThreeTwoOneEntry(entry);
    if (user?.uid) {
      try {
        const newScore = await refreshWellnessScore(user.uid);
        setWellnessScore(newScore);
      } catch (error) {
        logger.error('Error refreshing wellness score after 4-3-2-1 change:', error);
      }
    }
  }, [user]);

  const handleWellnessScoreEnable = useCallback(async () => {
    if (user?.uid) {
      await setWellnessScoreEnabled(user.uid, true);
      setWellnessScoreEnabledState(true);
    }
  }, [user]);

  const dataLoading = goalsLoading;

  return {
    user,
    navigation,
    dataLoading,
    dataErrors,
    refreshing,
    greeting,
    formattedDate,
    today,
    visibleDays,

    // Goals
    goals,
    completedToday,

    // Daily Plan
    dailyPlan,
    generatingPlan,
    isPlanExpanded,
    setIsPlanExpanded,
    handleGenerateDailyPlan,

    // Wellness Score
    wellnessScore,
    wellnessScoreLoading,
    showScoreBreakdown,
    setShowScoreBreakdown,
    wellnessScoreEnabled,
    showOptInPrompt,
    setShowOptInPrompt,
    handleRefreshWellnessScore,
    handleWellnessScoreEnable,

    // 4-3-2-1
    fourThreeTwoOneEntry,
    handleFourThreeTwoOneChange,

    // Welcome back
    showWelcomeBack,
    setShowWelcomeBack,

    // Notification opt-in
    notifOptInCard,
    handleNotifOptIn,
    handleNotifDismiss,

    // Refresh
    handleRefresh,

    // Dashboard V2
    brainStateCheckIn,
    todaysProtocol,

    // Daily Reflection
    handleDailyReflection,
    handleDailyReflectionSkip,

    // Event Code
    showEventCodeCard,
    eventCodeSheetVisible,
    setEventCodeSheetVisible,
    handleEventCodeDismiss,
    handleEventCodeSuccess,

    // Nudge
    nudgeSuggestion,
    dismissNudge,
    markFeatureVisited,

    cardOrder,
  };
}
