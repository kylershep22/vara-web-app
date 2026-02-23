/**
 * Notification Settings Screen
 * 4-category layout with max 8 toggles. Clean, fast, brand-aligned.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { useNotificationPreferences } from '../hooks';
import { LoadingSpinner } from '../components';
import { ReminderTime } from '../types';
import { formatReminderTime } from '../services/firebase';

const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const {
    preferences,
    loading,
    updateCategory,
    toggleAll,
    setQuietHours,
  } = useNotificationPreferences();

  const [timePicker, setTimePicker] = useState<{
    visible: boolean;
    field: string;
    currentTime: ReminderTime;
  }>({ visible: false, field: '', currentTime: { hour: 8, minute: 0 } });

  const reminderTimeToDate = (time: ReminderTime): Date => {
    const d = new Date();
    d.setHours(time.hour, time.minute, 0, 0);
    return d;
  };

  const openTimePicker = (field: string, currentTime: ReminderTime) => {
    setTimePicker({ visible: true, field, currentTime });
  };

  const handleTimeChange = useCallback(
    async (_event: any, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setTimePicker((prev) => ({ ...prev, visible: false }));
      }
      if (!selectedDate || !preferences) return;

      const newTime: ReminderTime = {
        hour: selectedDate.getHours(),
        minute: selectedDate.getMinutes(),
      };

      if (timePicker.field === 'dailyRhythmTime') {
        await updateCategory('dailyRhythm', { ...preferences.dailyRhythm, reminderTime: newTime });
      } else if (timePicker.field === 'quietStart') {
        await setQuietHours({ ...preferences.quietHours, startTime: newTime });
      } else if (timePicker.field === 'quietEnd') {
        await setQuietHours({ ...preferences.quietHours, endTime: newTime });
      }
    },
    [timePicker.field, preferences, updateCategory, setQuietHours],
  );

  const closeTimePicker = () => setTimePicker((prev) => ({ ...prev, visible: false }));

  if (loading || !preferences) {
    return <LoadingSpinner message="Loading notification settings..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Notifications</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Master Toggle */}
        <View style={styles.card}>
          <SettingRow
            icon="bell"
            iconBg={Colors.evergreenTeal + '20'}
            iconColor={Colors.evergreenTeal}
            label="All Notifications"
            description="Master toggle for all notifications"
            value={preferences.allNotificationsEnabled}
            onToggle={(v) => toggleAll(v)}
          />
        </View>

        {/* Daily Rhythm */}
        <Text style={styles.sectionHeader}>Daily Rhythm</Text>
        <View style={styles.card}>
          <SettingRow
            icon="clock-outline"
            iconBg={Colors.evergreenTeal + '20'}
            iconColor={Colors.evergreenTeal}
            label="Daily Reminder"
            description="One reminder per day at your chosen time"
            value={preferences.dailyRhythm.enabled}
            onToggle={(v) => updateCategory('dailyRhythm', { ...preferences.dailyRhythm, enabled: v })}
          />
          {preferences.dailyRhythm.enabled && preferences.dailyRhythm.reminderTime && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.timeRow}
                onPress={() => openTimePicker('dailyRhythmTime', preferences.dailyRhythm.reminderTime!)}
              >
                <Text style={styles.subLabel}>Reminder Time</Text>
                <View style={styles.timeValue}>
                  <Text style={styles.timeText}>
                    {formatReminderTime(preferences.dailyRhythm.reminderTime)}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Insights & Learning */}
        <Text style={styles.sectionHeader}>Insights & Learning</Text>
        <View style={styles.card}>
          <SettingRow
            icon="lightbulb-on-outline"
            iconBg={Colors.goldenApricot + '20'}
            iconColor={Colors.goldenApricot}
            label="Brain-Health Insights"
            description="2-3 insights per week from our content library"
            value={preferences.insightsLearning.enabled}
            onToggle={(v) => updateCategory('insightsLearning', { ...preferences.insightsLearning, enabled: v })}
          />
        </View>

        {/* Messages & Social */}
        <Text style={styles.sectionHeader}>Messages & Social</Text>
        <View style={styles.card}>
          <SettingRow
            icon="message-text-outline"
            iconBg={Colors.evergreenTeal + '20'}
            iconColor={Colors.evergreenTeal}
            label="Direct Messages"
            description="Notifications when someone messages you"
            value={preferences.socialConnection.directMessages}
            onToggle={(v) => updateCategory('socialConnection', { ...preferences.socialConnection, directMessages: v })}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="account-plus-outline"
            iconBg={Colors.evergreenTeal + '20'}
            iconColor={Colors.evergreenTeal}
            label="Connection Requests"
            description="When someone wants to connect"
            value={preferences.socialConnection.connectionRequests}
            onToggle={(v) => updateCategory('socialConnection', { ...preferences.socialConnection, connectionRequests: v })}
          />
          <View style={styles.divider} />
          <SettingRow
            icon="account-group-outline"
            iconBg={Colors.evergreenTeal + '20'}
            iconColor={Colors.evergreenTeal}
            label="Community Activity"
            description="Updates from your groups"
            value={preferences.socialConnection.communityDigest}
            onToggle={(v) => updateCategory('socialConnection', { ...preferences.socialConnection, communityDigest: v })}
          />
        </View>

        {/* Milestones */}
        <Text style={styles.sectionHeader}>Milestones & Reflection</Text>
        <View style={styles.card}>
          <SettingRow
            icon="trophy-outline"
            iconBg={Colors.goldenApricot + '20'}
            iconColor={Colors.goldenApricot}
            label="Milestones"
            description="Celebrate progress and time-based reflections"
            value={preferences.milestonesReflection.enabled}
            onToggle={(v) => updateCategory('milestonesReflection', { enabled: v })}
          />
        </View>

        {/* Quiet Hours */}
        <Text style={styles.sectionHeader}>Quiet Hours</Text>
        <View style={styles.card}>
          <SettingRow
            icon="moon-waning-crescent"
            iconBg={Colors.lavenderMist + '20'}
            iconColor={Colors.lavenderMist}
            label="Enable Quiet Hours"
            description="Pause notifications during specific times"
            value={preferences.quietHours.enabled}
            onToggle={(v) => setQuietHours({ ...preferences.quietHours, enabled: v })}
          />
          {preferences.quietHours.enabled && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.timeRow}
                onPress={() => openTimePicker('quietStart', preferences.quietHours.startTime)}
              >
                <Text style={styles.subLabel}>Start</Text>
                <View style={styles.timeValue}>
                  <Text style={styles.timeText}>{formatReminderTime(preferences.quietHours.startTime)}</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
                </View>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.timeRow}
                onPress={() => openTimePicker('quietEnd', preferences.quietHours.endTime)}
              >
                <Text style={styles.subLabel}>End</Text>
                <View style={styles.timeValue}>
                  <Text style={styles.timeText}>{formatReminderTime(preferences.quietHours.endTime)}</Text>
                  <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>

      {/* Time Picker */}
      {timePicker.visible &&
        (Platform.OS === 'ios' ? (
          <View style={styles.pickerOverlay}>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={closeTimePicker}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={closeTimePicker}>
                  <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={reminderTimeToDate(timePicker.currentTime)}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                style={{ height: 200 }}
              />
            </View>
          </View>
        ) : (
          <DateTimePicker
            value={reminderTimeToDate(timePicker.currentTime)}
            mode="time"
            is24Hour={false}
            display="default"
            onChange={handleTimeChange}
          />
        ))}
    </SafeAreaView>
  );
};

// ==========================================
// SETTING ROW COMPONENT
// ==========================================

interface SettingRowProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  label: string;
  description: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  iconBg,
  iconColor,
  label,
  description,
  value,
  onToggle,
}) => (
  <View style={styles.settingRow}>
    <View style={styles.settingInfo}>
      <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
        <Icon name={icon as any} size={22} color={iconColor} />
      </View>
      <View style={styles.settingText}>
        <Text style={styles.settingLabel}>{label}</Text>
        <Text style={styles.settingDesc}>{description}</Text>
      </View>
    </View>
    <Switch
      value={value}
      onValueChange={onToggle}
      trackColor={{ false: Colors.silverSage, true: Colors.evergreenTeal }}
      thumbColor="#fff"
    />
  </View>
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
    fontWeight: Typography.fontWeight.medium as any,
    color: Colors.softCharcoal,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '500' as any,
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
    marginBottom: Spacing.sm,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 8 },
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
  },
  settingText: { flex: 1 },
  settingLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium as any,
    color: Colors.softCharcoal,
  },
  settingDesc: {
    fontSize: 14,
    color: Colors.mutedSageGray,
    marginTop: 1,
  },
  subLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    flex: 1,
  },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginHorizontal: Spacing.base },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    minHeight: 56,
  },
  timeValue: { flexDirection: 'row', alignItems: 'center' },
  timeText: {
    fontSize: Typography.fontSize.base,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium as any,
    marginRight: Spacing.xs,
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Layout.borderRadius.xl,
    borderTopRightRadius: Layout.borderRadius.xl,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  pickerCancel: { fontSize: Typography.fontSize.base, color: Colors.textSecondary },
  pickerDone: {
    fontSize: Typography.fontSize.base,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold as any,
  },
});

export default NotificationSettingsScreen;
