/**
 * useCommunityFeed
 * State management and event handlers for the CommunityScreen.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, InteractionManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFeed } from './useFeed';
import {
  uploadPostMedia,
  hidePost,
  unhidePost,
  muteUser,
  unmuteUser,
  softDeletePost,
  checkDuplicateReport,
} from '../services/firebase';
import { logger } from '../utils/logger';

const POST_PROMPTS = [
  "What's bringing you energy today?",
  'Share a small win from this week',
  'What are you grateful for right now?',
  'Any wellness tips you\'ve discovered?',
  'How\'s your wellness journey going?',
  'What\'s one thing you\'re proud of?',
  'Share something that made you smile',
  'What healthy habit are you building?',
];

export function useCommunityFeed() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const {
    posts,
    loading,
    createPost,
    likePost,
    commentOnPost,
    hiddenPostIds,
    mutedUserIds,
    setHiddenPostIds,
    setMutedUserIds,
    refreshFilters,
  } = useFeed();
  const { showNotificationToast } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [feedFilter, setFeedFilter] = useState<'all' | 'groups' | 'connections'>('all');
  const [selectedPostType, setSelectedPostType] = useState<'update' | 'win' | 'reflection' | 'ask' | null>(null);
  const [showPostTypeSelector, setShowPostTypeSelector] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [commentPost, setCommentPost] = useState<any | null>(null);
  const [overflowPost, setOverflowPost] = useState<any | null>(null);
  const [showOverflow, setShowOverflow] = useState(false);
  const [editPost, setEditPost] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);

  // Rotate prompts periodically
  useEffect(() => {
    setPromptIndex(Math.floor(Math.random() * POST_PROMPTS.length));
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
      if (!user || !db) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      } catch (error) {
        logger.error('Error loading user profile:', error);
      }
    };
    loadUserProfile();
  }, [user]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleSubmitPost = useCallback(async (
    content: string,
    selectedMedia: Array<{ uri: string; type: 'image' | 'video'; id: string }>
  ) => {
    let mediaArray: Array<{ url: string; type: 'image' | 'video' }> = [];

    if (selectedMedia.length > 0) {
      const uploadResults = await uploadPostMedia(user!.uid, selectedMedia);
      mediaArray = uploadResults.map(r => ({
        url: r.url,
        type: r.type,
      }));
    }

    await createPost(content, undefined, mediaArray, selectedPostType || 'update');
    setSelectedPostType(null);
    showNotificationToast('Post shared', 'Your post is now live in the feed.');
  }, [user, createPost, selectedPostType, showNotificationToast]);

  const handleLike = useCallback(async (postId: string): Promise<boolean> => {
    try {
      const success = await likePost(postId);
      return success;
    } catch (error) {
      return false;
    }
  }, [likePost]);

  const handleCommentSubmit = useCallback(async (postId: string, text: string) => {
    logger.log('[CommunityScreen] Submitting comment to post:', postId);
    try {
      await commentOnPost(postId, text);
      logger.log('[CommunityScreen] Comment submitted successfully');
    } catch (error) {
      logger.error('[CommunityScreen] Error submitting comment:', error);
      throw error;
    }
  }, [commentOnPost]);

  const handleMorePress = useCallback((post: any) => {
    setOverflowPost(post);
    setShowOverflow(true);
  }, []);

  const dismissOverflow = useCallback(() => {
    setShowOverflow(false);
    setOverflowPost(null);
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

    setHiddenPostIds((prev: string[]) => [...prev, postId]);

    const undoHide = async () => {
      setHiddenPostIds((prev: string[]) => prev.filter((id: string) => id !== postId));
      try { await unhidePost(user.uid, postId); } catch (_) {}
      showNotificationToast('Restored.', '');
    };

    showNotificationToast('Post hidden.', '', undefined, 'Undo', undoHide);

    try {
      await hidePost(user.uid, postId);
    } catch (error) {
      setHiddenPostIds((prev: string[]) => prev.filter((id: string) => id !== postId));
      showNotificationToast("Something didn't connect. Try again when ready.", '');
    }
  }, [user, overflowPost, setHiddenPostIds, showNotificationToast]);

  const handleMuteUser = useCallback(async () => {
    if (!user || !overflowPost) return;
    const mutedUserId = overflowPost.authorId || overflowPost.userId || overflowPost.author?.uid;
    if (!mutedUserId) return;

    setMutedUserIds((prev: string[]) => [...prev, mutedUserId]);

    const undoMute = async () => {
      setMutedUserIds((prev: string[]) => prev.filter((id: string) => id !== mutedUserId));
      try { await unmuteUser(user.uid, mutedUserId); } catch (_) {}
      showNotificationToast('Restored.', '');
    };

    showNotificationToast('Posts from this person are now hidden.', '', undefined, 'Undo', undoMute);

    try {
      await muteUser(user.uid, mutedUserId);
    } catch (error) {
      setMutedUserIds((prev: string[]) => prev.filter((id: string) => id !== mutedUserId));
      showNotificationToast("Something didn't connect. Try again when ready.", '');
    }
  }, [user, overflowPost, setMutedUserIds, showNotificationToast]);

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

  const handleInviteAction = useCallback((_type: 'group' | 'challenge', _id: string) => {
    // PendingInvitesSection manages its own data; this callback is for parent awareness
  }, []);

  const filteredPosts = useMemo(() => {
    if (feedFilter === 'all') return posts;
    if (feedFilter === 'groups') return posts.filter((p: any) => !!p.groupId);
    if (feedFilter === 'connections') return posts.filter((p: any) => !p.groupId);
    return posts;
  }, [posts, feedFilter]);

  const formatTimestamp = useCallback((post: any) => {
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

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  const currentPrompt = POST_PROMPTS[promptIndex];

  const postPlaceholder = useMemo(() => {
    if (selectedPostType === 'win') return 'What went well?';
    if (selectedPostType === 'reflection') return 'What did you notice or learn?';
    if (selectedPostType === 'ask') return 'What could you use support with?';
    return "What's on your mind?";
  }, [selectedPostType]);

  return {
    user,
    navigation,
    posts,
    loading,
    refreshing,
    feedFilter,
    setFeedFilter,
    selectedPostType,
    setSelectedPostType,
    showPostTypeSelector,
    setShowPostTypeSelector,
    showCreatePost,
    setShowCreatePost,
    commentPost,
    setCommentPost,
    overflowPost,
    showOverflow,
    editPost,
    setEditPost,
    userProfile,
    isReady,
    currentPrompt,
    postPlaceholder,
    filteredPosts,
    handleRefresh,
    handleSubmitPost,
    handleLike,
    handleCommentSubmit,
    handleMorePress,
    dismissOverflow,
    handleReport,
    handleHidePost,
    handleMuteUser,
    handleEditPost,
    handleDeletePost,
    handleInviteAction,
    formatTimestamp,
    refreshFilters,
  };
}
