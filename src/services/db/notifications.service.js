// src/services/db/notifications.service.js

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Create a new notification for a user
 * @param {string} recipientId - User ID of the notification recipient
 * @param {Object} notificationData - Notification data
 * @param {string} notificationData.type - Type of notification ('invite', 'message', 'group_invite', 'daily_plan', etc.)
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.body - Notification body/text
 * @param {string} [notificationData.link] - Optional link to navigate to when clicked
 * @param {Object} [notificationData.metadata] - Optional additional data (groupId, from, etc.)
 * @returns {Promise<string>} - Created notification ID
 */
export async function createNotification(recipientId, notificationData) {
  if (!recipientId) {
    throw new Error('recipientId is required');
  }

  const { type, title, body, link, metadata = {} } = notificationData;

  if (!type || !title || !body) {
    throw new Error('type, title, and body are required');
  }

  const notification = {
    recipientId,
    type,
    title,
    body,
    link: link || '',
    read: false,
    createdAt: serverTimestamp(),
    ...metadata // Include any additional metadata (groupId, from, email, etc.)
  };

  try {
    const docRef = await addDoc(collection(db, 'notifications'), notification);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Mark a notification as read
 * @param {string} notificationId - Notification document ID
 * @returns {Promise<void>}
 */
export async function markNotificationAsRead(notificationId) {
  if (!notificationId) {
    throw new Error('notificationId is required');
  }

  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      read: true,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark multiple notifications as read
 * @param {string[]} notificationIds - Array of notification IDs
 * @returns {Promise<void>}
 */
export async function markNotificationsAsRead(notificationIds) {
  if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
    return;
  }

  try {
    const updates = notificationIds.map(id =>
      updateDoc(doc(db, 'notifications', id), {
        read: true,
        updatedAt: serverTimestamp()
      })
    );
    await Promise.all(updates);
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    throw error;
  }
}

/**
 * Delete a notification
 * @param {string} notificationId - Notification document ID
 * @returns {Promise<void>}
 */
export async function deleteNotification(notificationId) {
  if (!notificationId) {
    throw new Error('notificationId is required');
  }

  try {
    await deleteDoc(doc(db, 'notifications', notificationId));
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

/**
 * Get unread notification count for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Count of unread notifications
 */
export async function getUnreadCount(userId) {
  if (!userId) {
    throw new Error('userId is required');
  }

  try {
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      where('read', '==', false)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
}

/**
 * Get recent notifications for a user
 * @param {string} userId - User ID
 * @param {number} [limitCount=10] - Maximum number of notifications to return
 * @param {boolean} [unreadOnly=false] - Only return unread notifications
 * @returns {Promise<Array>} - Array of notification objects
 */
export async function getRecentNotifications(userId, limitCount = 10, unreadOnly = false) {
  if (!userId) {
    throw new Error('userId is required');
  }

  try {
    let q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    if (unreadOnly) {
      q = query(
        collection(db, 'notifications'),
        where('recipientId', '==', userId),
        where('read', '==', false),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting recent notifications:', error);
    return [];
  }
}

/**
 * Subscribe to unread notifications for a user (real-time)
 * @param {string} userId - User ID
 * @param {Function} callback - Callback function to receive notifications array
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToUnreadNotifications(userId, callback) {
  if (!userId) {
    throw new Error('userId is required');
  }

  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    where('read', '==', false),
    orderBy('createdAt', 'desc'),
    limit(25)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(notifications);
  }, (error) => {
    console.error('Error in notifications subscription:', error);
    callback([]);
  });
}

/**
 * Subscribe to all notifications for a user (real-time)
 * @param {string} userId - User ID
 * @param {Function} callback - Callback function to receive notifications array
 * @param {number} [limitCount=50] - Maximum number of notifications
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToAllNotifications(userId, callback, limitCount = 50) {
  if (!userId) {
    throw new Error('userId is required');
  }

  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(notifications);
  }, (error) => {
    console.error('Error in notifications subscription:', error);
    callback([]);
  });
}

/**
 * Delete all read notifications for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Number of notifications deleted
 */
export async function deleteReadNotifications(userId) {
  if (!userId) {
    throw new Error('userId is required');
  }

  try {
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      where('read', '==', true)
    );

    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    return snapshot.size;
  } catch (error) {
    console.error('Error deleting read notifications:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<number>} - Number of notifications marked as read
 */
export async function markAllAsRead(userId) {
  if (!userId) {
    throw new Error('userId is required');
  }

  try {
    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', userId),
      where('read', '==', false)
    );

    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(doc =>
      updateDoc(doc.ref, {
        read: true,
        updatedAt: serverTimestamp()
      })
    );
    await Promise.all(updatePromises);

    return snapshot.size;
  } catch (error) {
    console.error('Error marking all as read:', error);
    throw error;
  }
}
