/**
 * useFeed Hook
 * Hook for managing social feed with posts from connections and groups
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  collection,
  query,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  Post,
  UserProfile,
  createPost,
  togglePostLike,
  addCommentToPost,
  fetchUserConnections,
  fetchUserGroups,
  getUserById,
} from '../services/firebase';

export interface EnrichedPost extends Post {
  author?: UserProfile;
  isLiked: boolean;
  likesCount: number;
  commentsCount: number;
}

export const useFeed = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<EnrichedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [connectionIds, setConnectionIds] = useState<string[]>([]);
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [contextLoaded, setContextLoaded] = useState(false);

  // Load user's connections and groups
  useEffect(() => {
    if (!user) {
      setContextLoaded(false);
      return;
    }

    const loadUserContext = async () => {
      try {
        console.log('[useFeed] Loading user context for:', user.uid);
        const [connections, groups] = await Promise.all([
          fetchUserConnections(user.uid),
          fetchUserGroups(user.uid),
        ]);

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

        console.log('[useFeed] Loaded connections:', connIds.length, connIds);

        // Extract group IDs
        const grpIds = groups.map((g) => g.id);
        setGroupIds(grpIds);

        console.log('[useFeed] Loaded groups:', grpIds.length, grpIds);

        // Mark context as loaded so feed filtering can proceed
        setContextLoaded(true);
      } catch (err) {
        console.error('Error loading user context:', err);
        // Still mark as loaded so we don't block forever
        setContextLoaded(true);
      }
    };

    loadUserContext();
  }, [user]);

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
      console.log('[useFeed] Waiting for context to load...');
      return;
    }

    console.log('[useFeed] Context loaded, subscribing to posts with:', {
      connectionIds: connectionIds.length,
      groupIds: groupIds.length,
    });

    // Build query for feed posts
    // Posts from: user's own posts, connection posts, and group posts
    const postsRef = collection(db, 'posts');

    // Fetch posts with a strict limit to prevent rendering too many at once
    // This helps prevent "Malformed calls from JS" bridge errors
    const q = query(postsRef, limit(30));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        try {
          const allPosts = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Post[];

          console.log('Total posts in database:', allPosts.length);
          console.log('User connections:', connectionIds);
          console.log('User groups:', groupIds);

          // Filter posts: own posts, connection posts, or group posts
          // Support both authorId (web app) and userId (mobile app)
          const feedPosts = allPosts.filter((post) => {
            const postAuthor = post.authorId || post.userId;
            if (!postAuthor) return false;

            // User's own posts
            if (postAuthor === user.uid) {
              console.log('Including own post:', post.id);
              return true;
            }

            // Posts from connections (no groupId = personal/public posts)
            // Include ALL personal posts from connections, regardless of age
            if (!post.groupId && connectionIds.includes(postAuthor)) {
              console.log('Including connection post:', post.id, 'from:', postAuthor);
              return true;
            }

            // Posts from groups user is member of
            if (post.groupId && groupIds.includes(post.groupId)) {
              console.log('Including group post:', post.id, 'in group:', post.groupId);
              return true;
            }

            return false;
          });

          console.log('Filtered feed posts:', feedPosts.length);

          // Debug: log comments for each post
          feedPosts.forEach((post) => {
            console.log(`[useFeed] Post ${post.id} has ${post.comments?.length || 0} comments:`, post.comments);
          });

          // Enrich posts with author info
          // Process in batches to prevent "Malformed calls from JS" errors
          const enrichedPosts: EnrichedPost[] = [];
          const batchSize = 5;

          for (let i = 0; i < feedPosts.length; i += batchSize) {
            const batch = feedPosts.slice(i, i + batchSize);
            const batchResults = await Promise.all(
              batch.map(async (post) => {
                const authorId = post.authorId || post.userId;
                const author = authorId ? await getUserById(authorId) : null;

                return {
                  ...post,
                  author: author || undefined,
                  isLiked: post.likes?.includes(user.uid) || false,
                  likesCount: post.likes?.length || 0,
                  commentsCount: post.comments?.length || 0,
                } as EnrichedPost;
              })
            );
            enrichedPosts.push(...batchResults);
          }

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

          // Limit to 5 posts initially to prevent bridge errors
          const limitedPosts = sortedPosts.slice(0, 5);
          console.log('[useFeed] Displaying', limitedPosts.length, 'of', sortedPosts.length, 'posts');

          setPosts(limitedPosts);
          setError(null);
        } catch (err) {
          console.error('Error processing feed posts:', err);
          setError(err as Error);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error subscribing to posts:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, connectionIds, groupIds, contextLoaded]);

  const handleCreatePost = async (
    content: string,
    groupId?: string,
    media?: Array<{ url: string; type: 'image' | 'video' }>
  ) => {
    if (!user) return;

    try {
      await createPost({
        userId: user.uid,
        content,
        groupId,
        media,
      });
    } catch (err) {
      console.error('Error creating post:', err);
      throw err;
    }
  };

  const handleLikePost = async (postId: string) => {
    if (!user) return;

    try {
      await togglePostLike(postId, user.uid);
    } catch (err) {
      console.error('Error liking post:', err);
      throw err;
    }
  };

  const handleCommentOnPost = async (postId: string, text: string) => {
    if (!user) {
      console.log('[useFeed] No user, cannot comment');
      return;
    }

    console.log('[useFeed] Adding comment to post:', postId);
    console.log('[useFeed] User:', user.uid, 'displayName:', user.displayName);

    try {
      await addCommentToPost(postId, {
        userId: user.uid,
        text,
        authorName: user.displayName || 'Someone',
      });
      console.log('[useFeed] Comment added successfully');
    } catch (err) {
      console.error('[useFeed] Error commenting on post:', err);
      throw err;
    }
  };

  return {
    posts,
    loading,
    error,
    createPost: handleCreatePost,
    likePost: handleLikePost,
    commentOnPost: handleCommentOnPost,
  };
};
