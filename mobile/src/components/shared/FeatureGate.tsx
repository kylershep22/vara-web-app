/**
 * FeatureGate Component
 * Conditionally renders content based on feature unlock status
 *
 * Design Philosophy: Show locked features as previews (not hidden) to create
 * anticipation and allow users to unlock when ready.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFeatureUnlock } from '../../hooks/useFeatureUnlock';
import { FeatureId, FEATURE_METADATA } from '../../constants/featureUnlock';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface FeatureGateProps {
  /** The feature ID to check */
  feature: FeatureId;
  /** Content to render when feature is unlocked */
  children: React.ReactNode;
  /** Optional custom fallback when locked (defaults to LockedFeaturePreview) */
  fallback?: React.ReactNode;
  /** Hide completely when locked instead of showing preview */
  hideWhenLocked?: boolean;
  /** Callback when user taps on locked feature */
  onLockedPress?: () => void;
}

/**
 * FeatureGate - Conditionally renders based on feature unlock status
 */
export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback,
  hideWhenLocked = false,
  onLockedPress,
}) => {
  const { isUnlocked, access, unlockAll } = useFeatureUnlock();

  // Feature is unlocked - render children
  if (isUnlocked(feature)) {
    return <>{children}</>;
  }

  // Feature is locked - hide if requested
  if (hideWhenLocked) {
    return null;
  }

  // Feature is locked - show fallback or default preview
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <LockedFeaturePreview
      feature={feature}
      daysUntilUnlock={access.daysUntilNextUnlock}
      onPress={onLockedPress}
      onUnlockAll={unlockAll}
    />
  );
};

/**
 * LockedFeaturePreview - Shows a preview of a locked feature
 */
interface LockedFeaturePreviewProps {
  feature: FeatureId;
  daysUntilUnlock: number;
  onPress?: () => void;
  onUnlockAll?: () => Promise<void>;
}

export const LockedFeaturePreview: React.FC<LockedFeaturePreviewProps> = ({
  feature,
  daysUntilUnlock,
  onPress,
  onUnlockAll,
}) => {
  const metadata = FEATURE_METADATA[feature];
  const [unlocking, setUnlocking] = React.useState(false);

  const handleUnlockAll = async () => {
    if (!onUnlockAll || unlocking) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUnlocking(true);
    try {
      await onUnlockAll();
    } catch (error) {
      console.error('Error unlocking all features:', error);
    } finally {
      setUnlocking(false);
    }
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Locked overlay */}
      <View style={styles.lockedOverlay}>
        <View style={styles.iconContainer}>
          <Icon name={metadata.icon as any} size={32} color={Colors.silverSage} />
          <View style={styles.lockBadge}>
            <Icon name="lock" size={12} color={Colors.white} />
          </View>
        </View>

        <Text style={styles.featureName}>{metadata.name}</Text>
        <Text style={styles.featureDescription}>{metadata.description}</Text>

        <View style={styles.unlockInfo}>
          {daysUntilUnlock > 0 ? (
            <Text style={styles.unlockText}>
              Unlocks in {daysUntilUnlock} day{daysUntilUnlock !== 1 ? 's' : ''}
            </Text>
          ) : (
            <Text style={styles.unlockText}>Coming soon</Text>
          )}
        </View>

        {/* Unlock now button */}
        <TouchableOpacity
          style={styles.unlockButton}
          onPress={handleUnlockAll}
          disabled={unlocking}
        >
          <Text style={styles.unlockButtonText}>
            {unlocking ? 'Unlocking...' : 'Unlock Now'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

/**
 * Compact locked badge for inline use
 */
interface LockedBadgeProps {
  daysUntilUnlock?: number;
  onPress?: () => void;
}

export const LockedBadge: React.FC<LockedBadgeProps> = ({
  daysUntilUnlock,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.badge} onPress={onPress} activeOpacity={0.7}>
      <Icon name="lock" size={10} color={Colors.silverSage} />
      <Text style={styles.badgeText}>
        {daysUntilUnlock && daysUntilUnlock > 0
          ? `${daysUntilUnlock}d`
          : 'Locked'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
  },
  lockedOverlay: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
    padding: Spacing.lg,
    alignItems: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  lockBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.silverSage,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureName: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  unlockInfo: {
    backgroundColor: Colors.dewSage,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
    marginBottom: Spacing.base,
  },
  unlockText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  unlockButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  unlockButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  // Badge styles
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${Colors.silverSage}20`,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  badgeText: {
    fontSize: 10,
    color: Colors.silverSage,
    fontWeight: '500',
  },
});

export default FeatureGate;
