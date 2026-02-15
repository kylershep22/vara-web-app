/**
 * Post Card Component
 * Simplified version to prevent React Native bridge errors
 * Enhanced with Support action and comment previews
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Platform, Image } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

// Brand colors
const COLORS = {
  evergreenTeal: '#1B5E57',
  mistWhite: '#FAFAF6',
  silverSage: '#B8CDBA',
  softCharcoal: '#3E3E3E',
  textSecondary: '#6F7F77',
  mintCream: '#E8F5F2',
};

interface Comment {
  userId: string;
  content: string;
  createdAt: any;
  authorName?: string;
}

interface PostCardProps {
  post: any;
  onLike: (postId: string) => void;
  onComment: (post: any) => void;
  formatTimestamp: (post: any) => string;
}

const PostCardComponent: React.FC<PostCardProps> = ({
  post,
  onLike,
  onComment,
  formatTimestamp,
}) => {
  // Extract data safely to avoid nested text issues
  const authorName = post.author?.displayName || 'Unknown';
  const initials = authorName.substring(0, 2).toUpperCase();
  const content = String(post.content || '');
  const timestamp = formatTimestamp(post);
  const likesCount = post.likesCount || 0;
  const commentsCount = post.commentsCount || 0;
  const avatarUrl = post.author?.avatarUrl || post.author?.avatar;

  // Get last active status
  const lastActive = post.author?.lastActiveAt;
  const isActiveNow = lastActive && (() => {
    const date = lastActive.toDate ? lastActive.toDate() : new Date(lastActive);
    const diffMs = Date.now() - date.getTime();
    return diffMs < 5 * 60 * 1000; // Active within 5 minutes
  })();

  // Get preview of last 2 comments
  const comments: Comment[] = post.comments || [];
  const previewComments = comments.slice(-2);

  return (
    <View style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <View style={styles.avatarWrapper}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}
          {isActiveNow && <View style={styles.activeIndicator} />}
        </View>
        <View style={styles.postHeaderInfo}>
          <Text style={styles.authorName}>{authorName}</Text>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>
      </View>

      {/* Post Content */}
      <Text style={styles.postContent}>{content}</Text>

      {/* Stats Row */}
      <View style={styles.postStats}>
        <Text style={styles.statsText}>
          {`${likesCount} ${likesCount === 1 ? 'support' : 'supports'} · ${commentsCount} ${commentsCount === 1 ? 'comment' : 'comments'}`}
        </Text>
      </View>

      {/* Comment Previews */}
      {previewComments.length > 0 && (
        <View style={styles.commentPreviewSection}>
          {previewComments.map((comment, index) => {
            const commentAuthor = comment.authorName || 'Someone';
            const commentInitials = commentAuthor.substring(0, 2).toUpperCase();
            const commentContent = String(comment.content || '').substring(0, 100);

            return (
              <View key={index} style={styles.commentPreview}>
                <View style={styles.commentAvatarSmall}>
                  <Text style={styles.commentAvatarText}>{commentInitials}</Text>
                </View>
                <View style={styles.commentContent}>
                  <Text style={styles.commentAuthorName}>{commentAuthor}</Text>
                  <Text style={styles.commentText} numberOfLines={2}>
                    {commentContent}
                  </Text>
                </View>
              </View>
            );
          })}
          {commentsCount > 2 && (
            <TouchableOpacity onPress={() => onComment(post)}>
              <Text style={styles.viewMoreComments}>
                {`View all ${commentsCount} comments`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Post Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity
          style={[styles.actionButton, post.isLiked && styles.actionButtonActive]}
          onPress={() => onLike(post.id)}
        >
          <Icon
            name={post.isLiked ? 'hand-heart' : 'hand-heart-outline'}
            size={20}
            color={post.isLiked ? COLORS.evergreenTeal : COLORS.textSecondary}
          />
          <Text style={[styles.actionText, post.isLiked && styles.actionTextActive]}>
            Support
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onComment(post)}
        >
          <Icon name="comment-outline" size={20} color={COLORS.textSecondary} />
          <Text style={styles.actionText}>Comment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Memoize to prevent unnecessary re-renders
export const PostCard = React.memo(PostCardComponent);

const styles = StyleSheet.create({
  postCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0,0,0,0.06)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  postHeaderInfo: {
    marginLeft: 12,
    flex: 1,
  },
  authorName: {
    color: COLORS.softCharcoal,
    fontWeight: '600',
    fontSize: 16,
  },
  timestamp: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  postContent: {
    color: COLORS.softCharcoal,
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 14,
  },
  postStats: {
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statsText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  // Comment Preview Styles
  commentPreviewSection: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  commentPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    backgroundColor: COLORS.mintCream,
    padding: 10,
    borderRadius: 10,
  },
  commentAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.silverSage,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    color: COLORS.softCharcoal,
    fontSize: 11,
    fontWeight: '600',
  },
  commentContent: {
    flex: 1,
    marginLeft: 8,
  },
  commentAuthorName: {
    color: COLORS.softCharcoal,
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 2,
  },
  commentText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  viewMoreComments: {
    color: COLORS.evergreenTeal,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 4,
  },
  // Action Buttons
  postActions: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 22,
    gap: 6,
    backgroundColor: COLORS.mistWhite,
  },
  actionButtonActive: {
    backgroundColor: COLORS.mintCream,
  },
  actionText: {
    color: COLORS.textSecondary,
    fontWeight: '500',
    fontSize: 14,
  },
  actionTextActive: {
    color: COLORS.evergreenTeal,
  },
});
