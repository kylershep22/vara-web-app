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
 * Ask the OS for notification permission, showing the system sheet if we have
 * not asked before. Returns whether we ended up granted.
 *
 * SPLIT OUT FROM registerForPushNotifications SO CALLERS CAN PUT THE SHEET
 * FIRST. This half is a pure native call with no network in it: whatever delay
 * a user sees between their tap and the sheet is delay the CALLER introduced by
 * awaiting something else first. The onboarding reminder step used to await two
 * Firestore round-trips ahead of it, and on a stalled connection the sheet
 * arrived some thirty seconds after the tap. Anything network-bound belongs on
 * the far side of this call.
 *
 * Keeps the physical-device guard, so a simulator still declines to prompt
 * exactly as it did when this lived inside registerForPushNotifications.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return false;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.log('Notification permission request failed (non-fatal):', error);
    return false;
  }
}

/**
 * Fetch the Expo push token. THE OTHER HALF OF THE SPLIT, and the network-bound
 * one: it registers with APNs/FCM and round-trips the Expo push service, so it
 * can hang for a long time on a poor connection. It decides nothing about
 * locally scheduled reminders, so callers on a user-facing path should not
 * block navigation on it.
 *
 * Assumes permission was already granted; call requestNotificationPermission
 * first (registerForPushNotifications does both in order).
 */
export async function registerPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  try {
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
 * Request notification permissions from the user, then fetch the push token.
 * Unchanged contract: the token, or null if permission was refused or the fetch
 * failed. Callers that need the sheet to appear promptly should use the two
 * halves directly instead.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const granted = await requestNotificationPermission();

  if (!granted) {
    console.log('Failed to get push token for push notification!');
    return null;
  }

  return await registerPushToken();
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
 * Cancel all PENDING scheduled notifications EXCEPT the focus-block completion
 * notification(s). Used by the foreground consolidation so a glance at the phone
 * mid-block (foreground then re-background) no longer wipes the pending
 * focus-complete schedule, which the OS owns and the timer relies on to fire at
 * endsAt. Every other type is cleared exactly as cancelAllNotifications() did.
 *
 * Follows the existing filter-then-cancel precedent (cancelAllUserNotifications,
 * syncAllReminders). focus-complete has no stable identifier prefix, so it is
 * matched by its data payload (data.type === 'focus-complete').
 */
export async function cancelAllScheduledExceptFocusComplete(): Promise<void> {
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  for (const request of pending) {
    if (request.content?.data?.type === 'focus-complete') continue;
    await Notifications.cancelScheduledNotificationAsync(request.identifier);
  }
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
