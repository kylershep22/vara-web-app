/**
 * Notification Settings Screen (NPM-2, NOTIFICATION-SETTINGS-TRUTHFULNESS).
 *
 * The settings say what the app does. In order: the device permission, General
 * notifications, the Daily reminder time, and Community (Direct messages,
 * Connection requests). Kyle's rulings D2 to D9 and Rulings 1 to 10 of
 * 2026-10-02.
 *
 * - General alone decides whether the daily reminder is active (Ruling 2). The
 *   time row is always shown and always tappable, also while General is off,
 *   and setting a time never turns General on.
 * - A change shows at once and is saved through the pending-intent journal
 *   (useNotificationSettingsState); Saving... appears after 500 ms unresolved.
 * - Hidden for V1, not rendered and with no write path, stored values
 *   untouched: Insights, Milestones, Completion Sound, Quiet Hours. Removed:
 *   Community Activity, and the Daily Reminder switch (Ruling 1).
 * Every string comes from notificationSettings.copy.
 */
import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Switch, StyleSheet, Platform } from 'react-native';
import Text from '../components/shared/Text';
import { Ionicons, MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { LoadingSpinner } from '../components';
import { TimePickerSheet, formatReminderTime } from '../components/shared/TimePickerSheet';
import { NotificationPermissionRow } from '../components/shared/NotificationPermissionRow';
import { useNotificationSettingsState } from '../hooks/useNotificationSettingsState';
import { DEFAULT_ANCHOR_HOUR } from '../constants/onboardingStressRecovery';
import { NOTIFICATION_SETTINGS_COPY as COPY, NOTIFICATION_SPOKEN as SPOKEN } from './notificationSettings.copy';
import { ReminderTime } from '../types';

const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const s = useNotificationSettingsState();
  const [pickerOpen, setPickerOpen] = useState(false);

  if (s.phase === 'loading') {
    return <LoadingSpinner message={COPY.loading} />;
  }

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backButton}
        accessibilityRole="button"
        accessibilityLabel={SPOKEN.back}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.screenTitle} accessibilityRole="header">
        {COPY.title}
      </Text>
    </View>
  );

  if (s.phase === 'unavailable') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {header}
        <View style={styles.unavailable}>
          <Text style={styles.unavailableText}>{COPY.loadFailed}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={s.retry}
            accessibilityRole="button"
            accessibilityLabel={SPOKEN.tryAgain}
            testID="notification-settings-retry"
          >
            <Text style={styles.retryLabel}>{COPY.tryAgain}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const formattedTime = s.dailyTime ? formatReminderTime(s.dailyTime) : null;
  const pickerSeed: ReminderTime = s.dailyTime ?? { hour: DEFAULT_ANCHOR_HOUR, minute: 0 };
  // Decision 5: only when a valid time exists and General is off.
  const timeSubtitle =
    s.dailyTime && !s.general ? COPY.dailyReminder.subtitleGeneralOff : COPY.dailyReminder.subtitle;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {header}

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Device permission (D4, Ruling 4) */}
        <View style={styles.card}>
          <NotificationPermissionRow />
        </View>

        {/* General notifications (D2) */}
        <View style={styles.card}>
          <SettingRow
            icon="bell"
            label={COPY.general.label}
            description={COPY.general.subtitle}
            value={s.general}
            saving={s.saving.general}
            onToggle={s.setGeneral}
            testID="general-switch"
          />
        </View>

        {/* Daily reminder time (Rulings 1 to 3, D7) */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.timeRow}
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={SPOKEN.dailyReminder(formattedTime, s.saving.dailyTime)}
            // The subtitle visible on this row, spoken as its hint (Kyle, ruling 2 on
            // Build B): including Turn on General notifications to get this reminder.
            accessibilityHint={timeSubtitle}
            activeOpacity={0.8}
            testID="daily-reminder-row"
          >
            <View style={styles.settingInfo}>
              <View style={styles.iconWrap}>
                <Icon name="clock-outline" size={22} color={Colors.evergreenTeal} />
              </View>
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>{COPY.dailyReminder.label}</Text>
                <Text style={styles.settingDesc}>{timeSubtitle}</Text>
              </View>
            </View>
            <View style={styles.timeValue}>
              <Text style={formattedTime ? styles.timeText : styles.addTimeText}>
                {formattedTime ?? COPY.dailyReminder.addTime}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
            </View>
          </TouchableOpacity>
          {s.saving.dailyTime && <SavingCaption />}
        </View>

        {/* Community (Ruling 7: independent of General) */}
        <Text style={styles.sectionHeader} accessibilityRole="header">
          {COPY.community.header}
        </Text>
        <View style={styles.card}>
          <SettingRow
            icon="message-text-outline"
            label={COPY.community.directMessages.label}
            description={COPY.community.directMessages.subtitle}
            value={s.directMessages}
            saving={s.saving.directMessages}
            onToggle={s.setDirectMessages}
            testID="direct-messages-switch"
          />
          <View style={styles.divider} />
          <SettingRow
            icon="account-plus-outline"
            label={COPY.community.connectionRequests.label}
            description={COPY.community.connectionRequests.subtitle}
            value={s.connectionRequests}
            saving={s.saving.connectionRequests}
            onToggle={s.setConnectionRequests}
            testID="connection-requests-switch"
          />
        </View>

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>

      {/* Draft only; Done commits once; Cancel discards (D7). */}
      <TimePickerSheet
        visible={pickerOpen}
        value={pickerSeed}
        onChange={s.setDailyTime}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
};

// ==========================================
// SETTING ROW AND SAVING CAPTION
// ==========================================

interface SettingRowProps {
  icon: string;
  label: string;
  description: string;
  value: boolean;
  saving: boolean;
  onToggle: (value: boolean) => void;
  testID: string;
}

/** The switch is named for its row; the subtitle is its hint. */
const SettingRow: React.FC<SettingRowProps> = ({ icon, label, description, value, saving, onToggle, testID }) => (
  <>
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <View style={styles.iconWrap}>
          <Icon name={icon as React.ComponentProps<typeof Icon>['name']} size={22} color={Colors.evergreenTeal} />
        </View>
        <View style={styles.settingText}>
          <Text style={styles.settingLabel}>{label}</Text>
          <Text style={styles.settingDesc}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        accessibilityLabel={SPOKEN.switchLabel(label, saving)}
        accessibilityHint={description}
        trackColor={{ false: Colors.silverSage, true: Colors.evergreenTeal }}
        thumbColor={Colors.white}
        testID={testID}
      />
    </View>
    {saving && <SavingCaption />}
  </>
);

/** Visual only: the control's own spoken label already carries "saving". */
const SavingCaption: React.FC = () => (
  <Text
    style={styles.saving}
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  >
    {COPY.saving}
  </Text>
);

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mistWhite },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  backButton: { padding: Spacing.xs, marginRight: Spacing.sm },
  screenTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
  sectionHeader: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.base,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    ...Platform.select({
      ios: { shadowColor: Colors.shadowColor, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8 },
      android: { elevation: 1 },
    }),
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    minHeight: 64,
  },
  settingInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: Spacing.base },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
    backgroundColor: Colors.evergreenTeal + '20',
  },
  settingText: { flex: 1 },
  settingLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
  settingDesc: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    marginTop: 1,
  },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: Spacing.base },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    minHeight: 64,
  },
  timeValue: { flexDirection: 'row', alignItems: 'center' },
  timeText: {
    fontSize: Typography.fontSize.base,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
    marginRight: Spacing.xs,
  },
  addTimeText: {
    fontSize: Typography.fontSize.base,
    color: Colors.evergreenTeal,
    marginRight: Spacing.xs,
  },
  saving: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  unavailable: { padding: Spacing.lg, alignItems: 'flex-start' },
  unavailableText: { fontSize: Typography.fontSize.base, color: Colors.softCharcoal },
  retryButton: { marginTop: Spacing.base, minHeight: 44, justifyContent: 'center' },
  retryLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
});

export default NotificationSettingsScreen;
