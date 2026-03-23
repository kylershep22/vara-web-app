/**
 * useFeed Hook
 * Hook for managing social feed with posts from connections and groups
 */

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  collection,
  query,
  limit,
  orderBy,
  onSnapshot,
  where,
  documentId,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { logger } from '../utils/logger';
import {
  Post,
  UserProfile,
  createPost,
  togglePostLike,
  addCommentToPost,
  fetchUserConnections,
  fetchUserGroups,
  fetchHiddenPostIds,
  fetchMutedUserIds,
} from '../services/firebase';

export interface EnrichedPost extends Post {
  author?: UserProfile;
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
  groupName?: string;
}

export const useFeed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<EnrichedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [connectionIds, setConnectionIds] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [groupMap, setGroupMap] = useState<Map<string, string>>(new Map()); // groupId -> groupName
  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>([]);
  const [mutedUserIds, setMutedUserIds] = useState<string[]>([]);
  const [contextLoaded, setContextLoaded] = useState(false);

  // Load user's connections and groups
  useEffect(() => {
    if (!user) {
      setContextLoaded(false);
      return;
    }

    const loadUserContext = async () => {
      try {
        logger.log('[useFeed] Loading user context for:', user.uid);
        const [connections, groups, hidden, muted] = await Promise.all([
          fetchUserConnections(user.uid),
          fetchUserGroups(user.uid),
          fetchHiddenPostIds(user.uid),
          fetchMutedUserIds(user.uid),
        ]);

        setHiddenPostIds(hidden);
        setMutedUserIds(muted);

        // Extract connection IDs (service layer normalizes to a/b format)
        const connIds = connections
          .map((conn) => {
            if (conn.a && conn.b) {
              return conn.a === user.uid ? conn.b : conn.a;
            }
            return null;
          })
          .filter((id): id is string => id !== null);
        setConnectionIds(connIds);

        logger.log('[useFeed] Loaded connections:', connIds.length, connIds);

        // Extract group IDs and build group name map
        const grpIds = groups.map((g) => g.id);
        setGroupIds(grpIds);

        // Build map of groupId -> groupName for enriching posts
        const grpMap = new Map<string, string>();
        groups.forEach((g) => {
          grpMap.set(g.id, g.name);
        });
        setGroupMap(grpMap);

        logger.log('[useFeed] Loaded groups:', grpIds.length, grpIds);

        // Mark context as loaded so feed filtering can proceed
        setContextLoaded(true);
      } catch (err) {
        logger.error('Error loading user context:', err);
        // Still mark as loaded so we don't block forever
        setContextLoaded(true);
      }
    };

    loadUserContext();
  }, [user]);

  // Stable serialized key for groupMap to avoid re-subscriptions
  const groupMapKey = useMemo(() => [...groupMap.keys()].sort().join(','), [groupMap]);

  // Subscribe to posts
  useEffect(() => {
    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }

    // Wait for context to load before subscribing to posts
    // This prevents showing "empty feed" while connections/groups are still loading
    if (!contextLoaded) {
      logger.log('[useFeed] Waiting for context to load...');
      return;
    }

    logger.log('[useFeed] Context loaded, subscribing to posts with:', {
      connectionIds: connectionIds.length,
      groupIds: groupIds.length,
    });

    if (!db) {
      console.error('Firestore not initialized - cannot load feed');
      setLoading(false);
      return;
    }

    // Build query for feed posts
    // Posts from: user's own posts, connection posts, and group posts
    const postsRef = collection(db, 'posts');

    // Fetch recent posts ordered by creation time, with enough headroom for
    // client-side filtering (own + connections + groups) to yield ~5 results.
    const q = query(postsRef, orderBy('createdAt', 'desc'), limit(50));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          const allPosts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Post[];

          logger.log('Total posts in database:', allPosts.length);
          logger.log('User connections:', connectionIds);
          logger.log('User groups:', groupIds);

          // Filter posts: own posts, connection posts, or group posts
          // Support both authorId (web app) and userId (mobile app)
          // Also filter out hidden posts, muted users, and soft-deleted posts
          const feedPosts = allPosts.filter((post) => {
            const postAuthor = post.authorId || post.userId;
            if (!postAuthor) return false;

            // Filter out soft-deleted posts
            if ((post as any).deleted) return false;

            // Filter out challenge check-in posts (these belong in the challenge feed only)
            if ((post as any).challengeId) return false;

            // Filter out hidden posts
            if (hiddenPostIds.includes(post.id)) return false;

            // Filter out posts from muted users
            if (mutedUserIds.includes(postAuthor)) return false;

            // User's own posts
            if (postAuthor === user.uid) {
              logger.log('Including own post:', post.id);
              return true;
            }

            // Posts from connections (no groupId = personal/public posts)
            // Include ALL personal posts from connections, regardless of age
            if (!post.groupId && connectionIds.includes(postAuthor)) {
              logger.log('Including connection post:', post.id, 'from:', postAuthor);
              return true;
            }

            // Posts from groups user is member of
            if (post.groupId && groupIds.includes(post.groupId)) {
              logger.log('Including group post:', post.id, 'in group:', post.groupId);
              return true;
            }

            return false;
          });

          logger.log('Filtered feed posts:', feedPosts.length);

          // Batch-fetch all unique author profiles (fixes N+1 query issue)
          const authorIds = [
            ...new Set(
              feedPosts
                .map((post) => post.authorId || post.userId)
                .filter((id): id is string => !!id)
            ),
          ];

          const authorMap = new Map<string, UserProfile>();
          // Firestore 'in' queries support max 10 values
          for (let i = 0; i < authorIds.length; i += 10) {
            const chunk = authorIds.slice(i, i + 10);
            const authorDocs = await getDocs(
              query(collection(db, 'users'), where(documentId(), 'in', chunk))
            );
            authorDocs.forEach((doc) => {
              authorMap.set(doc.id, { id: doc.id, ...doc.data() } as UserProfile);
            });
          }

          // Enrich posts with cached author info
          const enrichedPosts: EnrichedPost[] = feedPosts.map((post) => {
            const authorId = post.authorId || post.userId;
            const author = authorId ? authorMap.get(authorId) : undefined;
            const groupName = post.groupId ? groupMap.get(post.groupId) : undefined;

            return {
              ...post,
              author,
              isLiked: post.likes?.includes(user.uid) || false,
              likesCount: post.likes?.length || 0,
              commentsCount: post.comments?.length || 0,
              groupName,
            } as EnrichedPost;
          });

          // Sort by timestamp descending (most recent first)
          // Handle both createdAt (mobile) and timestamp (web) fields
          const sortedPosts = enrichedPosts.sort((a, b) => {
            const getTime = (post: any): number => {
              const ts = post.createdAt || post.timestamp;
              if (!ts) return 0;
              if (ts.toMillis) return ts.toMillis();
              if (ts.seconds) return ts.seconds * 1000;
              return 0;
            };
            return getTime(b) - getTime(a);
          });

          // Limit displayed posts to prevent bridge performance issues
          const limitedPosts = sortedPosts.slice(0, 20);
          logger.log('[useFeed] Displaying', limitedPosts.length, 'of', sortedPosts.length, 'posts');

          setPosts(limitedPosts);
          setError(null);
        } catch (err) {
          logger.error('Error processing feed posts:', err);
          setError(err as Error);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        logger.error('Error subscribing to posts:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, connectionIds, groupIds, groupMapKey, hiddenPostIds, mutedUserIds, contextLoaded]);

  const handleCreatePost = async (
    content: string,
    groupId?: string,
    media?: Array<{ url: string; type: 'image' | 'video' }>,
    postType?: string,
    challengeId?: string,
    challengeName?: string,
  ) => {
    if (!user) return;

    try {
      await createPost({
        userId: user.uid,
        content,
        groupId,
        media,
        postType,
        challengeId,
        challengeName,
      });
    } catch (err) {
      logger.error('Error creating post:', err);
      throw err;
    }
  };

  const handleLikePost = async (postId: string): Promise<boolean> => {
    if (!user) return false;

    // Optimistic update
    setPosts((current) =>
      current.map((p) => {
        if (p.id !== postId) return p;
        const nowLiked = !p.isLiked;
        return {
          ...p,
          isLiked: nowLiked,
          likesCount: nowLiked ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
        };
      })
    );

    try {
      await togglePostLike(postId, user.uid);
      return true;
    } catch (err) {
      logger.error('Error liking post:', err);
      // Revert using functional updater to avoid stale closure
      setPosts((current) =>
        current.map((p) => {
          if (p.id !== postId) return p;
          const reverted = !p.isLiked;
          return {
            ...p,
            isLiked: reverted,
            likesCount: reverted ? p.likesCount + 1 : Math.max(0, p.likesCount - 1),
          };
        })
      );
      return false;
    }
  };

  const refreshFilters = async () => {
    if (!user) return;
    try {
      const [hidden, muted] = await Promise.all([
        fetchHiddenPostIds(user.uid),
        fetchMutedUserIds(user.uid),
      ]);
      setHiddenPostIds(hidden);
      setMutedUserIds(muted);
    } catch (err) {
      logger.error('Error refreshing filters:', err);
    }
  };

  const handleCommentOnPost = async (postId: string, text: string) => {
    if (!user) {
      logger.log('[useFeed] No user, cannot comment');
      return;
    }

    logger.log('[useFeed] Adding comment to post:', postId);
    logger.log('[useFeed] User:', user.uid, 'displayName:', user.displayName);

    try {
      await addCommentToPost(postId, {
        userId: user.uid,
        text,
        authorName: user.displayName || 'Someone',
      });
      logger.log('[useFeed] Comment added successfully');
    } catch (err) {
      logger.error('[useFeed] Error commenting on post:', err);
      throw err;
    }
  };

  return {
    posts,
    loading,
    error,
    connectionIds,
    groupIds,
    hiddenPostIds,
    mutedUserIds,
    setHiddenPostIds,
    setMutedUserIds,
    refreshFilters,
    createPost: handleCreatePost,
    likePost: handleLikePost,
    commentOnPost: handleCommentOnPost,
  };
};
