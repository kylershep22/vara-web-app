/**
 * Challenge Card Component
 * Displays challenge info with progress, countdown, and participation status
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Card from '../Card';
import { Colors, Spacing, Typography, Layout, getGroupCategory } from '../../constants';
import { Challenge, ChallengeParticipant } from '../../types/models';
import {
  getDaysRemaining,
  getChallengeProgress,
  formatChallengeDuration,
} from '../../services/firebase/challenges.service';

interface ChallengeCardProps {
  challenge: Challenge;
  participation?: ChallengeParticipant | null;
  isMember: boolean;
  onPress: () => void;
  onJoin: () => void;
  onCheckIn?: () => void;
}

// Status Badge
const StatusBadge: React.FC<{ status: Challenge['status'] }> = ({ status }) => {
  const config = {
    upcoming: { label: 'Upcoming', color: Colors.info, icon: 'clock-outline' },
    active: { label: 'Active', color: Colors.success, icon: 'lightning-bolt' },
    completed: { label: 'Completed', color: Colors.textSecondary, icon: 'check-circle' },
  }[status];

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.color + '20' }]}>
      <Icon name={config.icon as any} size={12} color={config.color} />
      <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

// Progress Ring (simplified as progress bar for now)
const ProgressDisplay: React.FC<{
  current: number;
  target: number;
  unit?: string;
}> = ({ current, target, unit = 'times' }) => {
  const progress = getChallengeProgress(current, target);

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>Your Progress</Text>
        <Text style={styles.progressValue}>
          {current}/{target} {unit}
        </Text>
      </View>
      <ProgressBar
        progress={progress / 100}
        color={Colors.evergreenTeal}
        style={styles.progressBar}
      />
      <Text style={styles.progressPercent}>{progress}% complete</Text>
    </View>
  );
};

// Countdown Display
const CountdownDisplay: React.FC<{ endDate: any; status: Challenge['status'] }> = ({
  endDate,
  status,
}) => {
  if (status === 'completed') {
    return (
      <View style={styles.countdown}>
        <Icon name="flag-checkered" size={16} color={Colors.textSecondary} />
        <Text style={styles.countdownText}>Challenge ended</Text>
      </View>
    );
  }

  const daysLeft = getDaysRemaining(endDate);

  if (status === 'upcoming') {
    return (
      <View style={styles.countdown}>
        <Icon name="calendar-clock" size={16} color={Colors.info} />
        <Text style={[styles.countdownText, { color: Colors.info }]}>Starts soon</Text>
      </View>
    );
  }

  const urgencyColor = daysLeft <= 3 ? Colors.error : daysLeft <= 7 ? Colors.warning : Colors.success;

  return (
    <View style={styles.countdown}>
      <Icon name="timer-sand" size={16} color={urgencyColor} />
      <Text style={[styles.countdownText, { color: urgencyColor }]}>
        {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
      </Text>
    </View>
  );
};

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  participation,
  isMember,
  onPress,
  onJoin,
  onCheckIn,
}) => {
  const categoryConfig = getGroupCategory(challenge.category);
  const memberCount = challenge.memberCount || challenge.members?.length || 0;

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <Card style={styles.card}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={[styles.categoryIcon, { backgroundColor: categoryConfig.color + '20' }]}>
            <Icon name={categoryConfig.icon as any} size={24} color={categoryConfig.color} />
          </View>

          <View style={styles.headerInfo}>
            <View style={styles.titleRow}>
              <Text variant="titleMedium" style={styles.title} numberOfLines={1}>
                {challenge.name}
              </Text>
              {isMember && (
                <Icon name="account-check" size={16} color={Colors.evergreenTeal} style={styles.memberIcon} />
              )}
            </View>
            <View style={styles.metaRow}>
              <StatusBadge status={challenge.status} />
              <CountdownDisplay endDate={challenge.endDate} status={challenge.status} />
            </View>
          </View>
        </View>

        {/* Challenge Goal */}
        <View style={styles.goalSection}>
          <Icon name="target" size={16} color={Colors.evergreenTeal} />
          <Text style={styles.goalText}>{challenge.challengeGoal}</Text>
        </View>

        {/* Duration & Frequency */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Icon name="calendar-range" size={14} color={Colors.textSecondary} />
            <Text style={styles.statText}>
              {formatChallengeDuration(challenge.startDate, challenge.endDate)}
            </Text>
          </View>
          <View style={styles.stat}>
            <Icon name="refresh" size={14} color={Colors.textSecondary} />
            <Text style={styles.statText}>
              {challenge.frequency === 'daily'
                ? 'Check in daily'
                : challenge.frequency === 'weekly'
                ? 'Check in weekly'
                : `${challenge.targetCount} ${challenge.unit || 'times'} total`}
            </Text>
          </View>
          <View style={styles.stat}>
            <Icon name="account-group" size={14} color={Colors.textSecondary} />
            <Text style={styles.statText}>
              {memberCount} {memberCount === 1 ? 'participant' : 'participants'}
            </Text>
          </View>
        </View>

        {/* Progress (if member) */}
        {isMember && participation && (
          <ProgressDisplay
            current={participation.checkInCount}
            target={challenge.targetCount}
            unit={challenge.unit}
          />
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          {isMember ? (
            <>
              {challenge.status === 'active' && onCheckIn && (
                <TouchableOpacity
                  style={styles.checkInButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    onCheckIn();
                  }}
                >
                  <Icon name="check-bold" size={16} color={Colors.textOnPrimary} />
                  <Text style={styles.checkInButtonText}>Check In</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.viewButton} onPress={onPress}>
                <Text style={styles.viewButtonText}>View Details</Text>
                <Icon name="chevron-right" size={16} color={Colors.evergreenTeal} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={(e) => {
                e.stopPropagation();
                onJoin();
              }}
            >
              <Icon name="account-plus" size={16} color={Colors.textOnPrimary} />
              <Text style={styles.joinButtonText}>Join Challenge</Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    flex: 1,
  },
  memberIcon: {
    marginLeft: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: Spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.medium,
  },
  countdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countdownText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  goalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dewSage,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  goalText: {
    flex: 1,
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.base,
    marginBottom: Spacing.base,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  progressContainer: {
    marginBottom: Spacing.base,
    paddingTop: Spacing.sm,
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: Colors.borderLight,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  progressValue: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    fontSize: Typography.fontSize.sm,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.silverSage,
  },
  progressPercent: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xs,
    marginTop: 4,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.evergreenTeal,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.md,
    gap: 4,
  },
  checkInButtonText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewButtonText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.evergreenTeal,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
    gap: Spacing.xs,
  },
  joinButtonText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default ChallengeCard;
