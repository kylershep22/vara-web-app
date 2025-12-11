/**
 * useConnections Hook
 * Hook for managing user connections
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Connection,
  UserProfile,
  fetchUserConnections,
  fetchIncomingConnectionRequests,
  fetchSentConnectionRequests,
  sendConnectionRequest,
  acceptConnection,
  declineConnection,
  searchUsers,
  getUserById,
} from '../services/firebase';

export const useConnections = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [requests, setRequests] = useState<Connection[]>([]);
  const [sentRequests, setSentRequests] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setConnections([]);
      setRequests([]);
      setSentRequests([]);
      setLoading(false);
      return;
    }

    loadConnections();
  }, [user]);

  const loadConnections = async () => {
    setLoading(true);
    setError(null);

    try {
      const [connectionsData, requestsData, sentRequestsData] = await Promise.all([
        fetchUserConnections(user!.uid),
        fetchIncomingConnectionRequests(user!.uid),
        fetchSentConnectionRequests(user!.uid),
      ]);

      console.log('Loaded connections:', connectionsData.length);
      console.log('Loaded requests:', requestsData.length);
      console.log('Loaded sent requests:', sentRequestsData.length);

      setConnections(connectionsData);
      setRequests(requestsData);
      setSentRequests(sentRequestsData);
    } catch (err) {
      console.error('Error loading connections:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (addresseeId: string) => {
    if (!user) return;

    try {
      await sendConnectionRequest(user.uid, addresseeId);
      await loadConnections(); // Refresh
    } catch (err) {
      console.error('Error sending connection request:', err);
      throw err;
    }
  };

  const handleAcceptRequest = async (connectionId: string) => {
    try {
      await acceptConnection(connectionId);
      await loadConnections(); // Refresh
    } catch (err) {
      console.error('Error accepting connection:', err);
      throw err;
    }
  };

  const handleDeclineRequest = async (connectionId: string) => {
    try {
      await declineConnection(connectionId);
      await loadConnections(); // Refresh
    } catch (err) {
      console.error('Error declining connection:', err);
      throw err;
    }
  };

  const getConnectionIds = (): string[] => {
    if (!user) return [];

    return connections
      .map((conn) => {
        // Service layer normalizes to a/b format
        if (conn.a && conn.b) {
          return conn.a === user.uid ? conn.b : conn.a;
        }
        return null;
      })
      .filter((id): id is string => id !== null);
  };

  const isConnected = (userId: string): boolean => {
    return getConnectionIds().includes(userId);
  };

  const getSentRequestIds = (): string[] => {
    if (!user) return [];

    return sentRequests
      .map((req) => req.addresseeId)
      .filter((id): id is string => !!id);
  };

  const hasPendingRequest = (userId: string): boolean => {
    return getSentRequestIds().includes(userId);
  };

  return {
    connections,
    requests,
    sentRequests,
    loading,
    error,
    sendRequest: handleSendRequest,
    acceptRequest: handleAcceptRequest,
    declineRequest: handleDeclineRequest,
    getConnectionIds,
    isConnected,
    getSentRequestIds,
    hasPendingRequest,
    refresh: loadConnections,
  };
};

/**
 * Hook for searching users
 */
export const useUserSearch = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const search = async (query: string) => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = await searchUsers(query);
      setUsers(results);
    } catch (err) {
      console.error('Error searching users:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setUsers([]);
  };

  return {
    users,
    loading,
    error,
    search,
    clear,
  };
};

/**
 * Hook for getting user profiles from connection IDs
 */
export const useConnectionProfiles = (connectionIds: string[]) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, [connectionIds]);

  const loadProfiles = async () => {
    setLoading(true);

    try {
      const profilePromises = connectionIds.map((id) => getUserById(id));
      const profilesData = await Promise.all(profilePromises);
      setProfiles(profilesData.filter((p) => p !== null) as UserProfile[]);
    } catch (err) {
      console.error('Error loading profiles:', err);
    } finally {
      setLoading(false);
    }
  };

  return { profiles, loading };
};
