/**
 * Dashboard Screen
 * Main home screen showing wellness overview.
 * Thin UI shell that delegates state/handlers to useDashboard.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, RefreshControl, TouchableOpacity, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingSpinner } from '../components';
import NotificationOptInCard from '../components/dashboard/NotificationOptInCard';
import { ActiveRoutinePlayer } from './Focus/ActiveRoutinePlayer';
import { CheckInInvite } from '../components/dashboard/CheckInInvite';
import { SlimResetAffordance } from '../components/dashboard/SlimResetAffordance';
import { RightNowAcknowledgment } from '../components/dashboard/RightNowAcknowledgment';
import { SuggestedActionCard } from '../components/dashboard/SuggestedActionCard';
import { InsightCard } from '../components/dashboard/InsightCard';
import { RoutineCard } from '../components/dashboard/RoutineCard';
import { suggestedAction } from '../components/dashboard/suggestedAction';
import { FirstShiftFooter } from '../components/dashboard/FirstShiftFooter';
import NudgeCard from '../components/dashboard/NudgeCard';
import { EventCodeCard } from '../components/events/EventCodeCard';
import { EventCodeSheet } from '../components/events/EventCodeSheet';
import { Colors, Spacing, Typography } from '../constants';
import { DASHBOARD_SUPPRESS } from '../constants/dashboardConfig';
import { useDashboard } from '../hooks/useDashboard';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { doc, onSnapshot, type Timestamp } from 'firebase/firestore';

const DashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const {
    navigation,
    dataLoading,
    dataErrors,
    refreshing,
    greeting,
    formattedDate,
    handleRefresh,
    brainStateCheckIn,
    engineSession,
    notifOptInCard,
    handleNotifOptIn,
    handleNotifDismiss,
    showEventCodeCard,
    eventCodeSheetVisible,
    setEventCodeSheetVisible,
    handleEventCodeDismiss,
    handleEventCodeSuccess,
    nudgeSuggestion,
    dismissNudge,
    markFeatureVisited,
    dashboardRoutines,
    routineCompletions,
    activePlayerRoutine,
    routinePlayerVisible,
    handleBeginRoutine,
    handleCloseRoutinePlayer,
    handleRoutineComplete,
    dashboardPhase,
  } = useDashboard();

  // Sub-step 2.7 — subscribe to the user's firstShiftAt for the
  // FirstShiftFooter render decision. Real-time so a shift completed
  // in CheckInFlow surfaces the footer immediately on dashboard
  // remount or focus, regardless of whether DashboardScreen unmounts
  // during navigation. Single field, narrow scope; Phase 3 may
  // refactor into a shared useUserProfile hook when intentPath also
  // needs subscribing.
  const [firstShiftAt, setFirstShiftAt] = useState<Timestamp | null>(null);
  useEffect(() => {
    if (!user?.uid || !db) return;
    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      const data = snap.data();
      const value = (data?.firstShiftAt as Timestamp | undefined) ?? null;
      setFirstShiftAt(value);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // Phase 2.8.1 — hide the global FAB during the focused brain-state
  // check-in entry flow (dashboardPhase === 'pre-checkin'). When the
  // user completes (or skips) the check-in and the phase transitions
  // to 'checked-in', the FAB returns. Dashboard's Stack.Screen
  // declares showFAB: true; this override applies for the screen's
  // lifetime in the tab stack. Cast bypasses the excess-property
  // check on the navigator's options type (see navigation/types.ts).
  useEffect(() => {
    navigation.setOptions(
      { showFAB: dashboardPhase === 'checked-in' } as any
    );
  }, [navigation, dashboardPhase]);

  // System prompts that survive the rework, rendered after the spec content
  // cards. NotificationOptIn / EventCode are left as-is pending the live-entry
  // confirm; the nudge is kept because it's already live-gated (transient).
  const renderSystemPrompt = (cardId: 'notifOptIn' | 'eventCode' | 'nudge') => {
    switch (cardId) {
      case 'notifOptIn':
        if (DASHBOARD_SUPPRESS.notifOptIn) return null;
        // Skip in pre-checkin; it renders separately there (above) as a setting.
        if (dashboardPhase === 'pre-checkin') return null;
        return notifOptInCard ? (
          <View key="notifOptIn" style={{ paddingHorizontal: Spacing.base }}>
            <NotificationOptInCard
              category={notifOptInCard}
              onOptIn={() => handleNotifOptIn(notifOptInCard)}
              onDismiss={() => handleNotifDismiss(notifOptInCard)}
            />
          </View>
        ) : null;
      case 'eventCode':
        if (DASHBOARD_SUPPRESS.eventCode) return null;
        return showEventCodeCard ? (
          <View key="eventCode" style={{ paddingHorizontal: Spacing.base }}>
            <EventCodeCard
              onEnterCode={() => setEventCodeSheetVisible(true)}
              onDismiss={handleEventCodeDismiss}
            />
          </View>
        ) : null;
      case 'nudge':
        if (DASHBOARD_SUPPRESS.nudge) return null;
        return nudgeSuggestion ? (
          <NudgeCard
            key="nudge"
            suggestion={nudgeSuggestion}
            onAction={() => {
              markFeatureVisited(nudgeSuggestion.feature);
              navigation.navigate(nudgeSuggestion.screenName as never);
            }}
            onDismiss={dismissNudge}
          />
        ) : null;
    }
  };

  // The standing capacity practice for the post-check-in surface — time-of-day
  // driven, independent of any just-completed plan.
  const suggestion = suggestedAction();

  // Locally-typed navigate for the rework's new destinations. The hook's
  // navigation is untyped, so the legacy blocks fall back to `as never` casts
  // that don't type-check; this keeps the new calls clean.
  const go = (screen: string, params?: Record<string, unknown>) =>
    (navigation as unknown as {
      navigate: (s: string, p?: object) => void;
    }).navigate(screen, params);

  if (dataLoading) {
    return <LoadingSpinner message="Loading your wellness dashboard..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Animated.ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProfileStack' as never, { screen: 'Settings' } as never)}
              style={styles.settingsButton}
              accessibilityLabel="Settings"
            >
              <Icon name="cog-outline" size={28} color={Colors.evergreenTeal} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Error banner — non-blocking, shows which data failed */}
        {dataErrors.length > 0 && (
          <View style={styles.errorBanner}>
            <Icon name="alert-circle-outline" size={18} color={Colors.error} />
            <Text style={styles.errorBannerText}>
              Could not load {dataErrors.join(', ')}. Pull to refresh.
            </Text>
          </View>
        )}

        {(
          <>
            {/* Post-checkin: the quiet "Right now: [state]" acknowledgment
                (the priority post-checkin, calmer than the invite), derived
                from the circumplex quadrant. */}
            {dashboardPhase === 'checked-in' && (
              <RightNowAcknowledgment
                quadrant={engineSession?.quadrant ?? null}
              />
            )}

            {/* Pre-checkin: the ONE bright check-in invite (the priority). */}
            {dashboardPhase === 'pre-checkin' && <CheckInInvite />}

            {/* First-shift footer — suppressed on the reworked Home (not in the
                spec set). Reversible via DASHBOARD_SUPPRESS. */}
            {!DASHBOARD_SUPPRESS.firstShiftFooter && (
              <FirstShiftFooter
                firstShiftAt={firstShiftAt}
                userId={user?.uid}
              />
            )}

            {/* Slim 2-minute reset — present in both phases, quiet (not a card),
                reusing the locked overwhelm entry. */}
            <SlimResetAffordance />

            {/* Notification opt-in: treated as a setting, accessible in every
                phase. In post-checkin / returning it renders inside cardOrder
                after protocol. In pre-checkin it renders here, above the
                muted wrapper, so it stays fully interactive. */}
            {!DASHBOARD_SUPPRESS.notifOptIn &&
              dashboardPhase === 'pre-checkin' &&
              notifOptInCard && (
                <View style={{ paddingHorizontal: Spacing.base }}>
                  <NotificationOptInCard
                    category={notifOptInCard}
                    onOptIn={() => handleNotifOptIn(notifOptInCard)}
                    onDismiss={() => handleNotifDismiss(notifOptInCard)}
                  />
                </View>
              )}

            {/* Spec content cards — explicit, fixed order (no longer
                brain-state-ordered): Suggested action (post only) → Insight →
                Routine. */}
            <View>
              {dashboardPhase === 'checked-in' && suggestion && (
                <SuggestedActionCard
                  protocol={suggestion.protocol}
                  onStart={() =>
                    go('PracticeRun', {
                      protocolId: suggestion.protocol.id,
                      stateBefore: brainStateCheckIn?.brainState ?? 'steady',
                    })
                  }
                />
              )}

              <InsightCard />

              <RoutineCard
                routines={dashboardRoutines}
                completions={routineCompletions}
                onBeginRoutine={handleBeginRoutine}
                onNavigateToRoutines={() => go('Rhythms', { tab: 'routines' })}
                onNavigateToHabits={() => go('Rhythms', { tab: 'habits' })}
              />

              {/* Surviving system prompts (live-gated), after the content. */}
              {(['notifOptIn', 'eventCode', 'nudge'] as const).map((id) => (
                <React.Fragment key={id}>{renderSystemPrompt(id)}</React.Fragment>
              ))}
            </View>
          </>
        )}
      </Animated.ScrollView>

      {/* Event Code Sheet */}
      <EventCodeSheet
        visible={eventCodeSheetVisible}
        onDismiss={() => setEventCodeSheetVisible(false)}
        onSuccess={handleEventCodeSuccess}
      />

      {/* Routine Player Modal */}
      {activePlayerRoutine && (
        <ActiveRoutinePlayer
          visible={routinePlayerVisible}
          routine={activePlayerRoutine}
          onClose={handleCloseRoutinePlayer}
          onEditRoutine={() => {
            handleCloseRoutinePlayer();
            navigation.navigate('Rhythms' as never, { tab: 'routines' } as never);
          }}
          onComplete={handleRoutineComplete}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextContainer: {
    flex: 1,
  },
  greeting: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.xs,
    fontWeight: Typography.fontWeight.semibold,
    fontSize: 26,
  },
  dateText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(217,122,110,0.1)',
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  errorBannerText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 9999,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -8,
  },
});

export default DashboardScreen;
