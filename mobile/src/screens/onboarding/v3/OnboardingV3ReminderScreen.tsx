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
  const { floorCommitment, reminderTime, setReminderTime } = useOnboardingV3();

  const [selectedTime, setSelectedTime] = useState(
    seedDate(reminderTime?.hour ?? DEFAULT_ANCHOR_HOUR, reminderTime?.minute ?? 0)
  );
  // Android shows the picker as a modal on demand; iOS renders it inline.
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  const handleTimeChange = useCallback((_: unknown, date?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (date) setSelectedTime(date);
  }, []);

  const advance = useCallback(() => {
    setReminderTime({
      hour: selectedTime.getHours(),
      minute: selectedTime.getMinutes(),
    });
    navigation.navigate(V3_ROUTES.Done);
  }, [selectedTime, setReminderTime, navigation]);

  return (
    <OnboardingScaffold
      currentStep={v3StepNumber(V3_ROUTES.Reminder)}
      totalSteps={V3_TOTAL_STEPS}
      title={REMINDER_COPY.title}
      subtitle={REMINDER_COPY.subtitle}
      primaryLabel={REMINDER_COPY.primary}
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
});

export default OnboardingV3ReminderScreen;
