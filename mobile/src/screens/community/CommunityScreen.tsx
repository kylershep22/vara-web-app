/**
 * Community Screen
 * Social feed with posts from connections and groups
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput as RNTextInput,
  Alert,
} from 'react-native';
import { Text, Avatar, IconButton, Portal, Modal, Button as PaperButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Card, LoadingSpinner } from '../../components';
import { Colors, Spacing } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { useFeed } from '../../hooks';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const CommunityScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { posts, loading, createPost, likePost, commentOnPost } = useFeed();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  const handleRefresh = async () => {
    setRefreshing(true);
    // Posts update automatically via real-time subscription
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleCreatePost = async () => {
    if (!postContent.trim()) {
      Alert.alert('Error', 'Please enter some content for your post');
      return;
    }

    setSubmitting(true);
    try {
      await createPost(postContent);
      setPostContent('');
      setShowCreatePost(false);
      Alert.alert('Success', 'Post created!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await likePost(postId);
    } catch (error) {
      Alert.alert('Error', 'Failed to like post');
    }
  };

  const handleComment = async (postId: string) => {
    if (!commentText.trim()) return;

    try {
      await commentOnPost(postId, commentText);
      setCommentText('');
      setShowComments(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const formatTimestamp = (post: any) => {
    // Support both timestamp (web app) and createdAt (mobile app)
    const timestamp = post.timestamp || post.createdAt;
    if (!timestamp) return '';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderPost = ({ item }: { item: any }) => (
    <Card style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <Avatar.Text
          size={40}
          label={(item.author?.displayName || 'U').substring(0, 2).toUpperCase()}
          style={styles.avatar}
          color={Colors.textOnPrimary}
        />
        <View style={styles.postHeaderInfo}>
          <Text variant="titleMedium" style={styles.authorName}>
            {item.author?.displayName || 'Unknown User'}
          </Text>
          <Text variant="bodySmall" style={styles.timestamp}>
            {formatTimestamp(item)}
          </Text>
        </View>
      </View>

      {/* Post Content */}
      <Text variant="bodyLarge" style={styles.postContent}>
        {item.content}
      </Text>

      {/* Post Stats */}
      <View style={styles.postStats}>
        <Text variant="bodySmall" style={styles.statsText}>
          {item.likesCount} {item.likesCount === 1 ? 'like' : 'likes'}
        </Text>
        <Text variant="bodySmall" style={styles.statsText}>
          {item.commentsCount} {item.commentsCount === 1 ? 'comment' : 'comments'}
        </Text>
      </View>

      {/* Post Actions */}
      <View style={styles.postActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleLike(item.id)}
        >
          <Icon
            name={item.isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={item.isLiked ? Colors.evergreenTeal : Colors.textSecondary}
          />
          <Text
            variant="bodyMedium"
            style={[
              styles.actionText,
              item.isLiked && { color: Colors.evergreenTeal },
            ]}
          >
            Like
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowComments(item.id)}
        >
          <Icon name="comment-outline" size={20} color={Colors.textSecondary} />
          <Text variant="bodyMedium" style={styles.actionText}>
            Comment
          </Text>
        </TouchableOpacity>
      </View>

      {/* Comments Preview */}
      {item.comments && item.comments.length > 0 && (
        <View style={styles.commentsPreview}>
          {item.comments.slice(0, 2).map((comment: any, index: number) => (
            <View key={index} style={styles.commentItem}>
              <Text variant="bodySmall" style={styles.commentAuthor}>
                User •
              </Text>
              <Text variant="bodySmall" style={styles.commentText}>
                {comment.text}
              </Text>
            </View>
          ))}
          {item.comments.length > 2 && (
            <TouchableOpacity onPress={() => setShowComments(item.id)}>
              <Text variant="bodySmall" style={styles.viewMoreComments}>
                View {item.comments.length - 2} more comments
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Card>
  );

  const renderHeader = () => (
    <>
      {/* Quick Navigation */}
      <View style={styles.quickNav}>
        <TouchableOpacity
          style={styles.quickNavButton}
          onPress={() => navigation.navigate('Groups')}
        >
          <Icon name="account-group" size={24} color={Colors.evergreenTeal} />
          <Text variant="bodySmall" style={styles.quickNavText}>
            Groups
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickNavButton}
          onPress={() => navigation.navigate('People')}
        >
          <Icon name="account-multiple" size={24} color={Colors.evergreenTeal} />
          <Text variant="bodySmall" style={styles.quickNavText}>
            People
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickNavButton}
          onPress={() => navigation.navigate('Messages')}
        >
          <Icon name="message-text" size={24} color={Colors.evergreenTeal} />
          <Text variant="bodySmall" style={styles.quickNavText}>
            Messages
          </Text>
        </TouchableOpacity>
      </View>

      {/* Create Post Button */}
      <Card style={styles.createPostCard}>
        <TouchableOpacity
          style={styles.createPostButton}
          onPress={() => setShowCreatePost(true)}
        >
          <Avatar.Text
            size={36}
            label={(user?.displayName || 'U').substring(0, 2).toUpperCase()}
            style={styles.avatar}
            color={Colors.textOnPrimary}
          />
          <Text variant="bodyMedium" style={styles.createPostPlaceholder}>
            What's on your mind?
          </Text>
        </TouchableOpacity>
      </Card>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.screenTitle}>
          Community
        </Text>
      </View>

      {loading && posts.length === 0 ? (
        <LoadingSpinner message="Loading feed..." />
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.feedContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon
                name="earth"
                size={64}
                color={Colors.textSecondary}
                style={styles.emptyIcon}
              />
              <Text variant="titleMedium" style={styles.emptyTitle}>
                Your feed is empty
              </Text>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Connect with people and join groups to see posts here
              </Text>
            </View>
          }
        />
      )}

      {/* Create Post Modal */}
      <Portal>
        <Modal
          visible={showCreatePost}
          onDismiss={() => setShowCreatePost(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Create Post
          </Text>

          <RNTextInput
            value={postContent}
            onChangeText={setPostContent}
            placeholder="What's on your mind?"
            multiline
            numberOfLines={6}
            style={styles.postInput}
            textAlignVertical="top"
          />

          <View style={styles.modalActions}>
            <PaperButton
              mode="outlined"
              onPress={() => setShowCreatePost(false)}
              style={styles.modalButton}
            >
              Cancel
            </PaperButton>
            <PaperButton
              mode="contained"
              onPress={handleCreatePost}
              loading={submitting}
              disabled={submitting || !postContent.trim()}
              style={styles.modalButton}
              buttonColor={Colors.evergreenTeal}
            >
              Post
            </PaperButton>
          </View>
        </Modal>
      </Portal>

      {/* Comment Modal */}
      <Portal>
        <Modal
          visible={showComments !== null}
          onDismiss={() => setShowComments(null)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Comments
          </Text>

          <View style={styles.commentInputContainer}>
            <RNTextInput
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Write a comment..."
              style={styles.commentInput}
            />
            <IconButton
              icon="send"
              size={24}
              iconColor={Colors.evergreenTeal}
              onPress={() => showComments && handleComment(showComments)}
            />
          </View>

          <PaperButton
            mode="outlined"
            onPress={() => setShowComments(null)}
            style={styles.modalButton}
          >
            Close
          </PaperButton>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: '700',
  },
  feedContent: {
    paddingBottom: Spacing.xl,
  },
  quickNav: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    justifyContent: 'space-around',
  },
  quickNavButton: {
    alignItems: 'center',
    padding: Spacing.sm,
  },
  quickNavText: {
    color: Colors.evergreenTeal,
    marginTop: Spacing.xs,
    fontWeight: '600',
  },
  createPostCard: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  createPostPlaceholder: {
    color: Colors.textSecondary,
    marginLeft: Spacing.md,
    flex: 1,
  },
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
    fontWeight: '600',
  },
  timestamp: {
    color: Colors.textSecondary,
  },
  postContent: {
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  postStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
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
    fontWeight: '600',
  },
  commentsPreview: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  commentAuthor: {
    color: Colors.textPrimary,
    fontWeight: '600',
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  modal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: 12,
    padding: Spacing.lg,
  },
  modalTitle: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.lg,
    fontWeight: '600',
  },
  postInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    minHeight: 120,
    marginBottom: Spacing.md,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: Spacing.md,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});

export default CommunityScreen;
