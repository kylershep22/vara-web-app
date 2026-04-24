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

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      imagePreview.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      });
    };
  }, [imagePreview]);

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Filter out HEIC files (not supported in most browsers)
      const validFiles = files.filter(file => {
        const ext = file.name.toLowerCase().split('.').pop();
        if (ext === 'heic' || ext === 'heif') {
          alert(`${file.name} is in HEIC format which isn't supported. Please convert to JPEG or PNG first.`);
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        setSelectedImages(prev => [...prev, ...validFiles].slice(0, 4)); // Max 4 images

        // Create preview URLs
        const previews = validFiles.map(file => URL.createObjectURL(file));
        setImagePreview(prev => [...prev, ...previews].slice(0, 4));
      }
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
      const imageRef = ref(storage, `groupPosts/${groupId}/${user.uid}/${Date.now()}_${index}`);
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
      <div className="flex justify-center items-center min-h-screen bg-mist-white">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-evergreen-teal mx-auto mb-vara-base" />
          <p className="text-muted-sage-gray">Loading group forum...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist-white">
      <div className="max-w-2xl mx-auto py-6 px-vara-base">
        {/* Group Header */}
        <div className="bg-white rounded-vara-lg shadow-vara-sm p-vara-lg mb-vara-lg border">
          <div className="flex items-center gap-vara-base mb-vara-base">
            <div className="w-16 h-16 bg-teal-light rounded-full flex items-center justify-center text-vara-xl">
              {group?.emoji || '👥'}
            </div>
            <div>
              <h1 className="text-vara-xl font-bold text-soft-charcoal">{group?.name}</h1>
              <div className="flex items-center gap-vara-sm text-muted-sage-gray">
                <Users className="w-4 h-4" />
                <span className="text-vara-sm">{group?.memberCount || 0} members</span>
              </div>
            </div>
          </div>
          <p className="text-soft-charcoal">{group?.description}</p>
        </div>

        {/* Create Post */}
        <div className="bg-white rounded-vara-lg shadow-vara-sm p-vara-base mb-vara-lg border">
          <form onSubmit={handlePostSubmit}>
            <div className="flex gap-vara-md mb-vara-base">
              <img
                src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'You')}&background=10b981&color=fff`}
                alt="Your avatar"
                className="w-10 h-10 rounded-full object-cover"
              />
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="What's on your mind?"
                className="flex-1 border-none resize-none focus:outline-none placeholder-muted-sage-gray text-soft-charcoal"
                rows={3}
              />
            </div>

            {/* Image Previews */}
            {imagePreview.length > 0 && (
              <div className="mb-vara-base">
                <div className={`grid gap-vara-sm ${imagePreview.length === 1 ? 'grid-cols-1' : imagePreview.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                  {imagePreview.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-48 object-cover rounded-vara-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-2 right-2 bg-soft-charcoal bg-opacity-60 text-white rounded-full p-1 hover:bg-opacity-80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-divider">
              <div className="flex items-center gap-vara-base">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-vara-sm text-muted-sage-gray hover:text-evergreen-teal transition-colors"
                >
                  <ImageIcon className="w-5 h-5" />
                  <span className="text-vara-sm font-medium">Photo</span>
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
                className="bg-evergreen-teal text-white px-vara-lg py-2 rounded-full font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPosting ? (
                  <div className="flex items-center gap-vara-sm">
                    <Loader className="w-4 h-4 animate-spin" />
                    Posting...
                  </div>
                ) : (
                  'Post'
                )}
              </button>
            </div>
            <p className="text-vara-xs text-muted-sage-gray mt-2">
              Posts are reviewed by automated moderation.
            </p>
          </form>
        </div>

        {/* Posts Feed */}
        <div className="space-y-6">
          {posts.map(post => {
            const authorInfo = getUserDisplayInfo(post.authorId);
            const totalReactions = Object.values(post.reactions || {}).reduce((sum, arr) => sum + arr.length, 0);
            const userLiked = post.likes?.includes(user.uid);
            
            return (
              <div key={post.id} className="bg-white rounded-vara-lg shadow-vara-sm border hover:shadow-vara-md transition-shadow">
                {/* Post Header */}
                <div className="p-vara-base pb-0">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-vara-md">
                      <img
                        src={authorInfo.avatar}
                        alt={authorInfo.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-semibold text-soft-charcoal">{authorInfo.name}</h3>
                        <p className="text-vara-sm text-muted-sage-gray">{formatTimeAgo(post.timestamp)}</p>
                      </div>
                    </div>
                    <button className="text-muted-sage-gray hover:text-muted-sage-gray p-2">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Post Content */}
                  {post.content && (
                    <p className="text-soft-charcoal mb-3 whitespace-pre-wrap leading-relaxed">
                      {post.content}
                    </p>
                  )}
                </div>

                {/* Post Images */}
                {post.images && post.images.length > 0 && (
                  <div className="px-vara-base pb-3">
                    <div className={`grid gap-1 rounded-vara-md overflow-hidden ${post.images.length === 1 ? 'grid-cols-1' : post.images.length === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
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
                  <div className="px-vara-base py-2 flex items-center justify-between text-vara-sm text-muted-sage-gray border-b border-divider">
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
                <div className="px-vara-base py-3 flex items-center justify-around border-b border-divider">
                  <button
                    onClick={() => handleLike(post.id, post.likes || [])}
                    className={`flex items-center gap-vara-sm px-vara-base py-2 rounded-vara-md transition-colors ${
                      userLiked 
                        ? 'text-evergreen-teal bg-teal-light hover:bg-teal-light' 
                        : 'text-muted-sage-gray hover:bg-dew-sage-light'
                    }`}
                  >
                    <ThumbsUp className={`w-5 h-5 ${userLiked ? 'fill-current' : ''}`} />
                    <span className="font-medium">Like</span>
                  </button>
                  
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-vara-sm px-vara-base py-2 rounded-vara-md text-muted-sage-gray hover:bg-dew-sage-light transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="font-medium">Comment</span>
                  </button>
                  
                  <button className="flex items-center gap-vara-sm px-vara-base py-2 rounded-vara-md text-muted-sage-gray hover:bg-dew-sage-light transition-colors">
                    <Share2 className="w-5 h-5" />
                    <span className="font-medium">Share</span>
                  </button>
                </div>

                {/* Comments Section */}
                {showComments[post.id] && (
                  <div className="px-vara-base py-3">
                    {/* Add Comment */}
                    <div className="flex gap-vara-md mb-vara-base">
                      <img
                        src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'You')}&background=10b981&color=fff`}
                        alt="Your avatar"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex-1 flex gap-vara-sm">
                        <input
                          type="text"
                          placeholder="Write a comment..."
                          value={commentText[post.id] || ''}
                          onChange={(e) => setCommentText(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit(post.id)}
                          className="flex-1 bg-dew-sage-light rounded-full px-vara-base py-2 text-vara-sm focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
                        />
                        <button
                          onClick={() => handleCommentSubmit(post.id)}
                          className="text-evergreen-teal hover:text-evergreen-teal p-2"
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
                              <div className="flex gap-vara-md">
                                <img
                                  src={commentAuthor.avatar}
                                  alt={commentAuthor.name}
                                  className="w-8 h-8 rounded-full object-cover"
                                />
                                <div className="flex-1">
                                  <div className="bg-dew-sage-light rounded-vara-lg px-vara-base py-2">
                                    <p className="font-semibold text-vara-sm text-soft-charcoal">{commentAuthor.name}</p>
                                    <p className="text-soft-charcoal">{comment.text}</p>
                                  </div>
                                  <div className="flex items-center gap-vara-base mt-1 text-vara-xs text-muted-sage-gray">
                                    <span>{formatTimeAgo(comment.timestamp)}</span>
                                    <button 
                                      className={`hover:underline ${commentLiked ? 'text-evergreen-teal font-medium' : ''}`}
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
                                    <div className="mt-2 flex gap-vara-sm">
                                      <img
                                        src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'You')}&background=10b981&color=fff`}
                                        alt="Your avatar"
                                        className="w-6 h-6 rounded-full object-cover"
                                      />
                                      <div className="flex-1 flex gap-vara-sm">
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
                                          className="flex-1 bg-dew-sage-light rounded-full px-3 py-1 text-vara-sm focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
                                        />
                                        <button
                                          className="text-evergreen-teal hover:text-evergreen-teal p-1"
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
                                      <div key={reply.id || replyIdx} className="flex gap-vara-md">
                                        <img
                                          src={replyAuthor.avatar}
                                          alt={replyAuthor.name}
                                          className="w-6 h-6 rounded-full object-cover"
                                        />
                                        <div className="flex-1">
                                          <div className="bg-dew-sage-light rounded-vara-lg px-vara-base py-2">
                                            <p className="font-semibold text-vara-sm text-soft-charcoal">{replyAuthor.name}</p>
                                            <p className="text-soft-charcoal text-vara-sm">{reply.text}</p>
                                          </div>
                                          <div className="flex items-center gap-vara-base mt-1 text-vara-xs text-muted-sage-gray">
                                            <span>{formatTimeAgo(reply.timestamp)}</span>
                                            <button 
                                              className={`hover:underline ${replyLiked ? 'text-evergreen-teal font-medium' : ''}`}
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
            <div className="w-16 h-16 bg-dew-sage-light rounded-full flex items-center justify-center mx-auto mb-vara-base">
              <MessageCircle className="w-8 h-8 text-muted-sage-gray" />
            </div>
            <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-2">No posts yet</h3>
            <p className="text-muted-sage-gray">Be the first to share something with the group!</p>
          </div>
        )}
      </div>
    </div>
  );
}
