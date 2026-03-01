/**
 * Challenge Card Component
 * 3-zone layout: header+badges+goal, progress bar, footer with creator+action
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout, getGroupCategory } from '../../constants';
import { Badge } from '../shared/Badge';
import { CommunityAvatar } from '../shared/CommunityAvatar';
import { Challenge, ChallengeParticipant } from '../../types/models';
import { formatChallengePosition } from '../../services/firebase/challenges.service';

interface ChallengeCardProps {
  challenge: Challenge;
  participation?: ChallengeParticipant | null;
  isMember: boolean;
  creatorName?: string;
  creatorAvatar?: string | null;
  groupName?: string;
  joining?: boolean;
  onPress: () => void;
  onJoin: () => void;
  onCheckIn?: () => void;
}

function getTimeProgress(startDate: any, endDate: any): number {
  const start = startDate?.toDate ? startDate.toDate() : new Date(startDate);
  const end = endDate?.toDate ? endDate.toDate() : new Date(endDate);
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 1;
  const elapsed = Date.now() - start.getTime();
  return Math.min(1, Math.max(0, elapsed / total));
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge,
  isMember,
  creatorName,
  creatorAvatar,
  groupName,
  joining,
  onPress,
  onJoin,
}) => {
  const categoryConfig = getGroupCategory(challenge.category);
  const memberCount = challenge.memberCount || challenge.members?.length || 0;
  const positionText = formatChallengePosition(challenge.startDate, challenge.endDate);
  const progress = getTimeProgress(challenge.startDate, challenge.endDate);
  const statusLabel = challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1);
  const categoryLabel = categoryConfig.label || challenge.category || 'General';

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.card}>
      {/* Zone 1: Header Content */}
      <View style={styles.zone1}>
        {/* Icon + Name + Badges */}
        <View style={styles.headerRow}>
          <View style={styles.iconContainer}>
            <Icon name={categoryConfig.icon as any} size={20} color={Colors.evergreenTeal} />
          </View>

          <View style={styles.headerContent}>
            {/* Name row */}
            <View style={styles.nameRow}>
              <Text style={styles.challengeName} numberOfLines={1}>
                {challenge.name}
              </Text>
              {isMember && (
                <Text style={styles.joinedCheck}>✓</Text>
              )}
            </View>

            {/* Badge row */}
            <View style={styles.badgeRow}>
              <Badge label={categoryLabel} variant="default" />
              <Badge label={statusLabel} variant={challenge.status === 'active' ? 'active' : 'default'} />
              {groupName && (
                <Badge label={`via ${groupName}`} variant="default" />
              )}
            </View>
          </View>
        </View>

        {/* Goal text block */}
        <View style={styles.goalBlock}>
          <Text style={styles.goalText}>◎ {challenge.challengeGoal}</Text>
        </View>

        {/* Metadata row */}
        <View style={styles.metadataRow}>
          <Text style={styles.metadataText}>☺ {memberCount} {memberCount === 1 ? 'participant' : 'participants'}</Text>
          <Text style={styles.metadataText}>📅 {positionText}</Text>
        </View>
      </View>

      {/* Zone 2: Progress Bar */}
      <View style={styles.zone2}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>

      {/* Zone 3: Footer */}
      <View style={styles.zone3}>
        {/* Left: Creator */}
        <View style={styles.creatorRow}>
          <CommunityAvatar
            name={creatorName || 'Member'}
            photoURL={creatorAvatar}
            size={20}
          />
          <Text style={styles.creatorText}>by {creatorName || 'Community Member'}</Text>
        </View>

        {/* Right: Action */}
        {isMember ? (
          <TouchableOpacity onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.viewLink}>View →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.joinButton}
            onPress={(e) => {
              e.stopPropagation();
              onJoin();
            }}
            disabled={joining}
            activeOpacity={0.7}
          >
            {joining ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Text style={styles.joinButtonText}>Join Challenge</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.sm + 2, // 10px gap between cards
    ...Layout.shadow.sm,
  },

  // Zone 1: Header
  zone1: {
    paddingTop: Spacing.base,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm + 2, // 10px
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.dewSageLight,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  challengeName: {
    fontSize: 16,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    flex: 1,
  },
  joinedCheck: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: Spacing.xs,
    flexWrap: 'wrap',
  },
  goalBlock: {
    backgroundColor: Colors.dewSageLight,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Spacing.sm + 2, // 10px
  },
  goalText: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  metadataRow: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  metadataText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
  },

  // Zone 2: Progress
  zone2: {
    paddingHorizontal: Spacing.base,
  },
  progressTrack: {
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(184,205,186,0.3)',
  },
  progressFill: {
    height: 4,
    borderRadius: 4,
    backgroundColor: Colors.evergreenTeal,
  },

  // Zone 3: Footer
  zone3: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  creatorText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
  },
  viewLink: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  joinButton: {
    backgroundColor: Colors.evergreenTeal,
    paddingHorizontal: Spacing.base,
    height: 34,
    borderRadius: Layout.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default ChallengeCard;
