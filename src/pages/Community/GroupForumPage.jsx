import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../../firebase';
import {
  collection,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { Loader, ThumbsUp } from 'lucide-react';

export default function GroupForumPage() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [commentText, setCommentText] = useState({});

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const docRef = doc(db, 'groups', groupId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          setGroup({ id: snapshot.id, ...snapshot.data() });
        }
      } catch (error) {
        console.error('Error loading group:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [groupId]);

  useEffect(() => {
    const q = query(
      collection(db, 'groupPosts'),
      where('groupId', '==', groupId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData);
    });

    return () => unsubscribe();
  }, [groupId]);

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;

    await addDoc(collection(db, 'groupPosts'), {
      groupId,
      authorId: user.uid,
      content: newPost.trim(),
      timestamp: serverTimestamp(),
      likes: [],
      comments: []
    });

    setNewPost('');
  };

  const handleLike = async (postId, currentLikes) => {
    const postRef = doc(db, 'groupPosts', postId);
    if (!currentLikes.includes(user.uid)) {
      await updateDoc(postRef, {
        likes: arrayUnion(user.uid)
      });
    }
  };

  const handleCommentSubmit = async (postId) => {
    const postRef = doc(db, 'groupPosts', postId);
    const newComment = {
      authorId: user.uid,
      text: commentText[postId]?.trim(),
      timestamp: serverTimestamp()
    };

    if (!newComment.text) return;

    await updateDoc(postRef, {
      comments: arrayUnion(newComment)
    });

    setCommentText((prev) => ({ ...prev, [postId]: '' }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-emerald-800 mb-2 flex items-center gap-2">
        <span>{group.emoji || '👥'}</span>
        {group.name}
      </h1>
      <p className="text-gray-600 mb-6">{group.description}</p>

      <form onSubmit={handlePostSubmit} className="mb-6">
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          placeholder="Share something with the group..."
          className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-emerald-400"
          rows={3}
        />
        <button
          type="submit"
          className="mt-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 font-semibold"
        >
          Post
        </button>
      </form>

      <div className="space-y-4">
        {posts.map(post => (
          <div key={post.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{post.content}</p>
            <div className="text-xs text-gray-400 mt-2">
              Posted by {post.authorId} • {new Date(post.timestamp?.toDate()).toLocaleString()}
            </div>
            <div className="mt-3 flex items-center gap-3 text-sm text-gray-500">
              <button
                onClick={() => handleLike(post.id, post.likes || [])}
                className="flex items-center gap-1 hover:text-emerald-600"
              >
                <ThumbsUp className="w-4 h-4" /> {post.likes?.length || 0} Like{post.likes?.length === 1 ? '' : 's'}
              </button>
            </div>

            {/* Comment Section */}
            <div className="mt-4">
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentText[post.id] || ''}
                onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-emerald-400"
              />
              <button
                onClick={() => handleCommentSubmit(post.id)}
                className="mt-2 text-sm bg-emerald-500 text-white px-3 py-1 rounded-lg hover:bg-emerald-600"
              >
                Comment
              </button>
            </div>

            {post.comments?.length > 0 && (
              <div className="mt-4 space-y-2">
                {post.comments.map((comment, index) => (
                  <div key={index} className="text-sm text-gray-700 bg-gray-100 p-2 rounded-md">
                    <div className="font-medium">{comment.authorId}</div>
                    <div>{comment.text}</div>
                    <div className="text-xs text-gray-400">
                      {comment.timestamp?.toDate && new Date(comment.timestamp.toDate()).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
