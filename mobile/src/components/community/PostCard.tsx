/**
 * Post Card Component
 * Restyled to match Vara Community UI mockup
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Image, Alert, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { CommunityAvatar } from '../shared/CommunityAvatar';
import { HeartIcon } from './HeartIcon';

interface Comment {
  userId: string;
  content: string;
  createdAt: any;
  authorName?: string;
}

interface PostCardProps {
  post: any;
  onLike: (postId: string) => Promise<boolean>;
  onComment: (post: any) => void;
  formatTimestamp: (post: any) => string;
  disabled?: boolean;
  disabledMessage?: string;
  onGroupPress?: () => void;
  /** Hide group context badge (when viewing inside a group) */
  hideGroupBadge?: boolean;
  /** Called when the overflow ⋯ icon is tapped */
  onMorePress?: (post: any) => void;
}

const PostCardComponent: React.FC<PostCardProps> = ({
  post,
  onLike,
  onComment,
  formatTimestamp,
  disabled = false,
  disabledMessage = 'Join the group to interact with posts',
  onGroupPress,
  hideGroupBadge = false,
  onMorePress,
}) => {
  const authorName = post.author?.displayName || 'Unknown';
  const content = String(post.content || '');
  const timestamp = formatTimestamp(post);
  const likesCount = post.likesCount || 0;
  const commentsCount = post.commentsCount || 0;
  const avatarUrl = post.author?.avatarUrl || post.author?.avatar;

  const [supportError, setSupportError] = useState<string | null>(null);
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingRef = useRef(false);
  const heartScale = useSharedValue(1);

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  // Clean up error timeout on unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  const handleSupportPress = async () => {
    if (disabled) {
      Alert.alert('Join Required', disabledMessage);
      return;
    }

    // Guard against rapid double-taps
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    // Clear any existing error
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      setSupportError(null);
    }

    const wasLiked = post.isLiked;

    // Animate heart scale on support (not on unsupport)
    if (!wasLiked) {
      heartScale.value = withSequence(
        withTiming(1.15, { duration: 200, easing: Easing.ease }),
        withTiming(1, { duration: 200, easing: Easing.ease }),
      );
    }

    // Announce state change to screen reader
    const announcement = wasLiked ? 'Support removed' : 'Supported';
    AccessibilityInfo.announceForAccessibility(announcement);

    const success = await onLike(post.id);
    if (!success) {
      setSupportError("Couldn't save that \u2014 try again when you're ready.");
      errorTimeoutRef.current = setTimeout(() => {
        setSupportError(null);
      }, 3000);
    }

    isProcessingRef.current = false;
  };

  const isChallengePost = !!(post.challengeId && post.challengeName);

  // Post type badge config
  const getPostTypeBadge = () => {
    if (!post.postType || post.postType === 'update') return null;
    switch (post.postType) {
      case 'win':
        return { label: '\uD83C\uDF89 Win', bg: 'rgba(245,185,113,0.15)', color: '#8B6530' };
      case 'reflection':
        return { label: '\uD83D\uDCAD Reflection', bg: Colors.dewSageLight, color: Colors.evergreenTeal };
      case 'ask':
        return { label: '\uD83E\uDD1D Ask', bg: Colors.tealLight, color: Colors.evergreenTeal, border: Colors.tealMedium };
      default:
        return null;
    }
  };

  const badge = getPostTypeBadge();

  return (
    <View style={[styles.card, isChallengePost && styles.challengeCard]}>
      {/* Challenge Banner */}
      {isChallengePost && (
        <View style={styles.challengeBanner}>
          <Text style={styles.challengeIcon}>{'\u25C8'}</Text>
          <Text style={styles.challengeName} numberOfLines={1}>{post.challengeName}</Text>
          {post.challengeDay && post.challengeTotal && (
            <Text style={styles.challengeDay}>
              Day {post.challengeDay} of {post.challengeTotal}
            </Text>
          )}
        </View>
      )}

      {/* Group Context Badge */}
      {post.groupName && !isChallengePost && !hideGroupBadge && (
        <TouchableOpacity
          style={styles.groupBadgeContainer}
          onPress={onGroupPress}
          disabled={!onGroupPress}
          activeOpacity={onGroupPress ? 0.7 : 1}
        >
          <View style={styles.groupBadge}>
            <Text style={styles.groupBadgeText}>{post.groupName}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Author Row */}
      <View style={styles.authorRow}>
        <CommunityAvatar
          name={authorName}
          photoURL={avatarUrl}
          size={36}
        />
        <View style={styles.authorInfo}>
          <Text style={styles.authorName}>{authorName}</Text>
          <Text style={styles.timestamp}>
            {isChallengePost ? `checked in \u00B7 ${timestamp}` : timestamp}
          </Text>
        </View>
        {badge && (
          <View style={[
            styles.postTypeBadge,
            { backgroundColor: badge.bg },
            badge.border ? { borderWidth: 1, borderColor: badge.border } : undefined,
          ]}>
            <Text style={[styles.postTypeBadgeText, { color: badge.color }]}>
              {badge.label}
            </Text>
          </View>
        )}
        {onMorePress && (
          <TouchableOpacity
            onPress={() => onMorePress(post)}
            style={styles.overflowButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel={`More options for post by ${authorName}`}
            accessibilityRole="button"
          >
            <Icon name="dots-horizontal" size={20} color={Colors.mutedSageGray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Post Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.postContent}>{content}</Text>
      </View>

      {/* Support Avatars + Comment Count */}
      {(likesCount > 0 || commentsCount > 0) && (
        <View style={styles.statsRow}>
          {likesCount > 0 && (
            <View style={styles.supportSection}>
              {/* Mini avatar stack for supporters */}
              <View style={styles.miniAvatarStack}>
                {[0, 1, 2].slice(0, Math.min(likesCount, 3)).map((i) => (
                  <View key={i} style={[styles.miniAvatar, i > 0 && { marginLeft: -4 }]}>
                    <View style={styles.miniAvatarInner} />
                  </View>
                ))}
              </View>
              <Text style={styles.supportText}>
                {likesCount > 3 ? `and ${likesCount - 3} others supported` : `${likesCount} ${likesCount === 1 ? 'support' : 'supports'}`}
              </Text>
            </View>
          )}
          {commentsCount > 0 && (
            <Text style={styles.commentCount}>
              {commentsCount} {commentsCount === 1 ? 'comment' : 'comments'}
            </Text>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            post.isLiked ? styles.supportButtonActive : styles.supportButtonDefault,
            disabled && styles.actionButtonDisabled,
          ]}
          onPress={handleSupportPress}
          accessibilityLabel={post.isLiked ? 'Remove support from this post' : 'Support this post'}
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          <Animated.View style={heartAnimatedStyle}>
            <HeartIcon filled={post.isLiked} />
          </Animated.View>
          <Text style={[
            styles.supportButtonText,
            post.isLiked && styles.supportButtonTextActive,
          ]}>
            {post.isLiked ? 'Supported' : 'Support'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
          onPress={() => {
            if (disabled) {
              Alert.alert('Join Required', disabledMessage);
              return;
            }
            onComment(post);
          }}
        >
          <Text style={styles.actionText}>
            {'\uD83D\uDCAC'} Comment
          </Text>
        </TouchableOpacity>
      </View>

      {/* Inline error for failed support toggle */}
      {supportError && (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>{supportError}</Text>
        </View>
      )}
    </View>
  );
};

export const PostCard = React.memo(PostCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
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
  challengeCard: {
    borderWidth: 1,
    borderColor: Colors.dewSage,
  },

  // Challenge Banner
  challengeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.dewSageLight,
    paddingVertical: 12,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    borderTopLeftRadius: Layout.borderRadius.lg,
    borderTopRightRadius: Layout.borderRadius.lg,
  },
  challengeIcon: {
    fontSize: 14,
    color: Colors.evergreenTeal,
  },
  challengeName: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    flex: 1,
  },
  challengeDay: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    marginLeft: 'auto',
  },

  // Group Context Badge
  groupBadgeContainer: {
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.base,
  },
  groupBadge: {
    backgroundColor: Colors.dewSageLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.sm,
    alignSelf: 'flex-start',
  },
  groupBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },

  // Author Row
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    paddingHorizontal: Spacing.base,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  timestamp: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.mutedSageGray,
  },

  // Overflow Button
  overflowButton: {
    padding: Spacing.xs,
    marginLeft: 4,
  },

  // Post Type Badge
  postTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.sm,
    marginLeft: 'auto',
  },
  postTypeBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },

  // Content
  contentContainer: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.base,
  },
  postContent: {
    fontSize: 16,
    lineHeight: 22.5,
    color: Colors.softCharcoal,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    marginTop: Spacing.md,
  },
  supportSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  miniAvatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 20,
    height: 20,
    borderRadius: 12,
    backgroundColor: Colors.silverSage,
    borderWidth: 1.5,
    borderColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.silverSage,
  },
  supportText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
  },
  commentCount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    marginLeft: 'auto',
  },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.dewSageLight,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionText: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  supportButtonDefault: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
  },
  supportButtonActive: {
    backgroundColor: Colors.dewSage,
    borderWidth: 1.5,
    borderColor: Colors.evergreenTeal,
  },
  supportButtonText: {
    fontSize: 12.5,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
    marginLeft: Spacing.sm,
  },
  supportButtonTextActive: {
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  errorRow: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.softCoral,
  },
});
