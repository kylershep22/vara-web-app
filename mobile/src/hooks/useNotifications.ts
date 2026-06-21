/**
 * useNotifications Hook
 * Manages push token registration, permission status, and notification tap routing.
 *
 * Deep-link mapping for 4 notification categories:
 *   daily_rhythm     → Dashboard (home/track)
 *   insights_learning → Insights screen
 *   social_connection → Chat / Profile / Community (based on type)
 *   milestones_reflection → Dashboard
 */

import { useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';
import { ROUTES } from '../navigation/routes';
import {
  registerForPushNotifications,
  savePushTokenToUser,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getPermissionsStatus,
} from '../services/notifications.service';

export function useNotifications() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>('undetermined');
  const notificationListener = useRef<Notifications.Subscription>(null);
  const responseListener = useRef<Notifications.Subscription>(null);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!user) return;

      try {
        const { status } = await getPermissionsStatus();
        setPermissionStatus(status);

        if (status === 'granted') {
          const token = await registerForPushNotifications();
          if (token) {
            setExpoPushToken(token);
            await savePushTokenToUser(user.uid, token);
          }
        }
      } catch (error) {
        console.error('Error checking notification permissions:', error);
      }
    };

    checkPermissions();

    notificationListener.current = addNotificationReceivedListener((n) => {
      setNotification(n);
    });

    responseListener.current = addNotificationResponseListener((response) => {
      handleNotificationResponse(response);
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [user]);

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const data = response.notification.request.content.data;
    const category = data?.category as string | undefined;
    const type = data?.type as string | undefined;

    // Route by category first, then fall back to type
    switch (category) {
      case 'daily_rhythm':
        navigation.navigate(ROUTES.Home);
        break;

      case 'insights_learning':
        navigation.navigate('Insights');
        break;

      case 'social_connection':
        if (type === 'message' && data?.conversationId) {
          navigation.navigate('Messages', {
            screen: 'Chat',
            params: {
              conversationId: data.conversationId,
              otherUserId: data.senderId,
            },
          });
        } else if (type === 'connection' && data?.senderId) {
          navigation.navigate('Profile', { screen: 'ProfileSettings' });
        } else if (data?.groupId) {
          navigation.navigate('Community', {
            screen: 'Group',
            params: { groupId: data.groupId },
          });
        } else {
          navigation.navigate('Community');
        }
        break;

      case 'milestones_reflection':
        navigation.navigate(ROUTES.Home);
        break;

      default:
        // Legacy fallback by type
        if (type === 'message' && data?.conversationId) {
          navigation.navigate('Messages', {
            screen: 'Chat',
            params: {
              conversationId: data.conversationId,
              otherUserId: data.senderId,
            },
          });
        } else if (type === 'connection') {
          navigation.navigate('Profile', { screen: 'ProfileSettings' });
        } else if (type === 'community_activity' && data?.groupId) {
          navigation.navigate('Community', {
            screen: 'Group',
            params: { groupId: data.groupId },
          });
        } else {
          navigation.navigate(ROUTES.Home);
        }
        break;
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const token = await registerForPushNotifications();
      if (token) {
        setExpoPushToken(token);
        await savePushTokenToUser(user.uid, token);
      }

      const { status } = await getPermissionsStatus();
      setPermissionStatus(status);
      return status === 'granted';
    } catch (error) {
      logger.log('Notification setup unavailable (expected in Expo Go):', error);
      return false;
    }
  };

  return {
    expoPushToken,
    notification,
    permissionStatus,
    requestPermissions,
  };
}
