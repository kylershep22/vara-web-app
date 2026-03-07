/**
 * CommentModal
 * Enhanced bottom-sheet style modal for viewing and adding comments on a post.
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  ActivityIndicator,
  TextInput,
  Platform,
} from 'react-native';
import { Colors, Spacing } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

export interface CommentModalProps {
  visible: boolean;
  post: any | null;
  onDismiss: () => void;
  onSubmit: (postId: string, text: string) => Promise<void>;
}

interface CommentItemData {
  userId: string;
  content: string;
  authorName?: string;
  createdAt?: any;
}

const CHARACTER_LIMIT = 500;

const CommentModal = memo(({ visible, post, onDismiss, onSubmit }: CommentModalProps) => {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localComments, setLocalComments] = useState<CommentItemData[]>([]);

  // Sync local comments with post comments when post changes
  useEffect(() => {
    if (post?.comments) {
      setLocalComments(post.comments);
    } else {
      setLocalComments([]);
    }
  }, [post]);

  const authorName = post?.author?.displayName || 'this post';
  const remainingChars = CHARACTER_LIMIT - commentText.length;

  const handleComment = async () => {
    if (!commentText.trim() || !post?.id) return;

    setIsSubmitting(true);
    setError(null);

    // Optimistically add the comment
    const newComment: CommentItemData = {
      userId: user?.uid || '',
      content: commentText,
      authorName: user?.displayName || 'You',
      createdAt: new Date(),
    };

    try {
      await onSubmit(post.id, commentText);
      // Add to local state on success
      setLocalComments(prev => [...prev, newComment]);
      setCommentText('');
    } catch (err) {
      setError("Something didn't go through. Try again when ready.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();
    setCommentText('');
    setError(null);
    onDismiss();
  }, [onDismiss]);

  const formatCommentTime = (createdAt: any): string => {
    if (!createdAt) return '';
    const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const isPostAuthor = (commentUserId: string): boolean => {
    const postAuthorId = post?.author?.uid || post?.authorId || post?.userId;
    return commentUserId === postAuthorId;
  };

  const renderEmptyState = () => (
    <View style={commentStyles.emptyState}>
      <Icon name="comment-text-outline" size={48} color={Colors.silverSage} />
      <Text style={commentStyles.emptyStateTitle}>Be the first to comment</Text>
      <Text style={commentStyles.emptyStateText}>Share your thoughts and support</Text>
    </View>
  );

  const renderCommentItem = (comment: CommentItemData, index: number) => {
    const commentAuthorName = comment.authorName || 'Someone';
    const initials = commentAuthorName.substring(0, 2).toUpperCase();
    const isAuthor = isPostAuthor(comment.userId);

    return (
      <View key={index} style={commentStyles.commentItem}>
        <View style={commentStyles.commentAvatar}>
          <Text style={commentStyles.commentAvatarText}>{initials}</Text>
        </View>
        <View style={commentStyles.commentContent}>
          <View style={commentStyles.commentHeader}>
            <Text style={commentStyles.commentAuthor}>{commentAuthorName}</Text>
            {isAuthor && (
              <View style={commentStyles.authorBadge}>
                <Text style={commentStyles.authorBadgeText}>Author</Text>
              </View>
            )}
            <Text style={commentStyles.commentTime}>{formatCommentTime(comment.createdAt)}</Text>
          </View>
          <Text style={commentStyles.commentText}>{comment.content}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <TouchableOpacity
          style={commentStyles.modalOverlay}
          activeOpacity={1}
          onPress={handleDismiss}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={commentStyles.modalContainer}
          >
            {/* Handle bar */}
            <View style={commentStyles.handleBar} />

            {/* Header */}
            <View style={commentStyles.modalHeader}>
              <View style={commentStyles.headerContent}>
                <Text style={commentStyles.modalTitle}>Comments</Text>
                <Text style={commentStyles.modalSubtitle}>on {authorName}'s post</Text>
              </View>
              <TouchableOpacity style={commentStyles.closeButton} onPress={handleDismiss}>
                <Icon name="close" size={24} color={Colors.mutedSageGray} />
              </TouchableOpacity>
            </View>

            {/* Input section */}
            <View style={commentStyles.inputContainer}>
              <View style={[
                commentStyles.inputWrapper,
                isFocused && commentStyles.inputWrapperFocused,
              ]}>
                <TextInput
                  style={commentStyles.input}
                  value={commentText}
                  onChangeText={setCommentText}
                  placeholder="Share a supportive thought..."
                  placeholderTextColor={Colors.mutedSageGray}
                  multiline
                  maxLength={CHARACTER_LIMIT}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  textAlignVertical="top"
                  editable={!isSubmitting}
                  accessibilityLabel="Comment input field"
                  accessibilityHint="Type your comment here"
                />
                <TouchableOpacity
                  style={[
                    commentStyles.sendButton,
                    (!commentText.trim() || isSubmitting) && commentStyles.sendButtonDisabled,
                  ]}
                  onPress={handleComment}
                  disabled={!commentText.trim() || isSubmitting}
                  accessibilityLabel="Send comment"
                  accessibilityRole="button"
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Icon
                      name="send"
                      size={20}
                      color={commentText.trim() ? Colors.white : Colors.silverSage}
                    />
                  )}
                </TouchableOpacity>
              </View>

              {/* Character count */}
              {commentText.length > 0 && (
                <Text style={[
                  commentStyles.characterCount,
                  remainingChars < 50 && commentStyles.characterCountWarning,
                ]}>
                  {remainingChars} characters remaining
                </Text>
              )}

              {/* Hint text */}
              {!commentText && !isFocused && (
                <Text style={commentStyles.inputHint}>
                  Your thoughtful perspective matters
                </Text>
              )}

              {/* Error message */}
              {error && (
                <View style={commentStyles.errorContainer}>
                  <Icon name="alert-circle-outline" size={16} color={Colors.softCoral} />
                  <Text style={commentStyles.errorText}>{error}</Text>
                </View>
              )}
            </View>

            {/* Divider */}
            <View style={commentStyles.divider} />

            {/* Comments list */}
            {localComments.length === 0 ? (
              renderEmptyState()
            ) : (
              <ScrollView
                style={commentStyles.commentsList}
                showsVerticalScrollIndicator={false}
              >
                {localComments.map((comment, index) => renderCommentItem(comment, index))}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const commentStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.mistWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 34,
    paddingHorizontal: 24,
    maxHeight: '85%',
    ...Platform.select({
      ios: {
        shadowColor: Colors.evergreenTeal,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: Colors.silverSage,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerContent: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: Colors.evergreenTeal,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.mutedSageGray,
    fontWeight: '400',
  },
  closeButton: {
    padding: 8,
    marginTop: -4,
    marginRight: -8,
  },
  // Input styles
  inputContainer: {
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.dewSage,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
    ...Platform.select({
      ios: {
        shadowColor: Colors.evergreenTeal,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  inputWrapperFocused: {
    borderColor: Colors.evergreenTeal,
    ...Platform.select({
      ios: {
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  input: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: Colors.softCharcoal,
    maxHeight: 120,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 9999,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    ...Platform.select({
      ios: {
        shadowColor: Colors.evergreenTeal,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sendButtonDisabled: {
    backgroundColor: Colors.dewSage,
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  characterCount: {
    fontSize: 12,
    color: Colors.mutedSageGray,
    textAlign: 'right',
    marginTop: 8,
  },
  characterCountWarning: {
    color: Colors.softCoral,
  },
  inputHint: {
    fontSize: 14,
    color: Colors.mutedSageGray,
    marginTop: 8,
    fontStyle: 'italic',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(217, 122, 110, 0.1)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: Colors.softCoral,
    gap: 8,
  },
  errorText: {
    fontSize: 14,
    color: Colors.softCoral,
    flex: 1,
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 16,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.evergreenTeal,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.mutedSageGray,
    textAlign: 'center',
  },
  // Comments list
  commentsList: {
    maxHeight: 300,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.dewSage,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  commentAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.evergreenTeal,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  commentAuthor: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.softCharcoal,
  },
  authorBadge: {
    backgroundColor: Colors.tealMedium,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  authorBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.evergreenTeal,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  commentTime: {
    fontSize: 14,
    color: Colors.mutedSageGray,
  },
  commentText: {
    fontSize: 16,
    lineHeight: 22,
    color: Colors.softCharcoal,
  },
});

export default CommentModal;
