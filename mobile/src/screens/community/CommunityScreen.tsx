/**
 * Community Screen
 * Social feed with posts from connections and groups
 */

import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Alert,
  Image,
  ImageStyle,
  Keyboard,
  InputAccessoryView,
  Platform,
  ScrollView,
  InteractionManager,
  Text,
  Modal,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LoadingSpinner, PostCard, QuickNavButton } from '../../components';
import { PendingInvitesSection } from '../../components/community';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { useFeed } from '../../hooks';
import { uploadPostMedia } from '../../services/firebase';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getAllPendingInvites } from '../../services/firebase/invites.service';
import { GroupInvite, ChallengeInvite } from '../../types/models';

// Extracted Create Post Modal component to prevent re-renders from parent Firestore subscriptions
interface CreatePostModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (content: string, media: Array<{ uri: string; type: 'image' | 'video'; id: string }>) => Promise<void>;
  userId: string;
  placeholder?: string;
}

const CreatePostModal = memo(({ visible, onDismiss, onSubmit, userId, placeholder }: CreatePostModalProps) => {
  const [postContent, setPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Array<{
    uri: string;
    type: 'image' | 'video';
    id: string;
  }>>([]);

  // Permission request functions
  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take photos and videos');
      return false;
    }
    return true;
  };

  const requestLibraryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to select media');
      return false;
    }
    return true;
  };

  // Media selection functions
  const handleTakePhoto = async () => {
    if (!(await requestCameraPermission())) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedMedia(prev => [...prev, {
        uri: result.assets[0].uri,
        type: 'image',
        id: Date.now().toString(),
      }]);
    }
  };

  const handleRecordVideo = async () => {
    if (!(await requestCameraPermission())) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 300, // 5 minutes
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });

    if (!result.canceled) {
      // Validate duration
      if (result.assets[0].duration && result.assets[0].duration > 300) {
        Alert.alert('Video Too Long', 'Videos must be 5 minutes or less');
        return;
      }

      setSelectedMedia(prev => [...prev, {
        uri: result.assets[0].uri,
        type: 'video',
        id: Date.now().toString(),
      }]);
    }
  };

  const handleChooseFromLibrary = async () => {
    if (!(await requestLibraryPermission())) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newMedia = result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' as const : 'image' as const,
        id: `${Date.now()}_${Math.random()}`,
      }));

      setSelectedMedia(prev => [...prev, ...newMedia]);
    }
  };

  const showMediaOptions = () => {
    Alert.alert(
      'Add Media',
      'Choose a source',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Record Video', onPress: handleRecordVideo },
        { text: 'Choose from Library', onPress: handleChooseFromLibrary },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const removeMedia = (id: string) => {
    setSelectedMedia(prev => prev.filter(m => m.id !== id));
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() && selectedMedia.length === 0) {
      Alert.alert('Error', 'Please enter some content or add media');
      return;
    }

    setSubmitting(true);
    setIsUploading(selectedMedia.length > 0);

    try {
      await onSubmit(postContent, selectedMedia);
      // Success - clear and close
      setPostContent('');
      setSelectedMedia([]);
      onDismiss();
      Alert.alert('Success', 'Post created!');
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert(
        'Upload Failed',
        'Would you like to try again?',
        [
          { text: 'Retry', onPress: handleCreatePost },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setSubmitting(false);
      setIsUploading(false);
    }
  };

  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();
    onDismiss();
  }, [onDismiss]);

  const isPostDisabled = submitting || isUploading || (!postContent.trim() && selectedMedia.length === 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Share with the community</Text>

          <TextInput
            value={postContent}
            onChangeText={setPostContent}
            placeholder={placeholder || "What's on your mind?"}
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={6}
            style={styles.postInput}
            textAlignVertical="top"
            inputAccessoryViewID="communityInputAccessory"
            blurOnSubmit={false}
          />

          {/* Media Preview Grid */}
          {selectedMedia.length > 0 && (
            <ScrollView
              horizontal
              style={styles.mediaPreview}
              showsHorizontalScrollIndicator={false}
            >
              {selectedMedia.map((media) => (
                <View key={media.id} style={styles.mediaThumbnail}>
                  <Image
                    source={{ uri: media.uri }}
                    style={styles.thumbnailImage as ImageStyle}
                  />

                  {/* Remove button */}
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeMedia(media.id)}
                  >
                    <Icon name="close-circle" size={24} color={Colors.error} />
                  </TouchableOpacity>

                  {/* Video indicator */}
                  {media.type === 'video' && (
                    <View style={styles.videoIndicator}>
                      <Icon name="play-circle" size={32} color="#fff" />
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          )}

          {/* Add Media Button */}
          <TouchableOpacity
            style={styles.addMediaButton}
            onPress={showMediaOptions}
          >
            <Icon name="image-plus" size={24} color={Colors.evergreenTeal} />
            <Text style={styles.addMediaText}>Add Photos/Videos</Text>
          </TouchableOpacity>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleDismiss}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.postButton, isPostDisabled && styles.postButtonDisabled]}
              onPress={handleCreatePost}
              disabled={isPostDisabled}
            >
              <Text style={styles.postButtonText}>
                {isUploading ? 'Uploading...' : 'Post'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// Enhanced Comment Modal component
interface CommentModalProps {
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
                <Icon name="close" size={24} color="#6F7F77" />
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
                  placeholderTextColor="#6F7F77"
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
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Icon
                      name="send"
                      size={20}
                      color={commentText.trim() ? '#FFFFFF' : '#B8CDBA'}
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
                  <Icon name="alert-circle-outline" size={16} color="#D97A6E" />
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

// Comment Modal Styles
const commentStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.mistWhite,
    borderTopLeftRadius: Layout.borderRadius.xl,
    borderTopRightRadius: Layout.borderRadius.xl,
    paddingTop: Spacing.md,
    paddingBottom: 34,
    paddingHorizontal: Spacing.lg,
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
    marginBottom: Spacing.base,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.xs,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.mutedSageGray,
    fontWeight: Typography.fontWeight.regular,
  },
  closeButton: {
    padding: Spacing.sm,
    marginTop: -4,
    marginRight: -8,
  },
  inputContainer: {
    marginBottom: Spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.xl,
    borderWidth: 1.5,
    borderColor: Colors.dewSage,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
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
    fontSize: 15,
    lineHeight: 22,
    color: Colors.softCharcoal,
    maxHeight: 120,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.dewSage,
  },
  characterCount: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    textAlign: 'right',
    marginTop: Spacing.sm,
  },
  characterCountWarning: {
    color: Colors.softCoral,
  },
  inputHint: {
    fontSize: 13,
    color: Colors.mutedSageGray,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(217, 122, 110, 0.1)',
    borderRadius: Layout.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.softCoral,
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: 13,
    color: Colors.softCoral,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.base,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.mutedSageGray,
    textAlign: 'center',
  },
  commentsList: {
    maxHeight: 300,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: Spacing.base,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.dewSage,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  commentAvatarText: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 6,
  },
  commentAuthor: {
    fontSize: 15,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  authorBadge: {
    backgroundColor: Colors.tealMedium,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.sm,
  },
  authorBadgeText: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  commentTime: {
    fontSize: 13,
    color: Colors.mutedSageGray,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.softCharcoal,
  },
});

const INPUT_ACCESSORY_VIEW_ID = 'communityInputAccessory';

// Contextual prompts for post composer - rotating inspirational prompts
const POST_PROMPTS = [
  "What's bringing you energy today? ✨",
  "Share a small win from this week 🎉",
  "What are you grateful for right now? 🙏",
  "Any wellness tips you've discovered? 💡",
  "How's your wellness journey going? 🌱",
  "What's one thing you're proud of? 💪",
  "Share something that made you smile 😊",
  "What healthy habit are you building? 🌿",
];

const CommunityScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { posts, loading, createPost, likePost, commentOnPost, connectionIds, groupIds } = useFeed();
  const [refreshing, setRefreshing] = useState(false);
  const [feedFilter, setFeedFilter] = useState<'all' | 'groups' | 'connections'>('all');
  const [selectedPostType, setSelectedPostType] = useState<'update' | 'win' | 'reflection' | 'ask' | null>(null);
  const [showPostTypeSelector, setShowPostTypeSelector] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [commentPost, setCommentPost] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [pendingInvites, setPendingInvites] = useState<{
    groupInvites: GroupInvite[];
    challengeInvites: ChallengeInvite[];
  }>({ groupInvites: [], challengeInvites: [] });

  // Rotate prompts periodically
  useEffect(() => {
    // Set random initial prompt
    setPromptIndex(Math.floor(Math.random() * POST_PROMPTS.length));

    // Rotate every 30 seconds
    const interval = setInterval(() => {
      setPromptIndex((prev) => (prev + 1) % POST_PROMPTS.length);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Defer heavy rendering until after navigation animations complete
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setIsReady(true);
    });
    return () => task.cancel();
  }, []);

  // Load user profile data for avatar
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };
    loadUserProfile();
  }, [user]);

  // Load pending invites
  const loadPendingInvites = useCallback(async () => {
    if (!user) return;
    try {
      const invites = await getAllPendingInvites();
      setPendingInvites({
        groupInvites: invites.groups || [],
        challengeInvites: invites.challenges || [],
      });
    } catch (error) {
      // Silently fail for permission errors (common for new users with no invites)
      // Only log non-permission errors
      if (!(error instanceof Error && error.message.includes('permission'))) {
        console.error('Error loading pending invites:', error);
      }
      setPendingInvites({ groupInvites: [], challengeInvites: [] });
    }
  }, [user]);

  useEffect(() => {
    loadPendingInvites();
  }, [loadPendingInvites]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Posts update automatically via real-time subscription
    // Also reload pending invites
    await loadPendingInvites();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Memoized callback for creating posts (used by extracted modal)
  const handleSubmitPost = useCallback(async (
    content: string,
    selectedMedia: Array<{ uri: string; type: 'image' | 'video'; id: string }>
  ) => {
    let mediaArray: Array<{ url: string; type: 'image' | 'video' }> = [];

    // Upload media if selected
    if (selectedMedia.length > 0) {
      const uploadResults = await uploadPostMedia(user!.uid, selectedMedia);
      mediaArray = uploadResults.map(r => ({
        url: r.url,
        type: r.type,
      }));
    }

    // Create post with media array and post type
    await createPost(content, undefined, mediaArray, selectedPostType || 'update');
    setSelectedPostType(null);
  }, [user, createPost, selectedPostType]);

  const handleLike = useCallback(async (postId: string) => {
    try {
      await likePost(postId);
    } catch (error) {
      Alert.alert('Error', 'Failed to like post');
    }
  }, [likePost]);

  // Memoized callback for commenting (used by extracted modal)
  const handleCommentSubmit = useCallback(async (postId: string, text: string) => {
    console.log('[CommunityScreen] Submitting comment to post:', postId, 'text:', text);
    try {
      await commentOnPost(postId, text);
      console.log('[CommunityScreen] Comment submitted successfully');
    } catch (error) {
      console.error('[CommunityScreen] Error submitting comment:', error);
      throw error;
    }
  }, [commentOnPost]);

  const handleCloseCreatePost = useCallback(() => {
    setShowCreatePost(false);
  }, []);

  const handleCloseComments = useCallback(() => {
    setCommentPost(null);
  }, []);

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

  const handleOpenComments = useCallback((post: any) => {
    setCommentPost(post);
  }, []);

  const filteredPosts = useMemo(() => {
    if (feedFilter === 'all') return posts;
    if (feedFilter === 'groups') return posts.filter((p: any) => !!p.groupId);
    if (feedFilter === 'connections') return posts.filter((p: any) => !p.groupId);
    return posts;
  }, [posts, feedFilter]);

  const renderPost = ({ item }: { item: any }) => (
    <View style={{ marginHorizontal: Spacing.base, marginBottom: Spacing.md }}>
      <PostCard
        post={item}
        onLike={handleLike}
        onComment={handleOpenComments}
        formatTimestamp={formatTimestamp}
        onGroupPress={item.groupId ? () => navigation.navigate('GroupDetail', { groupId: item.groupId, groupName: item.groupName }) : undefined}
      />
    </View>
  );

  const handleInviteAction = useCallback(() => {
    // Reload invites after accepting or declining
    loadPendingInvites();
  }, [loadPendingInvites]);

  const renderHeader = () => (
    <>
      {/* Quick Navigation */}
      <View style={styles.quickNav}>
        <QuickNavButton
          icon="account-group"
          label="Groups"
          onPress={() => navigation.navigate('Groups')}
        />
        <QuickNavButton
          icon="account-multiple"
          label="People"
          onPress={() => navigation.navigate('People')}
        />
        <QuickNavButton
          icon="trophy-outline"
          label="Challenges"
          onPress={() => navigation.navigate('Challenges')}
        />
        <QuickNavButton
          icon="message-text"
          label="Messages"
          onPress={() => navigation.navigate('Conversations')}
        />
      </View>

      {/* Pending Invites Section */}
      {(pendingInvites.groupInvites.length > 0 || pendingInvites.challengeInvites.length > 0) && (
        <View style={styles.pendingInvitesContainer}>
          <PendingInvitesSection
            groupInvites={pendingInvites.groupInvites}
            challengeInvites={pendingInvites.challengeInvites}
            onAccept={handleInviteAction}
            onDecline={handleInviteAction}
          />
        </View>
      )}

      {/* Feed Filter Pills */}
      <View style={styles.filterPillsContainer}>
        {(['all', 'groups', 'connections'] as const).map((filter) => {
          const labels = { all: 'All', groups: 'My Groups', connections: 'Connections' };
          const isActive = feedFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => setFeedFilter(filter)}
            >
              <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                {labels[filter]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Create Post Button with Contextual Prompt */}
      <View style={styles.createPostCard}>
        <TouchableOpacity
          style={styles.createPostButton}
          onPress={() => {
            if (showPostTypeSelector) {
              // If already showing type selector, tapping input directly defaults to 'update'
              setSelectedPostType('update');
              setShowPostTypeSelector(false);
              setShowCreatePost(true);
            } else {
              setShowPostTypeSelector(true);
            }
          }}
        >
          {userProfile?.avatarUrl ? (
            <Image
              source={{ uri: userProfile.avatarUrl }}
              style={styles.createPostAvatar as ImageStyle}
            />
          ) : (
            <View style={styles.createPostAvatarFallback}>
              <Text style={styles.avatarText}>
                {(userProfile?.displayName || user?.displayName || 'U').substring(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.createPostPlaceholder}>
            {POST_PROMPTS[promptIndex]}
          </Text>
        </TouchableOpacity>

        {/* Post Type Selector Grid */}
        {showPostTypeSelector && (
          <View style={styles.postTypeGrid}>
            {([
              { type: 'update' as const, emoji: '\u2728', label: 'Update', subtitle: "Share what's happening" },
              { type: 'win' as const, emoji: '\uD83C\uDF89', label: 'Win', subtitle: 'Celebrate progress' },
              { type: 'reflection' as const, emoji: '\uD83D\uDCAD', label: 'Reflection', subtitle: 'Share an insight' },
              { type: 'ask' as const, emoji: '\uD83E\uDD1D', label: 'Ask', subtitle: 'Request support' },
            ]).map((item) => (
              <TouchableOpacity
                key={item.type}
                style={styles.postTypeCard}
                onPress={() => {
                  setSelectedPostType(item.type);
                  setShowPostTypeSelector(false);
                  setShowCreatePost(true);
                }}
              >
                <Text style={styles.postTypeLabel}>{item.emoji} {item.label}</Text>
                <Text style={styles.postTypeSubtitle}>{item.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>
          Community
        </Text>
        {/* Profile Picture Button */}
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('ProfileStack')}
        >
          {userProfile?.avatarUrl ? (
            <Image
              source={{ uri: userProfile.avatarUrl }}
              style={styles.profileImage as ImageStyle}
            />
          ) : (
            <View style={styles.profileAvatarFallback}>
              <Text style={styles.profileAvatarText}>
                {(userProfile?.displayName || user?.displayName || 'U').substring(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {!isReady || (loading && posts.length === 0) ? (
        <LoadingSpinner message="Loading feed..." />
      ) : (
        <FlatList
          data={filteredPosts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.feedContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          // Performance optimizations to prevent rendering too many items at once
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon
                name="hand-wave-outline"
                size={64}
                color={Colors.evergreenTeal}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyTitle}>
                Welcome to the community
              </Text>
              <Text style={styles.emptyText}>
                Connect with others and join groups to build your wellness network
              </Text>
            </View>
          }
        />
      )}

      {/* Create Post Modal */}
      <CreatePostModal
        visible={showCreatePost}
        onDismiss={() => {
          handleCloseCreatePost();
          setSelectedPostType(null);
        }}
        onSubmit={handleSubmitPost}
        userId={user?.uid || ''}
        placeholder={
          selectedPostType === 'win' ? 'What went well?' :
          selectedPostType === 'reflection' ? 'What did you notice or learn?' :
          selectedPostType === 'ask' ? 'What could you use support with?' :
          "What's on your mind?"
        }
      />

      {/* Comment Modal */}
      <CommentModal
        visible={commentPost !== null}
        post={commentPost}
        onDismiss={handleCloseComments}
        onSubmit={handleCommentSubmit}
      />

      {/* Keyboard Accessory Toolbar (iOS) */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={INPUT_ACCESSORY_VIEW_ID}>
          <View style={styles.keyboardAccessory}>
            <TouchableOpacity
              onPress={() => Keyboard.dismiss()}
              style={styles.keyboardAccessoryButton}
            >
              <Text style={styles.keyboardAccessoryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: 0,
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
    fontSize: 26,
  },
  profileButton: {
    borderRadius: Layout.borderRadius.full,
    overflow: 'hidden',
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: Layout.borderRadius.full,
  },
  profileAvatar: {
    backgroundColor: Colors.evergreenTeal,
  },
  feedContent: {
    paddingBottom: Spacing.xl,
  },
  quickNav: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
    justifyContent: 'space-evenly',
  },
  pendingInvitesContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.base,
  },
  filterPillsContainer: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  filterPill: {
    backgroundColor: Colors.dewSageLight,
    borderRadius: Layout.borderRadius.pill,
    paddingVertical: 6,
    paddingHorizontal: Spacing.base,
  },
  filterPillActive: {
    backgroundColor: Colors.evergreenTeal,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.mutedSageGray,
  },
  filterPillTextActive: {
    color: Colors.white,
  },
  postTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: 14,
  },
  postTypeCard: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: 10,
    backgroundColor: Colors.dewSageLight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  postTypeLabel: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  postTypeSubtitle: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },
  createPostCard: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.base,
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
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  createPostPlaceholder: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Layout.borderRadius.pill,
    backgroundColor: Colors.mistWhite,
    borderWidth: 1,
    borderColor: Colors.divider,
    fontSize: 14,
    color: Colors.mutedSageGray,
    overflow: 'hidden',
  },
  avatar: {
    backgroundColor: Colors.evergreenTeal,
  },
  createPostAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.evergreenTeal,
  },
  createPostAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: Colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  profileAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.mintCream,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    marginTop: Spacing.base,
  },
  emptyIcon: {
    marginBottom: Spacing.lg,
    opacity: 0.9,
  },
  emptyTitle: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.lg,
    fontWeight: '600',
    fontSize: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: Colors.evergreenTeal,
    fontWeight: '600',
    fontSize: 14,
  },
  postButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
  },
  postButtonDisabled: {
    backgroundColor: Colors.silverSage,
  },
  postButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  sendButton: {
    padding: 8,
    marginLeft: 8,
  },
  postInput: {
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.background.default,
    minHeight: 120,
    marginBottom: Spacing.base,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  commentInput: {
    flex: 1,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.background.default,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
  // Media preview
  mediaPreview: {
    marginVertical: Spacing.base,
    maxHeight: 100,
  },
  mediaThumbnail: {
    width: 80,
    height: 80,
    marginRight: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  videoIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  // Add media button
  addMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.borderLight,
    borderRadius: Layout.borderRadius.md,
    borderStyle: 'dashed',
    marginBottom: Spacing.base,
  },
  addMediaText: {
    marginLeft: Spacing.sm,
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  // Keyboard Accessory Toolbar
  keyboardAccessory: {
    backgroundColor: Colors.surface,
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  keyboardAccessoryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.md,
  },
  keyboardAccessoryButtonText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default CommunityScreen;
