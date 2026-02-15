/**
 * LockedScreenOverlay Component
 * Full-screen overlay for screens that are locked during progressive unlock
 *
 * Design Philosophy: Show the screen content greyed out behind the overlay
 * to create anticipation, while guiding users to focus on their selected pillar.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useFeatureUnlock } from '../../hooks/useFeatureUnlock';
import { FeatureId, FEATURE_METADATA, getPillarById } from '../../constants/featureUnlock';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface LockedScreenOverlayProps {
  /** The feature ID required to access this screen */
  feature: FeatureId;
  /** The screen content to show greyed out behind the overlay */
  children: React.ReactNode;
}

/**
 * LockedScreenOverlay - Wraps a screen and shows an overlay if the feature is locked
 */
export const LockedScreenOverlay: React.FC<LockedScreenOverlayProps> = ({
  feature,
  children,
}) => {
  const navigation = useNavigation();
  const { isUnlocked, access, selectedPillarInfo, loading } = useFeatureUnlock();

  // If loading or feature is unlocked, show the children
  if (loading || isUnlocked(feature)) {
    return <>{children}</>;
  }

  const metadata = FEATURE_METADATA[feature];
  const pillarTitle = selectedPillarInfo?.title || 'your focus';

  const handleGoToSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Settings is nested inside ProfileStack navigator
    navigation.navigate('ProfileStack' as never, { screen: 'Settings' } as never);
  };

  return (
    <View style={styles.container}>
      {/* Greyed out content */}
      <View style={styles.greyedContent} pointerEvents="none">
        {children}
      </View>

      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Lock icon */}
          <View style={styles.iconContainer}>
            <Icon name={metadata.icon as any} size={48} color={Colors.evergreenTeal} />
            <View style={styles.lockBadge}>
              <Icon name="lock" size={16} color={Colors.white} />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{metadata.name}</Text>

          {/* Focus message */}
          <Text style={styles.message}>
            This feature will be available soon. For now, focus on building your{' '}
            <Text style={styles.pillarHighlight}>{pillarTitle}</Text> foundation.
          </Text>

          {/* Progress indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(access.currentDay / 14) * 100}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              Day {access.currentDay} of 14
            </Text>
          </View>

          {/* Unlock info */}
          {access.daysUntilNextUnlock > 0 && (
            <View style={styles.unlockInfo}>
              <Icon name="clock-outline" size={14} color={Colors.evergreenTeal} />
              <Text style={styles.unlockInfoText}>
                More features unlock in {access.daysUntilNextUnlock} day
                {access.daysUntilNextUnlock !== 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {/* Ready for more? */}
          <View style={styles.readySection}>
            <Text style={styles.readyText}>
              Ready to explore everything?
            </Text>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={handleGoToSettings}
              activeOpacity={0.8}
            >
              <Icon name="cog" size={18} color={Colors.white} />
              <Text style={styles.settingsButtonText}>
                Unlock All in Settings
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  greyedContent: {
    flex: 1,
    opacity: 0.15,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    maxWidth: 340,
    width: '100%',
    shadowColor: Colors.evergreenTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: Spacing.base,
  },
  lockBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.silverSage,
    borderRadius: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.fontSize.sm * 1.5,
    marginBottom: Spacing.lg,
  },
  pillarHighlight: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 3,
  },
  progressText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  unlockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dewSage,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  unlockInfoText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  readySection: {
    alignItems: 'center',
    width: '100%',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  readyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.evergreenTeal,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.md,
    gap: Spacing.xs,
  },
  settingsButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
});

export default LockedScreenOverlay;
