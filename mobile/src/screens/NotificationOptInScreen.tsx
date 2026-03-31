/**
 * NotificationOptInScreen
 * Pre-permission screen shown after the user's first meaningful action.
 * Follows the OnboardingWelcomeScreen layout pattern.
 *
 * Explains the daily rhythm reminder, lets the user pick a time,
 * then requests system permission. "Maybe later" is always available.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform, Alert, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { Button } from '../components';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { registerForPushNotifications, savePushTokenToUser } from '../services/notifications.service';
import { useAuth } from '../context/AuthContext';
import { useNotificationOptIn } from '../hooks/useNotificationOptIn';
import { updateNotificationPreferences } from '../services/firebase/notificationPreferences.service';

interface NotificationOptInScreenProps {
  navigation: any;
}

const NotificationOptInScreen: React.FC<NotificationOptInScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const { markOptedIn, markPromptDismissed } = useNotificationOptIn();
  const [selectedTime, setSelectedTime] = useState(new Date(2024, 0, 1, 8, 0)); // Default 8 AM
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [enabling, setEnabling] = useState(false);

  const handleChooseTime = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowTimePicker(true);
  };

  const handleTimeChange = (_: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (date) {
      setSelectedTime(date);
    }
  };

  const handleEnable = async () => {
    if (!user?.uid) return;
    setEnabling(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Request system permission
      const token = await registerForPushNotifications();

      // Save time preference regardless of permission result
      const hour = selectedTime.getHours();
      const minute = selectedTime.getMinutes();

      await updateNotificationPreferences(user.uid, {
        allNotificationsEnabled: true,
        dailyReminders: {
          reminderTime: { hour, minute },
          fourThreeTwoOne: true,
          habits: true,
        },
      });

      if (token) {
        await savePushTokenToUser(user.uid, token);
      }

      await markOptedIn();

      if (!token) {
        // Permission denied but time saved
        Alert.alert(
          'Time saved',
          'No worries. You can turn on reminders anytime in Settings.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error enabling notifications:', error);
      navigation.goBack();
    } finally {
      setEnabling(false);
    }
  };

  const handleMaybeLater = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await markPromptDismissed();
    navigation.goBack();
  };

  const formatTime = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topSpacer} />

        {/* Bell Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Icon name="bell-outline" size={48} color={Colors.white} />
          </View>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>
          Stay on rhythm, your way
        </Text>

        {/* Body */}
        <Text style={styles.body}>
          Vara can send a gentle reminder at the time that works for your routine.
          You choose when, and you can always change it.
        </Text>

        {/* Time Selector */}
        <View style={styles.timeSection}>
          <Text style={styles.timeLabel}>Reminder time</Text>
          <View style={styles.timeButton}>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                style={styles.iosPicker}
              />
            ) : (
              <>
                <Button
                  variant="outline"
                  onPress={handleChooseTime}
                  accessibilityLabel={`Selected time: ${formatTime(selectedTime)}. Tap to change.`}
                >
                  {formatTime(selectedTime)}
                </Button>
                {showTimePicker && (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}
              </>
            )}
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* CTAs */}
      <View style={styles.ctaContainer}>
        <Button
          variant="primary"
          onPress={handleEnable}
          fullWidth
          loading={enabling}
          disabled={enabling}
          accessibilityLabel="Choose my reminder time"
          accessibilityRole="button"
        >
          Choose my reminder time
        </Button>
        <Button
          variant="text"
          onPress={handleMaybeLater}
          fullWidth
          disabled={enabling}
          accessibilityLabel="Maybe later"
          accessibilityRole="button"
          style={styles.secondaryButton}
        >
          Maybe later
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
  },
  topSpacer: {
    flex: 1,
    minHeight: Spacing['3xl'],
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
    ...Layout.shadow.md,
  },
  headline: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
    lineHeight: Typography.fontSize['2xl'] * Typography.lineHeight.heading,
    marginBottom: Spacing.lg,
    letterSpacing: -0.25,
  },
  body: {
    color: Colors.softCharcoal,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.regular,
    textAlign: 'center',
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  timeSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  timeLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.sm,
  },
  timeButton: {
    alignItems: 'center',
  },
  iosPicker: {
    width: 200,
    height: 120,
  },
  bottomSpacer: {
    flex: 1,
    minHeight: Spacing['3xl'],
  },
  ctaContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.base,
    paddingTop: Spacing.sm,
  },
  secondaryButton: {
    marginTop: Spacing.sm,
  },
});

export default NotificationOptInScreen;
