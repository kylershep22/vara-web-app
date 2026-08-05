/**
 * Analytics Service — CONSOLE STUB. NOT THE ANALYTICS PIPELINE.
 *
 * THE REAL PIPE IS services/firebase/analyticsEvents.service.ts. Wire new events
 * THERE, not here. This file emits nothing anywhere: every helper below funnels
 * into logger.log, which is __DEV__-gated, so preview and production builds send
 * exactly zero events. Its only remaining callers are AuthContext (trackSignup /
 * trackLogin / setUserProperties) and the init call in App.tsx.
 *
 * WHY THIS WAS NOT REPOINTED AT FIRESTORE: the chokepoint below takes
 * `eventName: string` and `params?: Record<string, string | number | boolean>`.
 * That signature is precisely the shape the content firewall forbids — an open
 * event name and an open string-valued map — and roughly ten of the helpers
 * below inherit it: trackGoalCreated, trackHabitCreated, trackAIInteraction,
 * trackPostCreated, trackTaskCompleted and friends all take a free `string`
 * where a caller could pass a goal title, a habit name or a user's prompt, and
 * trackSettingChanged does `String(value)` outright. trackLibraryContent even
 * accepts a contentName and then drops it, which is the firewall implemented as
 * discipline rather than as a type. Pointing this signature at a real collection
 * would import all of those holes on day one.
 *
 * The new service starts from a closed event map with exact payloads instead.
 * Migrating these callers means giving each a typed event, which is the wiring
 * slice, not this one.
 *
 * Current: Logs events in dev, no-op in production on native.
 *
 * NATIVE ANALYTICS ACTIVATION:
 * 1. Download GoogleService-Info.plist (iOS) and google-services.json (Android)
 *    from Firebase Console > Project Settings > Your Apps
 * 2. Place them in mobile/ root directory
 * 3. npm install @react-native-firebase/app @react-native-firebase/analytics
 * 4. Add plugins to app.json:
 *    ["@react-native-firebase/app", { ... }]
 * 5. Rebuild with EAS (native modules required)
 * 6. Replace this file's implementation with @react-native-firebase/analytics calls
 *
 * PRIVACY: No Firebase UID, health/wellness content, or PII in events.
 * Only anonymized behavioral metrics (screen views, feature usage counts).
 */

import { logger } from '../utils/logger';

/**
 * Initialize Analytics
 * No-op on native until @react-native-firebase/analytics is set up
 */
export const initializeAnalytics = (): void => {
  logger.log('Analytics: ready (events logged in dev only until native SDK configured)');
};

/**
 * Log custom event
 */
export const logEvent = (
  eventName: string,
  params?: Record<string, string | number | boolean>
): void => {
  logger.log(`[Analytics] ${eventName}`, params);
};

/**
 * Log screen view
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
 * Set user properties (anonymized only)
 */
export const setUserProperties = (properties: {
  [key: string]: string;
}): void => {
  logger.log('[Analytics] User properties:', properties);
};

/**
 * Set user ID — intentionally no-op for data minimization.
 * Do NOT link Firebase UID to analytics data.
 */
export const setUserId = (_userId: string): void => {
  // Intentionally not tracking user ID in analytics (data minimization)
};

// ====================================
// PRE-DEFINED EVENT TRACKING FUNCTIONS
// ====================================

export const trackSignup = (method: string = 'email'): void => {
  logEvent('sign_up', { method });
};

export const trackLogin = (method: string = 'email'): void => {
  logEvent('login', { method });
};

export const trackGoalCreated = (goalType?: string): void => {
  logEvent('goal_created', { goal_type: goalType || 'general' });
};

export const trackHabitCreated = (habitType?: string): void => {
  logEvent('habit_created', { habit_type: habitType || 'daily' });
};

export const trackHabitCompleted = (): void => {
  logEvent('habit_completed');
};

export const trackJournalEntry = (hasVoiceInput: boolean = false): void => {
  logEvent('journal_entry_created', { voice_input: hasVoiceInput });
};

export const trackAIInteraction = (interactionType: string): void => {
  logEvent('ai_interaction', { interaction_type: interactionType });
};

export const trackPostCreated = (postType: string = 'text'): void => {
  logEvent('post_created', { post_type: postType });
};

export const trackGroupJoined = (): void => {
  logEvent('group_joined');
};

export const trackConnectionSent = (): void => {
  logEvent('connection_sent');
};

export const trackMessageSent = (): void => {
  logEvent('message_sent');
};

export const trackLibraryContent = (
  contentType: string,
  contentName?: string
): void => {
  // Only track content type, not name (could contain wellness data)
  logEvent('library_content_used', { content_type: contentType });
};

export const trackFocusSession = (
  duration: number,
  sessionType: string = 'pomodoro'
): void => {
  logEvent('focus_session_completed', {
    duration_minutes: duration,
    session_type: sessionType,
  });
};

export const trackTaskCompleted = (priority?: string): void => {
  logEvent('task_completed', { priority: priority || 'medium' });
};

export const trackNotificationPermission = (granted: boolean): void => {
  logEvent('notification_permission', { granted });
};

export const trackSettingChanged = (setting: string, value: string | number | boolean): void => {
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
