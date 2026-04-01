/**
 * Network Status Hook
 * Monitors device connectivity and offline queue status
 *
 * Uses expo-network to detect real connectivity changes and tracks
 * pending operations in the offline queue.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as Network from 'expo-network';
import {
  getPendingCount,
  processQueue,
  subscribeToSync,
  initializeOfflineQueue,
} from '../services/offlineQueue.service';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
  pendingOperations: number;
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
}

export const useNetworkStatus = () => {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true, // Optimistic default until first check
    isInternetReachable: true,
    connectionType: null,
    pendingOperations: 0,
    syncStatus: 'idle',
  });

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Check current network state
  const checkNetwork = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      setStatus((prev) => ({
        ...prev,
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? null,
        connectionType: state.type ? String(state.type) : null,
      }));
    } catch (error) {
      // On error, assume connected to avoid false offline banners
      if (__DEV__) {
        console.warn('Network status check failed:', error);
      }
    }
  }, []);

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setStatus((prev) => ({ ...prev, pendingOperations: count }));
    } catch (error) {
      // Silently handle errors
    }
  }, []);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    await processQueue();
    await updatePendingCount();
  }, [updatePendingCount]);

  // Poll network state and manage offline queue
  useEffect(() => {
    // Initial network check
    checkNetwork();

    // Poll every 5 seconds for connectivity changes
    // expo-network doesn't provide an event listener, so polling is required
    pollRef.current = setInterval(checkNetwork, 5000);

    // Initialize offline queue
    const cleanupQueue = initializeOfflineQueue();

    // Initial pending count
    updatePendingCount();

    // Subscribe to sync status changes
    const unsubscribeSync = subscribeToSync((syncStatus) => {
      setStatus((prev) => ({
        ...prev,
        syncStatus: syncStatus === 'synced' ? 'idle' : syncStatus,
      }));

      // Update pending count after sync
      if (syncStatus === 'synced') {
        updatePendingCount();
      }
    });

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
      cleanupQueue();
      unsubscribeSync();
    };
  }, [checkNetwork, updatePendingCount]);

  // When we come back online, trigger sync of pending changes
  useEffect(() => {
    if (status.isConnected && status.pendingOperations > 0) {
      triggerSync();
    }
  }, [status.isConnected, status.pendingOperations, triggerSync]);

  return {
    ...status,
    isOffline: !status.isConnected,
    hasPendingChanges: status.pendingOperations > 0,
    triggerSync,
    refreshPendingCount: updatePendingCount,
  };
};

export default useNetworkStatus;
