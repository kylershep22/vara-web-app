/**
 * Firebase Analytics Service (JS SDK)
 * FREE analytics and user behavior tracking
 *
 * NOTE: Firebase Analytics (web SDK) only works on web platforms.
 * For native mobile analytics, consider using Expo Analytics or Firebase Analytics React Native.
 */

import { Platform } from 'react-native';
import { getAnalytics, logEvent as firebaseLogEvent, setUserId as firebaseSetUserId, setUserProperties as firebaseSetUserProperties } from 'firebase/analytics';
import { getApp } from 'firebase/app';

// Get analytics instance (will be initialized when Firebase app is initialized)
let analytics: ReturnType<typeof getAnalytics> | null = null;

/**
 * Initialize Analytics
 * Call this after Firebase app is initialized
 *
 * Only initializes on web platform - React Native doesn't support firebase/analytics
 */
export const initializeAnalytics = (): void => {
  try {
    // Firebase Analytics (web SDK) only works on web
    if (Platform.OS !== 'web') {
      if (__DEV__) {
        console.log('📊 Firebase Analytics (web SDK) skipped on native platform');
        console.log('   Analytics events will be logged to console in development');
      }
      return;
    }

    // Only try to initialize on web
    const app = getApp();
    if (!app) {
      if (__DEV__) {
        console.warn('⚠️  Firebase app not initialized, skipping analytics');
      }
      return;
    }

    analytics = getAnalytics(app);

    if (__DEV__) {
      console.log('📊 Firebase Analytics initialized');
    }
  } catch (error) {
    // Silently fail - analytics is not critical
    if (__DEV__) {
      console.warn('Failed to initialize Firebase Analytics:', error);
    }
    // Don't throw - allow app to continue without analytics
  }
};

/**
 * Log custom event
 * @param eventName - Name of the event (use snake_case)
 * @param params - Event parameters
 */
export const logEvent = (
  eventName: string,
  params?: { [key: string]: any }
): void => {
  try {
    if (!analytics) {
      if (__DEV__) console.log(`📊 Event (not tracked in dev): ${eventName}`, params);
      return;
    }

    firebaseLogEvent(analytics, eventName, params);

    if (__DEV__) {
      console.log(`📊 Event logged: ${eventName}`, params);
    }
  } catch (error) {
    if (__DEV__) {
      console.error('Failed to log event:', error);
    }
  }
};

/**
 * Log screen view
 * @param screenName - Name of the screen
 * @param screenClass - Optional screen class/category
 */
export const logScreenView = (
  screenName: string,
  screenClass?: string
): void => {
  logEvent('screen_view', {
    screen_name: screenName,
    screen_class: screenClass || screenName,
  });
};

/**
 * Set user properties
 * @param properties - User properties to set
 */
export const setUserProperties = (properties: {
  [key: string]: string;
}): void => {
  try {
    if (!analytics) return;
    firebaseSetUserProperties(analytics, properties);

    if (__DEV__) {
      console.log('📊 User properties set:', properties);
    }
  } catch (error) {
    if (__DEV__) {
      console.error('Failed to set user properties:', error);
    }
  }
};

/**
 * Set user ID
 * @param userId - User ID from Firebase Auth
 */
export const setUserId = (userId: string): void => {
  try {
    if (!analytics) return;
    firebaseSetUserId(analytics, userId);

    if (__DEV__) {
      console.log(`📊 User ID set: ${userId}`);
    }
  } catch (error) {
    if (__DEV__) {
      console.error('Failed to set user ID:', error);
    }
  }
};

// ====================================
// PRE-DEFINED EVENT TRACKING FUNCTIONS
// ====================================

/**
 * Track signup event
 * @param method - Signup method (email, google, apple, etc.)
 */
export const trackSignup = (method: string = 'email'): void => {
  logEvent('sign_up', { method });
};

/**
 * Track login event
 * @param method - Login method (email, google, apple, etc.)
 */
export const trackLogin = (method: string = 'email'): void => {
  logEvent('login', { method });
};

/**
 * Track goal creation
 * @param goalType - Type of goal (fitness, mindfulness, etc.)
 */
export const trackGoalCreated = (goalType?: string): void => {
  logEvent('goal_created', { goal_type: goalType || 'general' });
};

/**
 * Track habit creation
 * @param habitType - Type of habit (daily, weekly, etc.)
 */
export const trackHabitCreated = (habitType?: string): void => {
  logEvent('habit_created', { habit_type: habitType || 'daily' });
};

/**
 * Track habit completion
 */
export const trackHabitCompleted = (): void => {
  logEvent('habit_completed');
};

/**
 * Track journal entry creation
 * @param hasVoiceInput - Whether voice input was used
 */
export const trackJournalEntry = (hasVoiceInput: boolean = false): void => {
  logEvent('journal_entry_created', { voice_input: hasVoiceInput });
};

/**
 * Track AI interaction
 * @param interactionType - Type of AI interaction (chat, plan, suggestion, etc.)
 */
export const trackAIInteraction = (interactionType: string): void => {
  logEvent('ai_interaction', { interaction_type: interactionType });
};

/**
 * Track community post creation
 * @param postType - Type of post (text, image, video)
 */
export const trackPostCreated = (postType: string = 'text'): void => {
  logEvent('post_created', { post_type: postType });
};

/**
 * Track group join
 */
export const trackGroupJoined = (): void => {
  logEvent('group_joined');
};

/**
 * Track connection request sent
 */
export const trackConnectionSent = (): void => {
  logEvent('connection_sent');
};

/**
 * Track message sent
 */
export const trackMessageSent = (): void => {
  logEvent('message_sent');
};

/**
 * Track library content consumed
 * @param contentType - Type of content (breathwork, sleep, movement, masterclass)
 * @param contentName - Name of the content
 */
export const trackLibraryContent = (
  contentType: string,
  contentName?: string
): void => {
  logEvent('library_content_used', {
    content_type: contentType,
    content_name: contentName || 'unknown',
  });
};

/**
 * Track focus session completion
 * @param duration - Duration in minutes
 * @param sessionType - Type of session (pomodoro, routine)
 */
export const trackFocusSession = (
  duration: number,
  sessionType: string = 'pomodoro'
): void => {
  logEvent('focus_session_completed', {
    duration_minutes: duration,
    session_type: sessionType,
  });
};

/**
 * Track task completion
 * @param priority - Task priority (low, medium, high)
 */
export const trackTaskCompleted = (priority?: string): void => {
  logEvent('task_completed', { priority: priority || 'medium' });
};

/**
 * Track push notification permission
 * @param granted - Whether permission was granted
 */
export const trackNotificationPermission = (granted: boolean): void => {
  logEvent('notification_permission', { granted });
};

/**
 * Track settings change
 * @param setting - Name of the setting changed
 * @param value - New value
 */
export const trackSettingChanged = (setting: string, value: any): void => {
  logEvent('setting_changed', {
    setting_name: setting,
    setting_value: String(value),
  });
};

export default {
  initializeAnalytics,
  logEvent,
  logScreenView,
  setUserProperties,
  setUserId,
  // Event tracking
  trackSignup,
  trackLogin,
  trackGoalCreated,
  trackHabitCreated,
  trackHabitCompleted,
  trackJournalEntry,
  trackAIInteraction,
  trackPostCreated,
  trackGroupJoined,
  trackConnectionSent,
  trackMessageSent,
  trackLibraryContent,
  trackFocusSession,
  trackTaskCompleted,
  trackNotificationPermission,
  trackSettingChanged,
};
