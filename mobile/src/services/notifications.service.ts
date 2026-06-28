// mobile/src/services/notifications.service.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { db } from '../config/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { FocusCopy } from '../constants/focusContent';

// ==========================================
// FOREGROUND NOTIFICATION GATE
// Suppresses system alerts when app is foregrounded;
// routes them to in-app toast instead.
// ==========================================

let _isForeground = AppState.currentState === 'active';
let _onForegroundNotification: ((title: string, body: string, data?: Record<string, unknown>) => void) | null = null;
let _notificationHandlerReady = false;

// Track foreground state — wrapped in try-catch to prevent module-load crashes
try {
  AppState.addEventListener('change', (state: AppStateStatus) => {
    _isForeground = state === 'active';
  });
} catch (error) {
  console.warn('Failed to attach AppState listener:', error);
}

/**
 * Register a callback for notifications received while foregrounded.
 * The NotificationContext calls this to route to ToastContext.
 */
export function setForegroundNotificationHandler(
  handler: (title: string, body: string, data?: Record<string, unknown>) => void,
): void {
  _onForegroundNotification = handler;
}

// Configure how notifications are handled when the app is foregrounded
// Wrapped in try-catch to prevent module-load crash in production builds
// where the native notification module may not be ready yet
try {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      if (_isForeground) {
        // Route to in-app toast instead of system alert
        const title = notification.request.content.title || '';
        const body = notification.request.content.body || '';
        if (_onForegroundNotification && (title || body)) {
          const data = notification.request.content.data as Record<string, unknown> | undefined;
          _onForegroundNotification(title, body, data);
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
  _notificationHandlerReady = true;
} catch (error) {
  console.error('Failed to set notification handler (non-fatal):', error);
}

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
 * Schedule a local notification (for habit reminders, etc.). `data` is attached
 * to the notification content so a tap can be deep-link routed by type.
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput,
  data?: Record<string, unknown>
): Promise<string> {
  return await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      ...(data ? { data } : {}),
    },
    trigger,
  });
}

/**
 * Ensure notification permission, requesting it once if undetermined. Returns
 * whether notifications are granted. Used by the focus timer to request on
 * first use; a denial simply means no completion notification (the timer still
 * works) — callers degrade gracefully.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return true;
    const { status: requested } = await Notifications.requestPermissionsAsync();
    return requested === 'granted';
  } catch (error) {
    console.warn('Notification permission check failed (non-fatal):', error);
    return false;
  }
}

/**
 * Schedule the focus-block completion notification for `endsAt`. The OS owns it,
 * so it fires whether the app is backgrounded or killed. The data payload deep
 * links a tap back to the FocusScreen completion surface for that block. Returns
 * the scheduled id (to cancel later), or null when permission is denied or
 * scheduling fails — the timer keeps working regardless.
 */
export async function scheduleFocusCompletionNotification(
  focusSessionId: string,
  endsAt: number
): Promise<string | null> {
  const granted = await ensureNotificationPermission();
  if (!granted) return null;
  try {
    return await scheduleLocalNotification(
      FocusCopy.focusCompleteNotificationTitle,
      FocusCopy.focusCompleteNotificationBody,
      { type: Notifications.SchedulableTriggerInputTypes.DATE, date: endsAt },
      { type: 'focus-complete', focusSessionId, endsAt }
    );
  } catch (error) {
    console.warn('Failed to schedule focus completion notification:', error);
    return null;
  }
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
 * The notification response that launched the app from a cold start (the user
 * tapped a notification while the app was killed), or null. Used for
 * cold-launch deep-link routing that the warm/background response listener
 * cannot catch because it was not yet subscribed.
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  try {
    return await Notifications.getLastNotificationResponseAsync();
  } catch (error) {
    console.warn('Failed to read last notification response:', error);
    return null;
  }
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
