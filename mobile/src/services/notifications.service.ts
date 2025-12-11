// mobile/src/services/notifications.service.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { db } from '../config/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Configure how notifications should be handled when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request notification permissions from the user
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    return null;
  }

  // Get the Expo push token
  const token = (
    await Notifications.getExpoPushTokenAsync({
      projectId: '9af30502-8eeb-472c-a0cc-f4e8b10ede1a', // Your Expo project ID
    })
  ).data;

  // Android-specific configuration
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1B5E57',
    });
  }

  return token;
}

/**
 * Save the Expo push token to the user's Firestore document
 */
export async function savePushTokenToUser(userId: string, pushToken: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      expoPushToken: pushToken,
      pushTokenUpdatedAt: serverTimestamp(),
    });
    console.log('Push token saved to user document');
  } catch (error) {
    console.error('Error saving push token:', error);
    throw error;
  }
}

/**
 * Schedule a local notification (for habit reminders, etc.)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger,
  });
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get all scheduled notifications
 */
export async function getAllScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Schedule daily habit reminder
 */
export async function scheduleDailyHabitReminder(hour: number, minute: number): Promise<string> {
  // Cancel existing reminder first
  await cancelAllNotifications();

  const trigger: Notifications.DailyTriggerInput = {
    hour,
    minute,
    repeats: true,
  };

  return await scheduleLocalNotification(
    'Time to check in! 🌟',
    'Complete your daily habits and track your wellness journey.',
    trigger
  );
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
  handler: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(handler);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseListener(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}

/**
 * Get notification permissions status
 */
export async function getPermissionsStatus(): Promise<Notifications.NotificationPermissionsStatus> {
  return await Notifications.getPermissionsAsync();
}

/**
 * Open device settings for notifications
 */
export async function openNotificationSettings(): Promise<void> {
  await Notifications.getPermissionsAsync();
  // On iOS, this will prompt to open settings if permissions were denied
}
