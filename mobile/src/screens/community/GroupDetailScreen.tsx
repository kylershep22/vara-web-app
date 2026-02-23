/**
 * Group Detail Screen
 * View group info, members, and posts within a group
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput as RNTextInput,
  Alert,
  Image,
  Keyboard,
  InputAccessoryView,
  Platform,
  ScrollView,
  ImageStyle,
  Modal,
  KeyboardAvoidingView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {
  Text,
  Avatar,
  IconButton,
  Portal,
  Modal as PaperModal,
  Button as PaperButton,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Card, LoadingSpinner, Button, PostCard } from '../../components';
import { InviteMembersModal, CreateChallengeFromGroupModal, ChallengeCard } from '../../components/community';
import { Badge } from '../../components/shared/Badge';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { Challenge, ChallengeParticipant, GroupPrompt } from '../../types/models';
import { useAuth } from '../../context/AuthContext';
import {
  getGroupInfo,
  fetchGroupPosts,
  createPost,
  togglePostLike,
  addCommentToPost,
  joinGroup,
  leaveGroup,
  getUserById,
  getGroupPrompt,
  createGroupPrompt,
  ensureWeeklyPromptPost,
  Group,
  Post,
  UserProfile,
} from '../../services/firebase/community.service';
import { canUserInviteToGroup } from '../../services/firebase/invites.service';
import {
  fetchChallengesByGroup,
  fetchMyParticipation,
  joinChallenge,
  formatChallengePosition,
} from '../../services/firebase/challenges.service';
import { ProgressBar } from 'react-native-paper';
import { uploadPostMedia } from '../../services/firebase';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

type GroupDetailRouteParams = {
  GroupDetail: {
    groupId: string;
    groupName?: string;
  };
};

const INPUT_ACCESSORY_VIEW_ID = 'groupDetailInputAccessory';

// Create Post Modal Component
interface CreatePostModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (content: string, media: Array<{ uri: string; type: 'image' | 'video'; id: string }>) => Promise<void>;
  groupName: string;
}

const CreatePostModal = memo(({ visible, onDismiss, onSubmit, groupName }: CreatePostModalProps) => {
  const [postContent, setPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Array<{
    uri: string;
    type: 'image' | 'video';
    id: string;
  }>>([]);

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
      videoMaxDuration: 300,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });

    if (!result.canceled) {
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
      setPostContent('');
      setSelectedMedia([]);
      onDismiss();
      Alert.alert('Success', 'Post created!');
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert('Upload Failed', 'Would you like to try again?', [
        { text: 'Retry', onPress: handleCreatePost },
        { text: 'Cancel', style: 'cancel' }
      ]);
    } finally {
      setSubmitting(false);
      setIsUploading(false);
    }
  };

  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();
    onDismiss();
  }, [onDismiss]);

  return (
    <PaperModal
      visible={visible}
      onDismiss={handleDismiss}
      contentContainerStyle={styles.modal}
    >
      <Text variant="headlineSmall" style={styles.modalTitle}>
        Post to {groupName}
      </Text>

      <RNTextInput
        value={postContent}
        onChangeText={setPostContent}
        placeholder="Share something with the group..."
        multiline
        numberOfLines={6}
        style={styles.postInput}
        textAlignVertical="top"
        inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
        blurOnSubmit={false}
      />

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
                style={styles.thumbnailImage}
              />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeMedia(media.id)}
              >
                <Icon name="close-circle" size={24} color={Colors.error} />
              </TouchableOpacity>
              {media.type === 'video' && (
                <View style={styles.videoIndicator}>
                  <Icon name="play-circle" size={32} color={Colors.white} />
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.addMediaButton}
        onPress={showMediaOptions}
      >
        <Icon name="image-plus" size={24} color={Colors.evergreenTeal} />
        <Text style={styles.addMediaText}>Add Photos/Videos</Text>
      </TouchableOpacity>

      <View style={styles.modalActions}>
        <PaperButton
          mode="outlined"
          onPress={handleDismiss}
          style={styles.modalButton}
        >
          Cancel
        </PaperButton>
        <PaperButton
          mode="contained"
          onPress={handleCreatePost}
          loading={submitting || isUploading}
          disabled={submitting || isUploading || (!postContent.trim() && selectedMedia.length === 0)}
          style={styles.modalButton}
          buttonColor={Colors.evergreenTeal}
        >
          {isUploading ? 'Uploading...' : 'Post'}
        </PaperButton>
      </View>
    </PaperModal>
  );
});

// Enhanced Comment Modal Component
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

// Members Modal Component
interface MembersModalProps {
  visible: boolean;
  members: UserProfile[];
  ownerId: string;
  onDismiss: () => void;
}

const MembersModal = memo(({ visible, members, ownerId, onDismiss }: MembersModalProps) => {
  return (
    <PaperModal
      visible={visible}
      onDismiss={onDismiss}
      contentContainerStyle={styles.membersModal}
    >
      <Text variant="headlineSmall" style={styles.modalTitle}>
        Members ({members.length})
      </Text>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.memberItem}>
            <Avatar.Text
              size={40}
              label={(item.displayName || 'U').substring(0, 2).toUpperCase()}
              style={styles.memberAvatar}
              color={Colors.textOnPrimary}
            />
            <View style={styles.memberInfo}>
              <Text variant="titleSmall" style={styles.memberName}>
                {item.displayName || 'Unknown User'}
              </Text>
              {item.id === ownerId && (
                <Chip
                  mode="flat"
                  compact
                  style={styles.ownerChip}
                  textStyle={styles.ownerChipText}
                >
                  Host
                </Chip>
              )}
            </View>
          </View>
        )}
        style={styles.membersList}
      />

      <PaperButton
        mode="outlined"
        onPress={onDismiss}
        style={styles.modalButton}
      >
        Close
      </PaperButton>
    </PaperModal>
  );
});

const GroupDetailScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<GroupDetailRouteParams, 'GroupDetail'>>();
  const { groupId, groupName: initialGroupName } = route.params;

  // State
  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [commentPost, setCommentPost] = useState<any | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateChallengeModal, setShowCreateChallengeModal] = useState(false);
  const [canInvite, setCanInvite] = useState(false);
  const [groupChallenges, setGroupChallenges] = useState<Challenge[]>([]);
  const [challengeParticipations, setChallengeParticipations] = useState<Map<string, ChallengeParticipant | null>>(new Map());
  const [groupPrompt, setGroupPrompt] = useState<GroupPrompt | null>(null);
  const [promptResponseCount, setPromptResponseCount] = useState(0);
  const [showSetPrompt, setShowSetPrompt] = useState(false);
  const [newPromptText, setNewPromptText] = useState('');

  // Load group data
  const loadGroupData = useCallback(async () => {
    try {
      console.log('[GroupDetail] Loading group data for:', groupId);

      // Fetch group info
      const groupData = await getGroupInfo(groupId);
      if (!groupData) {
        console.log('[GroupDetail] Group not found:', groupId);
        Alert.alert('Error', 'Group not found');
        navigation.goBack();
        return;
      }
      console.log('[GroupDetail] Group loaded:', groupData.name);
      setGroup(groupData);

      // Fetch owner profile
      if (groupData.ownerId) {
        const ownerProfile = await getUserById(groupData.ownerId);
        setOwner(ownerProfile);
        console.log('[GroupDetail] Owner loaded:', ownerProfile?.displayName);
      } else {
        console.warn('[GroupDetail] Group has no ownerId');
      }

      // Check if user can invite others
      if (user) {
        const canUserInvite = await canUserInviteToGroup(groupId, user.uid);
        setCanInvite(canUserInvite);
      }

      // Fetch member profiles (first 20) - handle individual failures gracefully
      const memberIds = groupData.members.slice(0, 20);
      const memberProfiles = await Promise.all(
        memberIds.map(async (id) => {
          try {
            return await getUserById(id);
          } catch (e) {
            console.warn('[GroupDetail] Failed to load member profile:', id);
            return null;
          }
        })
      );
      setMembers(memberProfiles.filter((m): m is UserProfile => m !== null));
      console.log('[GroupDetail] Members loaded:', memberProfiles.filter(m => m !== null).length);

      // Fetch posts - wrap in try/catch to handle index errors gracefully
      let groupPosts: Post[] = [];
      try {
        groupPosts = await fetchGroupPosts(groupId);
        console.log('[GroupDetail] Posts loaded:', groupPosts.length);
      } catch (postsError: any) {
        console.error('[GroupDetail] Error fetching posts:', postsError);
        // If it's an index error, show empty posts but don't fail the whole load
        if (postsError?.message?.includes('index') || postsError?.code === 'failed-precondition') {
          console.warn('[GroupDetail] Missing Firestore index for posts query');
          groupPosts = [];
        } else {
          throw postsError;
        }
      }
      // Enrich posts with author info - handle individual failures gracefully
      const enrichedPosts = await Promise.all(
        groupPosts.map(async (post) => {
          const authorId = post.authorId || post.userId;
          let author = null;
          if (authorId) {
            try {
              author = await getUserById(authorId);
            } catch (e) {
              console.warn('[GroupDetail] Failed to load post author:', authorId);
            }
          }
          return {
            ...post,
            author,
            likesCount: post.likes?.length || 0,
            commentsCount: post.comments?.length || 0,
            isLiked: post.likes?.includes(user?.uid || ''),
          };
        })
      );
      setPosts(enrichedPosts);
      console.log('[GroupDetail] Posts enriched:', enrichedPosts.length);

      // Fetch group challenges
      try {
        console.log('Fetching challenges for group:', groupId);
        const challenges = await fetchChallengesByGroup(groupId);
        console.log('Found challenges for group:', challenges.length, challenges.map(c => ({ id: c.id, name: c.name, sourceGroupId: c.sourceGroupId })));
        setGroupChallenges(challenges);

        // Fetch participations for each challenge
        if (user && challenges.length > 0) {
          const participationPromises = challenges.map(async (challenge) => {
            const participation = await fetchMyParticipation(challenge.id);
            return { challengeId: challenge.id, participation };
          });
          const participations = await Promise.all(participationPromises);
          const participationMap = new Map<string, ChallengeParticipant | null>();
          participations.forEach(({ challengeId, participation }) => {
            participationMap.set(challengeId, participation);
          });
          setChallengeParticipations(participationMap);
        }
      } catch (challengeError) {
        console.error('Error loading group challenges:', challengeError);
        // Non-critical, don't show error to user
      }

      // Load group prompt
      try {
        const prompt = await getGroupPrompt(groupId);
        setGroupPrompt(prompt);
        if (prompt) {
          await ensureWeeklyPromptPost(groupId, prompt);
        }
      } catch (promptError) {
        console.error('Error loading group prompt:', promptError);
        // Non-critical
      }
    } catch (error: any) {
      console.error('[GroupDetail] Error loading group data:', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack,
      });
      // Provide more specific error messages
      let errorMessage = 'Failed to load group data';
      if (error?.code === 'permission-denied') {
        errorMessage = 'You do not have permission to view this group. It may be private or you may need to sign in again.';
      } else if (error?.code === 'not-found') {
        errorMessage = 'This group no longer exists or has been deleted.';
      } else if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
        errorMessage = 'The database is still being set up. Please try again in a few minutes.';
      } else if (error?.code === 'unavailable') {
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      } else if (error?.message) {
        errorMessage = `Error: ${error.message}`;
      }
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [groupId, user?.uid, navigation]);

  useEffect(() => {
    loadGroupData();
  }, [loadGroupData]);

  // Update navigation header
  useEffect(() => {
    navigation.setOptions({
      title: group?.name || initialGroupName || 'Group',
    });
  }, [navigation, group?.name, initialGroupName]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGroupData();
    setRefreshing(false);
  };

  const isMember = group?.members.includes(user?.uid || '');
  const isOwner = group?.ownerId === user?.uid;

  const handleJoinGroup = async () => {
    if (!user || !group) return;
    try {
      await joinGroup(groupId, user.uid);
      await loadGroupData();
      Alert.alert('Success', `You joined ${group.name}!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to join group');
    }
  };

  const handleLeaveGroup = async () => {
    if (!user || !group) return;

    if (isOwner) {
      Alert.alert('Cannot Leave', 'As the group owner, you cannot leave. Transfer ownership first or delete the group.');
      return;
    }

    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave ${group.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveGroup(groupId, user.uid);
              Alert.alert('Success', `You left ${group.name}`);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to leave group');
            }
          },
        },
      ]
    );
  };

  const handleCreatePost = useCallback(async (
    content: string,
    selectedMedia: Array<{ uri: string; type: 'image' | 'video'; id: string }>
  ) => {
    if (!user) return;

    let mediaArray: Array<{ url: string; type: 'image' | 'video' }> = [];

    if (selectedMedia.length > 0) {
      const uploadResults = await uploadPostMedia(user.uid, selectedMedia);
      mediaArray = uploadResults.map(r => ({
        url: r.url,
        type: r.type,
      }));
    }

    await createPost({
      userId: user.uid,
      content,
      groupId,
      media: mediaArray,
    });

    await loadGroupData();
  }, [user, groupId, loadGroupData]);

  const handleLikePost = useCallback(async (postId: string) => {
    if (!user) return;
    if (!group?.members.includes(user.uid)) {
      Alert.alert('Join Required', 'Join this group to support posts');
      return;
    }
    try {
      await togglePostLike(postId, user.uid);
      // Optimistic update
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const isLiked = post.isLiked;
          return {
            ...post,
            isLiked: !isLiked,
            likesCount: isLiked ? post.likesCount - 1 : post.likesCount + 1,
          };
        }
        return post;
      }));
    } catch (error) {
      Alert.alert('Error', 'Failed to like post');
    }
  }, [user, group]);

  const handleCommentSubmit = useCallback(async (postId: string, text: string) => {
    if (!user) return;
    if (!group?.members.includes(user.uid)) {
      Alert.alert('Join Required', 'Join this group to comment on posts');
      return;
    }
    await addCommentToPost(postId, { userId: user.uid, text });
    await loadGroupData();
  }, [user, group, loadGroupData]);

  const handleNavigateToChallenge = useCallback((challengeId: string, challengeName: string) => {
    navigation.navigate('ChallengeDetail', { challengeId, challengeName });
  }, [navigation]);

  const handleJoinChallenge = useCallback(async (challengeId: string, challengeName: string) => {
    try {
      await joinChallenge(challengeId);
      Alert.alert('Success', `You joined ${challengeName}!`);
      await loadGroupData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join challenge');
    }
  }, [loadGroupData]);

  const isChallengeParticipant = useCallback((challenge: Challenge): boolean => {
    return challenge.members.includes(user?.uid || '');
  }, [user?.uid]);

  const formatTimestamp = (post: any) => {
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

  const renderHeader = () => (
    <View>
      {/* Back Button Header */}
      <View style={styles.backButtonHeader}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-left" size={20} color={Colors.evergreenTeal} />
        </TouchableOpacity>
        <Text style={styles.backButtonTitle} numberOfLines={1}>
          {group?.name || initialGroupName || 'Group'}
        </Text>
        {isMember ? (
          <TouchableOpacity
            onPress={() => {
              const options: any[] = [];
              if (!isOwner) {
                options.push({
                  text: 'Leave Group',
                  style: 'destructive',
                  onPress: handleLeaveGroup,
                });
              }
              options.push({ text: 'Cancel', style: 'cancel' });
              Alert.alert('Options', undefined, options);
            }}
            style={styles.overflowButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="dots-horizontal" size={18} color={Colors.mutedSageGray} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButtonSpacer} />
        )}
      </View>

      {/* Group Header */}
      <View style={styles.groupHeader}>
        <View style={styles.groupIconContainer}>
          <Text style={styles.groupIconText}>
            <Icon name="account-group" size={26} color={Colors.evergreenTeal} />
          </Text>
        </View>

        <Text style={styles.groupName}>
          {group?.name}
        </Text>

        {group?.description && (
          <Text style={styles.groupDescription}>
            {group.description}
          </Text>
        )}

        {/* Group Meta Badges */}
        <View style={styles.groupMeta}>
          {group?.category && (
            <Badge label={group.category} variant="category" />
          )}
          <Badge
            label={group?.isPublic ? 'Public' : 'Private'}
            variant="active"
          />
          <TouchableOpacity onPress={() => setShowMembers(true)}>
            <Badge
              label={`${group?.memberCount || group?.members.length || 0} members`}
              variant="default"
            />
          </TouchableOpacity>
        </View>

        {/* Owner Info */}
        {owner && (
          <View style={styles.ownerInfo}>
            <Avatar.Text
              size={32}
              label={(owner.displayName || 'U').substring(0, 2).toUpperCase()}
              style={styles.ownerAvatar}
              color={Colors.textOnPrimary}
            />
            <Text variant="bodyMedium" style={styles.ownerText}>
              Hosted by <Text style={styles.ownerName}>{owner.displayName}</Text>
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {isMember ? (
            <>
              <Button
                variant="primary"
                style={styles.actionButtonPrimary}
                onPress={() => setShowCreatePost(true)}
              >
                <Icon name="pencil" size={16} color={Colors.textOnPrimary} /> Post
              </Button>
              <Button
                variant="outline"
                style={styles.actionButtonSecondary}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowCreateChallengeModal(true);
                }}
              >
                <Icon name="trophy-outline" size={16} color={Colors.evergreenTeal} /> Challenge
              </Button>
              {canInvite && (
                <Button
                  variant="outline"
                  style={styles.actionButtonInvite}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowInviteModal(true);
                  }}
                >
                  <Icon name="account-plus" size={16} color={Colors.evergreenTeal} /> Invite
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="primary"
              style={styles.actionButtonPrimary}
              onPress={handleJoinGroup}
            >
              Join Group
            </Button>
          )}
        </View>
      </View>

      {/* Group Challenges Section */}
      {groupChallenges.length > 0 && (
        <View style={styles.challengesSection}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Group Challenges
            </Text>
            <Text variant="bodySmall" style={styles.sectionSubtitle}>
              {groupChallenges.length} {groupChallenges.length === 1 ? 'challenge' : 'challenges'}
            </Text>
          </View>
          <View style={styles.challengesList}>
            {groupChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                participation={challengeParticipations.get(challenge.id)}
                isMember={isChallengeParticipant(challenge)}
                onPress={() => handleNavigateToChallenge(challenge.id, challenge.name)}
                onJoin={() => handleJoinChallenge(challenge.id, challenge.name)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Empty Challenges State (only show when member but no challenges) */}
      {isMember && groupChallenges.length === 0 && (
        <View style={styles.emptyChallengesSection}>
          <View style={styles.emptyChallengesContent}>
            <Icon name="trophy-outline" size={32} color={Colors.textSecondary} />
            <View style={styles.emptyChallengesText}>
              <Text variant="bodyMedium" style={styles.emptyChallengesTitle}>
                No group challenges yet
              </Text>
              <Text variant="bodySmall" style={styles.emptyChallengesSubtitle}>
                Create a challenge to motivate group members
              </Text>
            </View>
            <TouchableOpacity
              style={styles.createChallengeButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowCreateChallengeModal(true);
              }}
            >
              <Icon name="plus" size={16} color={Colors.evergreenTeal} />
              <Text style={styles.createChallengeButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Active Challenge Card */}
      {(() => {
        const activeChallenges = groupChallenges?.filter((c: Challenge) => c.status === 'active') || [];
        if (activeChallenges.length > 0) {
          return (
            <View style={styles.activeChallengeWrapper}>
            <View style={styles.activeChallengeCard}>
              <View style={styles.activeChallengeHeader}>
                <Text style={styles.activeChallengeHeaderIcon}>◈</Text>
                <Text style={styles.activeChallengeHeaderText}>Active Challenge</Text>
              </View>
              <TouchableOpacity
                style={styles.activeChallengeContent}
                onPress={() => navigation.navigate('ChallengeDetail', {
                  challengeId: activeChallenges[0].id,
                  challengeName: activeChallenges[0].name
                })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeChallengeName}>{activeChallenges[0].name}</Text>
                  <Text style={styles.activeChallengeInfo}>
                    {formatChallengePosition(activeChallenges[0].startDate, activeChallenges[0].endDate)} · {activeChallenges[0].memberCount || activeChallenges[0].members?.length || 0} participants
                  </Text>
                  <View style={styles.activeChallengeProgress}>
                    <ProgressBar
                      progress={(() => {
                        const c = activeChallenges[0];
                        const start = c.startDate?.toDate ? c.startDate.toDate() : new Date(c.startDate as any);
                        const end = c.endDate?.toDate ? c.endDate.toDate() : new Date(c.endDate as any);
                        const total = end.getTime() - start.getTime();
                        const elapsed = Date.now() - start.getTime();
                        return total > 0 ? Math.min(Math.max(elapsed / total, 0), 1) : 0;
                      })()}
                      color={Colors.evergreenTeal}
                      style={styles.activeChallengeProgressBar}
                    />
                  </View>
                </View>
                <Text style={styles.activeChallengeViewLink}>View →</Text>
              </TouchableOpacity>
            </View>
            </View>
          );
        }
        if (activeChallenges.length === 0 && isMember) {
          return (
            <View style={styles.noActiveChallengeCard}>
              <Icon name="trophy-outline" size={24} color={Colors.textSecondary} />
              <Text style={styles.noActiveChallengeText}>No active challenges yet</Text>
              <TouchableOpacity
                style={styles.noActiveChallengeButton}
                onPress={() => setShowCreateChallengeModal(true)}
              >
                <Text style={styles.noActiveChallengeButtonText}>+ Create</Text>
              </TouchableOpacity>
            </View>
          );
        }
        return null;
      })()}

      {/* Weekly Prompt Card */}
      {groupPrompt && (
        <View style={styles.promptWrapper}>
          <View style={styles.promptCard}>
            <Text style={styles.promptLabel}>WEEKLY REFLECTION</Text>
            <Text style={styles.promptQuestion}>{groupPrompt.prompt}</Text>
            <View style={styles.promptFooter}>
              <Text style={styles.promptResponseCount}>{promptResponseCount} responses this week</Text>
              <TouchableOpacity onPress={() => setShowCreatePost(true)}>
                <Text style={styles.promptShareLink}>Share yours →</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Set Weekly Prompt button (owner only) */}
      {isOwner && (
        <TouchableOpacity onPress={() => setShowSetPrompt(true)} style={styles.setPromptButton}>
          <Icon name="message-text-outline" size={16} color={Colors.evergreenTeal} />
          <Text style={styles.setPromptButtonText}>
            {groupPrompt ? 'Edit Weekly Prompt' : 'Set Weekly Prompt'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Posts Section Header */}
      <View style={styles.postsSectionHeader}>
        <Text style={styles.postsSectionTitle}>Posts</Text>
        <Text style={styles.postsSectionCount}>
          {posts.length} {posts.length === 1 ? 'post' : 'posts'}
        </Text>
      </View>
    </View>
  );

  const renderPost = ({ item }: { item: any }) => (
    <PostCard
      post={item}
      onLike={handleLikePost}
      onComment={(post) => setCommentPost(post)}
      formatTimestamp={formatTimestamp}
      disabled={!isMember}
      disabledMessage="Join this group to support and comment on posts"
      hideGroupBadge
    />
  );

  if (loading) {
    return <LoadingSpinner message="Loading group..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon
              name="post-outline"
              size={64}
              color={Colors.textSecondary}
              style={styles.emptyIcon}
            />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              No posts yet
            </Text>
            <Text variant="bodyMedium" style={styles.emptyText}>
              {isMember
                ? 'Be the first to share something with the group!'
                : 'Join the group to see and create posts'}
            </Text>
            {isMember && (
              <Button
                variant="primary"
                style={styles.emptyButton}
                onPress={() => setShowCreatePost(true)}
              >
                Create First Post
              </Button>
            )}
          </View>
        }
      />

      {/* Create Post Modal */}
      <Portal>
        <CreatePostModal
          visible={showCreatePost}
          onDismiss={() => setShowCreatePost(false)}
          onSubmit={handleCreatePost}
          groupName={group?.name || 'Group'}
        />
      </Portal>

      {/* Comment Modal */}
      <CommentModal
        visible={commentPost !== null}
        post={commentPost}
        onDismiss={() => setCommentPost(null)}
        onSubmit={handleCommentSubmit}
      />

      {/* Members Modal */}
      <Portal>
        <MembersModal
          visible={showMembers}
          members={members}
          ownerId={group?.ownerId || ''}
          onDismiss={() => setShowMembers(false)}
        />
      </Portal>

      {/* Invite Members Modal */}
      <InviteMembersModal
        visible={showInviteModal}
        onDismiss={() => setShowInviteModal(false)}
        type="group"
        entityId={groupId}
        entityName={group?.name || 'Group'}
        existingMemberIds={group?.members || []}
        onInvitesSent={(count) => {
          if (count > 0) {
            Alert.alert('Success', `${count} invite${count > 1 ? 's' : ''} sent!`);
          }
        }}
      />

      {/* Create Challenge from Group Modal */}
      <CreateChallengeFromGroupModal
        visible={showCreateChallengeModal}
        onDismiss={() => setShowCreateChallengeModal(false)}
        groupId={groupId}
        groupName={group?.name || 'Group'}
        memberCount={group?.memberCount || group?.members?.length || 1}
        onSuccess={(challengeId) => {
          navigation.navigate('ChallengeDetail', {
            challengeId,
            challengeName: 'New Challenge',
          });
        }}
      />

      {/* Set Weekly Prompt Modal */}
      <Portal>
        <PaperModal
          visible={showSetPrompt}
          onDismiss={() => setShowSetPrompt(false)}
          contentContainerStyle={styles.setPromptModal}
        >
          <Text variant="headlineSmall" style={styles.setPromptTitle}>Weekly Prompt</Text>
          <Text style={styles.setPromptSubtitle}>Ask your group a question each week</Text>
          <TextInput
            style={styles.setPromptInput}
            placeholder="What would you like to ask your group each week?"
            placeholderTextColor={Colors.textSecondary}
            value={newPromptText}
            onChangeText={setNewPromptText}
            multiline
          />
          <View style={styles.setPromptActions}>
            <PaperButton mode="outlined" onPress={() => setShowSetPrompt(false)}>Cancel</PaperButton>
            <PaperButton
              mode="contained"
              buttonColor={Colors.evergreenTeal}
              onPress={async () => {
                if (!newPromptText.trim()) return;
                try {
                  await createGroupPrompt({ groupId, prompt: newPromptText.trim() });
                  setShowSetPrompt(false);
                  setNewPromptText('');
                  loadGroupData();
                } catch (e: any) {
                  Alert.alert('Error', e.message || 'Failed to set prompt');
                }
              }}
            >Save Prompt</PaperButton>
          </View>
        </PaperModal>
      </Portal>

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
  content: {
    paddingBottom: Spacing.xl,
  },
  // Header bar
  backButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  backButtonTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: Colors.softCharcoal,
  },
  backButtonSpacer: {
    width: 32,
  },
  overflowButton: {
    padding: Spacing.xs,
  },
  // Group Header Card
  groupHeader: {
    padding: 16,
    paddingBottom: 0,
    alignItems: 'center',
  },
  groupIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: Colors.dewSageLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  groupIconText: {
    fontSize: 26,
    color: Colors.evergreenTeal,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.evergreenTeal,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  groupDescription: {
    fontSize: 13,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.base,
    paddingHorizontal: Spacing.lg,
  },
  groupMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  ownerAvatar: {
    backgroundColor: Colors.evergreenTeal,
    marginRight: Spacing.sm,
  },
  ownerText: {
    color: Colors.mutedSageGray,
  },
  ownerName: {
    color: Colors.softCharcoal,
    fontWeight: Typography.fontWeight.semibold,
  },
  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    width: '100%',
  },
  actionButtonPrimary: {
    flex: 1,
    height: 36,
  },
  actionButtonSecondary: {
    flex: 1,
    height: 36,
  },
  actionButtonInvite: {
    height: 36,
  },
  // Posts section header
  postsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: Spacing.base,
  },
  postsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.softCharcoal,
  },
  postsSectionCount: {
    fontSize: 13,
    color: Colors.mutedSageGray,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.mistWhite,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  sectionSubtitle: {
    color: Colors.textSecondary,
  },
  challengesSection: {
    backgroundColor: Colors.mistWhite,
  },
  challengesList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.base,
  },
  emptyChallengesSection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
  },
  emptyChallengesContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.base,
  },
  emptyChallengesText: {
    flex: 1,
  },
  emptyChallengesTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  emptyChallengesSubtitle: {
    color: Colors.textSecondary,
  },
  createChallengeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.md,
    gap: 4,
  },
  createChallengeButtonText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  // Active Challenge Card styles
  activeChallengeWrapper: {
    padding: 12,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  activeChallengeCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dewSage,
    overflow: 'hidden',
  },
  activeChallengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.dewSageLight,
    gap: Spacing.sm,
  },
  activeChallengeHeaderIcon: {
    fontSize: 14,
    color: Colors.evergreenTeal,
  },
  activeChallengeHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.evergreenTeal,
  },
  activeChallengeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingHorizontal: 16,
  },
  activeChallengeName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.softCharcoal,
    marginBottom: 4,
  },
  activeChallengeInfo: {
    fontSize: 12,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.sm,
  },
  activeChallengeProgress: {
    marginTop: 4,
  },
  activeChallengeProgressBar: {
    height: 4,
    borderRadius: 4,
    backgroundColor: Colors.dewSageLight,
  },
  activeChallengeViewLink: {
    fontSize: 13,
    color: Colors.evergreenTeal,
    fontWeight: '500',
    marginLeft: Spacing.sm,
  },
  noActiveChallengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.base,
    padding: Spacing.base,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.borderLight,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
  },
  noActiveChallengeText: {
    flex: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  noActiveChallengeButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.md,
  },
  noActiveChallengeButtonText: {
    fontSize: 13,
    color: Colors.evergreenTeal,
    fontWeight: '500',
  },
  // Weekly Prompt styles
  promptWrapper: {
    padding: 12,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  promptCard: {
    backgroundColor: Colors.dewSageLight,
    borderWidth: 1,
    borderColor: Colors.dewSage,
    padding: 18,
    borderRadius: 12,
  },
  promptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.evergreenTeal,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  promptQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.softCharcoal,
    lineHeight: 22,
    marginBottom: 10,
  },
  promptFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promptResponseCount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  promptShareLink: {
    fontSize: 13,
    color: Colors.evergreenTeal,
    fontWeight: '500',
  },
  setPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  setPromptButtonText: {
    fontSize: 13,
    color: Colors.evergreenTeal,
    fontWeight: '500',
  },
  setPromptModal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: 12,
    padding: Spacing.lg,
  },
  setPromptTitle: {
    color: Colors.evergreenTeal,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  setPromptSubtitle: {
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  setPromptInput: {
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: Spacing.base,
  },
  setPromptActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    minWidth: 160,
  },
  // Modal styles
  modal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    maxHeight: '80%',
  },
  membersModal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    maxHeight: '70%',
  },
  modalTitle: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.lg,
    fontWeight: Typography.fontWeight.semibold,
  },
  postInput: {
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.mistWhite,
    minHeight: 120,
    marginBottom: Spacing.base,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
  // Media styles
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
  } as ImageStyle,
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
  // Members list
  membersList: {
    maxHeight: 300,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
  },
  memberAvatar: {
    backgroundColor: Colors.evergreenTeal,
    marginRight: Spacing.base,
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  memberName: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  ownerChip: {
    backgroundColor: Colors.dewSage,
    height: 24,
  },
  ownerChipText: {
    fontSize: 10,
    color: Colors.evergreenTeal,
  },
  // Keyboard accessory
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

// Comment Modal Styles
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
    marginBottom: 20,
  },
  headerContent: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 24,
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
    borderRadius: 20,
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
    fontSize: 13,
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
    fontSize: 13,
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
    fontSize: 13,
    fontWeight: '600',
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
    fontSize: 11,
    fontWeight: '600',
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

export default GroupDetailScreen;
