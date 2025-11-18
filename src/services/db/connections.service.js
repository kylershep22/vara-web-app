// src/services/db/connections.service.js

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  or,
  and
} from 'firebase/firestore';
import { db } from '../../firebase';

/**
 * Standardized Connection Data Model:
 * {
 *   requesterId: string,      // User who sent the request
 *   addresseeId: string,      // User who received the request
 *   participants: [string],   // [requesterId, addresseeId] for easy querying
 *   status: 'pending' | 'accepted' | 'declined' | 'canceled',
 *   createdAt: Timestamp,
 *   updatedAt: Timestamp
 * }
 */

const CONNECTIONS_COLLECTION = 'connections';

/**
 * Send a connection request
 * @param {string} requesterId - User sending the request
 * @param {string} addresseeId - User receiving the request
 * @returns {Promise<string>} - Connection document ID
 */
export async function sendConnectionRequest(requesterId, addresseeId) {
  if (!requesterId || !addresseeId) {
    throw new Error('requesterId and addresseeId are required');
  }

  if (requesterId === addresseeId) {
    throw new Error('Cannot send connection request to yourself');
  }

  // Check if connection already exists
  const existing = await getConnectionBetweenUsers(requesterId, addresseeId);
  if (existing) {
    throw new Error('Connection request already exists');
  }

  try {
    const connection = {
      requesterId,
      addresseeId,
      participants: [requesterId, addresseeId],
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, CONNECTIONS_COLLECTION), connection);
    return docRef.id;
  } catch (error) {
    console.error('Error sending connection request:', error);
    throw error;
  }
}

/**
 * Accept a connection request
 * @param {string} connectionId - Connection document ID
 * @param {string} userId - User accepting (must be addressee)
 * @returns {Promise<void>}
 */
export async function acceptConnectionRequest(connectionId, userId) {
  if (!connectionId || !userId) {
    throw new Error('connectionId and userId are required');
  }

  try {
    const connectionDoc = await getDoc(doc(db, CONNECTIONS_COLLECTION, connectionId));
    if (!connectionDoc.exists()) {
      throw new Error('Connection not found');
    }

    const connection = connectionDoc.data();
    if (connection.addresseeId !== userId) {
      throw new Error('Only the addressee can accept the connection');
    }

    if (connection.status !== 'pending') {
      throw new Error('Connection is not pending');
    }

    await updateDoc(doc(db, CONNECTIONS_COLLECTION, connectionId), {
      status: 'accepted',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error accepting connection request:', error);
    throw error;
  }
}

/**
 * Decline a connection request
 * @param {string} connectionId - Connection document ID
 * @param {string} userId - User declining (must be addressee)
 * @returns {Promise<void>}
 */
export async function declineConnectionRequest(connectionId, userId) {
  if (!connectionId || !userId) {
    throw new Error('connectionId and userId are required');
  }

  try {
    const connectionDoc = await getDoc(doc(db, CONNECTIONS_COLLECTION, connectionId));
    if (!connectionDoc.exists()) {
      throw new Error('Connection not found');
    }

    const connection = connectionDoc.data();
    if (connection.addresseeId !== userId) {
      throw new Error('Only the addressee can decline the connection');
    }

    await updateDoc(doc(db, CONNECTIONS_COLLECTION, connectionId), {
      status: 'declined',
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error declining connection request:', error);
    throw error;
  }
}

/**
 * Cancel a connection request (by requester) or remove a connection
 * @param {string} connectionId - Connection document ID
 * @param {string} userId - User canceling (must be requester or either participant if accepted)
 * @returns {Promise<void>}
 */
export async function cancelConnection(connectionId, userId) {
  if (!connectionId || !userId) {
    throw new Error('connectionId and userId are required');
  }

  try {
    const connectionDoc = await getDoc(doc(db, CONNECTIONS_COLLECTION, connectionId));
    if (!connectionDoc.exists()) {
      throw new Error('Connection not found');
    }

    const connection = connectionDoc.data();

    // If pending, only requester can cancel
    if (connection.status === 'pending' && connection.requesterId !== userId) {
      throw new Error('Only the requester can cancel a pending connection');
    }

    // If accepted, either participant can remove
    if (connection.status === 'accepted' && !connection.participants.includes(userId)) {
      throw new Error('You are not part of this connection');
    }

    // Delete the connection
    await deleteDoc(doc(db, CONNECTIONS_COLLECTION, connectionId));
  } catch (error) {
    console.error('Error canceling connection:', error);
    throw error;
  }
}

/**
 * Get connection between two users
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {Promise<Object|null>} - Connection object or null
 */
export async function getConnectionBetweenUsers(userId1, userId2) {
  if (!userId1 || !userId2) {
    throw new Error('Both user IDs are required');
  }

  try {
    // Query for connection where both users are participants
    const q = query(
      collection(db, CONNECTIONS_COLLECTION),
      where('participants', 'array-contains', userId1)
    );

    const snapshot = await getDocs(q);
    const connection = snapshot.docs.find(doc => {
      const data = doc.data();
      return data.participants.includes(userId2);
    });

    return connection ? { id: connection.id, ...connection.data() } : null;
  } catch (error) {
    console.error('Error getting connection between users:', error);
    return null;
  }
}

/**
 * Get all connections for a user
 * @param {string} userId - User ID
 * @param {string} [status] - Optional status filter ('pending', 'accepted', etc.)
 * @returns {Promise<Array>} - Array of connection objects
 */
export async function getUserConnections(userId, status = null) {
  if (!userId) {
    throw new Error('userId is required');
  }

  try {
    let q = query(
      collection(db, CONNECTIONS_COLLECTION),
      where('participants', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );

    if (status) {
      q = query(
        collection(db, CONNECTIONS_COLLECTION),
        where('participants', 'array-contains', userId),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting user connections:', error);
    return [];
  }
}

/**
 * Get pending connection requests received by user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of pending connection requests
 */
export async function getPendingReceivedRequests(userId) {
  if (!userId) {
    throw new Error('userId is required');
  }

  try {
    const q = query(
      collection(db, CONNECTIONS_COLLECTION),
      where('addresseeId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting pending received requests:', error);
    return [];
  }
}

/**
 * Get pending connection requests sent by user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of pending sent requests
 */
export async function getPendingSentRequests(userId) {
  if (!userId) {
    throw new Error('userId is required');
  }

  try {
    const q = query(
      collection(db, CONNECTIONS_COLLECTION),
      where('requesterId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting pending sent requests:', error);
    return [];
  }
}

/**
 * Get accepted connections (actual connections) for a user
 * @param {string} userId - User ID
 * @returns {Promise<Array>} - Array of accepted connections
 */
export async function getAcceptedConnections(userId) {
  return getUserConnections(userId, 'accepted');
}

/**
 * Subscribe to user's connections (real-time)
 * @param {string} userId - User ID
 * @param {Function} callback - Callback function to receive connections array
 * @param {string} [status] - Optional status filter
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToUserConnections(userId, callback, status = null) {
  if (!userId) {
    throw new Error('userId is required');
  }

  let q = query(
    collection(db, CONNECTIONS_COLLECTION),
    where('participants', 'array-contains', userId),
    orderBy('createdAt', 'desc')
  );

  if (status) {
    q = query(
      collection(db, CONNECTIONS_COLLECTION),
      where('participants', 'array-contains', userId),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
  }

  return onSnapshot(q, (snapshot) => {
    const connections = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(connections);
  }, (error) => {
    console.error('Error in connections subscription:', error);
    callback([]);
  });
}

/**
 * Subscribe to pending connection requests received by user (real-time)
 * @param {string} userId - User ID
 * @param {Function} callback - Callback function to receive requests array
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToPendingReceivedRequests(userId, callback) {
  if (!userId) {
    throw new Error('userId is required');
  }

  const q = query(
    collection(db, CONNECTIONS_COLLECTION),
    where('addresseeId', '==', userId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(requests);
  }, (error) => {
    console.error('Error in pending requests subscription:', error);
    callback([]);
  });
}

/**
 * Check if users are connected
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {Promise<boolean>} - True if connected (status: accepted)
 */
export async function areUsersConnected(userId1, userId2) {
  const connection = await getConnectionBetweenUsers(userId1, userId2);
  return connection?.status === 'accepted';
}

/**
 * Get connection status between users
 * @param {string} userId1 - First user ID
 * @param {string} userId2 - Second user ID
 * @returns {Promise<string|null>} - Connection status or null if no connection
 */
export async function getConnectionStatus(userId1, userId2) {
  const connection = await getConnectionBetweenUsers(userId1, userId2);
  return connection?.status || null;
}
