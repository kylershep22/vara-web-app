/**
 * useNotificationPermission (NPM-2, Kyle's D4, D6 and Rulings 4 and 5).
 *
 * The device's notification permission, read from the OS only: no Firestore
 * read is involved, so a status can never fail because the network did. Read on
 * mount, whenever the app becomes active (a return from iOS Settings), and
 * whenever the screen regains focus.
 *
 * Any granted status, provisional included, is 'allowed'. 'denied' leads to iOS
 * Settings. 'notAsked' asks the OS; on a grant the Expo push token is registered
 * and saved, as the removed Push Notifications switch did. That save is
 * best-effort: a failure is logged and never reported as a permission failure.
 * Nothing here writes a notification preference (D4: General stays as the user
 * set it whatever the device allows).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import {
  getPermissionsStatus,
  registerPushToken,
  requestNotificationPermission,
  savePushTokenToUser,
} from '../services/notifications.service';
import { logger } from '../utils/logger';

export type NotificationPermissionState = 'allowed' | 'denied' | 'notAsked';

export function permissionStateFrom(
  result: Pick<Notifications.NotificationPermissionsStatus, 'status' | 'granted' | 'ios'>
): NotificationPermissionState {
  // The enum's values (PROVISIONAL 3, EPHEMERAL 4) as fallbacks, because test
  // doubles of expo-notifications rarely carry the enum.
  const iosStatus = Notifications.IosAuthorizationStatus;
  const provisional = iosStatus?.PROVISIONAL ?? 3;
  const ephemeral = iosStatus?.EPHEMERAL ?? 4;
  if (
    result.granted ||
    result.status === 'granted' ||
    result.ios?.status === provisional ||
    result.ios?.status === ephemeral
  ) {
    return 'allowed';
  }
  return result.status === 'denied' ? 'denied' : 'notAsked';
}

export function useNotificationPermission() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  /** null until the first read answers: the row renders nothing until then. */
  const [state, setState] = useState<NotificationPermissionState | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const next = permissionStateFrom(await getPermissionsStatus());
      if (mounted.current) setState(next);
    } catch (error) {
      logger.warn('[useNotificationPermission] permission read failed', error);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refresh();
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => {
      mounted.current = false;
      sub.remove();
    };
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const openSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      logger.warn('[useNotificationPermission] could not open Settings', error);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    const granted = await requestNotificationPermission();
    await refresh();
    if (granted && uid) {
      // Best-effort, and never in the way of the status: a failed token save is
      // logged only (Ruling 5; NPM-3a owns token registration).
      void registerPushToken()
        .then((token) => (token ? savePushTokenToUser(uid, token) : undefined))
        .catch((error) => logger.warn('[useNotificationPermission] push token not saved', error));
    }
  }, [refresh, uid]);

  return { state, refresh, openSettings, requestPermission };
}

export default useNotificationPermission;
