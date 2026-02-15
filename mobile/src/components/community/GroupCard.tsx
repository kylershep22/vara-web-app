/**
 * Enhanced Group Card Component
 * Displays group info with member avatars, activity indicator, and category
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ImageStyle } from 'react-native';
import { Text, Avatar, Chip } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Card from '../Card';
import { Colors, Spacing, Typography, Layout, getGroupCategory } from '../../constants';
import { getUserById, UserProfile } from '../../services/firebase/community.service';
import { GroupCategory } from '../../types/models';
import { Timestamp } from 'firebase/firestore';

// Flexible group type that works with both models.ts and service types
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
}

interface GroupCardProps {
  group: GroupData;
  isMember: boolean;
  onPress: () => void;
  onJoin: () => void;
  onLeave: () => void;
}

// Member Avatar Stack - shows up to 4 member avatars
const MemberAvatarStack: React.FC<{ memberIds: string[]; size?: number }> = ({
  memberIds,
  size = 28,
}) => {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const displayCount = Math.min(memberIds.length, 4);
  const extraCount = memberIds.length - displayCount;

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

  if (members.length === 0) {
    return null;
  }

  return (
    <View style={styles.avatarStack}>
      {members.map((member, index) => (
        <View
          key={member.id}
          style={[
            styles.stackedAvatar,
            { marginLeft: index > 0 ? -size / 3 : 0, zIndex: displayCount - index },
          ]}
        >
          {member.avatar ? (
            <Avatar.Image
              size={size}
              source={{ uri: member.avatar }}
              style={styles.avatarImage as ImageStyle}
            />
          ) : (
            <Avatar.Text
              size={size}
              label={(member.displayName || 'U').substring(0, 1).toUpperCase()}
              style={styles.avatarText}
              color={Colors.textOnPrimary}
              labelStyle={styles.avatarLabel}
            />
          )}
        </View>
      ))}
      {extraCount > 0 && (
        <View style={[styles.stackedAvatar, { marginLeft: -size / 3 }]}>
          <View style={[styles.extraCount, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text style={styles.extraCountText}>+{extraCount}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

// Activity Indicator - shows recent activity
const ActivityIndicator: React.FC<{
  lastActivityAt?: Timestamp;
  postCount?: number;
}> = ({ lastActivityAt, postCount }) => {
  const getActivityText = () => {
    if (!lastActivityAt) {
      return postCount ? `${postCount} posts` : 'New group';
    }

    const now = new Date();
    const lastActivity = lastActivityAt.toDate ? lastActivityAt.toDate() : new Date(lastActivityAt as any);
    const diffHours = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

    if (diffHours < 1) {
      return 'Active now';
    } else if (diffHours < 24) {
      return `Active ${Math.floor(diffHours)}h ago`;
    } else if (diffHours < 168) { // 7 days
      const days = Math.floor(diffHours / 24);
      return `Active ${days}d ago`;
    } else {
      return postCount ? `${postCount} posts` : 'No recent activity';
    }
  };

  const isActive = lastActivityAt &&
    ((new Date().getTime() - (lastActivityAt.toDate ? lastActivityAt.toDate() : new Date(lastActivityAt as any)).getTime()) < 3600000);

  return (
    <View style={styles.activityIndicator}>
      <View style={[styles.activityDot, isActive && styles.activityDotActive]} />
      <Text variant="bodySmall" style={styles.activityText}>
        {getActivityText()}
      </Text>
    </View>
  );
};

// Category Badge
const CategoryBadge: React.FC<{ category?: GroupCategory | string }> = ({ category }) => {
  const config = getGroupCategory(category);

  return (
    <View style={[styles.categoryBadge, { backgroundColor: config.color + '20' }]}>
      <Icon name={config.icon as any} size={12} color={config.color} />
      <Text style={[styles.categoryText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
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

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      <Card style={styles.card}>
        {/* Top Row: Icon + Title + Member Badge */}
        <View style={styles.topRow}>
          <View style={styles.groupIcon}>
            <Icon
              name={getGroupCategory(group.category).icon as any}
              size={24}
              color={getGroupCategory(group.category).color}
            />
          </View>

          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Text variant="titleMedium" style={styles.groupName} numberOfLines={1}>
                {group.name}
              </Text>
              {isMember && (
                <Icon name="check-circle" size={16} color={Colors.evergreenTeal} style={styles.memberCheck} />
              )}
            </View>

            {/* Category + Visibility */}
            <View style={styles.metaRow}>
              {group.category && <CategoryBadge category={group.category} />}
              <View style={styles.visibilityBadge}>
                <Icon
                  name={isPublic ? 'earth' : 'lock'}
                  size={10}
                  color={Colors.textSecondary}
                />
                <Text variant="bodySmall" style={styles.visibilityText}>
                  {isPublic ? 'Public' : 'Private'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Description */}
        {group.description && (
          <Text variant="bodyMedium" style={styles.description} numberOfLines={2}>
            {group.description}
          </Text>
        )}

        {/* Bottom Row: Member Avatars + Activity + Actions */}
        <View style={styles.bottomRow}>
          <View style={styles.socialInfo}>
            {/* Member Avatar Stack */}
            {group.members && group.members.length > 0 && (
              <MemberAvatarStack memberIds={group.members} />
            )}

            {/* Member Count */}
            <Text variant="bodySmall" style={styles.memberCount}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </Text>

            {/* Activity Indicator */}
            <ActivityIndicator
              lastActivityAt={group.lastActivityAt}
              postCount={group.postCount}
            />
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              isMember ? styles.leaveButton : styles.joinButton,
            ]}
            onPress={(e) => {
              e.stopPropagation();
              isMember ? onLeave() : onJoin();
            }}
          >
            <Text style={[
              styles.actionButtonText,
              isMember ? styles.leaveButtonText : styles.joinButtonText,
            ]}>
              {isMember ? 'Leave' : 'Join'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tap Hint */}
        <View style={styles.tapHint}>
          <Text variant="bodySmall" style={styles.tapHintText}>
            Tap to view
          </Text>
          <Icon name="chevron-right" size={14} color={Colors.textSecondary} />
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.base,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  groupIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  titleSection: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupName: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    flex: 1,
  },
  memberCheck: {
    marginLeft: Spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: Spacing.sm,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.medium,
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  visibilityText: {
    color: Colors.textSecondary,
    fontSize: 10,
  },
  description: {
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
    lineHeight: 18,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: Colors.borderLight,
  },
  socialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedAvatar: {
    borderWidth: 2,
    borderColor: Colors.surface,
    borderRadius: 14,
  },
  avatarImage: {
    backgroundColor: Colors.dewSage,
  },
  avatarText: {
    backgroundColor: Colors.evergreenTeal,
  },
  avatarLabel: {
    fontSize: 10,
  },
  extraCount: {
    backgroundColor: Colors.silverSage,
    justifyContent: 'center',
    alignItems: 'center',
  },
  extraCountText: {
    color: Colors.evergreenTeal,
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
  },
  memberCount: {
    color: Colors.textSecondary,
  },
  activityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textSecondary,
  },
  activityDotActive: {
    backgroundColor: Colors.success,
  },
  activityText: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  actionButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.md,
    minWidth: 64,
    alignItems: 'center',
  },
  joinButton: {
    backgroundColor: Colors.evergreenTeal,
  },
  leaveButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  joinButtonText: {
    color: Colors.textOnPrimary,
  },
  leaveButtonText: {
    color: Colors.textSecondary,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: Spacing.sm,
  },
  tapHintText: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
});

export default GroupCard;
