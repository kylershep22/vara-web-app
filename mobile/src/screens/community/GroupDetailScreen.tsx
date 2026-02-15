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
} from 'react-native';
import {
  Text,
  Avatar,
  IconButton,
  Portal,
  Modal,
  Button as PaperButton,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Card, LoadingSpinner, Button, PostCard } from '../../components';
import { InviteMembersModal, CreateChallengeFromGroupModal, ChallengeCard } from '../../components/community';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { Challenge, ChallengeParticipant } from '../../types/models';
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
  Group,
  Post,
  UserProfile,
} from '../../services/firebase/community.service';
import { canUserInviteToGroup } from '../../services/firebase/invites.service';
import {
  fetchChallengesByGroup,
  fetchMyParticipation,
  joinChallenge,
} from '../../services/firebase/challenges.service';
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
    <Modal
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
                  <Icon name="play-circle" size={32} color="#fff" />
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
    </Modal>
  );
});

// Comment Modal Component
interface CommentModalProps {
  visible: boolean;
  postId: string | null;
  onDismiss: () => void;
  onSubmit: (postId: string, text: string) => Promise<void>;
}

const CommentModal = memo(({ visible, postId, onDismiss, onSubmit }: CommentModalProps) => {
  const [commentText, setCommentText] = useState('');

  const handleComment = async () => {
    if (!commentText.trim() || !postId) return;

    try {
      await onSubmit(postId, commentText);
      setCommentText('');
      onDismiss();
    } catch (error) {
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();
    onDismiss();
  }, [onDismiss]);

  return (
    <Modal
      visible={visible}
      onDismiss={handleDismiss}
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
          inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
          returnKeyType="send"
          onSubmitEditing={handleComment}
          blurOnSubmit={false}
        />
        <IconButton
          icon="send"
          size={24}
          iconColor={Colors.evergreenTeal}
          onPress={handleComment}
        />
      </View>

      <PaperButton
        mode="outlined"
        onPress={handleDismiss}
        style={styles.modalButton}
      >
        Close
      </PaperButton>
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
    <Modal
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
    </Modal>
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
  const [showComments, setShowComments] = useState<string | null>(null);
  const [showMembers, setShowMembers] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateChallengeModal, setShowCreateChallengeModal] = useState(false);
  const [canInvite, setCanInvite] = useState(false);
  const [groupChallenges, setGroupChallenges] = useState<Challenge[]>([]);
  const [challengeParticipations, setChallengeParticipations] = useState<Map<string, ChallengeParticipant | null>>(new Map());

  // Load group data
  const loadGroupData = useCallback(async () => {
    try {
      // Fetch group info
      const groupData = await getGroupInfo(groupId);
      if (!groupData) {
        Alert.alert('Error', 'Group not found');
        navigation.goBack();
        return;
      }
      setGroup(groupData);

      // Fetch owner profile
      const ownerProfile = await getUserById(groupData.ownerId);
      setOwner(ownerProfile);

      // Check if user can invite others
      if (user) {
        const canUserInvite = await canUserInviteToGroup(groupId, user.uid);
        setCanInvite(canUserInvite);
      }

      // Fetch member profiles (first 20)
      const memberIds = groupData.members.slice(0, 20);
      const memberProfiles = await Promise.all(
        memberIds.map(id => getUserById(id))
      );
      setMembers(memberProfiles.filter((m): m is UserProfile => m !== null));

      // Fetch posts
      const groupPosts = await fetchGroupPosts(groupId);

      // Enrich posts with author info
      const enrichedPosts = await Promise.all(
        groupPosts.map(async (post) => {
          const authorId = post.authorId || post.userId;
          const author = authorId ? await getUserById(authorId) : null;
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
    } catch (error) {
      console.error('Error loading group data:', error);
      Alert.alert('Error', 'Failed to load group data');
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
  }, [user]);

  const handleCommentSubmit = useCallback(async (postId: string, text: string) => {
    if (!user) return;
    await addCommentToPost(postId, { userId: user.uid, text });
    await loadGroupData();
  }, [user, loadGroupData]);

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
          <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="titleMedium" style={styles.backButtonTitle} numberOfLines={1}>
          {group?.name || initialGroupName || 'Group'}
        </Text>
        <View style={styles.backButtonSpacer} />
      </View>

      {/* Group Header */}
      <View style={styles.groupHeader}>
        <View style={styles.groupIconContainer}>
          <Icon name="account-group" size={48} color={Colors.evergreenTeal} />
        </View>

        <Text variant="headlineMedium" style={styles.groupName}>
          {group?.name}
        </Text>

        {group?.description && (
          <Text variant="bodyMedium" style={styles.groupDescription}>
            {group.description}
          </Text>
        )}

        {/* Group Meta */}
        <View style={styles.groupMeta}>
          <Chip
            icon={group?.isPublic ? 'earth' : 'lock'}
            mode="outlined"
            compact
            style={styles.metaChip}
          >
            {group?.isPublic ? 'Public' : 'Private'}
          </Chip>
          <TouchableOpacity onPress={() => setShowMembers(true)}>
            <Chip
              icon="account-multiple"
              mode="outlined"
              compact
              style={styles.metaChip}
            >
              {group?.memberCount || group?.members.length || 0} members
            </Chip>
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
                style={styles.actionButton}
                onPress={() => setShowCreatePost(true)}
              >
                <Icon name="pencil" size={16} color={Colors.textOnPrimary} /> Post
              </Button>
              {canInvite && (
                <Button
                  variant="outline"
                  style={styles.actionButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowInviteModal(true);
                  }}
                >
                  <Icon name="account-plus" size={16} color={Colors.evergreenTeal} /> Invite
                </Button>
              )}
              <Button
                variant="outline"
                style={styles.actionButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowCreateChallengeModal(true);
                }}
              >
                <Icon name="trophy-outline" size={16} color={Colors.evergreenTeal} /> Challenge
              </Button>
              {!isOwner && (
                <Button
                  variant="outline"
                  style={styles.actionButton}
                  onPress={handleLeaveGroup}
                >
                  Leave
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="primary"
              style={styles.actionButton}
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

      {/* Posts Section Header */}
      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Posts
        </Text>
        <Text variant="bodySmall" style={styles.sectionSubtitle}>
          {posts.length} {posts.length === 1 ? 'post' : 'posts'}
        </Text>
      </View>
    </View>
  );

  const renderPost = ({ item }: { item: any }) => (
    <PostCard
      post={item}
      onLike={handleLikePost}
      onComment={setShowComments}
      formatTimestamp={formatTimestamp}
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
      <Portal>
        <CommentModal
          visible={showComments !== null}
          postId={showComments}
          onDismiss={() => setShowComments(null)}
          onSubmit={handleCommentSubmit}
        />
      </Portal>

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
  backButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  backButtonTitle: {
    flex: 1,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  backButtonSpacer: {
    width: 32, // Same width as back button for centering
  },
  groupHeader: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    alignItems: 'center',
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
  },
  groupIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  groupName: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  groupDescription: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.base,
    paddingHorizontal: Spacing.lg,
  },
  groupMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  metaChip: {
    backgroundColor: Colors.mistWhite,
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
    color: Colors.textSecondary,
  },
  ownerName: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    minWidth: 100,
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
    backgroundColor: Colors.mistWhite,
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

export default GroupDetailScreen;
