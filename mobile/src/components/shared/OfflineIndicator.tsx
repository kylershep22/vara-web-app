/**
 * Offline Indicator
 * Shows when device is offline or has pending changes to sync
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

interface OfflineIndicatorProps {
  compact?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ compact = false }) => {
  const {
    isOffline,
    hasPendingChanges,
    pendingOperations,
    syncStatus,
    triggerSync,
  } = useNetworkStatus();

  // Don't render if online and no pending changes
  if (!isOffline && !hasPendingChanges) {
    return null;
  }

  if (compact) {
    return (
      <TouchableOpacity
        style={[
          styles.compactContainer,
          isOffline ? styles.offlineBg : styles.pendingBg,
        ]}
        onPress={triggerSync}
        activeOpacity={0.7}
      >
        <Icon
          name={isOffline ? 'wifi-off' : 'cloud-sync-outline'}
          size={14}
          color={isOffline ? Colors.error : Colors.sunriseAmber}
        />
        {hasPendingChanges && (
          <Text style={[styles.compactText, isOffline ? styles.offlineText : styles.pendingText]}>
            {pendingOperations}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.container,
        isOffline ? styles.offlineBg : styles.pendingBg,
      ]}
      onPress={!isOffline ? triggerSync : undefined}
      activeOpacity={isOffline ? 1 : 0.7}
    >
      <Icon
        name={isOffline ? 'wifi-off' : syncStatus === 'syncing' ? 'cloud-sync' : 'cloud-sync-outline'}
        size={16}
        color={isOffline ? Colors.error : Colors.sunriseAmber}
      />
      <Text style={[styles.text, isOffline ? styles.offlineText : styles.pendingText]}>
        {isOffline
          ? 'You\'re offline'
          : syncStatus === 'syncing'
          ? 'Syncing...'
          : `${pendingOperations} change${pendingOperations !== 1 ? 's' : ''} pending`}
      </Text>
      {!isOffline && syncStatus !== 'syncing' && (
        <Text style={styles.tapHint}>Tap to sync</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.sm,
  },
  offlineBg: {
    backgroundColor: Colors.error + '15',
  },
  pendingBg: {
    backgroundColor: Colors.sunriseAmber + '15',
  },
  text: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  compactText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  offlineText: {
    color: Colors.error,
  },
  pendingText: {
    color: Colors.sunriseAmber,
  },
  tapHint: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginLeft: 'auto',
  },
});

export default OfflineIndicator;
