/**
 * useGroupDetail hook
 * Encapsulates all data loading, state, and event handlers for GroupDetailScreen.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Challenge, ChallengeParticipant, GroupPrompt } from '../types/models';
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
  ensureWeeklyPromptPost,
  Group,
  Post,
  UserProfile,
} from '../services/firebase/community.service';
import { canUserInviteToGroup } from '../services/firebase/invites.service';
import {
  fetchChallengesByGroup,
  fetchMyParticipation,
  joinChallenge,
} from '../services/firebase/challenges.service';
import {
  uploadPostMedia,
  hidePost,
  unhidePost,
  muteUser,
  unmuteUser,
  softDeletePost,
  checkDuplicateReport,
  fetchHiddenPostIds,
  fetchMutedUserIds,
} from '../services/firebase';
import { logger } from '../utils/logger';

export function useGroupDetail(groupId: string, initialGroupName?: string) {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { showNotificationToast } = useToast();

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
  const [overflowPost, setOverflowPost] = useState<any | null>(null);
  const [showOverflow, setShowOverflow] = useState(false);
  const [editPost, setEditPost] = useState<any | null>(null);
  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([]);
  const [mutedUserIds, setMutedUserIds] = useState<string[]>([]);

  // Derived values
  const isMember = group?.members.includes(user?.uid || '');
  const isOwner = group?.ownerId === user?.uid;

  // Load group data
  const loadGroupData = useCallback(async () => {
    try {
      logger.log('[GroupDetail] Loading group data for:', groupId);

      const groupData = await getGroupInfo(groupId);
      if (!groupData) {
        logger.log('[GroupDetail] Group not found:', groupId);
        Alert.alert('Error', 'Group not found');
        navigation.goBack();
        return;
      }
      logger.log('[GroupDetail] Group loaded:', groupData.name);
      setGroup(groupData);

      if (groupData.ownerId) {
        const ownerProfile = await getUserById(groupData.ownerId);
        setOwner(ownerProfile);
        logger.log('[GroupDetail] Owner loaded:', ownerProfile?.displayName);
      } else {
        logger.warn('[GroupDetail] Group has no ownerId');
      }

      if (user) {
        const canUserInviteResult = await canUserInviteToGroup(groupId, user.uid);
        setCanInvite(canUserInviteResult);
      }

      const memberIds = groupData.members.slice(0, 20);
      const memberProfiles = await Promise.all(
        memberIds.map(async (id) => {
          try {
            return await getUserById(id);
          } catch (e) {
            logger.warn('[GroupDetail] Failed to load member profile:', id);
            return null;
          }
        })
      );
      setMembers(memberProfiles.filter((m): m is UserProfile => m !== null));
      logger.log('[GroupDetail] Members loaded:', memberProfiles.filter(m => m !== null).length);

      let groupPosts: Post[] = [];
      try {
        groupPosts = await fetchGroupPosts(groupId);
        logger.log('[GroupDetail] Posts loaded:', groupPosts.length);
      } catch (postsError: any) {
        logger.error('[GroupDetail] Error fetching posts:', postsError);
        if (postsError?.message?.includes('index') || postsError?.code === 'failed-precondition') {
          logger.warn('[GroupDetail] Missing Firestore index for posts query');
          groupPosts = [];
        } else {
          throw postsError;
        }
      }

      const enrichedPosts = await Promise.all(
        groupPosts.map(async (post) => {
          const authorId = post.authorId || post.userId;
          let author = null;
          if (authorId) {
            try {
              author = await getUserById(authorId);
            } catch (e) {
              logger.warn('[GroupDetail] Failed to load post author:', authorId);
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
      logger.log('[GroupDetail] Posts enriched:', enrichedPosts.length);

      try {
        logger.log('Fetching challenges for group:', groupId);
        const challenges = await fetchChallengesByGroup(groupId);
        logger.log('Found challenges for group:', challenges.length, challenges.map(c => ({ id: c.id, name: c.name, sourceGroupId: c.sourceGroupId })));
        setGroupChallenges(challenges);

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
        logger.error('Error loading group challenges:', challengeError);
      }

      try {
        const prompt = await getGroupPrompt(groupId);
        setGroupPrompt(prompt);
        if (prompt) {
          await ensureWeeklyPromptPost(groupId, prompt);
        }
      } catch (promptError) {
        logger.error('Error loading group prompt:', promptError);
      }
    } catch (error: any) {
      logger.error('[GroupDetail] Error loading group data:', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack,
      });
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

  // Load hidden/muted filters
  useEffect(() => {
    if (!user) return;
    const loadFilters = async () => {
      const [hidden, muted] = await Promise.all([
        fetchHiddenPostIds(user.uid),
        fetchMutedUserIds(user.uid),
      ]);
      setHiddenPostIds(hidden);
      setMutedUserIds(muted);
    };
    loadFilters();
  }, [user]);

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

  const handleLikePost = useCallback(async (postId: string): Promise<boolean> => {
    if (!user) return false;
    if (!group?.members.includes(user.uid)) {
      Alert.alert('Join Required', 'Join this group to support posts');
      return false;
    }
    // Optimistic update
    setPosts(prev => prev.map(post => {
      if (post.id !== postId) return post;
      const nowLiked = !post.isLiked;
      return {
        ...post,
        isLiked: nowLiked,
        likesCount: nowLiked ? post.likesCount + 1 : Math.max(0, post.likesCount - 1),
      };
    }));

    try {
      await togglePostLike(postId, user.uid);
      return true;
    } catch (error) {
      // Revert using functional updater to avoid stale closure
      setPosts(prev => prev.map(post => {
        if (post.id !== postId) return post;
        const reverted = !post.isLiked;
        return {
          ...post,
          isLiked: reverted,
          likesCount: reverted ? post.likesCount + 1 : Math.max(0, post.likesCount - 1),
        };
      }));
      return false;
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

  // Filter posts by hidden/muted
  const visiblePosts = useMemo(() => {
    return posts.filter((post: any) => {
      if (post.deleted) return false;
      if (hiddenPostIds.includes(post.id)) return false;
      const author = post.authorId || post.userId;
      if (author && mutedUserIds.includes(author)) return false;
      return true;
    });
  }, [posts, hiddenPostIds, mutedUserIds]);

  const handleMorePress = useCallback((post: any) => {
    setOverflowPost(post);
    setShowOverflow(true);
  }, []);

  const handleReport = useCallback(async () => {
    if (!user || !overflowPost) return;
    try {
      const isDuplicate = await checkDuplicateReport(user.uid, overflowPost.id);
      if (isDuplicate) {
        showNotificationToast("You've already reported this post.", '');
        return;
      }
      const reportedUserId = overflowPost.authorId || overflowPost.userId || overflowPost.author?.uid;
      navigation.navigate('ReportReason', { postId: overflowPost.id, reportedUserId });
    } catch (error) {
      showNotificationToast("Something didn't connect. Try again when ready.", '');
    }
  }, [user, overflowPost, navigation, showNotificationToast]);

  const handleHidePost = useCallback(async () => {
    if (!user || !overflowPost) return;
    const postId = overflowPost.id;
    setHiddenPostIds((prev) => [...prev, postId]);

    const undoHide = async () => {
      setHiddenPostIds((prev) => prev.filter((id) => id !== postId));
      try { await unhidePost(user.uid, postId); } catch (_) {}
      showNotificationToast('Restored.', '');
    };

    showNotificationToast('Post hidden.', '', undefined, 'Undo', undoHide);

    try {
      await hidePost(user.uid, postId);
    } catch (error) {
      setHiddenPostIds((prev) => prev.filter((id) => id !== postId));
      showNotificationToast("Something didn't connect. Try again when ready.", '');
    }
  }, [user, overflowPost, showNotificationToast]);

  const handleMuteUser = useCallback(async () => {
    if (!user || !overflowPost) return;
    const mutedUserId = overflowPost.authorId || overflowPost.userId || overflowPost.author?.uid;
    if (!mutedUserId) return;
    setMutedUserIds((prev) => [...prev, mutedUserId]);

    const undoMute = async () => {
      setMutedUserIds((prev) => prev.filter((id) => id !== mutedUserId));
      try { await unmuteUser(user.uid, mutedUserId); } catch (_) {}
      showNotificationToast('Restored.', '');
    };

    showNotificationToast('Posts from this person are now hidden.', '', undefined, 'Undo', undoMute);

    try {
      await muteUser(user.uid, mutedUserId);
    } catch (error) {
      setMutedUserIds((prev) => prev.filter((id) => id !== mutedUserId));
      showNotificationToast("Something didn't connect. Try again when ready.", '');
    }
  }, [user, overflowPost, showNotificationToast]);

  const handleEditPost = useCallback(() => {
    if (!overflowPost) return;
    setEditPost(overflowPost);
  }, [overflowPost]);

  const handleDeletePost = useCallback(async () => {
    if (!overflowPost) return;
    try {
      await softDeletePost(overflowPost.id);
      showNotificationToast('Post deleted.', '');
    } catch (error) {
      showNotificationToast("Something didn't connect. Try again when ready.", '');
    }
  }, [overflowPost, showNotificationToast]);

  const handleInvitesSent = useCallback((count: number) => {
    if (count > 0) {
      Alert.alert('Success', `${count} invite${count > 1 ? 's' : ''} sent!`);
    }
  }, []);

  const handleChallengeCreated = useCallback((challengeId: string) => {
    navigation.navigate('ChallengeDetail', {
      challengeId,
      challengeName: 'New Challenge',
    });
  }, [navigation]);

  const dismissOverflow = useCallback(() => {
    setShowOverflow(false);
    setOverflowPost(null);
  }, []);

  return {
    // State
    user,
    group,
    posts,
    members,
    owner,
    loading,
    refreshing,
    showCreatePost,
    commentPost,
    showMembers,
    showInviteModal,
    showCreateChallengeModal,
    canInvite,
    groupChallenges,
    challengeParticipations,
    groupPrompt,
    promptResponseCount,
    showSetPrompt,
    overflowPost,
    showOverflow,
    editPost,
    visiblePosts,

    // Derived
    isMember,
    isOwner,

    // State setters (for UI toggles)
    setShowCreatePost,
    setCommentPost,
    setShowMembers,
    setShowInviteModal,
    setShowCreateChallengeModal,
    setShowSetPrompt,
    setEditPost,

    // Handlers
    handleRefresh,
    handleJoinGroup,
    handleLeaveGroup,
    handleCreatePost,
    handleLikePost,
    handleCommentSubmit,
    handleNavigateToChallenge,
    handleJoinChallenge,
    handleMorePress,
    handleReport,
    handleHidePost,
    handleMuteUser,
    handleEditPost,
    handleDeletePost,
    handleInvitesSent,
    handleChallengeCreated,
    dismissOverflow,
    formatTimestamp,
    loadGroupData,

    // Navigation
    navigation,
    groupId,
    initialGroupName,
  };
}
