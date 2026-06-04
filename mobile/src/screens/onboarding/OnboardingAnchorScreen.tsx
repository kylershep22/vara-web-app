/**
 * Screen 9 — Daily anchor + contextual notification permission (skippable).
 * The terminal onboarding screen: its primary action completes onboarding, so
 * the navigator's natural re-render lands the user on the paywall (Task 8).
 *
 * Anchor reuses the existing dailyRhythm reminder system (decision: reuse, not a
 * new anchorBlock). We write the canonical V2 `dailyRhythm` field (the opt-in
 * screen writes the legacy `dailyReminders`, which V2 reads ignore) so
 * scheduleDailyRhythm actually fires. getNotificationPreferences first ensures
 * the prefs doc exists (updateNotificationPreferences uses updateDoc).
 *
 * Permission is requested IN CONTEXT here — never cold-prompted at launch.
 * Granted → schedule one daily local notification (cancel-and-reschedule + stable
 * id are internal to scheduleDailyRhythm; DAILY trigger rolls a past time to the
 * next occurrence). Denied → anchor saved, no schedule, no penalty copy.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { OnboardingScaffold } from '../../components/onboarding/OnboardingScaffold';
import { Colors, Spacing, Typography } from '../../constants';
import {
  DEFAULT_ANCHOR_HOUR,
  PEAK_WINDOW_OPTIONS,
  type PeakWindow,
  ONBOARDING_SR_TOTAL_STEPS,
  onboardingStepNumber,
} from '../../constants/onboardingStressRecovery';
import { useAuth } from '../../context/AuthContext';
import {
  saveOnboardingStep,
  persistRecheckAsDailyCheckIn,
} from '../../services/firebase/onboardingStressRecovery.service';
import { completeOnboarding } from '../../services/firebase/onboarding.service';
import {
  registerForPushNotifications,
  getPermissionsStatus,
} from '../../services/notifications.service';
import { scheduleDailyRhythm } from '../../services/notificationScheduler.service';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../../services/firebase/notificationPreferences.service';

function hourForPeak(peak: PeakWindow | null): number {
  const match = PEAK_WINDOW_OPTIONS.find((o) => o.id === peak);
  return match?.suggestedHour ?? DEFAULT_ANCHOR_HOUR;
}

const OnboardingAnchorScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [selectedTime, setSelectedTime] = useState(new Date(2024, 0, 1, DEFAULT_ANCHOR_HOUR, 0));
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [busy, setBusy] = useState(false);
  const [deniedNote, setDeniedNote] = useState(false);

  useEffect(() => {
    if (user?.uid) void saveOnboardingStep(user.uid, 'OnboardingAnchor');
  }, [user?.uid]);

  // Pre-suggest the anchor time from the persisted peak window.
  useEffect(() => {
    if (!user?.uid || !db) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (cancelled || !snap.exists()) return;
        const peak = (snap.data().onboardingStressRecovery?.peakWindow ?? null) as PeakWindow | null;
        setSelectedTime(new Date(2024, 0, 1, hourForPeak(peak), 0));
      } catch {
        // Keep the default hour.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const handleTimeChange = (_: unknown, date?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (date) setSelectedTime(date);
  };

  const finish = async () => {
    if (user?.uid) {
      // Carry the re-check brain state into today's daily check-in BEFORE
      // flipping hasCompletedOnboarding — once that flips, the navigator
      // routes onward and the dashboard reads the check-in log. No-ops if the
      // user skipped re-check.
      await persistRecheckAsDailyCheckIn(user.uid);
      try {
        await completeOnboarding(user.uid);
      } catch {
        // completeOnboarding writes onboardingCompletedAt + hasCompletedOnboarding;
        // a failure here leaves the user in onboarding (re-tries next launch).
      }
    }
    // Navigator re-renders on the hasCompletedOnboarding flip → PaywallNavigator.
  };

  const handleStartTrial = async () => {
    if (!user?.uid || busy) return;
    setBusy(true);
    setDeniedNote(false);
    try {
      const hour = selectedTime.getHours();
      const minute = selectedTime.getMinutes();

      // Ensure the prefs doc exists, then write the canonical V2 dailyRhythm.
      await getNotificationPreferences(user.uid);
      await updateNotificationPreferences(user.uid, {
        allNotificationsEnabled: true,
        dailyRhythm: { enabled: true, reminderTime: { hour, minute } },
      });

      // Contextual permission request, then schedule only if granted.
      await registerForPushNotifications();
      const perm = await getPermissionsStatus();
      if (perm.status === 'granted') {
        await scheduleDailyRhythm(user.uid);
      } else {
        // Denied: anchor saved, no schedule, no penalty. Quiet note only.
        setDeniedNote(true);
      }
    } catch {
      // Non-blocking — never trap the user on the terminal screen.
    } finally {
      setBusy(false);
      await finish();
    }
  };

  const handleSkip = async () => {
    if (busy) return;
    setBusy(true);
    await finish();
    setBusy(false);
  };

  return (
    <OnboardingScaffold
      currentStep={onboardingStepNumber('OnboardingAnchor')}
      totalSteps={ONBOARDING_SR_TOTAL_STEPS}
      title="Want a daily moment to reset?"
      subtitle="Pick a time that fits your day. It's an invitation, not an obligation. You can change or turn it off anytime."
      primaryLabel="Continue"
      primaryDisabled={busy}
      onPrimary={handleStartTrial}
      onSkip={handleSkip}
    >
      <View style={styles.pickerRow}>
        {(showPicker || Platform.OS === 'ios') && (
          <DateTimePicker
            value={selectedTime}
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleTimeChange}
            style={styles.iosPicker}
          />
        )}
      </View>
      {deniedNote && (
        <Text style={styles.note}>
          Your time is saved. You can turn on reminders anytime in Settings.
        </Text>
      )}
    </OnboardingScaffold>
  );
};

const styles = StyleSheet.create({
  pickerRow: { alignItems: 'center', marginTop: Spacing.sm },
  iosPicker: { width: 220, height: 140 },
  note: {
    marginTop: Spacing.base,
    color: Colors.mutedSageGray,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
  },
});

export default OnboardingAnchorScreen;
