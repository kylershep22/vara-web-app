/**
 * Network Status Hook
 * Monitors offline queue status
 *
 * Note: This is a simplified implementation that doesn't require native
 * network modules. It assumes online status and tracks pending operations
 * in the offline queue.
 */

import { useState, useEffect, useCallback } from 'react';
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
    isConnected: true, // Assume online
    isInternetReachable: true,
    connectionType: null,
    pendingOperations: 0,
    syncStatus: 'idle',
  });

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

  useEffect(() => {
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
      cleanupQueue();
      unsubscribeSync();
    };
  }, [updatePendingCount]);

  return {
    ...status,
    isOffline: false, // Always assume online in this simplified implementation
    hasPendingChanges: status.pendingOperations > 0,
    triggerSync,
    refreshPendingCount: updatePendingCount,
  };
};

export default useNetworkStatus;
