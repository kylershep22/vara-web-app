import React, { useEffect, useState, useRef } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  MessageCircle, 
  Lock, 
  Globe, 
  Star,
  TrendingUp,
  UserPlus,
  Settings,
  Eye,
  EyeOff,
  ThumbsUp,
  Share2,
  MoreHorizontal,
  Heart,
  Send,
  Image,
  X,
  Bell,
  UserCheck,
  MessageSquare,
  Video,
  Phone,
  Loader,
  ChevronDown,
  Smile
} from 'lucide-react';
import {
  fetchUserGroups,
  fetchPublicGroups,
  fetchUserConnections,
  fetchFeedPosts,
  getUserById
} from '../../services/communityService';
import { createPost } from '../../services/communityService';
import { addCommentToPost } from '../../services/communityService';
import { useAuth } from '../../context/AuthContext';

const CommunityPage = () => {
  const { user, isAuthReady } = useAuth();
  // State management
  const [showModal, setShowModal] = useState(false);
  const [groups, setGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('feed'); // feed, discover, messages
  
  // Posts feed state
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [isPosting, setIsPosting] = useState(false);
  const [commentText, setCommentText] = useState({});
  const [showComments, setShowComments] = useState({});
  const [replyText, setReplyText] = useState({});
  const [activeReply, setActiveReply] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  
  // Direct messages state
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  
  // Connections and invitations
  const [connections, setConnections] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [showInvitations, setShowInvitations] = useState(false);
  
  const fileInputRef = useRef(null);

  // Load data from Firebase
  useEffect(() => {
  if (!isAuthReady || !user?.uid) {
    console.log("❌ Auth not ready or no user.uid, aborting community data load");
    return;
  }

  const loadCommunityData = async () => {
    setLoading(true);
    console.log("🚀 START: loadCommunityData");

    try {
      console.log("📌 Fetching user groups...");
      const userGroups = await fetchUserGroups(user.uid);
      console.log("✅ User groups:", userGroups);

      console.log("📌 Fetching public groups...");
      const publicGroups = await fetchPublicGroups();
      console.log("✅ Public groups:", publicGroups);

      const allGroups = [...userGroups, ...publicGroups];
      const uniqueGroups = allGroups.filter(
        (group, index, self) =>
          index === self.findIndex((g) => g.id === group.id)
      );
      setGroups(uniqueGroups);
      console.log("✅ Combined + set unique groups");

      console.log("📌 Fetching feed posts...");
      const feedPosts = await fetchFeedPosts(user.uid);
      console.log("✅ Feed posts:", feedPosts);
      setPosts(feedPosts);

      console.log("📌 Extracting user IDs from posts/comments...");
      const userIds = new Set([
        ...feedPosts.map((post) => post.authorId),
        ...feedPosts.flatMap((post) => post.comments?.map((c) => c.authorId) || []),
      ]);
      console.log("✅ User IDs found:", [...userIds]);

      const usersData = {};

      await Promise.all(
        Array.from(userIds).map(async (userId) => {
          if (userId && userId !== user.uid) {
            try {
              const userData = await getUserById(userId);
              if (userData) {
                usersData[userId] = userData;
                console.log(`✅ Fetched user data for ${userId}`);
              } else {
                console.warn(`⚠️ No user data found for ${userId}`);
              }
            } catch (error) {
              console.error(`❌ Error fetching user ${userId}:`, error);
            }
          }
        })
      );

      usersData[user.uid] = {
        id: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
      };

      setUsers(usersData);
      console.log("✅ All users set to state");

    } catch (error) {
      console.error("❌ loadCommunityData error:", error);
    } finally {
      console.log("🏁 FINISHED: loadCommunityData");
      setLoading(false);
    }
  };

  loadCommunityData();
}, [user?.uid, isAuthReady]); 

  // Handle post creation
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim() && selectedImages.length === 0) return;

    setIsPosting(true);

    try {
      const postId = await createPost({
        authorId: user.uid,
        content: newPost.trim(),
        images: imagePreview,
        groupId: selectedGroupId
      });

      // Optimistic UI update
      const newPostObj = {
        id: postId,
        authorId: user.uid,
        content: newPost.trim(),
        images: imagePreview,
        groupId: selectedGroupId,
        likes: [],
        comments: [],
        timestamp: new Date(),
        groupInfo: selectedGroupId ? groups.find(g => g.id === selectedGroupId) : null
      };

      setPosts(prev => [newPostObj, ...prev]);
      setNewPost('');
      setSelectedImages([]);
      setImagePreview([]);
    } catch (err) {
      console.error('Failed to create post:', err);
    }

    setIsPosting(false);
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSelectedImages(prev => [...prev, ...files].slice(0, 4));
      const previews = files.map(file => URL.createObjectURL(file));
      setImagePreview(prev => [...prev, ...previews].slice(0, 4));
    }
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreview(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleLike = (postId, currentLikes) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const userLiked = currentLikes.includes(user.uid);
        return {
          ...post,
          likes: userLiked 
            ? currentLikes.filter(id => id !== user.uid)
            : [...currentLikes, user.uid]
        };
      }
      return post;
    }));
  };

  const handleCommentSubmit = async (postId, commentContent, clearInput) => {
    const trimmed = commentContent?.trim();
    if (!trimmed) return;

    const newComment = {
      id: Date.now().toString(),
      authorId: user.uid,
      text: trimmed,
      timestamp: new Date(),
      likes: [],
      replies: []
    };

    try {
      // Save comment to Firestore
      await addCommentToPost(postId, newComment);

      // Update local state
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [...(post.comments || []), newComment]
          };
        }
        return post;
      }));

      clearInput('');
    } catch (error) {
      console.error('Error saving comment:', error);
    }
  };

  const toggleComments = (postId) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const now = new Date();
    const posted = new Date(timestamp);
    const diffInMinutes = Math.floor((now - posted) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const getUserDisplayInfo = (userId) => {
    const userData = users[userId];
    return {
      name: userData?.displayName || 'User',
      avatar: userData?.photoURL || `https://ui-avatars.com/api/?name=User&background=10b981&color=fff`
    };
  };

  const handleJoinGroup = async (groupId, isMember) => {
    // TODO: Implement actual Firebase group join/leave logic
    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        const newMembers = isMember 
          ? group.members.filter(id => id !== user.uid)
          : [...group.members, user.uid];
        return {
          ...group,
          members: newMembers,
          memberCount: newMembers.length
        };
      }
      return group;
    }));
  };

  const PostCard = ({ post, isGroupPost = true }) => {
    const [localComment, setLocalComment] = useState('');
    const authorInfo = getUserDisplayInfo(post.authorId);
    const userLiked = post.likes?.includes(user.uid);
    
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
        {/* Post Header */}
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <img
                src={authorInfo.avatar}
                alt={authorInfo.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{authorInfo.name}</h3>
                  {isGroupPost && post.groupInfo && (
                    <>
                      <span className="text-gray-400">→</span>
                      <span className="text-emerald-600 font-medium text-sm">
                        {post.groupInfo.name}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-500">{formatTimeAgo(post.timestamp)}</p>
              </div>
            </div>
            <button className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100">
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
            <div className={`grid gap-1 rounded-xl overflow-hidden ${
              post.images.length === 1 ? 'grid-cols-1' : 
              post.images.length === 2 ? 'grid-cols-2' : 
              'grid-cols-2'
            }`}>
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

        {/* Engagement Stats */}
        {(post.likes?.length > 0 || post.comments?.length > 0) && (
          <div className="px-4 py-2 flex items-center justify-between text-sm text-gray-500 border-t border-gray-50">
            <div className="flex items-center gap-1">
              {post.likes?.length > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <ThumbsUp className="w-3 h-3 text-white fill-current" />
                  </div>
                  <span>{post.likes.length}</span>
                </div>
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
        <div className="px-4 py-3 flex items-center justify-around border-t border-gray-50">
          <button
            onClick={() => handleLike(post.id, post.likes || [])}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
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
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">Comment</span>
          </button>
          
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-all">
            <Share2 className="w-5 h-5" />
            <span className="font-medium">Share</span>
          </button>
        </div>

        {/* Comments Section */}
        {showComments[post.id] && (
          <div className="px-4 pb-4 border-t border-gray-50">
            {/* Add Comment */}
            <div className="flex gap-3 pt-4 mb-4">
              <img
                src={user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'You')}&background=10b981&color=fff`}
                alt="Your avatar"
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={localComment}
                  onChange={(e) => setLocalComment(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCommentSubmit(post.id, localComment, setLocalComment)}
                  className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white"
                />
                <button
                  onClick={() => handleCommentSubmit(post.id, localComment, setLocalComment)}
                  className="text-emerald-600 hover:text-emerald-700 p-2 rounded-full hover:bg-emerald-50"
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
                  return (
                    <div key={comment.id || index} className="flex gap-3">
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
                          <button className="hover:underline">Like</button>
                          <button className="hover:underline">Reply</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const GroupCard = ({ group }) => {
    const isMember = group.members?.includes(user?.uid);
    const isCreator = group.createdBy === user?.uid;

    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl flex items-center justify-center text-xl shadow-sm">
            {group.emoji || '🌱'}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 hover:text-emerald-600 line-clamp-1 transition-colors cursor-pointer">
              {group.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {group.isPublic ? (
                <Globe className="w-3 h-3" />
              ) : (
                <Lock className="w-3 h-3" />
              )}
              <span>{group.memberCount || 0} members</span>
              {isCreator && <Star className="w-3 h-3 text-yellow-500 fill-current" />}
            </div>
          </div>
        </div>
        
        <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
          {group.description}
        </p>
        
        <div className="flex gap-2">
          <button
            onClick={() => handleJoinGroup(group.id, isMember)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${
              isMember
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
            }`}
          >
            {isMember ? 'Joined' : 'Join'}
          </button>
          <button className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
            View
          </button>
        </div>
      </div>
    );
  };

  const CreateGroupModal = ({ isOpen, onClose }) => {
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [groupEmoji, setGroupEmoji] = useState('🌱');
    const [isPublic, setIsPublic] = useState(true);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      // TODO: Implement actual Firebase group creation
      const newGroup = {
        id: `group${Date.now()}`, // This should come from Firebase
        name: groupName,
        description: groupDescription,
        emoji: groupEmoji,
        isPublic,
        memberCount: 1,
        createdBy: user.uid,
        members: [user.uid],
        category: 'general'
      };
      
      setGroups(prev => [newGroup, ...prev]);
      setGroupName('');
      setGroupDescription('');
      setGroupEmoji('🌱');
      setIsPublic(true);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Create New Group</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Emoji</label>
              <input
                type="text"
                value={groupEmoji}
                onChange={(e) => setGroupEmoji(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                maxLength={2}
              />
            </div>
            
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="text-emerald-600"
                />
                <span className="text-sm font-medium text-gray-700">Make this group public</span>
              </label>
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Create Group
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Show loading if user is not available yet
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading community...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Community</h1>
            <p className="text-gray-600">
              Connect, share, and grow together on your wellness journey.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {pendingInvitations.length > 0 && (
              <button
                onClick={() => setShowInvitations(!showInvitations)}
                className="relative flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 rounded-xl hover:bg-orange-100 transition-colors"
              >
                <Bell className="w-4 h-4" />
                <span className="font-medium">{pendingInvitations.length} Invites</span>
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                  {pendingInvitations.length}
                </div>
              </button>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Group</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
          {[
            { id: 'feed', label: 'Feed', icon: MessageCircle },
            { id: 'discover', label: 'Discover', icon: TrendingUp },
            { id: 'messages', label: 'Messages', icon: MessageSquare }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Feed - Left & Center */}
          <div className="lg:col-span-3">
            {activeTab === 'feed' && (
              <div className="space-y-6">
                {/* Create Post */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <form onSubmit={handlePostSubmit}>
                    <div className="flex gap-3 mb-4">
                     <div className="flex flex-col gap-2 w-full mb-4">
                      <div className="flex gap-3 items-start">
                        <img
                          src={user?.photoURL}
                          alt="Your avatar"
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                        />
                        <div className="flex-1 flex flex-col gap-2">
                          {/* Group Selector */}
                          <select
                            value={selectedGroupId || ''}
                            onChange={(e) => setSelectedGroupId(e.target.value || null)}
                            className="w-full text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="">🌍 Post publicly to your connections</option>
                            {groups
                              .filter(g => g.members?.includes(user.uid))
                              .map(group => (
                                <option key={group.id} value={group.id}>
                                  {group.emoji || '👥'} {group.name}
                                </option>
                              ))}
                          </select>

                          {/* Post Textarea */}
                          <textarea
                            value={newPost}
                            onChange={(e) => setNewPost(e.target.value)}
                            placeholder="What's on your mind? Share your wellness journey..."
                            className="flex-1 border-none resize-none focus:outline-none placeholder-gray-500 text-gray-900 text-lg"
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                    </div>

                    {/* Image Previews */}
                    {imagePreview.length > 0 && (
                      <div className="mb-4">
                        <div className={`grid gap-2 ${imagePreview.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          {imagePreview.map((preview, index) => (
                            <div key={index} className="relative">
                              <img
                                src={preview}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-48 object-cover rounded-xl"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-2 right-2 bg-gray-900 bg-opacity-60 text-white rounded-full p-1.5 hover:bg-opacity-80"
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
                          className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-colors px-3 py-2 rounded-lg hover:bg-emerald-50"
                        >
                          <Image className="w-5 h-5" />
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
                        className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
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
                {loading ? (
                  <div className="flex justify-center py-12">
                    <div className="text-center">
                      <Loader className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
                      <p className="text-gray-600">Loading your feed...</p>
                    </div>
                  </div>
                ) : posts.length > 0 ? (
                  <div className="space-y-6">
                    {posts.map(post => (
                      <PostCard key={post.id} post={post} isGroupPost={true} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Your feed is empty</h3>
                    <p className="text-gray-600 mb-4">Join some groups to see posts from your community!</p>
                    <button
                      onClick={() => setActiveTab('discover')}
                      className="bg-emerald-600 text-white px-6 py-2 rounded-xl hover:bg-emerald-700 transition-colors font-semibold"
                    >
                      Discover Groups
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Discover Tab */}
            {activeTab === 'discover' && (
              <div className="space-y-6">
                {/* Search Bar */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search groups, topics, or people..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-2xl shadow-sm">
                    <UserPlus className="w-8 h-8 mb-3" />
                    <h3 className="font-semibold mb-2">Find Partners</h3>
                    <p className="text-sm opacity-90">Connect with accountability partners</p>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-sm">
                    <Video className="w-8 h-8 mb-3" />
                    <h3 className="font-semibold mb-2">Live Sessions</h3>
                    <p className="text-sm opacity-90">Join live wellness sessions</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-sm">
                    <Settings className="w-8 h-8 mb-3" />
                    <h3 className="font-semibold mb-2">Create Group</h3>
                    <p className="text-sm opacity-90">Build your wellness community</p>
                  </div>
                </div>

                {/* Trending Groups */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Trending Groups</h2>
                  {groups.filter(group => group.isPublic).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {groups.filter(group => group.isPublic).slice(0, 6).map(group => (
                        <GroupCard key={group.id} group={group} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No public groups yet</h3>
                      <p className="text-gray-600">Be the first to create a public group!</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-96">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900">Messages</h2>
                    <button
                      onClick={() => setShowNewChatModal(true)}
                      className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition-colors text-sm font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      New Chat
                    </button>
                  </div>
                </div>
                <div className="p-6 flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No conversations yet</h3>
                  <p className="text-gray-600 mb-4">Start a conversation with your connections</p>
                  <button
                    onClick={() => setShowNewChatModal(true)}
                    className="bg-emerald-600 text-white px-6 py-2 rounded-xl hover:bg-emerald-700 transition-colors font-medium"
                  >
                    Start Chatting
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* My Groups */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">My Groups</h3>
                <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                  See all
                </button>
              </div>
              <div className="space-y-3">
                {groups.filter(group => group.members?.includes(user?.uid)).slice(0, 4).map(group => (
                  <div
                    key={group.id}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center text-sm shadow-sm">
                      {group.emoji || '🌱'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{group.name}</p>
                      <p className="text-xs text-gray-500">{group.memberCount || 0} members</p>
                    </div>
                  </div>
                ))}
                {groups.filter(group => group.members?.includes(user?.uid)).length === 0 && (
                  <div className="text-center py-6">
                    <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No groups joined yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Vara Connections */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Vara Connections</h3>
                <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
                  Find more
                </button>
              </div>
              <div className="space-y-3">
                {connections.slice(0, 5).map(connection => {
                  const otherUserId = connection.participants.find(id => id !== user?.uid);
                  const otherUser = users[otherUserId];
                  return (
                    <div key={connection.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                      <img
                        src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.displayName || 'User')}&background=10b981&color=fff`}
                        alt={otherUser?.displayName || 'User'}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{otherUser?.displayName || 'User'}</p>
                        <p className="text-xs text-gray-500">Connected</p>
                      </div>
                      <div className="flex gap-1">
                        <button className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Video className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {connections.length === 0 && (
                  <div className="text-center py-6">
                    <UserCheck className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No connections yet</p>
                    <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium mt-2">
                      Find connections
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Group Invitations */}
            {pendingInvitations.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <h3 className="font-bold text-gray-900 mb-4">Group Invitations</h3>
                <div className="space-y-3">
                  {pendingInvitations.slice(0, 3).map(invitation => (
                    <div key={invitation.id} className="p-3 bg-orange-50 rounded-xl border border-orange-100">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-8 h-8 bg-orange-200 rounded-lg flex items-center justify-center text-sm">
                          {invitation.groupEmoji || '🎯'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{invitation.groupName}</p>
                          <p className="text-xs text-gray-600">
                            Invited by {users[invitation.invitedBy]?.displayName || 'Someone'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button className="flex-1 bg-emerald-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                          Accept
                        </button>
                        <button className="flex-1 bg-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors">
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Groups */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-bold text-gray-900 mb-4">Suggested Groups</h3>
              <div className="space-y-3">
                {groups.filter(group => group.isPublic && !group.members?.includes(user?.uid)).slice(0, 3).map(group => (
                  <GroupCard key={group.id} group={group} />
                ))}
                {groups.filter(group => group.isPublic && !group.members?.includes(user?.uid)).length === 0 && (
                  <div className="text-center py-6">
                    <TrendingUp className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No suggestions available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white">
              <h3 className="font-bold mb-3">Your Community Impact</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-90">Groups Joined</span>
                  <span className="font-bold">{groups.filter(g => g.members?.includes(user?.uid)).length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-90">Connections</span>
                  <span className="font-bold">{connections.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm opacity-90">Posts This Month</span>
                  <span className="font-bold">{posts.filter(p => p.authorId === user.uid).length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Create Group Modal */}
        <CreateGroupModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />

        {/* New Chat Modal */}
        {showNewChatModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Start New Chat</h2>
                <button
                  onClick={() => setShowNewChatModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search connections..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
                
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {connections.map(connection => {
                    const otherUserId = connection.participants.find(id => id !== user?.uid);
                    const otherUser = users[otherUserId];
                    return (
                      <button
                        key={connection.id}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                      >
                        <img
                          src={otherUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.displayName || 'User')}&background=10b981&color=fff`}
                          alt={otherUser?.displayName || 'User'}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{otherUser?.displayName || 'User'}</p>
                          <p className="text-sm text-gray-500">Start conversation</p>
                        </div>
                      </button>
                    );
                  })}
                  {connections.length === 0 && (
                    <div className="text-center py-6">
                      <UserCheck className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No connections available</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setShowNewChatModal(false)}
                    className="flex-1 py-2 px-4 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button className="flex-1 py-2 px-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors">
                    Create Group Chat
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityPage;




