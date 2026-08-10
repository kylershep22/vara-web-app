/**
 * Step 7 of 8 — The daily reminder.
 *
 * Reuses the anchor screen's control exactly: @react-native-community
 * DateTimePicker in `time` mode, iOS spinner / Android default, seeded to
 * DEFAULT_ANCHOR_HOUR. TIME ONLY, no day selection, because the store it writes
 * to (NotificationPreferences.dailyRhythm) carries `{ enabled, reminderTime }`
 * and has no days field. Weekday reminders are a habit-level concept and are
 * not in scope here.
 *
 * THE FLOOR ECHO IS DISPLAY ONLY. It shows the user what the nudge will point
 * at, and nothing about it is written or re-derived; the floor was captured two
 * screens ago and is unchanged by anything here. The block is omitted entirely
 * when the floor was skipped rather than rendered empty.
 */
import React, { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';

import { OnboardingScaffold } from '../../../components/onboarding/OnboardingScaffold';
import { Colors, Layout, Spacing, Typography } from '../../../constants';
import { DEFAULT_ANCHOR_HOUR } from '../../../constants/onboardingStressRecovery';
import { useAuth } from '../../../context/AuthContext';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../../../services/firebase/notificationPreferences.service';
import {
  registerPushToken,
  requestNotificationPermission,
} from '../../../services/notifications.service';
import { scheduleDailyRhythm } from '../../../services/notificationScheduler.service';
import { logger } from '../../../utils/logger';
import { REMINDER_COPY } from './copy';
import { useOnboardingV3 } from './OnboardingV3Context';
import { V3_ROUTES, V3_TOTAL_STEPS, v3StepNumber } from './routes';

/**
 * The picker needs a Date, but only its clock time is ever read. The calendar
 * date is a fixed arbitrary day so nothing downstream can mistake it for one.
 */
function seedDate(hour: number, minute: number): Date {
  return new Date(2024, 0, 1, hour, minute);
}

export const OnboardingV3ReminderScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { floorCommitment, reminderTime, setReminderTime } = useOnboardingV3();

  const [selectedTime, setSelectedTime] = useState(
    seedDate(reminderTime?.hour ?? DEFAULT_ANCHOR_HOUR, reminderTime?.minute ?? 0)
  );
  // Android shows the picker as a modal on demand; iOS renders it inline.
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [busy, setBusy] = useState(false);
  const [deniedNote, setDeniedNote] = useState(false);

  const handleTimeChange = useCallback((_: unknown, date?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (date) setSelectedTime(date);
  }, []);

  /**
   * Requests permission and writes the reminder IN CONTEXT, mirroring
   * OnboardingAnchorScreen. This is the first and only place the arc asks for
   * notifications, and it asks AFTER the first win, at the moment the user has
   * just chosen a time, rather than cold-prompting at launch.
   *
   * THE PERMISSION SHEET IS THE FIRST AWAITED THING, DELIBERATELY. It is a pure
   * native call with no network in it, so it can appear on the same tick as the
   * tap; every millisecond between the two would be something we chose to await
   * first. This handler used to open with getNotificationPreferences and
   * updateNotificationPreferences, and on a stalled connection those two
   * Firestore round-trips held the sheet back by some thirty seconds. Nothing
   * network-bound may move back above this line.
   *
   * BOTH BRANCHES STILL WRITE. Granted or refused, the time is saved: the
   * refusal copy promises exactly that, and NotificationSettingsScreen only
   * offers the time row once `dailyRhythm.reminderTime` exists, so dropping the
   * write on refusal would strand anyone who later turns notifications on in
   * iOS Settings. Only the scheduling is conditional.
   *
   * Writes the canonical V2 `dailyRhythm` field, which is what
   * scheduleDailyRhythm actually reads. getNotificationPreferences first because
   * updateNotificationPreferences uses updateDoc and would reject a user who has
   * never had a prefs document.
   *
   * NOTHING HERE BLOCKS THE ARC. A write failure or a scheduler fault is logged
   * and swallowed: the reminder is the one genuinely optional thing the arc
   * collects, and no user should be stuck inside onboarding over it.
   *
   * DENIAL IS THE ONE CASE THAT PAUSES, for exactly one tap. The permission
   * sheet is a system modal, so advancing the instant it is dismissed would
   * unmount this screen before the user could read what happened. Instead the
   * quiet note renders and the next tap continues, short-circuiting the
   * permission dance rather than re-prompting (the OS would not show the sheet
   * a second time anyway).
   */
  const advance = useCallback(async () => {
    if (busy) return;

    const hour = selectedTime.getHours();
    const minute = selectedTime.getMinutes();
    setReminderTime({ hour, minute });

    // Second tap after a denial: the time is already saved and there is nothing
    // left to ask for.
    if (deniedNote) {
      navigation.navigate(V3_ROUTES.Done);
      return;
    }

    setBusy(true);

    // No signed-in user means nothing to write and nothing to ask for.
    if (!user?.uid) {
      setBusy(false);
      navigation.navigate(V3_ROUTES.Done);
      return;
    }

    // THE SHEET. Local, native, first.
    const granted = await requestNotificationPermission();

    try {
      await getNotificationPreferences(user.uid);
      await updateNotificationPreferences(user.uid, {
        allNotificationsEnabled: true,
        dailyRhythm: { enabled: true, reminderTime: { hour, minute } },
      });

      if (granted) {
        await scheduleDailyRhythm(user.uid);
      }
    } catch (error) {
      logger.error('[OnboardingV3Reminder] reminder setup failed:', error);
    }

    if (!granted) {
      // Time saved, nothing scheduled, no penalty copy.
      setDeniedNote(true);
      setBusy(false);
      return;
    }

    // Deliberately NOT awaited. The push token is a network round-trip that
    // says nothing about the local daily reminder, and awaiting it here would
    // let a slow APNs handshake hold the user on this screen for no benefit.
    void registerPushToken();

    setBusy(false);
    navigation.navigate(V3_ROUTES.Done);
  }, [busy, deniedNote, selectedTime, setReminderTime, user?.uid, navigation]);

  return (
    <OnboardingScaffold
      currentStep={v3StepNumber(V3_ROUTES.Reminder)}
      totalSteps={V3_TOTAL_STEPS}
      title={REMINDER_COPY.title}
      subtitle={REMINDER_COPY.subtitle}
      primaryLabel={REMINDER_COPY.primary}
      primaryDisabled={busy}
      onPrimary={advance}
      onBack={() => navigation.goBack()}
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

      {!!floorCommitment && (
        <View style={styles.echo} testID="v3-reminder-floor-echo">
          <Text style={styles.echoLabel}>{REMINDER_COPY.floorEchoLabel}</Text>
          <Text style={styles.echoText}>{floorCommitment}</Text>
        </View>
      )}

      {deniedNote && (
        <Text style={styles.note} testID="v3-reminder-denied-note">
          {REMINDER_COPY.permissionDenied}
        </Text>
      )}
    </OnboardingScaffold>
  );
};

const styles = StyleSheet.create({
  pickerRow: { alignItems: 'center', marginTop: Spacing.sm },
  iosPicker: { width: 220, height: 140 },
  echo: {
    marginTop: Spacing.lg,
    padding: Spacing.base,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.silverSage,
  },
  echoLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.xs,
  },
  echoText: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
  note: {
    marginTop: Spacing.base,
    textAlign: 'center',
    color: Colors.mutedSageGray,
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
  },
});

export default OnboardingV3ReminderScreen;
