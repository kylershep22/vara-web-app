/**
 * Notification Settings Screen
 * Granular controls for all notification types
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { useNotificationPreferences } from '../hooks';
import { LoadingSpinner } from '../components';
import { NotificationPreferences, ReminderTime } from '../types';
import { formatReminderTime, applyNotificationPreset, NOTIFICATION_PRESETS, NotificationPresetKey } from '../services/firebase';

// Days of week for weekly summary picker
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface TimePickerState {
  visible: boolean;
  category: string;
  field: string;
  currentTime: ReminderTime;
}

const PRESET_INFO: Record<NotificationPresetKey, { title: string; description: string; icon: string }> = {
  minimal: {
    title: 'Minimal',
    description: 'Only direct messages',
    icon: 'bell-off-outline',
  },
  balanced: {
    title: 'Balanced',
    description: 'Essential notifications only',
    icon: 'bell-outline',
  },
  engaged: {
    title: 'Engaged',
    description: 'Full notification experience',
    icon: 'bell-ring',
  },
};

const NotificationSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { preferences, loading, updatePreferences, updateCategory, toggleAll, setQuietHours, refresh } = useNotificationPreferences();
  const [applyingPreset, setApplyingPreset] = useState<NotificationPresetKey | null>(null);

  // Time picker state
  const [timePicker, setTimePicker] = useState<TimePickerState>({
    visible: false,
    category: '',
    field: '',
    currentTime: { hour: 8, minute: 0 },
  });

  // Convert ReminderTime to Date for picker
  const reminderTimeToDate = (time: ReminderTime): Date => {
    const date = new Date();
    date.setHours(time.hour, time.minute, 0, 0);
    return date;
  };

  // Convert Date to ReminderTime
  const dateToReminderTime = (date: Date): ReminderTime => ({
    hour: date.getHours(),
    minute: date.getMinutes(),
  });

  // Open time picker
  const openTimePicker = (category: string, field: string, currentTime: ReminderTime) => {
    setTimePicker({
      visible: true,
      category,
      field,
      currentTime,
    });
  };

  // Handle time change
  const handleTimeChange = useCallback(async (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setTimePicker(prev => ({ ...prev, visible: false }));
    }

    if (selectedDate && preferences) {
      const newTime = dateToReminderTime(selectedDate);
      const { category, field } = timePicker;

      if (category === 'quietHours') {
        const quietHours = { ...preferences.quietHours };
        if (field === 'startTime') {
          quietHours.startTime = newTime;
        } else {
          quietHours.endTime = newTime;
        }
        await setQuietHours(quietHours);
      } else {
        const categoryData = preferences[category as keyof NotificationPreferences];
        if (typeof categoryData === 'object' && categoryData !== null) {
          await updateCategory(category as keyof NotificationPreferences, {
            ...categoryData,
            [field]: newTime,
          } as any);
        }
      }
    }
  }, [timePicker, preferences, setQuietHours, updateCategory]);

  // Close time picker (iOS)
  const closeTimePicker = () => {
    setTimePicker(prev => ({ ...prev, visible: false }));
  };

  // Toggle category enabled
  const toggleCategory = async (category: keyof NotificationPreferences, enabled: boolean) => {
    if (!preferences) return;
    const categoryData = preferences[category];
    if (typeof categoryData === 'object' && categoryData !== null && 'enabled' in categoryData) {
      await updateCategory(category, { ...categoryData, enabled } as any);
    }
  };

  // Toggle sub-setting
  const toggleSubSetting = async (
    category: keyof NotificationPreferences,
    field: string,
    value: boolean
  ) => {
    if (!preferences) return;
    const categoryData = preferences[category];
    if (typeof categoryData === 'object' && categoryData !== null) {
      await updateCategory(category, { ...categoryData, [field]: value } as any);
    }
  };

  // Handle preset selection
  const handlePresetSelect = async (preset: NotificationPresetKey) => {
    if (!preferences) return;

    setApplyingPreset(preset);
    try {
      await applyNotificationPreset(preferences.userId, preset);
      await refresh?.();
    } catch (error) {
      console.error('Error applying preset:', error);
      Alert.alert('Error', 'Failed to apply notification preset');
    } finally {
      setApplyingPreset(null);
    }
  };

  // Select day of week
  const selectDayOfWeek = (dayIndex: number) => {
    if (!preferences) return;
    Alert.alert(
      'Weekly Summary Day',
      'Which day would you like to receive your weekly summary?',
      DAYS_OF_WEEK.map((day, index) => ({
        text: day,
        onPress: () => updateCategory('weeklySummary', {
          ...preferences.weeklySummary,
          dayOfWeek: index,
        }),
      })).concat([{ text: 'Cancel', style: 'cancel' as const, onPress: () => {} }])
    );
  };

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
        <View style={styles.headerTitles}>
          <Text variant="headlineMedium" style={styles.screenTitle}>
            Notifications
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Customize when and how you're notified
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Master Toggle */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.iconContainer}>
                  <Icon name="bell" size={24} color={Colors.evergreenTeal} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>All Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Master toggle for all notifications
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.allNotificationsEnabled}
                onValueChange={(value) => toggleAll(value)}
                trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Quick Setup - Presets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Setup</Text>
          <Text style={styles.sectionDescription}>
            Choose a notification style that fits your preferences
          </Text>
          <View style={styles.presetContainer}>
            {(Object.keys(PRESET_INFO) as NotificationPresetKey[]).map((preset) => {
              const info = PRESET_INFO[preset];
              const isActive = applyingPreset === preset;
              return (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetCard,
                    preset === 'balanced' && styles.presetCardRecommended,
                  ]}
                  onPress={() => handlePresetSelect(preset)}
                  disabled={applyingPreset !== null}
                  activeOpacity={0.7}
                >
                  {isActive ? (
                    <View style={styles.presetIconContainer}>
                      <View style={styles.presetSpinner} />
                    </View>
                  ) : (
                    <View style={[styles.presetIconContainer, preset === 'balanced' && styles.presetIconRecommended]}>
                      <Icon name={info.icon as any} size={24} color={preset === 'balanced' ? Colors.evergreenTeal : Colors.textSecondary} />
                    </View>
                  )}
                  <Text style={[styles.presetTitle, preset === 'balanced' && styles.presetTitleRecommended]}>
                    {info.title}
                  </Text>
                  <Text style={styles.presetDescription}>{info.description}</Text>
                  {preset === 'balanced' && (
                    <View style={styles.recommendedBadge}>
                      <Text style={styles.recommendedText}>Recommended</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Quiet Hours */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconContainer, { backgroundColor: Colors.lavenderMist + '20' }]}>
                  <Icon name="moon-waning-crescent" size={24} color={Colors.lavenderMist} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Enable Quiet Hours</Text>
                  <Text style={styles.settingDescription}>
                    Pause notifications during specific times
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.quietHours.enabled}
                onValueChange={(value) => setQuietHours({ ...preferences.quietHours, enabled: value })}
                trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                thumbColor="#fff"
              />
            </View>

            {preferences.quietHours.enabled && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => openTimePicker('quietHours', 'startTime', preferences.quietHours.startTime)}
                >
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Start Time</Text>
                  </View>
                  <View style={styles.timeValue}>
                    <Text style={styles.timeText}>{formatReminderTime(preferences.quietHours.startTime)}</Text>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                  </View>
                </TouchableOpacity>

                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => openTimePicker('quietHours', 'endTime', preferences.quietHours.endTime)}
                >
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>End Time</Text>
                  </View>
                  <View style={styles.timeValue}>
                    <Text style={styles.timeText}>{formatReminderTime(preferences.quietHours.endTime)}</Text>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Tier 1: Retention-Critical */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Essential Reminders</Text>
          <Text style={styles.sectionDescription}>
            Stay consistent and celebrate your growth
          </Text>

          {/* Consistency Protection */}
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconContainer, { backgroundColor: Colors.evergreenTeal + '20' }]}>
                  <Icon name="leaf" size={24} color={Colors.evergreenTeal} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Consistency Reminders</Text>
                  <Text style={styles.settingDescription}>
                    Gentle "never miss twice" nudges to keep your rhythm
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.streakProtection.enabled}
                onValueChange={(value) => toggleCategory('streakProtection', value)}
                trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                thumbColor="#fff"
              />
            </View>

            {preferences.streakProtection.enabled && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => openTimePicker('streakProtection', 'reminderTime', preferences.streakProtection.reminderTime)}
                >
                  <View style={styles.settingInfo}>
                    <Text style={styles.subSettingLabel}>Reminder Time</Text>
                  </View>
                  <View style={styles.timeValue}>
                    <Text style={styles.timeText}>{formatReminderTime(preferences.streakProtection.reminderTime)}</Text>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Milestones */}
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconContainer, { backgroundColor: Colors.success + '20' }]}>
                  <Icon name="trophy" size={24} color={Colors.success} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Milestone Celebrations</Text>
                  <Text style={styles.settingDescription}>
                    Celebrate your progress and achievements
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.milestones.enabled}
                onValueChange={(value) => toggleCategory('milestones', value)}
                trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                thumbColor="#fff"
              />
            </View>

            {preferences.milestones.enabled && (
              <>
                <View style={styles.divider} />
                <View style={styles.settingRow}>
                  <Text style={styles.subSettingLabel}>Consistency Milestones (7, 21, 30, 66, 100 days)</Text>
                  <Switch
                    value={preferences.milestones.habitStreaks}
                    onValueChange={(value) => toggleSubSetting('milestones', 'habitStreaks', value)}
                    trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.divider} />
                <View style={styles.settingRow}>
                  <Text style={styles.subSettingLabel}>Goal Progress (25%, 50%, 75%, 100%)</Text>
                  <Switch
                    value={preferences.milestones.goalProgress}
                    onValueChange={(value) => toggleSubSetting('milestones', 'goalProgress', value)}
                    trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.divider} />
                <View style={styles.settingRow}>
                  <Text style={styles.subSettingLabel}>Daily Completion (all habits done)</Text>
                  <Switch
                    value={preferences.milestones.dailyCompletion}
                    onValueChange={(value) => toggleSubSetting('milestones', 'dailyCompletion', value)}
                    trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                    thumbColor="#fff"
                  />
                </View>
              </>
            )}
          </View>

          {/* Daily Reminders */}
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconContainer, { backgroundColor: Colors.evergreenTeal + '20' }]}>
                  <Icon name="clock-outline" size={24} color={Colors.evergreenTeal} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Daily Reminders</Text>
                  <Text style={styles.settingDescription}>
                    Gentle nudges to complete your daily practice
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.dailyReminders.enabled}
                onValueChange={(value) => toggleCategory('dailyReminders', value)}
                trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                thumbColor="#fff"
              />
            </View>

            {preferences.dailyReminders.enabled && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => openTimePicker('dailyReminders', 'reminderTime', preferences.dailyReminders.reminderTime)}
                >
                  <View style={styles.settingInfo}>
                    <Text style={styles.subSettingLabel}>Reminder Time</Text>
                  </View>
                  <View style={styles.timeValue}>
                    <Text style={styles.timeText}>{formatReminderTime(preferences.dailyReminders.reminderTime)}</Text>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                  </View>
                </TouchableOpacity>

                <View style={styles.divider} />
                <View style={styles.settingRow}>
                  <Text style={styles.subSettingLabel}>4-3-2-1 Practice</Text>
                  <Switch
                    value={preferences.dailyReminders.fourThreeTwoOne}
                    onValueChange={(value) => toggleSubSetting('dailyReminders', 'fourThreeTwoOne', value)}
                    trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.divider} />
                <View style={styles.settingRow}>
                  <Text style={styles.subSettingLabel}>Habit Completion</Text>
                  <Switch
                    value={preferences.dailyReminders.habits}
                    onValueChange={(value) => toggleSubSetting('dailyReminders', 'habits', value)}
                    trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                    thumbColor="#fff"
                  />
                </View>
              </>
            )}
          </View>
        </View>

        {/* Tier 2: Engagement Boosters */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Engagement</Text>
          <Text style={styles.sectionDescription}>
            Stay motivated with challenges and smart reminders
          </Text>

          {/* Challenges */}
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconContainer, { backgroundColor: Colors.goldenApricot + '20' }]}>
                  <Icon name="flag-checkered" size={24} color={Colors.goldenApricot} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Challenge Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Stay on track with your challenges
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.challenges.enabled}
                onValueChange={(value) => toggleCategory('challenges', value)}
                trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                thumbColor="#fff"
              />
            </View>

            {preferences.challenges.enabled && (
              <>
                <View style={styles.divider} />
                <View style={styles.settingRow}>
                  <Text style={styles.subSettingLabel}>Check-in Reminders</Text>
                  <Switch
                    value={preferences.challenges.checkInReminders}
                    onValueChange={(value) => toggleSubSetting('challenges', 'checkInReminders', value)}
                    trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.divider} />
                <View style={styles.settingRow}>
                  <Text style={styles.subSettingLabel}>Friend Activity</Text>
                  <Switch
                    value={preferences.challenges.friendActivity}
                    onValueChange={(value) => toggleSubSetting('challenges', 'friendActivity', value)}
                    trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.divider} />
                <View style={styles.settingRow}>
                  <Text style={styles.subSettingLabel}>Leaderboard Changes</Text>
                  <Switch
                    value={preferences.challenges.leaderboardChanges}
                    onValueChange={(value) => toggleSubSetting('challenges', 'leaderboardChanges', value)}
                    trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                    thumbColor="#fff"
                  />
                </View>
              </>
            )}
          </View>

          {/* Implementation Intentions */}
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconContainer, { backgroundColor: Colors.lavenderMist + '20' }]}>
                  <Icon name="calendar-clock" size={24} color={Colors.lavenderMist} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Habit Triggers</Text>
                  <Text style={styles.settingDescription}>
                    Reminders based on your habit's "when/where" plan
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.implementationIntentions.enabled}
                onValueChange={(value) => toggleCategory('implementationIntentions', value)}
                trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Weekly Summary */}
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconContainer, { backgroundColor: Colors.evergreenTeal + '20' }]}>
                  <Icon name="chart-line" size={24} color={Colors.evergreenTeal} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Weekly Summary</Text>
                  <Text style={styles.settingDescription}>
                    Review your weekly progress and wins
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.weeklySummary.enabled}
                onValueChange={(value) => toggleCategory('weeklySummary', value)}
                trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                thumbColor="#fff"
              />
            </View>

            {preferences.weeklySummary.enabled && (
              <>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => selectDayOfWeek(preferences.weeklySummary.dayOfWeek)}
                >
                  <Text style={styles.subSettingLabel}>Day</Text>
                  <View style={styles.timeValue}>
                    <Text style={styles.timeText}>{DAYS_OF_WEEK[preferences.weeklySummary.dayOfWeek]}</Text>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                  </View>
                </TouchableOpacity>

                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => openTimePicker('weeklySummary', 'time', preferences.weeklySummary.time)}
                >
                  <Text style={styles.subSettingLabel}>Time</Text>
                  <View style={styles.timeValue}>
                    <Text style={styles.timeText}>{formatReminderTime(preferences.weeklySummary.time)}</Text>
                    <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Tier 3: Re-engagement & Community */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Community & Re-engagement</Text>
          <Text style={styles.sectionDescription}>
            Stay connected with friends and get back on track
          </Text>

          {/* Inactivity Reminders */}
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconContainer, { backgroundColor: Colors.mutedSageGray + '20' }]}>
                  <Icon name="account-clock" size={24} color={Colors.mutedSageGray} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Come Back Reminders</Text>
                  <Text style={styles.settingDescription}>
                    Gentle nudges if you've been away
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.inactivityReminders.enabled}
                onValueChange={(value) => toggleCategory('inactivityReminders', value)}
                trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                thumbColor="#fff"
              />
            </View>

            {preferences.inactivityReminders.enabled && (
              <>
                <View style={styles.divider} />
                <View style={styles.settingRow}>
                  <Text style={styles.subSettingLabel}>After 3 days</Text>
                  <Switch
                    value={preferences.inactivityReminders.threeDayReminder}
                    onValueChange={(value) => toggleSubSetting('inactivityReminders', 'threeDayReminder', value)}
                    trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.divider} />
                <View style={styles.settingRow}>
                  <Text style={styles.subSettingLabel}>After 7 days</Text>
                  <Switch
                    value={preferences.inactivityReminders.sevenDayReminder}
                    onValueChange={(value) => toggleSubSetting('inactivityReminders', 'sevenDayReminder', value)}
                    trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.divider} />
                <View style={styles.settingRow}>
                  <Text style={styles.subSettingLabel}>After 14 days</Text>
                  <Switch
                    value={preferences.inactivityReminders.fourteenDayReminder}
                    onValueChange={(value) => toggleSubSetting('inactivityReminders', 'fourteenDayReminder', value)}
                    trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                    thumbColor="#fff"
                  />
                </View>
              </>
            )}
          </View>

          {/* Community */}
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconContainer, { backgroundColor: Colors.evergreenTeal + '20' }]}>
                  <Icon name="account-group" size={24} color={Colors.evergreenTeal} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Community Activity</Text>
                  <Text style={styles.settingDescription}>
                    Updates from groups and friends
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.community.enabled}
                onValueChange={(value) => toggleCategory('community', value)}
                trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                thumbColor="#fff"
              />
            </View>

            {preferences.community.enabled && (
              <>
                <View style={styles.divider} />
                <View style={styles.settingRow}>
                  <Text style={styles.subSettingLabel}>Friend Milestones</Text>
                  <Switch
                    value={preferences.community.friendMilestones}
                    onValueChange={(value) => toggleSubSetting('community', 'friendMilestones', value)}
                    trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.divider} />
                <View style={styles.settingRow}>
                  <Text style={styles.subSettingLabel}>Group Posts</Text>
                  <Switch
                    value={preferences.community.groupPosts}
                    onValueChange={(value) => toggleSubSetting('community', 'groupPosts', value)}
                    trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.divider} />
                <View style={styles.settingRow}>
                  <Text style={styles.subSettingLabel}>Mentions</Text>
                  <Switch
                    value={preferences.community.mentions}
                    onValueChange={(value) => toggleSubSetting('community', 'mentions', value)}
                    trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.divider} />
                <View style={styles.settingRow}>
                  <Text style={styles.subSettingLabel}>Connection Requests</Text>
                  <Switch
                    value={preferences.community.connectionRequests}
                    onValueChange={(value) => toggleSubSetting('community', 'connectionRequests', value)}
                    trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                    thumbColor="#fff"
                  />
                </View>
              </>
            )}
          </View>

          {/* Messages */}
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconContainer, { backgroundColor: Colors.evergreenTeal + '20' }]}>
                  <Icon name="message-text" size={24} color={Colors.evergreenTeal} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Direct Messages</Text>
                  <Text style={styles.settingDescription}>
                    New message notifications
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.messages.enabled}
                onValueChange={(value) => toggleCategory('messages', value)}
                trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                thumbColor="#fff"
              />
            </View>
          </View>

          {/* Wellness Suggestions */}
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={[styles.iconContainer, { backgroundColor: Colors.dewSage }]}>
                  <Icon name="lightbulb-on" size={24} color={Colors.evergreenTeal} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Wellness Suggestions</Text>
                  <Text style={styles.settingDescription}>
                    AI-powered tips based on your patterns
                  </Text>
                </View>
              </View>
              <Switch
                value={preferences.wellnessSuggestions.enabled}
                onValueChange={(value) => toggleCategory('wellnessSuggestions', value)}
                trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                thumbColor="#fff"
              />
            </View>

            {preferences.wellnessSuggestions.enabled && (
              <>
                <View style={styles.divider} />
                <View style={styles.settingRow}>
                  <Text style={styles.subSettingLabel}>Based on Mood</Text>
                  <Switch
                    value={preferences.wellnessSuggestions.basedOnMood}
                    onValueChange={(value) => toggleSubSetting('wellnessSuggestions', 'basedOnMood', value)}
                    trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.divider} />
                <View style={styles.settingRow}>
                  <Text style={styles.subSettingLabel}>Based on Stress</Text>
                  <Switch
                    value={preferences.wellnessSuggestions.basedOnStress}
                    onValueChange={(value) => toggleSubSetting('wellnessSuggestions', 'basedOnStress', value)}
                    trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.divider} />
                <View style={styles.settingRow}>
                  <Text style={styles.subSettingLabel}>Based on Sleep</Text>
                  <Switch
                    value={preferences.wellnessSuggestions.basedOnSleep}
                    onValueChange={(value) => toggleSubSetting('wellnessSuggestions', 'basedOnSleep', value)}
                    trackColor={{ false: Colors.borderLight, true: Colors.evergreenTeal }}
                    thumbColor="#fff"
                  />
                </View>
              </>
            )}
          </View>
        </View>

        <View style={{ height: Spacing['3xl'] }} />
      </ScrollView>

      {/* Time Picker Modal */}
      {timePicker.visible && (
        Platform.OS === 'ios' ? (
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
                style={styles.picker}
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
        )
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  headerTitles: {
    flex: 1,
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.base,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: Colors.evergreenTeal,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
    minHeight: 60,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: Spacing.base,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  settingDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  subSettingLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.base,
  },
  timeValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: Typography.fontSize.base,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
    marginRight: Spacing.xs,
  },
  // iOS Picker styles
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
  pickerCancel: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  pickerDone: {
    fontSize: Typography.fontSize.base,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  picker: {
    height: 200,
  },
  // Preset styles
  presetContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  presetCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  presetCardRecommended: {
    borderColor: Colors.evergreenTeal,
    borderWidth: 2,
  },
  presetIconContainer: {
    width: 48,
    height: 48,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  presetIconRecommended: {
    backgroundColor: Colors.dewSage,
  },
  presetSpinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.evergreenTeal,
    borderTopColor: 'transparent',
  },
  presetTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  presetTitleRecommended: {
    color: Colors.evergreenTeal,
  },
  presetDescription: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  recommendedBadge: {
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.sm,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
});

export default NotificationSettingsScreen;
