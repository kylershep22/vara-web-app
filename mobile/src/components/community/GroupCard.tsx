/**
 * Enhanced Group Card Component
 * Restyled to match Vara Community UI mockup
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout, getGroupCategory } from '../../constants';
import { getUserById, UserProfile } from '../../services/firebase/community.service';
import { GroupCategory } from '../../types/models';
import { Timestamp } from 'firebase/firestore';
import { Badge } from '../shared/Badge';
import { CommunityAvatar } from '../shared/CommunityAvatar';

interface GroupData {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  visibility?: 'public' | 'private';
  isPublic?: boolean;
  members: string[];
  memberCount?: number;
  category?: GroupCategory | string;
  coverImage?: string;
  lastActivityAt?: Timestamp;
  postCount?: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  activeChallengeCount?: number;
}

interface GroupCardProps {
  group: GroupData;
  isMember: boolean;
  onPress: () => void;
  onJoin: () => void;
  onLeave: () => void;
}

// Member Avatar Stack - shows up to 4 overlapping avatars
const MemberAvatarStack: React.FC<{ memberIds: string[]; size?: number }> = ({
  memberIds,
  size = 24,
}) => {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const displayCount = Math.min(memberIds.length, 4);

  useEffect(() => {
    const loadMembers = async () => {
      const idsToLoad = memberIds.slice(0, 4);
      const profiles = await Promise.all(
        idsToLoad.map(id => getUserById(id))
      );
      setMembers(profiles.filter((p): p is UserProfile => p !== null));
    };

    if (memberIds.length > 0) {
      loadMembers();
    }
  }, [memberIds]);

  if (members.length === 0) return null;

  return (
    <View style={avatarStyles.stack}>
      {members.map((member, index) => (
        <View
          key={member.id}
          style={[
            avatarStyles.wrapper,
            index > 0 && { marginLeft: -8 },
            { zIndex: displayCount - index },
          ]}
        >
          <CommunityAvatar
            name={member.displayName || 'U'}
            photoURL={member.avatar}
            size={size}
            style={avatarStyles.avatar}
          />
        </View>
      ))}
    </View>
  );
};

const avatarStyles = StyleSheet.create({
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wrapper: {
    borderWidth: 2,
    borderColor: Colors.white,
    borderRadius: Layout.borderRadius.full,
  },
  avatar: {},
});

// Activity text
const getActivityText = (lastActivityAt?: Timestamp, postCount?: number) => {
  if (!lastActivityAt) {
    return postCount ? `${postCount} posts` : 'New group';
  }

  const now = new Date();
  const lastActivity = lastActivityAt.toDate ? lastActivityAt.toDate() : new Date(lastActivityAt as any);
  const diffHours = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

  if (diffHours < 1) return 'Active now';
  if (diffHours < 24) return `Active ${Math.floor(diffHours)}h ago`;
  if (diffHours < 168) return `Active ${Math.floor(diffHours / 24)}d ago`;
  return postCount ? `${postCount} posts` : 'No recent activity';
};

export const GroupCard: React.FC<GroupCardProps> = ({
  group,
  isMember,
  onPress,
  onJoin,
  onLeave,
}) => {
  const memberCount = group.memberCount || group.members?.length || 0;
  const isPublic = group.isPublic !== undefined ? group.isPublic : group.visibility === 'public';
  const categoryConfig = getGroupCategory(group.category);

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <View style={styles.card}>
        {/* Header Row: Icon + Content */}
        <View style={styles.headerRow}>
          <View style={styles.iconContainer}>
            <Icon
              name={categoryConfig.icon as any}
              size={24}
              color={Colors.evergreenTeal}
            />
          </View>

          <View style={styles.contentSection}>
            {/* Name + Member Check */}
            <View style={styles.nameRow}>
              <Text style={styles.groupName} numberOfLines={1}>
                {group.name}
              </Text>
              {isMember && (
                <Text style={styles.memberCheck}>{'\u2713'}</Text>
              )}
            </View>

            {/* Description */}
            {group.description && (
              <Text style={styles.description} numberOfLines={2}>
                {group.description}
              </Text>
            )}
          </View>
        </View>

        {/* Badge Row */}
        <View style={styles.badgeRow}>
          {group.category && (
            <Badge label={categoryConfig.label} variant="category" />
          )}
          <Badge label={`${memberCount} ${memberCount === 1 ? 'member' : 'members'}`} variant="default" />
          {(group.activeChallengeCount ?? 0) > 0 && (
            <Badge
              label={`${group.activeChallengeCount} ${group.activeChallengeCount === 1 ? 'challenge' : 'challenges'}`}
              variant="active"
            />
          )}
        </View>

        {/* Footer Row */}
        <View style={styles.footerRow}>
          <View style={styles.footerLeft}>
            {group.members && group.members.length > 0 && (
              <MemberAvatarStack memberIds={group.members} size={24} />
            )}
            <Text style={styles.activityText}>
              {getActivityText(group.lastActivityAt, group.postCount)}
            </Text>
          </View>

          {isMember ? (
            <TouchableOpacity style={styles.viewButton} onPress={onPress}>
              <Text style={styles.viewButtonText}>View →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.joinButton}
              onPress={(e) => {
                e.stopPropagation();
                onJoin();
              }}
            >
              <Text style={styles.joinButtonText}>Join</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.md,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },

  // Header
  headerRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.dewSageLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentSection: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  groupName: {
    fontSize: Spacing.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    flex: 1,
  },
  memberCheck: {
    fontSize: 14,
    color: Colors.evergreenTeal,
  },
  description: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.mutedSageGray,
    lineHeight: 20,
    marginTop: 6,
  },

  // Badges
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 10,
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  activityText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
  },

  // Buttons
  viewButton: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.dewSageLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  joinButton: {
    height: 32,
    paddingHorizontal: 14,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonText: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.white,
  },
});

export default GroupCard;
