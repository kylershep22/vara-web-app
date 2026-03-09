// mobile/src/services/notifications.service.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { db } from '../config/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// ==========================================
// FOREGROUND NOTIFICATION GATE
// Suppresses system alerts when app is foregrounded;
// routes them to in-app toast instead.
// ==========================================

let _isForeground = AppState.currentState === 'active';
let _onForegroundNotification: ((title: string, body: string) => void) | null = null;

// Track foreground state
AppState.addEventListener('change', (state: AppStateStatus) => {
  _isForeground = state === 'active';
});

/**
 * Register a callback for notifications received while foregrounded.
 * The NotificationContext calls this to route to ToastContext.
 */
export function setForegroundNotificationHandler(
  handler: (title: string, body: string) => void,
): void {
  _onForegroundNotification = handler;
}

// Configure how notifications are handled when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    if (_isForeground) {
      // Route to in-app toast instead of system alert
      const title = notification.request.content.title || '';
      const body = notification.request.content.body || '';
      if (_onForegroundNotification && (title || body)) {
        _onForegroundNotification(title, body);
      }
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: false,
      };
    }
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

/**
 * Request notification permissions from the user
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  try {
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
        projectId: '63c2515a-00f1-454c-8400-2514781cade6',
      })
    ).data;

    // Android-specific configuration
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1B5E57',
      });
    }

    return token;
  } catch (error) {
    console.log('Push notification token unavailable (expected in Expo Go):', error);
    return null;
  }
}

/**
 * Save the Expo push token to the user's Firestore document
 */
export async function savePushTokenToUser(userId: string, pushToken: string): Promise<void> {
  if (!db) {
    console.warn('Firestore not initialized - cannot save push token');
    return;
  }
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
}

// ==========================================
// FCM TOKEN & FEATURE FLAG
// ==========================================

/**
 * Register for FCM push token via expo-notifications device push token.
 * Saves to user doc as `fcmToken` for server-side Cloud Functions.
 */
export async function registerAndSaveFCMToken(userId: string): Promise<string | null> {
  if (!Device.isDevice) return null;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return null;

    if (!db) {
      console.warn('Firestore not initialized - cannot save FCM token');
      return null;
    }

    // Expo's getDevicePushTokenAsync returns the native FCM/APNs token
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    const fcmToken = deviceToken.data;

    if (fcmToken && typeof fcmToken === 'string') {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmToken,
        fcmTokenUpdatedAt: serverTimestamp(),
      });
      return fcmToken;
    }

    return null;
  } catch (error) {
    console.log('FCM token registration unavailable:', error);
    return null;
  }
}

/**
 * Check if server-side push is enabled via feature flag.
 * Returns true if server push is active (client can skip local scheduling for covered categories).
 */
export async function isServerPushEnabled(): Promise<boolean> {
  if (!db) return false;
  try {
    const configRef = doc(db, 'config', 'notifications');
    const configSnap = await getDoc(configRef);
    if (!configSnap.exists()) return false;
    return configSnap.data()?.serverPushEnabled === true;
  } catch {
    return false;
  }
}
