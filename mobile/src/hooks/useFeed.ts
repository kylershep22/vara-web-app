/**
 * useFeed Hook
 * Hook for managing social feed with posts from connections and groups
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  or,
  and,
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

  // Load user's connections and groups
  useEffect(() => {
    if (!user) return;

    loadUserContext();
  }, [user]);

  const loadUserContext = async () => {
    try {
      const [connections, groups] = await Promise.all([
        fetchUserConnections(user!.uid),
        fetchUserGroups(user!.uid),
      ]);

      // Extract connection IDs (service layer normalizes to a/b format)
      const connIds = connections
        .map((conn) => {
          if (conn.a && conn.b) {
            return conn.a === user!.uid ? conn.b : conn.a;
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
    } catch (err) {
      console.error('Error loading user context:', err);
    }
  };

  // Subscribe to posts
  useEffect(() => {
    if (!user) {
      setPosts([]);
      setLoading(false);
      return;
    }

    // Build query for feed posts
    // Posts from: user's own posts, connection posts, and group posts
    const postsRef = collection(db, 'posts');

    // Temporarily fetch without orderBy to test
    // const q = query(postsRef, orderBy('createdAt', 'desc'));
    const q = query(postsRef); // Simplified query for debugging

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

          // Enrich posts with author info
          const enrichedPosts = await Promise.all(
            feedPosts.map(async (post) => {
              const authorId = post.authorId || post.userId;
              const author = authorId ? await getUserById(authorId) : null;

              return {
                ...post,
                author: author || undefined,
                isLiked: post.likes?.includes(user.uid) || false,
                likesCount: post.likes?.length || 0,
                commentsCount: post.comments?.length || 0,
              };
            })
          );

          setPosts(enrichedPosts);
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
  }, [user, connectionIds, groupIds]);

  const handleCreatePost = async (content: string, groupId?: string) => {
    if (!user) return;

    try {
      await createPost({
        userId: user.uid,
        content,
        groupId,
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
    if (!user) return;

    try {
      await addCommentToPost(postId, {
        userId: user.uid,
        text,
      });
    } catch (err) {
      console.error('Error commenting on post:', err);
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
