// mobile/src/hooks/useNotifications.ts
import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
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
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Register for push notifications and save token
    const setupNotifications = async () => {
      if (!user) return;

      try {
        const token = await registerForPushNotifications();
        if (token) {
          setExpoPushToken(token);
          // Save token to user's Firestore document
          await savePushTokenToUser(user.uid, token);
        }

        // Check permission status
        const { status } = await getPermissionsStatus();
        setPermissionStatus(status);
      } catch (error) {
        console.error('Error setting up notifications:', error);
      }
    };

    setupNotifications();

    // Add listener for notifications received while app is foregrounded
    notificationListener.current = addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    // Add listener for when user taps on notification
    responseListener.current = addNotificationResponseListener((response) => {
      handleNotificationResponse(response);
    });

    return () => {
      // Cleanup subscriptions
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user]);

  const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
    const notification = response.notification;
    const data = notification.request.content.data;

    // Handle different notification types and navigate accordingly
    if (data?.type === 'message') {
      navigation.navigate('Messages', {
        screen: 'Chat',
        params: {
          conversationId: data.conversationId,
          otherUserId: data.senderId,
        },
      });
    } else if (data?.type === 'habit_reminder') {
      navigation.navigate('Habits');
    } else if (data?.type === 'connection_request') {
      navigation.navigate('Profile', {
        screen: 'ProfileSettings',
      });
    } else if (data?.type === 'group_post') {
      navigation.navigate('Community', {
        screen: 'Group',
        params: {
          groupId: data.groupId,
        },
      });
    } else {
      // Default: navigate to home
      navigation.navigate('Dashboard');
    }
  };

  const requestPermissions = async (): Promise<boolean> => {
    if (!user) return false;

    try {
      const token = await registerForPushNotifications();
      if (token) {
        setExpoPushToken(token);
        await savePushTokenToUser(user.uid, token);

        const { status } = await getPermissionsStatus();
        setPermissionStatus(status);

        return status === 'granted';
      }
      return false;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      Alert.alert('Error', 'Failed to enable notifications');
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
