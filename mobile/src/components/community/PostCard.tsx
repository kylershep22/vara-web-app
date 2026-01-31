/**
 * Post Card Component
 * Displays a community post with author, content, likes, and comments
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Card from '../Card';
import { MediaItem } from '../media';
// Temporarily disabled ImageViewer due to worklets version mismatch
// import { ImageViewer } from '../media';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface PostCardProps {
  post: any;
  onLike: (postId: string) => void;
  onComment: (postId: string) => void;
  formatTimestamp: (post: any) => string;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onComment,
  formatTimestamp,
}) => {
  // Temporarily disabled ImageViewer state due to worklets version mismatch
  // const [viewerVisible, setViewerVisible] = useState(false);
  // const [viewerIndex, setViewerIndex] = useState(0);

  // Temporarily disabled - will re-enable after development build
  // const handleMediaPress = (mediaItem: { url: string; type: 'image' | 'video' }, index: number) => {
  //   if (mediaItem.type === 'image') {
  //     setViewerIndex(index);
  //     setViewerVisible(true);
  //   }
  //   // Videos play inline, no action needed
  // };

  return (
    <Card style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <Avatar.Text
          size={40}
          label={(post.author?.displayName || 'U').substring(0, 2).toUpperCase()}
          style={styles.avatar}
          color={Colors.textOnPrimary}
        />
        <View style={styles.postHeaderInfo}>
          <Text variant="titleMedium" style={styles.authorName}>
            {post.author?.displayName || 'Unknown User'}
          </Text>
          <Text variant="bodySmall" style={styles.timestamp}>
            {formatTimestamp(post)}
          </Text>
        </View>
      </View>

      {/* Post Content */}
      <Text variant="bodyLarge" style={styles.postContent}>
        {post.content}
      </Text>

      {/* Media Gallery - New media field with types */}
      {post.media && post.media.length > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.mediaGallery}
        >
          {post.media.map((mediaItem: any, index: number) => (
            <MediaItem
              key={index}
              media={mediaItem}
              style={styles.postImage}
              // onPress temporarily disabled - image viewer requires development build
            />
          ))}
        </ScrollView>
      )}

      {/* Backwards compatibility for old posts with images field */}
      {!post.media && post.images && post.images.length > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.mediaGallery}
        >
          {post.images.map((imageUrl: string, index: number) => (
            <MediaItem
              key={index}
              media={{ url: imageUrl, type: 'image' }}
              style={styles.postImage}
              // onPress temporarily disabled - image viewer requires development build
            />
          ))}
        </ScrollView>
      )}

      {/* Post Stats */}
      <View style={styles.postStats}>
        <Text variant="bodySmall" style={styles.statsText}>
          {post.likesCount} {post.likesCount === 1 ? 'like' : 'likes'}
        </Text>
        <Text variant="bodySmall" style={styles.statsText}>
          {post.commentsCount} {post.commentsCount === 1 ? 'comment' : 'comments'}
        </Text>
      </View>

      {/* Post Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onLike(post.id)}
        >
          <Icon
            name={post.isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={post.isLiked ? Colors.evergreenTeal : Colors.textSecondary}
          />
          <Text
            variant="bodyMedium"
            style={[
              styles.actionText,
              post.isLiked && { color: Colors.evergreenTeal },
            ]}
          >
            Like
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onComment(post.id)}
        >
          <Icon name="comment-outline" size={20} color={Colors.textSecondary} />
          <Text variant="bodyMedium" style={styles.actionText}>
            Comment
          </Text>
        </TouchableOpacity>
      </View>

      {/* Comments Preview */}
      {post.comments && post.comments.length > 0 && (
        <View style={styles.commentsPreview}>
          {post.comments.slice(0, 2).map((comment: any, index: number) => (
            <View key={index} style={styles.commentItem}>
              <Text variant="bodySmall" style={styles.commentAuthor}>
                User •
              </Text>
              <Text variant="bodySmall" style={styles.commentText}>
                {comment.text}
              </Text>
            </View>
          ))}
          {post.comments.length > 2 && (
            <TouchableOpacity onPress={() => onComment(post.id)}>
              <Text variant="bodySmall" style={styles.viewMoreComments}>
                View {post.comments.length - 2} more comments
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Image Viewer - Temporarily disabled due to worklets version mismatch */}
      {/* Will be re-enabled after development build is installed */}
      {/* <ImageViewer
        visible={viewerVisible}
        images={post.media || (post.images?.map((url: string) => ({ url, type: 'image' as const })) || [])}
        initialIndex={viewerIndex}
        onClose={() => setViewerVisible(false)}
      /> */}
    </Card>
  );
};

const styles = StyleSheet.create({
  postCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    backgroundColor: Colors.evergreenTeal,
  },
  postHeaderInfo: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  authorName: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  timestamp: {
    color: Colors.textSecondary,
  },
  postContent: {
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
  postStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: Layout.borderWidth.thin,
    borderBottomWidth: Layout.borderWidth.thin,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.sm,
  },
  statsText: {
    color: Colors.textSecondary,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  actionText: {
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  commentsPreview: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: Colors.borderLight,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  commentAuthor: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    marginRight: Spacing.xs,
  },
  commentText: {
    color: Colors.textSecondary,
    flex: 1,
  },
  viewMoreComments: {
    color: Colors.evergreenTeal,
    marginTop: Spacing.xs,
  },
  // Media gallery
  mediaGallery: {
    marginVertical: Spacing.md,
    width: '100%',
  },
  postImage: {
    width: Dimensions.get('window').width - (Spacing.lg * 4), // Account for card margins
    height: 300,
    borderRadius: Layout.borderRadius.md,
    marginRight: Spacing.sm,
  },
});
