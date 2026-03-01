/**
 * useNotificationSilence Hook
 * Notification silencing during focus sessions with permission flow
 *
 * Per Focus Page Spec Section 5.5:
 * - DND activates when timer starts (not when toggle is flipped)
 * - DND deactivates on: complete, pause, reset, app backgrounded 30s, or killed
 * - First-time: Show explanation before system permission prompt
 *
 * Implementation Status:
 * - iOS: Stub (requires Focus API via Intents framework in native module)
 * - Android: Stub (requires NotificationManager DND access)
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert, Linking, AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFERENCE_KEY = '@notification_silence_enabled';
const PERMISSION_ASKED_KEY = '@notification_silence_permission_asked';

interface UseNotificationSilenceReturn {
  /** User preference - whether they want notifications silenced */
  isEnabled: boolean;
  /** Whether DND is currently active */
  isCurrentlyActive: boolean;
  /** Toggle the preference */
  toggle: () => void;
  /** Activate DND (call when timer starts) */
  activate: () => Promise<void>;
  /** Deactivate DND (call when timer stops/pauses/resets) */
  deactivate: () => Promise<void>;
  /** Whether we have permission */
  hasPermission: boolean;
  /** Request permission with explanation dialog */
  requestPermission: () => Promise<boolean>;
  /** Show the first-time explanation bottom sheet */
  showPermissionExplanation: () => void;
  /** Whether the explanation dialog should be shown */
  needsExplanation: boolean;
}

export const useNotificationSilence = (): UseNotificationSilenceReturn => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isCurrentlyActive, setIsCurrentlyActive] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [hasAskedBefore, setHasAskedBefore] = useState(true);
  const [needsExplanation, setNeedsExplanation] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const [enabled, asked] = await Promise.all([
          AsyncStorage.getItem(PREFERENCE_KEY),
          AsyncStorage.getItem(PERMISSION_ASKED_KEY),
        ]);

        if (enabled !== null) {
          setIsEnabled(enabled === 'true');
        }

        setHasAskedBefore(asked === 'true');

        // Check if we have permission (stub - always false until native implementation)
        // In real implementation, check system permission status
        setHasPermission(false);
      } catch (error) {
        console.warn('[NotificationSilence] Error loading preferences:', error);
      }
    };

    loadPreferences();
  }, []);

  // Handle app going to background - deactivate DND after 30s
  useEffect(() => {
    let backgroundTimer: NodeJS.Timeout | null = null;

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' && isCurrentlyActive) {
        console.log('[NotificationSilence] App backgrounded, starting 30s timer');
        backgroundTimer = setTimeout(() => {
          console.log('[NotificationSilence] 30s elapsed, deactivating DND');
          setIsCurrentlyActive(false);
        }, 30000);
      } else if (nextAppState === 'active' && backgroundTimer) {
        console.log('[NotificationSilence] App returned to foreground, canceling timer');
        clearTimeout(backgroundTimer);
        backgroundTimer = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      if (backgroundTimer) {
        clearTimeout(backgroundTimer);
      }
    };
  }, [isCurrentlyActive]);

  const toggle = useCallback(async () => {
    const newValue = !isEnabled;
    setIsEnabled(newValue);

    try {
      await AsyncStorage.setItem(PREFERENCE_KEY, String(newValue));
    } catch (error) {
      console.warn('[NotificationSilence] Error saving preference:', error);
    }

    // If enabling for the first time and haven't asked for permission
    if (newValue && !hasAskedBefore && !hasPermission) {
      setNeedsExplanation(true);
    }

    console.log('[NotificationSilence] Toggle preference:', newValue);
  }, [isEnabled, hasAskedBefore, hasPermission]);

  const showPermissionExplanation = useCallback(() => {
    Alert.alert(
      'Enable Focus Mode',
      'Vara can silence notifications while your timer is running, so you can focus without interruption. You\'ll need to grant permission in your device settings.',
      [
        {
          text: 'Not now',
          style: 'cancel',
          onPress: () => {
            setNeedsExplanation(false);
            setIsEnabled(false);
            AsyncStorage.setItem(PREFERENCE_KEY, 'false');
          },
        },
        {
          text: 'Enable',
          onPress: async () => {
            setNeedsExplanation(false);
            await requestPermissionInternal();
          },
        },
      ]
    );
  }, []);

  const requestPermissionInternal = async (): Promise<boolean> => {
    console.log('[NotificationSilence] Requesting permission');
    console.log(`[NotificationSilence] Platform: ${Platform.OS}`);

    try {
      await AsyncStorage.setItem(PERMISSION_ASKED_KEY, 'true');
      setHasAskedBefore(true);
    } catch (error) {
      console.warn('[NotificationSilence] Error saving permission asked state:', error);
    }

    if (Platform.OS === 'ios') {
      // iOS: Would trigger Focus API permission
      // For now, direct to Settings
      Alert.alert(
        'Focus Mode Setup',
        'To enable Focus Mode, go to Settings > Focus > Vara and allow notifications to be silenced.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => Linking.openSettings(),
          },
        ]
      );
    } else {
      // Android: Open DND access settings
      Alert.alert(
        'Do Not Disturb Access',
        'To silence notifications during focus sessions, grant Vara access to Do Not Disturb settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              // Android-specific intent for DND settings
              Linking.openSettings();
            },
          },
        ]
      );
    }

    // In real implementation, return actual permission status
    return false;
  };

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!hasAskedBefore) {
      setNeedsExplanation(true);
      return false;
    }
    return requestPermissionInternal();
  }, [hasAskedBefore]);

  const activate = useCallback(async () => {
    if (!isEnabled) {
      console.log('[NotificationSilence] Preference disabled, not activating');
      return;
    }

    console.log('[NotificationSilence] Activating DND');
    console.log(`[NotificationSilence] Platform: ${Platform.OS}`);
    console.log('[NotificationSilence] Has permission:', hasPermission);

    // In real implementation:
    // iOS: Enable Vara Focus Mode via Focus API
    // Android: Set interruption filter via NotificationManager

    setIsCurrentlyActive(true);
  }, [isEnabled, hasPermission]);

  const deactivate = useCallback(async () => {
    if (!isCurrentlyActive) {
      return;
    }

    console.log('[NotificationSilence] Deactivating DND');

    // In real implementation:
    // iOS: Disable Vara Focus Mode
    // Android: Restore previous interruption filter

    setIsCurrentlyActive(false);
  }, [isCurrentlyActive]);

  // Effect to show explanation when needed
  useEffect(() => {
    if (needsExplanation) {
      showPermissionExplanation();
    }
  }, [needsExplanation, showPermissionExplanation]);

  return {
    isEnabled,
    isCurrentlyActive,
    toggle,
    activate,
    deactivate,
    hasPermission,
    requestPermission,
    showPermissionExplanation,
    needsExplanation,
  };
};

export default useNotificationSilence;
