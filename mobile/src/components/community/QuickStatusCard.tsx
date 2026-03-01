/**
 * Quick Status Card
 * Compact card for the "Your active challenges" horizontal scroll section.
 * Shows challenge name, time position, progress bar, and check-in state.
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Layout, Typography, getGroupCategory } from '../../constants';
import { Challenge, ChallengeParticipant } from '../../types/models';
import { formatChallengePosition } from '../../services/firebase/challenges.service';

interface QuickStatusCardProps {
  challenge: Challenge;
  participation?: ChallengeParticipant | null;
  hasCheckedIn: boolean;
  checkingIn?: boolean;
  onCheckIn: () => void;
  onPress: () => void;
}

function getTimeProgress(startDate: any, endDate: any): number {
  const start = startDate?.toDate ? startDate.toDate() : new Date(startDate);
  const end = endDate?.toDate ? endDate.toDate() : new Date(endDate);
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 1;
  const elapsed = Date.now() - start.getTime();
  return Math.min(1, Math.max(0, elapsed / total));
}

export const QuickStatusCard: React.FC<QuickStatusCardProps> = ({
  challenge,
  hasCheckedIn,
  checkingIn,
  onCheckIn,
  onPress,
}) => {
  const categoryConfig = getGroupCategory(challenge.category);
  const positionText = formatChallengePosition(challenge.startDate, challenge.endDate);
  const progress = getTimeProgress(challenge.startDate, challenge.endDate);

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.iconContainer}>
          <Icon
            name={categoryConfig.icon as any}
            size={16}
            color={Colors.evergreenTeal}
          />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.challengeName} numberOfLines={1}>
            {challenge.name}
          </Text>
          <Text style={styles.timePosition}>{positionText}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      {/* Check-in action */}
      {hasCheckedIn ? (
        <Text style={styles.checkedInText}>✓ Checked in today</Text>
      ) : (
        <TouchableOpacity
          style={styles.checkInButton}
          onPress={(e) => {
            e.stopPropagation();
            onCheckIn();
          }}
          activeOpacity={0.7}
          disabled={checkingIn}
        >
          {checkingIn ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.checkInButtonText}>Check In</Text>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    minWidth: 180,
    flexShrink: 0,
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.md,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.dewSage,
    ...Layout.shadow.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.dewSageLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  challengeName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  timePosition: {
    fontSize: 11,
    color: Colors.mutedSageGray,
  },
  progressTrack: {
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(184,205,186,0.3)',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: 4,
    borderRadius: 4,
    backgroundColor: Colors.evergreenTeal,
  },
  checkInButton: {
    width: '100%',
    height: 32,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkInButtonText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.white,
  },
  checkedInText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
    textAlign: 'center',
  },
});

export default QuickStatusCard;
