// src/pages/Community/CommunityPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit3,
  MessageCircle,
  Lock,
  Globe,
  Star,
  TrendingUp,
  Settings as SettingsIcon,
  MoreHorizontal,
  ThumbsUp,
  Share2,
  Send,
  Image,
  X,
  Bell,
  UserCheck,
  MessageSquare,
  Video,
  Loader,
  Target,
  Zap,
  Trophy,
  Flame,
  Sparkles,
  Leaf,
  Brain,
  Activity,
  Coffee,
  Book,
  Dumbbell,
  Apple,
  Moon,
  Sun,
  Wind,
  Droplet,
  CheckCircle2,
  Heart,
  Smile,
  Music
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  // Groups
  fetchUserGroups,
  fetchPublicGroups,
  joinGroup,
  leaveGroup,
  createGroup,
  // Posts
  fetchFeedPosts,
  getUserById,
  createPost,
  addCommentToPost,
  togglePostLike,
  toggleCommentLike
} from '../../services/communityService';

// Import new connections service
import {
  getAcceptedConnections,
  getPendingReceivedRequests,
  acceptConnectionRequest,
  declineConnectionRequest,
  cancelConnection
} from '../../services/db/connections.service';

import {
  subscribeConversations,
  subscribeMessages,
  createOrGetConversation,
  sendDirectMessage,
  markConversationAsRead,
  hasUnreadMessages
} from '../../services/messagingService';

import { db, storage } from '../../firebase';
import { getDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import SidebarLayout from '../../components/layout/SidebarLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import ConnectionsModal from "../../components/community/ConnectionsModal";
import CommunityOrientationCard from '../../components/community/CommunityOrientationCard';
import PostTypeSelector from '../../components/community/PostTypeSelector';
import PostTypeBadge from '../../components/community/PostTypeBadge';
import ReportPostModal from '../../components/community/ReportPostModal';
import EditPostModal from '../../components/community/EditPostModal';
import { fetchMutedUserIds, muteUser as muteUserService } from '../../services/db/moderation.service';

const CommunityPage = () => {
  const { user, isAuthReady } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  // UI state
  const [showModal, setShowModal] = useState(false);
  const [groups, setGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'discover' | 'messages'
  const [loading, setLoading] = useState(false);

  // Feed/post state
  const [posts, setPosts] = useState([]);
  const [users, setUsers] = useState({});
  const [newPost, setNewPost] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreview, setImagePreview] = useState([]);
  const [isPosting, setIsPosting] = useState(false);
  const [showComments, setShowComments] = useState({});
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [openPostMenu, setOpenPostMenu] = useState(null);

  // Connections & invitations
  const [connections, setConnections] = useState([]);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [showRequestsModal, setShowRequestsModal] = useState(false);

  // DMs state
  const [dmConversations, setDmConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [dmMessages, setDmMessages] = useState([]);
  const [dmText, setDmText] = useState('');

  const [postType, setPostType] = useState('update');
  const [feedFilter, setFeedFilter] = useState('all');
  const [showOrientation, setShowOrientation] = useState(false);
  const [mutedUserIds, setMutedUserIds] = useState(new Set());
  const [reportingPost, setReportingPost] = useState(null);
  const [editingPost, setEditingPost] = useState(null);

  const fileInputRef = useRef(null);

  // Cleanup previews
  useEffect(() => {
    return () => {
      imagePreview.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      });
    };
  }, [imagePreview]);

  // Check orientation + load muted users
  useEffect(() => {
    if (!user?.uid) return;
    const checkOrientation = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists() && !snap.data().community_orientation_seen) {
          setShowOrientation(true);
        }
      } catch { /* non-critical */ }
    };
    checkOrientation();
    fetchMutedUserIds(user.uid).then(ids => setMutedUserIds(new Set(ids))).catch(() => {});
  }, [user?.uid]);

  // Load community data
  useEffect(() => {
    if (!isAuthReady || !user?.uid) return;

    const loadCommunityData = async () => {
      setLoading(true);
      try {
        // Connections - using new service
        const userConnections = await getAcceptedConnections(user.uid);
        setConnections(userConnections || []);

        // Groups
        const userGroups = await fetchUserGroups(user.uid);
        const publicGroups = await fetchPublicGroups();

        const allGroups = [...(userGroups || []), ...(publicGroups || [])];
        const uniqueGroups = allGroups.filter(
          (group, index, self) => index === self.findIndex((g) => g.id === group.id)
        );
        setGroups(uniqueGroups);

        // Feed posts
        const joinedGroupIds = (userGroups || []).map((g) => g.id);
        const connectionIds = (userConnections || []).map((conn) =>
          conn.participants.find((id) => id !== user.uid)
        );

        const feedPosts = await fetchFeedPosts({
          userId: user.uid,
          joinedGroupIds,
          connectionIds
        });

        const postsWithGroup = (feedPosts || []).map((p) =>
          p.groupId
            ? { ...p, groupInfo: uniqueGroups.find((g) => g.id === p.groupId) || null }
            : p
        );
        setPosts(postsWithGroup);

        // Collect users referenced
        const userIds = new Set([
          ...(postsWithGroup || []).map((post) => post.authorId),
          ...(postsWithGroup || []).flatMap((post) => post.comments?.map((c) => c.authorId) || []),
          ...(postsWithGroup || []).flatMap((post) =>
            post.comments?.flatMap((c) => c.replies?.map((r) => r.authorId) || []) || []
          ),
          ...(userConnections || []).flatMap((c) => c.participants || [])
        ]);

        const usersData = {};

        await Promise.all(
          Array.from(userIds).map(async (uid) => {
            try {
              const userData = await getUserById(uid);
              if (userData) usersData[uid] = userData;
            } catch (err) {
              console.error('Error fetching user', uid, err);
            }
          })
        );

        // Ensure current user present
        if (!usersData[user.uid]) {
          try {
            const currentUserSnap = await getDoc(doc(db, 'users', user.uid));
            if (currentUserSnap.exists()) {
              const currentUserData = currentUserSnap.data();
              usersData[user.uid] = {
                id: user.uid,
                displayName: currentUserData.displayName || user.displayName || 'User',
                avatarUrl: currentUserData.avatarUrl || ''
              };
            } else {
              usersData[user.uid] = {
                id: user.uid,
                displayName: user.displayName || 'User',
                avatarUrl: ''
              };
            }
          } catch {}
        }

        setUsers(usersData);
      } catch (error) {
        console.error('loadCommunityData error:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCommunityData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isAuthReady]);

  useEffect(() => {
    if (!user?.uid) return;
    const load = async () => {
      try {
        const reqs = await getPendingReceivedRequests(user.uid);
        setIncomingRequests(reqs || []);
      } catch (e) {
        console.error('getPendingReceivedRequests failed:', e);
      }
    };
    load();
  }, [user?.uid]);

  const refreshConnectionsAndRequests = async () => {
    try {
      const [reqs, conns] = await Promise.all([
        getPendingReceivedRequests(user.uid),
        getAcceptedConnections(user.uid)
      ]);
      setIncomingRequests(reqs || []);
      setConnections(conns || []);
    } catch (e) {
      console.error('refreshConnectionsAndRequests failed:', e);
    }
  };

  // Subscribe to my conversations
  useEffect(() => {
    if (!user?.uid) return;
    const unsub = subscribeConversations(user.uid, setDmConversations);
    return unsub;
  }, [user?.uid]);

  // Subscribe to messages for active conversation
  useEffect(() => {
    if (!activeConversationId) return;
    const unsub = subscribeMessages(activeConversationId, setDmMessages);
    return unsub;
  }, [activeConversationId]);

  // Mark conversation as read when opened
  useEffect(() => {
    if (!activeConversationId || !user?.uid) return;
    markConversationAsRead(activeConversationId, user.uid);
  }, [activeConversationId, user?.uid]);

  // Close post menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenPostMenu(null);
    if (openPostMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openPostMenu]);

  // Calculate total unread messages
  const totalUnreadMessages = dmConversations.filter(conv =>
    hasUnreadMessages(conv, user?.uid)
  ).length;

  // Helpers
  const toDateSafe = (ts) => {
    if (!ts) return null;
    if (ts instanceof Date) return ts;
    if (typeof ts === 'object' && typeof ts.toDate === 'function') {
      try {
        return ts.toDate();
      } catch {}
    }
    if (ts && typeof ts === 'object' && 'seconds' in ts && 'nanoseconds' in ts) {
      return new Date(ts.seconds * 1000 + Math.floor(ts.nanoseconds / 1e6));
    }
    const d = new Date(ts);
    return Number.isFinite(d.getTime()) ? d : null;
  };

  const formatTimeAgo = (ts) => {
    const posted = toDateSafe(ts);
    if (!posted) return 'Just now';
    const now = new Date();
    const diffMs = now - posted;
    if (!Number.isFinite(diffMs) || diffMs < 0) return 'Just now';
    const diffMin = Math.floor(diffMs / (1000 * 60));
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h`;
    return `${Math.floor(diffMin / 1440)}d`;
  };

  const getUserDisplayInfo = (userId) => {
    const userData = users[userId];
    const name = userData?.displayName || userData?.name || 'User';
    const avatar =
      userData?.avatarUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10b981&color=fff`;
    return { name, avatar };
  };

  // Posting handlers
  const handlePostSubmit = async (e) => {
    e.preventDefault();
    if (!newPost.trim() && selectedImages.length === 0) return;

    setIsPosting(true);

    try {
      // Upload images to Firebase Storage and get download URLs
      const uploadedImageUrls = [];
      if (selectedImages.length > 0) {
        for (const file of selectedImages) {
          const timestamp = Date.now();
          const fileName = `posts/${user.uid}/${timestamp}_${file.name}`;
          const storageRef = ref(storage, fileName);

          await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(storageRef);
          uploadedImageUrls.push(downloadURL);
        }
      }

      const postId = await createPost({
        authorId: user.uid,
        content: newPost.trim(),
        images: uploadedImageUrls,
        groupId: selectedGroupId,
        postType: postType,
      });

      const groupInfo = selectedGroupId
        ? groups.find((g) => g.id === selectedGroupId) || null
        : null;

      const newPostObj = {
        id: postId,
        authorId: user.uid,
        content: newPost.trim(),
        images: uploadedImageUrls,
        groupId: selectedGroupId,
        postType: postType,
        groupInfo,
        likes: [],
        comments: [],
        timestamp: new Date()
      };

      setPosts((prev) => [newPostObj, ...prev]);
      setNewPost('');
      setSelectedImages([]);
      setImagePreview([]);
      setSelectedGroupId(null);
      setPostType('update');
      toast.success('Post created successfully!');
    } catch (err) {
      console.error('Failed to create post:', err);
      toast.error('Failed to create post. Please try again.');
    } finally {
      setIsPosting(false);
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
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
        setSelectedImages((prev) => [...prev, ...validFiles].slice(0, 4));
        const previews = validFiles.map((file) => URL.createObjectURL(file));
        setImagePreview((prev) => [...prev, ...previews].slice(0, 4));
      }
    }
  };

  const removeImage = (index) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreview((prev) => {
      try {
        URL.revokeObjectURL(prev[index]);
      } catch {}
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleLike = async (postId, currentLikes) => {
    try {
      await togglePostLike(postId, user.uid);
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                likes: currentLikes.includes(user.uid)
                  ? currentLikes.filter((id) => id !== user.uid)
                  : [...currentLikes, user.uid]
              }
            : post
        )
      );
    } catch (error) {
      console.error('Failed to update like:', error);
    }
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
      await addCommentToPost(postId, newComment);
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, comments: [...(post.comments || []), newComment] }
            : post
        )
      );
      clearInput('');
    } catch (error) {
      console.error('Error saving comment:', error);
    }
  };

  const toggleComments = (postId) => {
    setShowComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleReplySubmit = async (postId, commentIndex, text) => {
    if (!text?.trim()) return false;

    const reply = {
      id: Date.now().toString(),
      authorId: user.uid,
      text: text.trim(),
      timestamp: new Date(),
      likes: []
    };

    try {
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) throw new Error('Post not found');

      const postData = postSnap.data();
      const updatedComments = [...(postData.comments || [])];
      if (!updatedComments[commentIndex]) return false;

      updatedComments[commentIndex].replies = [
        ...(updatedComments[commentIndex].replies || []),
        reply
      ];

      await updateDoc(postRef, { comments: updatedComments });

      setPosts((prevPosts) =>
        prevPosts.map((p) => {
          if (p.id !== postId) return p;
          const localComments = [...(p.comments || [])];
          localComments[commentIndex].replies = [
            ...(localComments[commentIndex].replies || []),
            reply
          ];
          return { ...p, comments: localComments };
        })
      );

      return true;
    } catch (err) {
      console.error('Failed to submit reply:', err);
      return false;
    }
  };

  const handleCommentLike = async (postId, commentIndex) => {
    try {
      await toggleCommentLike(postId, commentIndex, user.uid);
      setPosts((prev) =>
        prev.map((post) => {
          if (post.id !== postId) return post;

          const updatedComments = [...(post.comments || [])];
          const likes = new Set(updatedComments[commentIndex]?.likes || []);

          if (likes.has(user.uid)) likes.delete(user.uid);
          else likes.add(user.uid);

          updatedComments[commentIndex].likes = Array.from(likes);

          return { ...post, comments: updatedComments };
        })
      );
    } catch (err) {
      console.error('Error toggling comment like:', err);
    }
  };

  // Group membership
  const handleJoinGroup = async (groupId, isMember) => {
    try {
      setGroups((prev) =>
        prev.map((group) => {
          if (group.id !== groupId) return group;
          const currentMembers = Array.isArray(group.members) ? group.members : [];
          const newMembers = isMember
            ? currentMembers.filter((id) => id !== user.uid)
            : Array.from(new Set([...currentMembers, user.uid]));
          return { ...group, members: newMembers, memberCount: newMembers.length };
        })
      );

      if (isMember) {
        await leaveGroup(groupId, user.uid);
      } else {
        await joinGroup(groupId, user.uid);
      }
    } catch (e) {
      console.error('Group membership update failed:', e);
      try {
        const userGroups = await fetchUserGroups(user.uid);
        const publicGroups = await fetchPublicGroups();
        const allGroups = [...(userGroups || []), ...(publicGroups || [])];
        const uniqueGroups = allGroups.filter(
          (g, i, self) => i === self.findIndex((x) => x.id === g.id)
        );
        setGroups(uniqueGroups);
      } catch (err) {
        console.error('Failed to refetch groups after error:', err);
      }
    }
  };

  // DMs handlers
  const openChatWith = async (otherUserId) => {
    if (!otherUserId || !user?.uid) return;
    try {
      const conv = await createOrGetConversation(user.uid, otherUserId);
      setActiveTab('messages');
      setActiveConversationId(conv.id);
      setShowNewChatModal(false);
    } catch (e) {
      console.error('openChatWith failed', e);
    }
  };

  const handleAcceptRequest = async (connectionId) => {
    try {
      await acceptConnectionRequest(connectionId, user.uid);
      await refreshConnectionsAndRequests();
      toast.success('Connection request accepted!');
    } catch (e) {
      console.error('acceptConnectionRequest failed:', e);
      toast.error('Failed to accept request. Please try again.');
    }
  };

  const handleDeclineRequest = async (connectionId) => {
    try {
      await declineConnectionRequest(connectionId, user.uid);
      await refreshConnectionsAndRequests();
      toast.info('Connection request declined.');
    } catch (e) {
      console.error('declineConnectionRequest failed:', e);
      toast.error('Failed to decline request. Please try again.');
    }
  };

  // Optional (only if you also want to show "Outgoing" requests somewhere)
  const handleCancelRequest = async (connectionId) => {
    try {
      await cancelConnection(connectionId, user.uid);
      await refreshConnectionsAndRequests();
    } catch (e) {
      console.error('cancelConnectionRequest failed:', e);
    }
  };

  const handleSendDM = async () => {
    if (!activeConversationId || !dmText.trim() || !user?.uid) return;
    try {
      await sendDirectMessage(activeConversationId, user.uid, dmText);
      setDmText('');
    } catch (e) {
      console.error('sendDirectMessage failed', e);
      toast.error('Failed to send message. Please try again.');
    }
  };

  const handleEditPost = async (postId, { content }) => {
    try {
      await updateDoc(doc(db, 'posts', postId), { content, updatedAt: new Date() });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, content } : p))
      );
      toast.success('Post updated!');
    } catch (error) {
      console.error('Failed to edit post:', error);
      toast.error('Failed to update post. Please try again.');
      throw error;
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      await deleteDoc(doc(db, 'posts', postId));
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      setOpenPostMenu(null);
      toast.success('Post deleted successfully!');
    } catch (error) {
      console.error('Failed to delete post:', error);
      toast.error('Failed to delete post. Please try again.');
    }
  };

  // Post Card
  const PostCard = ({ post }) => {
    const [localComment, setLocalComment] = useState('');
    const [activeReply, setActiveReply] = useState(null);
    const [replyText, setReplyText] = useState({});
    const authorInfo = getUserDisplayInfo(post.authorId);
    const userLiked = post.likes?.includes(user.uid);
    const isGroupPost = Boolean(post.groupId);
    const isOwnPost = post.authorId === user.uid;

    return (
      <div className="bg-white rounded-vara-lg shadow-vara-sm border border-divider hover:shadow-vara-md transition-all duration-200">
        <div className="p-vara-base pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-vara-md">
              <img
                src={authorInfo.avatar}
                alt={authorInfo.name}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-vara-sm"
              />
              <div>
                <div className="flex items-center gap-vara-sm">
                  <h3 className="font-semibold text-soft-charcoal">{authorInfo.name}</h3>
                  {isGroupPost && (post.groupInfo || groups.find((g) => g.id === post.groupId)) && (
                    <>
                      <span className="text-muted-sage-gray">→</span>
                      <span className="text-evergreen-teal font-medium text-vara-sm">
                        {(post.groupInfo || groups.find((g) => g.id === post.groupId))?.name}
                      </span>
                    </>
                  )}
                </div>
                <p className="text-vara-sm text-muted-sage-gray">{formatTimeAgo(post.timestamp)}</p>
                <PostTypeBadge postType={post.postType} />
              </div>
            </div>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenPostMenu(openPostMenu === post.id ? null : post.id);
                }}
                className="text-muted-sage-gray hover:text-muted-sage-gray p-2 rounded-full hover:bg-dew-sage-light"
              >
                <MoreHorizontal className="w-5 h-5" />
              </button>
              {openPostMenu === post.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-vara-lg shadow-vara-lg border border-divider py-1 z-10"
                >
                  {isOwnPost ? (
                    <>
                    <button
                      onClick={() => { setEditingPost(post); setOpenPostMenu(null); }}
                      className="w-full px-vara-base py-2 text-left text-vara-sm text-soft-charcoal hover:bg-dew-sage-light flex items-center gap-vara-sm"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Post
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="w-full px-vara-base py-2 text-left text-vara-sm text-red-600 hover:bg-red-50 flex items-center gap-vara-sm"
                    >
                      <X className="w-4 h-4" />
                      Delete Post
                    </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setReportingPost(post); setOpenPostMenu(null); }}
                        className="w-full px-vara-base py-2 text-left text-vara-sm text-soft-charcoal hover:bg-dew-sage-light"
                      >
                        Report
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await muteUserService(user.uid, post.authorId || post.userId);
                            setMutedUserIds(prev => new Set([...prev, post.authorId || post.userId]));
                          } catch (err) { console.error('Mute failed:', err); }
                          setOpenPostMenu(null);
                        }}
                        className="w-full px-vara-base py-2 text-left text-vara-sm text-soft-charcoal hover:bg-dew-sage-light"
                      >
                        Mute user
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {post.content && (
            <p className="text-soft-charcoal mb-3 whitespace-pre-wrap leading-relaxed">
              {post.content}
            </p>
          )}
        </div>

        {post.images && post.images.length > 0 && (
          <div className="px-vara-base pb-3">
            <div
              className={`grid gap-1 rounded-vara-lg overflow-hidden ${
                post.images.length === 1
                  ? 'grid-cols-1'
                  : post.images.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-2'
              }`}
            >
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

        {(post.likes?.length > 0 || post.comments?.length > 0) && (
          <div className="px-vara-base py-2 flex items-center justify-between text-vara-sm text-muted-sage-gray border-t border-divider">
            <div className="flex items-center gap-1">
              {post.likes?.length > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 bg-evergreen-teal rounded-full flex items-center justify-center">
                    <ThumbsUp className="w-3 h-3 text-white fill-current" />
                  </div>
                  <span>{post.likes.length}</span>
                </div>
              )}
            </div>
            {post.comments?.length > 0 && (
              <button onClick={() => toggleComments(post.id)} className="hover:underline">
                {post.comments.length} comment{post.comments.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

        <div className="px-vara-base py-3 flex items-center justify-around border-t border-divider">
          <button
            onClick={() => handleLike(post.id, post.likes || [])}
            className={`flex items-center gap-vara-sm px-vara-base py-2 rounded-vara-lg transition-all ${
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
            className="flex items-center gap-vara-sm px-vara-base py-2 rounded-vara-lg text-muted-sage-gray hover:bg-dew-sage-light transition-all"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">Comment</span>
          </button>

          <button className="flex items-center gap-vara-sm px-vara-base py-2 rounded-vara-lg text-muted-sage-gray hover:bg-dew-sage-light transition-all">
            <Share2 className="w-5 h-5" />
            <span className="font-medium">Share</span>
          </button>
        </div>

        {showComments[post.id] && (
          <div className="px-vara-base pb-4 border-t border-divider">
            <div className="flex gap-vara-md pt-4 mb-vara-base">
              <img
                src={
                  users[user?.uid]?.avatarUrl ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    users[user?.uid]?.displayName || user?.displayName || 'You'
                  )}&background=10b981&color=fff`
                }
                alt="Your avatar"
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="flex-1 flex gap-vara-sm">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={localComment}
                  onChange={(e) => setLocalComment(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && handleCommentSubmit(post.id, localComment, setLocalComment)
                  }
                  className="flex-1 bg-dew-sage-light rounded-full px-vara-base py-2 text-vara-sm focus:outline-none focus:ring-2 focus:ring-evergreen-teal focus:bg-white"
                />
                <button
                  onClick={() => handleCommentSubmit(post.id, localComment, setLocalComment)}
                  className="text-evergreen-teal hover:text-evergreen-teal p-2 rounded-full hover:bg-teal-light"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {post.comments?.length > 0 && (
              <div className="space-y-3">
                {post.comments.map((comment, index) => {
                  const commentAuthor = getUserDisplayInfo(comment.authorId);
                  const replyKey = `${post.id}_${index}`;
                  return (
                    <div key={comment.id || index} className="flex gap-vara-md">
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
                            className="hover:underline"
                            onClick={() => handleCommentLike(post.id, index)}
                          >
                            Like {comment.likes?.length > 0 ? `(${comment.likes.length})` : ''}
                          </button>
                          <button
                            className="hover:underline"
                            onClick={() =>
                              setActiveReply((prev) => (prev === replyKey ? null : replyKey))
                            }
                          >
                            Reply
                          </button>
                        </div>

                        {activeReply === replyKey && (
                          <div className="mt-2 flex gap-vara-sm">
                            <img
                              src={
                                users[user?.uid]?.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  users[user?.uid]?.displayName || user?.displayName || 'You'
                                )}&background=10b981&color=fff`
                              }
                              alt="Your avatar"
                              className="w-6 h-6 rounded-full object-cover"
                            />
                            <div className="flex-1 flex gap-vara-sm">
                              <input
                                type="text"
                                autoFocus
                                value={replyText[replyKey] || ''}
                                onChange={(e) =>
                                  setReplyText((prev) => ({ ...prev, [replyKey]: e.target.value }))
                                }
                                placeholder="Write a reply..."
                                onKeyDown={async (e) => {
                                  if (e.key === 'Enter') {
                                    const ok = await handleReplySubmit(
                                      post.id,
                                      index,
                                      replyText[replyKey]
                                    );
                                    if (ok) {
                                      setReplyText((prev) => ({ ...prev, [replyKey]: '' }));
                                      setActiveReply(null);
                                    }
                                  }
                                }}
                                className="flex-1 bg-dew-sage-light rounded-full px-3 py-1 text-vara-sm focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
                              />
                              <button
                                className="text-evergreen-teal hover:text-evergreen-teal p-1"
                                onClick={() => handleReplySubmit(post.id, index, replyText[replyKey])}
                              >
                                <Send className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}

                        {comment.replies?.length > 0 && (
                          <div className="mt-2 ml-10 space-y-2">
                            {comment.replies.map((r, rIdx) => {
                              const rAuthor = getUserDisplayInfo(r.authorId);
                              return (
                                <div key={r.id || rIdx} className="flex gap-vara-sm items-start">
                                  <img
                                    src={rAuthor.avatar}
                                    alt={rAuthor.name}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                  <div className="bg-mist-white rounded-vara-lg px-3 py-1.5">
                                    <p className="text-vara-xs font-semibold text-soft-charcoal">{rAuthor.name}</p>
                                    <p className="text-vara-sm text-soft-charcoal">{r.text}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
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

  // Helper to render group icon
  const renderGroupIcon = (iconName, className = "w-6 h-6 text-white") => {
    const iconMap = {
      Users, Target, Trophy, Flame, Heart, Star, Zap, Sparkles,
      Leaf, Brain, Activity, Dumbbell, Apple, Coffee, Moon, Sun,
      Wind, Droplet, MessageCircle, Book, CheckCircle2, Smile, Music, Globe
    };

    const IconComponent = iconMap[iconName] || Users;
    return <IconComponent className={className} />;
  };

  // Group Card
  const GroupCard = ({ group }) => {
    const isMember = group.members?.includes(user?.uid);
    const isCreator = group.createdBy === user?.uid;

    return (
      <div className="bg-white rounded-vara-lg p-vara-base shadow-vara-sm border border-divider hover:shadow-vara-md transition-all duration-200">
        <div
          onClick={() => navigate(`/group/${group.id}`)}
          className="cursor-pointer"
        >
          <div className="flex items-center gap-vara-md mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-medium to-evergreen-teal rounded-vara-lg flex items-center justify-center shadow-vara-sm">
              {renderGroupIcon(group.icon || group.emoji)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-soft-charcoal hover:text-evergreen-teal line-clamp-1 transition-colors">
                {group.name}
              </h3>
              <div className="flex items-center gap-vara-sm text-vara-xs text-muted-sage-gray">
                {group.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                <span>{group.memberCount || 0} members</span>
                {isCreator && <Star className="w-3 h-3 text-yellow-500 fill-current" />}
              </div>
            </div>
          </div>

          <p className="text-vara-sm text-muted-sage-gray mb-3 line-clamp-2 leading-relaxed">{group.description}</p>
        </div>

        <div className="flex gap-vara-sm">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleJoinGroup(group.id, isMember);
            }}
            className={`flex-1 py-2 px-3 rounded-vara-lg text-vara-sm font-medium transition-all ${
              isMember
                ? 'bg-dew-sage-light text-muted-sage-gray hover:bg-dew-sage-light'
                : 'bg-evergreen-teal text-white hover:opacity-90 shadow-vara-sm'
            }`}
          >
            {isMember ? 'Joined' : 'Join'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/group/${group.id}`);
            }}
            className="px-3 py-2 border border-divider rounded-vara-lg text-vara-sm font-medium text-soft-charcoal hover:bg-dew-sage-light transition-all"
          >
            View
          </button>
        </div>
      </div>
    );
  };

  // Create Group Modal
  const CreateGroupModal = ({ isOpen, onClose }) => {
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [groupIcon, setGroupIcon] = useState('Users');
    const [isPublic, setIsPublic] = useState(true);
    const [category, setCategory] = useState('general');
    const [tags, setTags] = useState([]);
    const [newTag, setNewTag] = useState('');
    const [groupColor, setGroupColor] = useState('emerald');

    if (!isOpen) return null;

    const addTag = () => {
      if (newTag.trim() && tags.length < 5) {
        setTags([...tags, newTag.trim()]);
        setNewTag('');
      }
    };

    const removeTag = (tagToRemove) => {
      setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleSubmit = async (e) => {
      e.preventDefault();

      try {
        // Save to Firestore using the service
        const groupId = await createGroup({
          name: groupName,
          description: groupDescription,
          type: isPublic ? 'public' : 'private',
          creatorId: user.uid
        });

        // Create the full group object with additional UI fields
        const newGroup = {
          id: groupId,
          name: groupName,
          description: groupDescription,
          icon: groupIcon,
          isPublic,
          memberCount: 1,
          createdBy: user.uid,
          members: [user.uid],
          category,
          tags,
          color: groupColor,
          type: isPublic ? 'public' : 'private',
          creatorId: user.uid,
          createdAt: new Date()
        };

        // Update UI fields in Firestore
        await updateDoc(doc(db, 'groups', groupId), {
          icon: groupIcon,
          category,
          tags,
          color: groupColor
        });

        // Add to local state
        setGroups((prev) => [newGroup, ...prev]);

        // Reset form
        setGroupName('');
        setGroupDescription('');
        setGroupIcon('Users');
        setIsPublic(true);
        setCategory('general');
        setTags([]);
        setNewTag('');
        setGroupColor('emerald');

        toast.success('Group created successfully!');
        onClose();
      } catch (error) {
        console.error('Error creating group:', error);
        toast.error('Failed to create group. Please try again.');
      }
    };

    const icons = [
      { name: 'Users', component: Users },
      { name: 'Target', component: Target },
      { name: 'Trophy', component: Trophy },
      { name: 'Flame', component: Flame },
      { name: 'Heart', component: Heart },
      { name: 'Star', component: Star },
      { name: 'Zap', component: Zap },
      { name: 'Sparkles', component: Sparkles },
      { name: 'Leaf', component: Leaf },
      { name: 'Brain', component: Brain },
      { name: 'Activity', component: Activity },
      { name: 'Dumbbell', component: Dumbbell },
      { name: 'Apple', component: Apple },
      { name: 'Coffee', component: Coffee },
      { name: 'Moon', component: Moon },
      { name: 'Sun', component: Sun },
      { name: 'Wind', component: Wind },
      { name: 'Droplet', component: Droplet },
      { name: 'MessageCircle', component: MessageCircle },
      { name: 'Book', component: Book },
      { name: 'CheckCircle2', component: CheckCircle2 },
      { name: 'Smile', component: Smile },
      { name: 'Music', component: Music },
      { name: 'Globe', component: Globe }
    ];

    const categories = [
      { value: 'general', label: 'General', icon: '💬' },
      { value: 'fitness', label: 'Fitness', icon: '💪' },
      { value: 'nutrition', label: 'Nutrition', icon: '🥗' },
      { value: 'mental-health', label: 'Mental Health', icon: '🧠' },
      { value: 'sleep', label: 'Sleep', icon: '😴' },
      { value: 'mindfulness', label: 'Mindfulness', icon: '🧘' },
      { value: 'accountability', label: 'Accountability', icon: '🎯' },
      { value: 'social', label: 'Social', icon: '👥' }
    ];

    const colors = [
      { value: 'emerald', label: 'Teal', class: 'from-teal-medium to-evergreen-teal' },
      { value: 'blue', label: 'Blue', class: 'from-blue-400 to-blue-600' },
      { value: 'purple', label: 'Purple', class: 'from-purple-400 to-purple-600' },
      { value: 'pink', label: 'Pink', class: 'from-pink-400 to-pink-600' },
      { value: 'orange', label: 'Orange', class: 'from-orange-400 to-orange-600' },
      { value: 'indigo', label: 'Indigo', class: 'from-indigo-400 to-indigo-600' }
    ];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-vara-base">
        <div className="bg-white rounded-vara-lg p-vara-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-vara-lg">
            <h2 className="text-vara-xl font-bold text-soft-charcoal">Create New Group</h2>
            <button onClick={onClose} className="text-muted-sage-gray hover:text-muted-sage-gray p-2 rounded-full hover:bg-dew-sage-light">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Group Name */}
            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-2">Group Name</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3 py-2 border border-divider rounded-vara-md focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
                placeholder="e.g., Morning Runners, Meditation Buddies"
                required
              />
            </div>

            {/* Icon Selector */}
            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-2">Group Icon</label>
              <div className="grid grid-cols-6 md:grid-cols-8 gap-vara-sm">
                {icons.map((icon) => {
                  const IconComponent = icon.component;
                  return (
                    <button
                      key={icon.name}
                      type="button"
                      onClick={() => setGroupIcon(icon.name)}
                      className={`p-3 rounded-vara-md border-2 transition-all hover:scale-105 ${
                        groupIcon === icon.name
                          ? 'border-evergreen-teal bg-teal-light'
                          : 'border-divider hover:border-divider'
                      }`}
                      title={icon.name}
                    >
                      <IconComponent className={`w-6 h-6 ${groupIcon === icon.name ? 'text-evergreen-teal' : 'text-muted-sage-gray'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-2">Category</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-vara-sm">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`p-3 rounded-vara-md border-2 transition-all text-vara-sm font-medium ${
                      category === cat.value
                        ? 'border-evergreen-teal bg-teal-light text-evergreen-teal'
                        : 'border-divider hover:border-divider text-soft-charcoal'
                    }`}
                  >
                    <div className="text-vara-lg mb-1">{cat.icon}</div>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-2">Description</label>
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-divider rounded-vara-md focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
                placeholder="What is this group about? What will members do together?"
                required
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-2">
                Tags (up to 5)
              </label>
              <div className="flex gap-vara-sm mb-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-3 py-2 border border-divider rounded-vara-md focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
                  placeholder="Add a tag (e.g., beginners, 30-day-challenge)"
                  disabled={tags.length >= 5}
                />
                <button
                  type="button"
                  onClick={addTag}
                  disabled={tags.length >= 5 || !newTag.trim()}
                  className="px-vara-base py-2 bg-evergreen-teal text-white rounded-vara-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-vara-sm">
                  {tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-teal-light text-evergreen-teal rounded-full text-vara-sm"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:opacity-80"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Color Theme */}
            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-2">Group Color</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-vara-sm">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setGroupColor(color.value)}
                    className={`h-12 rounded-vara-md bg-gradient-to-br ${color.class} transition-all ${
                      groupColor === color.value ? 'ring-4 ring-offset-2 ring-silver-sage' : 'hover:scale-105'
                    }`}
                    title={color.label}
                  />
                ))}
              </div>
            </div>

            {/* Privacy */}
            <div className="flex items-center gap-vara-base p-vara-base bg-mist-white rounded-vara-md">
              <label className="flex items-center gap-vara-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="w-4 h-4 text-evergreen-teal rounded focus:ring-evergreen-teal"
                />
                <div>
                  <span className="text-vara-sm font-medium text-soft-charcoal">Public Group</span>
                  <p className="text-vara-xs text-muted-sage-gray">Anyone can find and join this group</p>
                </div>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-vara-md pt-4 border-t border-divider">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-vara-base border border-divider rounded-vara-md text-soft-charcoal font-medium hover:bg-dew-sage-light transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-vara-base bg-evergreen-teal text-white font-medium rounded-vara-md hover:opacity-90 transition-colors shadow-vara-sm"
              >
                Create Group
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Render
  if (!isAuthReady || !user) {
    return (
      <div className="min-h-screen bg-mist-white flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-evergreen-teal mx-auto mb-vara-base" />
          <p className="text-muted-sage-gray">Loading community...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-mist-white">
        <div className="max-w-5xl mx-auto p-vara-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-vara-lg">
            <div>
              <h1 className="text-vara-2xl font-semibold text-soft-charcoal mb-2">Community</h1>
              <p className="text-muted-sage-gray">
                Connect, share, and grow together on your wellness journey.
              </p>
            </div>
            <div className="flex items-center gap-vara-md">
              {incomingRequests.length > 0 && (
                <button
                  onClick={() => setShowRequestsModal(true)}
                  className="relative flex items-center gap-vara-sm px-vara-base py-2 bg-teal-light text-evergreen-teal rounded-vara-lg hover:bg-teal-light transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  <span className="font-medium">
                    {incomingRequests.length} Request{incomingRequests.length > 1 ? 's' : ''}
                  </span>
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-evergreen-teal text-white text-vara-xs rounded-full flex items-center justify-center">
                    {incomingRequests.length}
                  </div>
                </button>
              )}

              {pendingInvitations.length > 0 && (
                <button
                  onClick={() => {}}
                  className="relative flex items-center gap-vara-sm px-vara-base py-2 bg-orange-50 text-orange-700 rounded-vara-lg hover:bg-orange-100 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  <span className="font-medium">{pendingInvitations.length} Invites</span>
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-orange-500 text-white text-vara-xs rounded-full flex items-center justify-center">
                    {pendingInvitations.length}
                  </div>
                </button>
              )}
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-vara-sm bg-evergreen-teal text-white px-vara-base py-2 rounded-vara-lg hover:opacity-90 transition-colors font-semibold shadow-vara-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create Group</span>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-vara-lg bg-dew-sage-light p-1 rounded-vara-lg w-fit">
            {[
              { id: 'feed', label: 'Feed', icon: MessageCircle },
              { id: 'discover', label: 'Discover', icon: TrendingUp },
              { id: 'challenges', label: 'Challenges', icon: Trophy, href: '/community/challenges' },
              { id: 'messages', label: 'Messages', icon: MessageSquare }
            ].map((tab) => {
              const Icon = tab.icon;
              const hasUnread = tab.id === 'messages' && totalUnreadMessages > 0;
              return (
                <button
                  key={tab.id}
                  onClick={() => tab.href ? navigate(tab.href) : setActiveTab(tab.id)}
                  className={`relative flex items-center gap-vara-sm px-vara-base py-2 rounded-vara-md text-vara-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-evergreen-teal shadow-vara-sm'
                      : 'text-muted-sage-gray hover:text-soft-charcoal'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {hasUnread && (
                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-evergreen-teal rounded-full ring-2 ring-white"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-vara-lg">
            {/* Main Left/Center */}
            <div className="lg:col-span-3">
              {/* Feed */}
              {activeTab === 'feed' && (
                <div className="space-y-6">
                  {showOrientation && (
                    <CommunityOrientationCard userId={user?.uid} onDismiss={() => setShowOrientation(false)} />
                  )}
                  {/* Composer */}
                  <div className="bg-white rounded-vara-lg shadow-vara-sm border border-divider p-vara-base">
                    <form onSubmit={handlePostSubmit}>
                      <div className="flex gap-vara-md mb-vara-base">
                        <div className="flex flex-col gap-vara-sm w-full mb-vara-base">
                          <div className="flex gap-vara-md items-start">
                            <img
                              src={
                                users[user?.uid]?.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  users[user?.uid]?.displayName || user?.displayName || 'User'
                                )}&background=10b981&color=fff`
                              }
                              alt="Your avatar"
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-vara-sm"
                            />
                            <div className="flex-1 flex flex-col gap-vara-sm">
                              <select
                                value={selectedGroupId || ''}
                                onChange={(e) => setSelectedGroupId(e.target.value || null)}
                                className="w-full text-vara-sm text-soft-charcoal border border-divider rounded-vara-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
                              >
                                <option value="">🌍 Post publicly to your connections</option>
                                {groups
                                  .filter((g) => g.members?.includes(user.uid))
                                  .map((group) => (
                                    <option key={group.id} value={group.id}>
                                      {group.emoji || '👥'} {group.name}
                                    </option>
                                  ))}
                              </select>

                              <PostTypeSelector value={postType} onChange={setPostType} />

                              <textarea
                                value={newPost}
                                onChange={(e) => setNewPost(e.target.value)}
                                placeholder="What's on your mind? Share your wellness journey..."
                                className="flex-1 border-none resize-none focus:outline-none placeholder-muted-sage-gray text-soft-charcoal text-vara-lg"
                                rows={3}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {imagePreview.length > 0 && (
                        <div className="mb-vara-base">
                          <div
                            className={`grid gap-vara-sm ${
                              imagePreview.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                            }`}
                          >
                            {imagePreview.map((preview, index) => (
                              <div key={index} className="relative">
                                <img
                                  src={preview}
                                  alt={`Preview ${index + 1}`}
                                  className="w-full h-48 object-cover rounded-vara-lg"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeImage(index)}
                                  className="absolute top-2 right-2 bg-soft-charcoal bg-opacity-60 text-white rounded-full p-1.5 hover:bg-opacity-80"
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
                            className="flex items-center gap-vara-sm text-muted-sage-gray hover:text-evergreen-teal transition-colors px-3 py-2 rounded-vara-md hover:bg-teal-light"
                          >
                            <Image className="w-5 h-5" />
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
                          className="bg-evergreen-teal text-white px-vara-lg py-2 rounded-vara-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-vara-sm"
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
                    </form>
                  </div>

                  {/* Feed list */}
                  {loading ? (
                    <div className="space-y-6">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-vara-lg shadow-vara-sm border border-divider p-vara-base animate-pulse">
                          <div className="flex items-center gap-vara-md mb-3">
                            <div className="w-10 h-10 bg-dew-sage-light rounded-full"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-dew-sage-light rounded w-1/4 mb-2"></div>
                              <div className="h-3 bg-dew-sage-light rounded w-1/6"></div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="h-4 bg-dew-sage-light rounded w-full"></div>
                            <div className="h-4 bg-dew-sage-light rounded w-5/6"></div>
                            <div className="h-4 bg-dew-sage-light rounded w-4/6"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : posts.length > 0 ? (
                    <div className="space-y-6">
                      <div className="flex gap-2 mb-4 flex-wrap">
                        {['all', 'update', 'win', 'reflection', 'ask'].map(f => (
                          <button
                            key={f}
                            onClick={() => setFeedFilter(f)}
                            className={`px-3 py-1.5 rounded-full text-sm border transition ${
                              feedFilter === f
                                ? 'border-evergreen-teal bg-teal-light/30 text-evergreen-teal font-medium'
                                : 'border-divider text-soft-charcoal'
                            }`}
                          >
                            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1) + 's'}
                          </button>
                        ))}
                      </div>
                      {posts.filter(p => {
                        if (mutedUserIds.has(p.authorId || p.userId)) return false;
                        if (feedFilter !== 'all' && (p.postType || 'update') !== feedFilter) return false;
                        return true;
                      }).map((post) => (
                        <PostCard key={post.id} post={post} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white rounded-vara-lg shadow-vara-sm border border-divider">
                      <div className="w-16 h-16 bg-dew-sage-light rounded-full flex items-center justify-center mx-auto mb-vara-base">
                        <MessageCircle className="w-8 h-8 text-muted-sage-gray" />
                      </div>
                      <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-2">Your feed is empty</h3>
                      <p className="text-muted-sage-gray mb-vara-base">Join some groups to see posts from your community!</p>
                      <button
                        onClick={() => setActiveTab('discover')}
                        className="bg-evergreen-teal text-white px-vara-lg py-2 rounded-vara-lg hover:opacity-90 transition-colors font-semibold"
                      >
                        Discover Groups
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Discover */}
              {activeTab === 'discover' && (
                <div className="space-y-6">
                  {/* Search */}
                  <div className="bg-white rounded-vara-lg shadow-vara-sm border border-divider p-vara-base">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-sage-gray w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search groups, topics, or people..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-divider rounded-vara-lg focus:outline-none focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-vara-base">
                    <div
                      className="bg-gradient-to-br from-evergreen-teal to-evergreen-teal text-white p-vara-lg rounded-vara-lg shadow-vara-sm cursor-pointer hover:opacity-95"
                      onClick={() => navigate('/community/people')}
                    >
                      <Users className="w-8 h-8 mb-3" />
                      <h3 className="font-semibold mb-2">Find Partners</h3>
                      <p className="text-vara-sm opacity-90">Connect with accountability partners</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-vara-lg rounded-vara-lg shadow-vara-sm">
                      <Video className="w-8 h-8 mb-3" />
                      <h3 className="font-semibold mb-2">Live Sessions</h3>
                      <p className="text-vara-sm opacity-90">Join live wellness sessions</p>
                    </div>
                    <div
                      className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-vara-lg rounded-vara-lg shadow-vara-sm cursor-pointer hover:opacity-95"
                      onClick={() => setShowModal(true)}
                    >
                      <SettingsIcon className="w-8 h-8 mb-3" />
                      <h3 className="font-semibold mb-2">Create Group</h3>
                      <p className="text-vara-sm opacity-90">Build your wellness community</p>
                    </div>
                  </div>

                  {/* Trending Groups */}
                  <div className="bg-white rounded-vara-lg shadow-vara-sm border border-divider p-vara-lg">
                    <h2 className="text-vara-lg font-bold text-soft-charcoal mb-vara-base">Trending Groups</h2>
                    {groups.filter((group) => group.isPublic).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-vara-base">
                        {groups
                          .filter(
                            (group) =>
                              group.isPublic &&
                              (group.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
                          )
                          .slice(0, 6)
                          .map((group) => (
                            <GroupCard key={group.id} group={group} />
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <TrendingUp className="w-12 h-12 text-muted-sage-gray mx-auto mb-vara-base" />
                        <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-2">No public groups yet</h3>
                        <p className="text-muted-sage-gray">Be the first to create a public group!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Messages */}
              {activeTab === 'messages' && (
                <div className="bg-white rounded-vara-lg shadow-vara-sm border border-divider h-[32rem] grid grid-cols-1 md:grid-cols-3 overflow-hidden">
                  {/* Conversations list */}
                  <div className="border-r border-divider hidden md:block">
                    <div className="p-vara-base border-b border-divider flex items-center justify-between">
                      <h2 className="text-vara-lg font-bold text-soft-charcoal">Messages</h2>
                      <button
                        onClick={() => setShowNewChatModal(true)}
                        className="text-evergreen-teal text-vara-sm font-medium hover:text-evergreen-teal"
                      >
                        New
                      </button>
                    </div>
                    <div className="overflow-y-auto h-full">
                      {dmConversations.map((c) => {
                        const otherId = (c.participants || []).find((id) => id !== user.uid);
                        const other = users[otherId] || {};
                        const name = other.displayName || 'User';
                        const avatar =
                          other.avatarUrl ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            name
                          )}&background=10b981&color=fff`;
                        const preview = c.lastMessage?.text || 'Start the conversation';
                        const active = c.id === activeConversationId;
                        const isUnread = hasUnreadMessages(c, user.uid);

                        return (
                          <button
                            key={c.id}
                            onClick={() => setActiveConversationId(c.id)}
                            className={`relative w-full flex items-center gap-vara-md px-vara-base py-3 text-left hover:bg-dew-sage-light ${
                              active ? 'bg-teal-light' : ''
                            }`}
                          >
                            <div className="relative">
                              <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover" />
                              {isUnread && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-evergreen-teal rounded-full ring-2 ring-white"></div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`truncate ${isUnread ? 'font-bold text-soft-charcoal' : 'font-medium text-soft-charcoal'}`}>
                                {name}
                              </p>
                              <p className={`text-vara-sm truncate ${isUnread ? 'font-medium text-soft-charcoal' : 'text-muted-sage-gray'}`}>
                                {preview}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                      {dmConversations.length === 0 && (
                        <div className="p-vara-lg text-center">
                          <MessageSquare className="w-12 h-12 text-muted-sage-gray mx-auto mb-3" />
                          <p className="text-vara-sm text-muted-sage-gray mb-3">No conversations yet</p>
                          <button
                            onClick={() => setShowNewChatModal(true)}
                            className="text-vara-sm text-evergreen-teal hover:text-evergreen-teal font-medium"
                          >
                            Start a conversation
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chat pane */}
                  <div className="col-span-2 flex flex-col h-full">
                    {/* Header */}
                    <div className="p-vara-base border-b border-divider flex items-center gap-vara-md">
                      {(() => {
                        const current =
                          dmConversations.find((c) => c.id === activeConversationId) || null;
                        const otherId = current?.participants?.find((id) => id !== user.uid);
                        const other = (otherId && users[otherId]) || null;
                        const name = other?.displayName || 'Select a conversation';
                        const avatar =
                          other?.avatarUrl ||
                          (otherId
                            ? `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                name
                              )}&background=10b981&color=fff`
                            : '');

                        return (
                          <>
                            {otherId && (
                              <img
                                src={avatar}
                                alt={name}
                                className="w-8 h-8 rounded-full object-cover"
                              />
                            )}
                            <h3 className="font-semibold text-soft-charcoal">{name}</h3>
                          </>
                        );
                      })()}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-vara-base space-y-2 bg-mist-white">
                      {activeConversationId ? (
                        dmMessages.map((m) => {
                          const mine = m.senderId === user.uid;
                          return (
                            <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                              <div
                                className={`px-3 py-2 rounded-vara-lg max-w-[75%] text-vara-sm ${
                                  mine
                                    ? 'bg-evergreen-teal text-white rounded-br-sm'
                                    : 'bg-white text-soft-charcoal border border-divider rounded-bl-sm'
                                }`}
                              >
                                {m.text}
                              </div>
                              <span className="text-vara-xs text-muted-sage-gray mt-0.5 px-1">
                                {formatTimeAgo(m.createdAt)}
                              </span>
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-full flex items-center justify-center text-muted-sage-gray">
                          Select a conversation to start chatting
                        </div>
                      )}
                    </div>

                    {/* Composer */}
                    <div className="p-3 border-t border-divider flex items-center gap-vara-sm">
                      <input
                        value={dmText}
                        onChange={(e) => setDmText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendDM()}
                        placeholder="Write a message…"
                        disabled={!activeConversationId}
                        className="flex-1 px-3 py-2 bg-white border border-divider rounded-vara-lg focus:outline-none focus:ring-2 focus:ring-evergreen-teal disabled:opacity-60"
                      />
                      <button
                        onClick={handleSendDM}
                        disabled={!activeConversationId || !dmText.trim()}
                        className="px-vara-base py-2 bg-evergreen-teal text-white rounded-vara-lg hover:opacity-90 disabled:opacity-50"
                      >
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* My Groups */}
              <div className="bg-white rounded-vara-lg shadow-vara-sm border border-divider p-vara-base">
                <div className="flex items-center justify-between mb-vara-base">
                  <h3 className="font-bold text-soft-charcoal">My Groups</h3>
                  <button className="text-evergreen-teal hover:text-evergreen-teal text-vara-sm font-medium">
                    See all
                  </button>
                </div>
                <div className="space-y-3">
                  {groups
                    .filter((group) => group.members?.includes(user?.uid))
                    .slice(0, 4)
                    .map((group) => (
                      <div
                        key={group.id}
                        onClick={() => navigate(`/group/${group.id}`)}
                        className="flex items-center gap-vara-md p-2 rounded-vara-lg hover:bg-dew-sage-light transition-colors cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-teal-medium to-evergreen-teal rounded-vara-md flex items-center justify-center shadow-vara-sm">
                          {renderGroupIcon(group.icon || group.emoji, "w-5 h-5 text-white")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-soft-charcoal truncate">{group.name}</p>
                          <p className="text-vara-xs text-muted-sage-gray">{group.memberCount || 0} members</p>
                        </div>
                      </div>
                    ))}
                  {groups.filter((group) => group.members?.includes(user?.uid)).length === 0 && (
                    <div className="text-center py-vara-lg">
                      <Users className="w-8 h-8 text-muted-sage-gray mx-auto mb-2" />
                      <p className="text-vara-sm text-muted-sage-gray mb-3">No groups joined yet</p>
                      <button
                        onClick={() => setActiveTab('discover')}
                        className="text-vara-sm text-evergreen-teal hover:text-evergreen-teal font-medium"
                      >
                        Discover groups
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Vara Connections */}
              <div className="bg-white rounded-vara-lg shadow-vara-sm border border-divider p-vara-base">
                <div className="flex items-center justify-between mb-vara-base">
                  <h3 className="font-bold text-soft-charcoal">Vara Connections</h3>
                  <div className="flex items-center gap-vara-sm">
                    <button
                      className="text-evergreen-teal hover:text-evergreen-teal text-vara-sm font-medium"
                      onClick={() => navigate('/community/people')}
                    >
                      Find more
                    </button>
                    <button
                      className="text-vara-sm text-muted-sage-gray hover:text-soft-charcoal"
                      onClick={() => setShowRequestsModal(true)}
                    >
                      Requests{incomingRequests.length ? ` (${incomingRequests.length})` : ''}
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {connections.slice(0, 5).map((connection) => {
                    const otherUserId = connection.participants.find((id) => id !== user?.uid);
                    const otherUser = users[otherUserId];
                    return (
                      <div
                        key={connection.id}
                        className="flex items-center gap-vara-md p-2 rounded-vara-lg hover:bg-dew-sage-light transition-colors cursor-pointer"
                      >
                        <img
                          src={
                            otherUser?.avatarUrl ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(
                              otherUser?.displayName || 'User'
                            )}&background=10b981&color=fff`
                          }
                          alt={otherUser?.displayName || 'User'}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-soft-charcoal truncate">
                            {otherUser?.displayName || 'User'}
                          </p>
                          <p className="text-vara-xs text-muted-sage-gray">Connected</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            className="p-1.5 text-muted-sage-gray hover:text-evergreen-teal hover:bg-teal-light rounded-vara-md transition-colors"
                            onClick={() => openChatWith(otherUserId)}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-muted-sage-gray hover:text-blue-600 hover:bg-blue-50 rounded-vara-md transition-colors">
                            <Video className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {connections.length === 0 && (
                    <div className="text-center py-vara-lg">
                      <UserCheck className="w-8 h-8 text-muted-sage-gray mx-auto mb-2" />
                      <p className="text-vara-sm text-muted-sage-gray">No connections yet</p>
                      <button
                        className="text-evergreen-teal hover:text-evergreen-teal text-vara-sm font-medium mt-2"
                        onClick={() => navigate('/community/people')}
                      >
                        Find connections
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Invitations */}
              {pendingInvitations.length > 0 && (
                <div className="bg-white rounded-vara-lg shadow-vara-sm border border-divider p-vara-base">
                  <h3 className="font-bold text-soft-charcoal mb-vara-base">Group Invitations</h3>
                  <div className="space-y-3">
                    {pendingInvitations.slice(0, 3).map((invitation) => (
                      <div key={invitation.id} className="p-3 bg-orange-50 rounded-vara-lg border border-orange-100">
                        <div className="flex items-start gap-vara-md mb-3">
                          <div className="w-8 h-8 bg-orange-200 rounded-vara-md flex items-center justify-center text-vara-sm">
                            {invitation.groupEmoji || '🎯'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-soft-charcoal text-vara-sm">{invitation.groupName}</p>
                            <p className="text-vara-xs text-muted-sage-gray">
                              Invited by {users[invitation.invitedBy]?.displayName || 'Someone'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-vara-sm">
                          <button className="flex-1 bg-evergreen-teal text-white py-2 px-3 rounded-vara-md text-vara-sm font-medium hover:opacity-90 transition-colors">
                            Accept
                          </button>
                          <button className="flex-1 bg-dew-sage-light text-soft-charcoal py-2 px-3 rounded-vara-md text-vara-sm font-medium hover:bg-dew-sage transition-colors">
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Groups */}
              <div className="bg-white rounded-vara-lg shadow-vara-sm border border-divider p-vara-base">
                <h3 className="font-bold text-soft-charcoal mb-vara-base">Suggested Groups</h3>
                <div className="space-y-3">
                  {groups
                    .filter((group) => group.isPublic && !group.members?.includes(user?.uid))
                    .slice(0, 3)
                    .map((group) => (
                      <GroupCard key={group.id} group={group} />
                    ))}
                  {groups.filter((g) => g.isPublic && !g.members?.includes(user?.uid)).length === 0 && (
                    <div className="text-center py-vara-lg">
                      <TrendingUp className="w-8 h-8 text-muted-sage-gray mx-auto mb-2" />
                      <p className="text-vara-sm text-muted-sage-gray mb-3">No suggestions available</p>
                      <button
                        onClick={() => setShowModal(true)}
                        className="text-vara-sm text-evergreen-teal hover:text-evergreen-teal font-medium"
                      >
                        Create a group
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-gradient-to-br from-evergreen-teal to-evergreen-teal rounded-vara-lg p-vara-base text-white">
                <h3 className="font-bold mb-3">Your Community Impact</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-vara-sm opacity-90">Groups Joined</span>
                    <span className="font-bold">
                      {groups.filter((g) => g.members?.includes(user?.uid)).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-vara-sm opacity-90">Connections</span>
                    <span className="font-bold">{connections.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-vara-sm opacity-90">Posts This Month</span>
                    <span className="font-bold">
                      {posts.filter((p) => p.authorId === user.uid).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Create Group Modal */}
          <CreateGroupModal isOpen={showModal} onClose={() => setShowModal(false)} />

          {/* New Chat Modal */}
          {showNewChatModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-vara-base">
              <div className="bg-white rounded-vara-lg p-vara-lg w-full max-w-md">
                <div className="flex items-center justify-between mb-vara-base">
                  <h2 className="text-vara-lg font-bold text-soft-charcoal">Start New Chat</h2>
                  <button
                    onClick={() => setShowNewChatModal(false)}
                    className="text-muted-sage-gray hover:text-muted-sage-gray p-2"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-sage-gray w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search connections..."
                      className="w-full pl-10 pr-4 py-3 border border-divider rounded-vara-lg focus:outline-none focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {connections.map((connection) => {
                      const otherUserId = connection.participants.find((id) => id !== user?.uid);
                      const otherUser = users[otherUserId];
                      const name = otherUser?.displayName || 'User';
                      const avatar =
                        otherUser?.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          name
                        )}&background=10b981&color=fff`;
                      return (
                        <button
                          key={connection.id}
                          onClick={() => openChatWith(otherUserId)}
                          className="w-full flex items-center gap-vara-md p-3 rounded-vara-lg hover:bg-dew-sage-light transition-colors text-left"
                        >
                          <img
                            src={avatar}
                            alt={name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium text-soft-charcoal">{name}</p>
                            <p className="text-vara-sm text-muted-sage-gray">Start conversation</p>
                          </div>
                        </button>
                      );
                    })}
                    {connections.length === 0 && (
                      <div className="text-center py-vara-lg">
                        <UserCheck className="w-8 h-8 text-muted-sage-gray mx-auto mb-2" />
                        <p className="text-vara-sm text-muted-sage-gray">No connections available</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-vara-md pt-4 border-t border-divider">
                    <button
                      onClick={() => setShowNewChatModal(false)}
                      className="flex-1 py-2 px-vara-base border border-divider rounded-vara-lg text-soft-charcoal hover:bg-dew-sage-light transition-colors"
                    >
                      Cancel
                    </button>
                    <button className="flex-1 py-2 px-vara-base bg-evergreen-teal text-white rounded-vara-lg hover:opacity-90 transition-colors">
                      Create Group Chat
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Connection Requests Modal */}
          {showRequestsModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-vara-base">
              <div className="bg-white rounded-vara-lg p-vara-lg w-full max-w-md">
                <div className="flex items-center justify-between mb-vara-base">
                  <h2 className="text-vara-lg font-bold text-soft-charcoal">Connection Requests</h2>
                  <button onClick={() => setShowRequestsModal(false)} className="text-muted-sage-gray hover:text-muted-sage-gray p-2">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {incomingRequests.length === 0 ? (
                  <div className="text-vara-sm text-muted-sage-gray py-8 text-center">
                    No pending requests.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {incomingRequests.map((req) => {
                      const otherUserId = (req.participants || []).find((id) => id !== user.uid);
                      const other = users[otherUserId] || {};
                      const name = other.displayName || 'User';
                      const avatar =
                        other.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=10b981&color=fff`;

                      return (
                        <div key={req.id} className="flex items-center justify-between p-3 border border-divider rounded-vara-lg">
                          <div className="flex items-center gap-vara-md">
                            <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover" />
                            <div>
                              <p className="font-medium text-soft-charcoal">{name}</p>
                              <p className="text-vara-xs text-muted-sage-gray">wants to connect</p>
                            </div>
                          </div>
                          <div className="flex gap-vara-sm">
                            <button
                              onClick={() => handleDeclineRequest(req.id)}
                              className="px-3 py-1.5 text-vara-sm rounded-vara-md border border-divider text-soft-charcoal hover:bg-dew-sage-light"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleAcceptRequest(req.id)}
                              className="px-3 py-1.5 text-vara-sm rounded-vara-md bg-evergreen-teal text-white hover:opacity-90"
                            >
                              Accept
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {reportingPost && (
        <ReportPostModal
          postId={reportingPost.id}
          reportedUserId={reportingPost.authorId || reportingPost.userId}
          reporterId={user?.uid}
          onClose={() => setReportingPost(null)}
        />
      )}
      <EditPostModal
        isOpen={!!editingPost}
        onClose={() => setEditingPost(null)}
        post={editingPost}
        onSave={(updates) => handleEditPost(editingPost.id, updates)}
      />
    </SidebarLayout>
  );
};

export default CommunityPage;







