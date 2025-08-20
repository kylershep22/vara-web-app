import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { db, storage } from '../../firebase';
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
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '../../context/AuthContext';
import { 
  Loader, 
  ThumbsUp, 
  MessageCircle, 
  Share2, 
  Image as ImageIcon, 
  X, 
  MoreHorizontal,
  Heart,
  Smile,
  Send,
  Camera,
  Users
} from 'lucide-react';
import { toggleCommentLike } from '../../services/communityService';

export default function GroupForumPage() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState({}); // Cache for user data
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [commentText, setCommentText] = useState({});
  const [showComments, setShowComments] = useState({});
  const [isPosting, setIsPosting] = useState(false);
  const [imagePreview, setImagePreview] = useState([]);
  const [replyText, setReplyText] = useState({});
  const [activeReply, setActiveReply] = useState(null); // comment key being replied to
  const fileInputRef = useRef(null);

  // Fetch user data for display names and avatars
  const fetchUserData = async (userId) => {
    if (users[userId]) return users[userId];
    
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = { id: userId, ...userDoc.data() };
        setUsers(prev => ({ ...prev, [userId]: userData }));
        return userData;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
    return { id: userId, displayName: 'Unknown User', photoURL: null };
  };

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

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData);
      
      // Fetch user data for all unique authors and commenters
      const userIds = new Set();
      postsData.forEach(post => {
        userIds.add(post.authorId);
        post.comments?.forEach(comment => {
          userIds.add(comment.authorId);
          comment.replies?.forEach(reply => userIds.add(reply.authorId));
        });
      });
      
      // Fetch missing user data
      userIds.forEach(userId => {
        if (!users[userId]) {
          fetchUserData(userId);
        }
      });
    });

    return () => unsubscribe();
  }, [groupId, users]);

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSelectedImages(prev => [...prev, ...files].slice(0, 4)); // Max 4 images
      
      // Create preview URLs
      const previews = files.map(file => URL.createObjectURL(file));
      setImagePreview(prev => [...prev, ...previews].slice(0, 4));
    }
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreview(prev => {
      URL.revokeObjectURL(prev[index]); // Clean up memory
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadImages = async (images) => {
    const uploadPromises = images.map(async (image, index) => {
      const imageRef = ref(storage, `groupPosts/${groupId}/${Date.now()}_${index}`);
      await uploadBytes(imageRef, image);
      return await getDownloadURL(imageRef);
    });
    return await Promise.all(uploadPromises);
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim() && selectedImages.length === 0) return;

    setIsPosting(true);
    try {
      let imageUrls = [];
      if (selectedImages.length > 0) {
        imageUrls = await uploadImages(selectedImages);
      }

      await addDoc(collection(db, 'groupPosts'), {
        groupId,
        authorId: user.uid,
        content: newPost.trim(),
        images: imageUrls,
        timestamp: serverTimestamp(),
        likes: [],
        comments: [],
        reactions: {
          like: [],
          love: [],
          laugh: []
        }
      });

      // Reset form
      setNewPost('');
      setSelectedImages([]);
      setImagePreview([]);
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleReaction = async (postId, reactionType, currentReactions) => {
    const postRef = doc(db, 'groupPosts', postId);
    const userReacted = currentReactions[reactionType]?.includes(user.uid);
    
    if (userReacted) {
      // Remove reaction
      await updateDoc(postRef, {
        [`reactions.${reactionType}`]: arrayRemove(user.uid)
      });
    } else {
      // Add reaction (remove from other reactions first)
      const updates = {};
      Object.keys(currentReactions).forEach(type => {
        if (currentReactions[type].includes(user.uid)) {
          updates[`reactions.${type}`] = arrayRemove(user.uid);
        }
      });
      updates[`reactions.${reactionType}`] = arrayUnion(user.uid);
      await updateDoc(postRef, updates);
    }
  };

  const handleLike = async (postId, currentLikes) => {
    const postRef = doc(db, 'groupPosts', postId);
    if (currentLikes.includes(user.uid)) {
      await updateDoc(postRef, {
        likes: arrayRemove(user.uid)
      });
    } else {
      await updateDoc(postRef, {
        likes: arrayUnion(user.uid)
      });
    }
  };

  const handleCommentSubmit = async (postId) => {
    const commentContent = commentText[postId]?.trim();
    if (!commentContent) return;

    const postRef = doc(db, 'groupPosts', postId);
    const newComment = {
      id: Date.now().toString(),
      authorId: user.uid,
      text: commentContent,
      timestamp: new Date(),
      likes: [],
      replies: []
    };

    await updateDoc(postRef, {
      comments: arrayUnion(newComment)
    });

    setCommentText(prev => ({ ...prev, [postId]: '' }));
  };

  const handleReplySubmit = async (postId, commentIndex) => {
    const commentKey = `${postId}_${commentIndex}`;
    const text = replyText[commentKey]?.trim();
    if (!text) return;

    const postRef = doc(db, 'groupPosts', postId);
    const postSnapshot = await getDoc(postRef);
    const postData = postSnapshot.data();
    const updatedComments = [...(postData.comments || [])];
    const commentToUpdate = updatedComments[commentIndex];

    if (!commentToUpdate.replies) commentToUpdate.replies = [];
    commentToUpdate.replies.push({
      id: Date.now().toString(),
      authorId: user.uid,
      text,
      timestamp: new Date(),
      likes: []
    });

    await updateDoc(postRef, {
      comments: updatedComments
    });

    setReplyText(prev => ({ ...prev, [commentKey]: '' }));
    setActiveReply(null);
  };

  const handleReplyLike = async (postId, commentIndex, replyIndex, currentLikes) => {
    const postRef = doc(db, 'groupPosts', postId);
    const postSnapshot = await getDoc(postRef);
    const postData = postSnapshot.data();
    const updatedComments = [...(postData.comments || [])];
    const reply = updatedComments[commentIndex].replies[replyIndex];

    if (currentLikes.includes(user.uid)) {
      reply.likes = reply.likes.filter(uid => uid !== user.uid);
    } else {
      reply.likes.push(user.uid);
    }

    await updateDoc(postRef, {
      comments: updatedComments
    });
  };

  const handleCommentLike = async (postId, commentIndex) => {
  try {
    await toggleCommentLike(postId, commentIndex, user.uid);

    // Update local UI
    setPosts(prev =>
      prev.map(post => {
        if (post.id !== postId) return post;

        const updatedComments = [...(post.comments || [])];
        const likes = new Set(updatedComments[commentIndex]?.likes || []);

        if (likes.has(user.uid)) {
          likes.delete(user.uid);
        } else {
          likes.add(user.uid);
        }

        updatedComments[commentIndex].likes = Array.from(likes);

        return {
          ...post,
          comments: updatedComments
        };
      })
    );
  } catch (err) {
    console.error('Error toggling comment like:', err);
  }
};

  const toggleComments = (postId) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const now = new Date();
    const posted = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffInMinutes = Math.floor((now - posted) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const getUserDisplayInfo = (userId) => {
    const userData = users[userId];
    return {
      name: userData?.displayName || userData?.name || 'User',
      avatar: userData?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.displayName || 'User')}&background=10b981&color=fff`
    };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading group forum...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto py-6 px-4">
        {/* Group Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6 border">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-2xl">
              {group?.emoji || '👥'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{group?.name}</h1>
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4" />
                <span className="text-sm">{group?.memberCount || 0} members</span>
              </div>
            </div>
          </div>
          <p className="text-gray-700">{group?.description}</p>
        </div>

        {/* Create Post */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border">
          <form onSubmit={handlePostSubmit}>
            <div className="flex gap-3 mb-4">
              <img
                src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'You')}&background=10b981&color=fff`}
                alt="Your avatar"
                className="w-10 h-10 rounded-full object-cover"
              />
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="What's on your mind?"
                className="flex-1 border-none resize-none focus:outline-none placeholder-gray-500 text-gray-900"
                rows={3}
              />
            </div>

            {/* Image Previews */}
            {imagePreview.length > 0 && (
              <div className="mb-4">
                <div className={`grid gap-2 ${imagePreview.length === 1 ? 'grid-cols-1' : imagePreview.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                  {imagePreview.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-gray-900 bg-opacity-60 text-white rounded-full p-1 hover:bg-opacity-80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-colors"
                >
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">Photo</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageSelect}
                  className="hidden"
                />
              </div>
              
              <button
                type="submit"
                disabled={isPosting || (!newPost.trim() && selectedImages.length === 0)}
                className="bg-emerald-600 text-white px-6 py-2 rounded-full font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPosting ? (
                  <div className="flex items-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" />
                    Posting...
                  </div>
                ) : (
                  'Post'
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Posts Feed */}
        <div className="space-y-6">
          {posts.map(post => {
            const authorInfo = getUserDisplayInfo(post.authorId);
            const totalReactions = Object.values(post.reactions || {}).reduce((sum, arr) => sum + arr.length, 0);
            const userLiked = post.likes?.includes(user.uid);
            
            return (
              <div key={post.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-shadow">
                {/* Post Header */}
                <div className="p-4 pb-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={authorInfo.avatar}
                        alt={authorInfo.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">{authorInfo.name}</h3>
                        <p className="text-sm text-gray-500">{formatTimeAgo(post.timestamp)}</p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 p-2">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Post Content */}
                  {post.content && (
                    <p className="text-gray-900 mb-3 whitespace-pre-wrap leading-relaxed">
                      {post.content}
                    </p>
                  )}
                </div>

                {/* Post Images */}
                {post.images && post.images.length > 0 && (
                  <div className="px-4 pb-3">
                    <div className={`grid gap-1 rounded-lg overflow-hidden ${post.images.length === 1 ? 'grid-cols-1' : post.images.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                      {post.images.map((imageUrl, index) => (
                        <img
                          key={index}
                          src={imageUrl}
                          alt={`Post image ${index + 1}`}
                          className="w-full h-64 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                          onClick={() => window.open(imageUrl, '_blank')}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Reaction Summary */}
                {(post.likes?.length > 0 || post.comments?.length > 0) && (
                  <div className="px-4 py-2 flex items-center justify-between text-sm text-gray-500 border-b border-gray-100">
                    <div className="flex items-center gap-1">
                      {post.likes?.length > 0 && (
                        <span>{post.likes.length} like{post.likes.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {post.comments?.length > 0 && (
                      <button
                        onClick={() => toggleComments(post.id)}
                        className="hover:underline"
                      >
                        {post.comments.length} comment{post.comments.length !== 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="px-4 py-3 flex items-center justify-around border-b border-gray-100">
                  <button
                    onClick={() => handleLike(post.id, post.likes || [])}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      userLiked 
                        ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <ThumbsUp className={`w-5 h-5 ${userLiked ? 'fill-current' : ''}`} />
                    <span className="font-medium">Like</span>
                  </button>
                  
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="font-medium">Comment</span>
                  </button>
                  
                  <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
                    <Share2 className="w-5 h-5" />
                    <span className="font-medium">Share</span>
                  </button>
                </div>

                {/* Comments Section */}
                {showComments[post.id] && (
                  <div className="px-4 py-3">
                    {/* Add Comment */}
                    <div className="flex gap-3 mb-4">
                      <img
                        src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'You')}&background=10b981&color=fff`}
                        alt="Your avatar"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={commentText[post.id] || ''}
                          onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit(post.id)}
                          className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                        />
                        <button
                          onClick={() => handleCommentSubmit(post.id)}
                          className="text-emerald-600 hover:text-emerald-700 p-2"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Comments List */}
                    {post.comments?.length > 0 && (
                      <div className="space-y-3">
                        {post.comments.map((comment, index) => {
                          const commentAuthor = getUserDisplayInfo(comment.authorId);
                          const commentLiked = comment.likes?.includes(user.uid);
                          return (
                            <div key={comment.id || index}>
                              {/* Main Comment */}
                              <div className="flex gap-3">
                                <img
                                  src={commentAuthor.avatar}
                                  alt={commentAuthor.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                                <div className="flex-1">
                                  <div className="bg-gray-100 rounded-2xl px-4 py-2">
                                    <p className="font-semibold text-sm text-gray-900">{commentAuthor.name}</p>
                                    <p className="text-gray-800">{comment.text}</p>
                                  </div>
                                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                    <span>{formatTimeAgo(comment.timestamp)}</span>
                                    <button 
                                      className={`hover:underline ${commentLiked ? 'text-emerald-600 font-medium' : ''}`}
                                      onClick={() => handleCommentLike(post.id, index, comment.likes || [])}
                                    >
                                      Like
                                      {comment.likes?.length > 0 && (
                                        <span className="ml-1">({comment.likes.length})</span>
                                      )}
                                    </button>
                                    <button 
                                      className="hover:underline" 
                                      onClick={() => setActiveReply(`${post.id}_${index}`)}
                                    >
                                      Reply
                                    </button>
                                  </div>
                                  
                                  {/* Reply Input */}
                                  {activeReply === `${post.id}_${index}` && (
                                    <div className="mt-2 flex gap-2">
                                      <img
                                        src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'You')}&background=10b981&color=fff`}
                                        alt="Your avatar"
                                        className="w-6 h-6 rounded-full object-cover"
                                      />
                                      <div className="flex-1 flex gap-2">
                                        <input
                                          type="text"
                                          value={replyText[`${post.id}_${index}`] || ''}
                                          onChange={(e) => setReplyText(prev => ({
                                            ...prev,
                                            [`${post.id}_${index}`]: e.target.value
                                          }))}
                                          placeholder="Write a reply..."
                                          onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                              handleReplySubmit(post.id, index, replyText[`${post.id}_${index}`]);
                                            }
                                          }}
                                          className="flex-1 bg-gray-100 rounded-full px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                                        />
                                        <button
                                          className="text-emerald-600 hover:text-emerald-700 p-1"
                                          onClick={() => handleReplySubmit(post.id, index, replyText[`${post.id}_${index}`])}
                                        >
                                          <Send className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Replies */}
                              {comment.replies?.length > 0 && (
                                <div className="ml-11 mt-3 space-y-3">
                                  {comment.replies.map((reply, replyIdx) => {
                                    const replyAuthor = getUserDisplayInfo(reply.authorId);
                                    const replyLiked = reply.likes?.includes(user.uid);
                                    return (
                                      <div key={reply.id || replyIdx} className="flex gap-3">
                                        <img
                                          src={replyAuthor.avatar}
                                          alt={replyAuthor.name}
                                          className="w-6 h-6 rounded-full object-cover"
                                        />
                                        <div className="flex-1">
                                          <div className="bg-gray-100 rounded-2xl px-4 py-2">
                                            <p className="font-semibold text-sm text-gray-900">{replyAuthor.name}</p>
                                            <p className="text-gray-800 text-sm">{reply.text}</p>
                                          </div>
                                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                            <span>{formatTimeAgo(reply.timestamp)}</span>
                                            <button 
                                              className={`hover:underline ${replyLiked ? 'text-emerald-600 font-medium' : ''}`}
                                              onClick={() => handleReplyLike(post.id, index, replyIdx, reply.likes || [])}
                                            >
                                              Like
                                              {reply.likes?.length > 0 && (
                                                <span className="ml-1">({reply.likes.length})</span>
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {posts.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-600">Be the first to share something with the group!</p>
          </div>
        )}
      </div>
    </div>
  );
}
