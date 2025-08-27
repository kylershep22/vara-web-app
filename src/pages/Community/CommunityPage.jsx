// src/pages/Community/CommunityPage.jsx
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
  Loader
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import {
  // Groups
  fetchUserGroups,
  fetchPublicGroups,
  joinGroup,
  leaveGroup,
  // Connections
  fetchUserConnections,
  fetchIncomingConnectionRequests,
  acceptConnection,
  declineConnection,
  cancelConnectionRequest,
  // Posts
  fetchFeedPosts,
  getUserById,
  createPost,
  addCommentToPost,
  togglePostLike,
  toggleCommentLike
} from '../../services/communityService';

import {
  subscribeConversations,
  subscribeMessages,
  createOrGetConversation,
  sendDirectMessage
} from '../../services/messagingService';

import { db } from '../../firebase';
import { getDoc, doc, updateDoc } from 'firebase/firestore';
import SidebarLayout from '../../components/layout/SidebarLayout';
import { useAuth } from '../../context/AuthContext';
import ConnectionsModal from "../../components/community/ConnectionsModal";

const CommunityPage = () => {
  const { user, isAuthReady } = useAuth();
  const navigate = useNavigate();

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

  // Load community data
  useEffect(() => {
    if (!isAuthReady || !user?.uid) return;

    const loadCommunityData = async () => {
      setLoading(true);
      try {
        // Connections
        const userConnections = await fetchUserConnections(user.uid);
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
        const reqs = await fetchIncomingConnectionRequests(user.uid);
        setIncomingRequests(reqs || []);
      } catch (e) {
        console.error('fetchIncomingConnectionRequests failed:', e);
      }
    };
    load();
  }, [user?.uid]);

  const refreshConnectionsAndRequests = async () => {
    try {
      const [reqs, conns] = await Promise.all([
        fetchIncomingConnectionRequests(user.uid),
        fetchUserConnections(user.uid)
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
      const postId = await createPost({
        authorId: user.uid,
        content: newPost.trim(),
        images: imagePreview, // replace with uploaded URLs when wired
        groupId: selectedGroupId
      });

      const groupInfo = selectedGroupId
        ? groups.find((g) => g.id === selectedGroupId) || null
        : null;

      const newPostObj = {
        id: postId,
        authorId: user.uid,
        content: newPost.trim(),
        images: imagePreview,
        groupId: selectedGroupId,
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
    } catch (err) {
      console.error('Failed to create post:', err);
    } finally {
      setIsPosting(false);
    }
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedImages((prev) => [...prev, ...files].slice(0, 4));
      const previews = files.map((file) => URL.createObjectURL(file));
      setImagePreview((prev) => [...prev, ...previews].slice(0, 4));
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
      await acceptConnection(connectionId, user.uid);
      await refreshConnectionsAndRequests();
    } catch (e) {
      console.error('acceptConnectionRequest failed:', e);
    }
  };

  const handleDeclineRequest = async (connectionId) => {
    try {
      await declineConnection(connectionId, user.uid);
      await refreshConnectionsAndRequests();
    } catch (e) {
      console.error('declineConnectionRequest failed:', e);
    }
  };

  // Optional (only if you also want to show "Outgoing" requests somewhere)
  const handleCancelRequest = async (connectionId) => {
    try {
      await cancelConnectionRequest(connectionId, user.uid);
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

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
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
                  {isGroupPost && (post.groupInfo || groups.find((g) => g.id === post.groupId)) && (
                    <>
                      <span className="text-gray-400">→</span>
                      <span className="text-emerald-600 font-medium text-sm">
                        {(post.groupInfo || groups.find((g) => g.id === post.groupId))?.name}
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

          {post.content && (
            <p className="text-gray-900 mb-3 whitespace-pre-wrap leading-relaxed">
              {post.content}
            </p>
          )}
        </div>

        {post.images && post.images.length > 0 && (
          <div className="px-4 pb-3">
            <div
              className={`grid gap-1 rounded-xl overflow-hidden ${
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
              <button onClick={() => toggleComments(post.id)} className="hover:underline">
                {post.comments.length} comment{post.comments.length !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

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

        {showComments[post.id] && (
          <div className="px-4 pb-4 border-t border-gray-50">
            <div className="flex gap-3 pt-4 mb-4">
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
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Write a comment..."
                  value={localComment}
                  onChange={(e) => setLocalComment(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && handleCommentSubmit(post.id, localComment, setLocalComment)
                  }
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

            {post.comments?.length > 0 && (
              <div className="space-y-3">
                {post.comments.map((comment, index) => {
                  const commentAuthor = getUserDisplayInfo(comment.authorId);
                  const replyKey = `${post.id}_${index}`;
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
                          <div className="mt-2 flex gap-2">
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
                            <div className="flex-1 flex gap-2">
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
                                className="flex-1 bg-gray-100 rounded-full px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                              />
                              <button
                                className="text-emerald-600 hover:text-emerald-700 p-1"
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
                                <div key={r.id || rIdx} className="flex gap-2 items-start">
                                  <img
                                    src={rAuthor.avatar}
                                    alt={rAuthor.name}
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                  <div className="bg-gray-50 rounded-2xl px-3 py-1.5">
                                    <p className="text-xs font-semibold text-gray-900">{rAuthor.name}</p>
                                    <p className="text-sm text-gray-800">{r.text}</p>
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

  // Group Card
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
              {group.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              <span>{group.memberCount || 0} members</span>
              {isCreator && <Star className="w-3 h-3 text-yellow-500 fill-current" />}
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">{group.description}</p>

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

  // Create Group Modal
  const CreateGroupModal = ({ isOpen, onClose }) => {
    const [groupName, setGroupName] = useState('');
    const [groupDescription, setGroupDescription] = useState('');
    const [groupEmoji, setGroupEmoji] = useState('🌱');
    const [isPublic, setIsPublic] = useState(true);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
      e.preventDefault();
      const newGroup = {
        id: `group${Date.now()}`,
        name: groupName,
        description: groupDescription,
        emoji: groupEmoji,
        isPublic,
        memberCount: 1,
        createdBy: user.uid,
        members: [user.uid],
        category: 'general'
      };

      setGroups((prev) => [newGroup, ...prev]);
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
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2">
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

  // Render
  if (!isAuthReady || !user) {
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
    <SidebarLayout>
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
              {incomingRequests.length > 0 && (
                <button
                  onClick={() => setShowRequestsModal(true)}
                  className="relative flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl hover:bg-emerald-100 transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  <span className="font-medium">
                    {incomingRequests.length} Request{incomingRequests.length > 1 ? 's' : ''}
                  </span>
                  <div className="absolute -top-2 -right-2 w-5 h-5 bg-emerald-600 text-white text-xs rounded-full flex items-center justify-center">
                    {incomingRequests.length}
                  </div>
                </button>
              )}

              {pendingInvitations.length > 0 && (
                <button
                  onClick={() => {}}
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

          {/* Tabs */}
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

          {/* Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Left/Center */}
            <div className="lg:col-span-3">
              {/* Feed */}
              {activeTab === 'feed' && (
                <div className="space-y-6">
                  {/* Composer */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <form onSubmit={handlePostSubmit}>
                      <div className="flex gap-3 mb-4">
                        <div className="flex flex-col gap-2 w-full mb-4">
                          <div className="flex gap-3 items-start">
                            <img
                              src={
                                users[user?.uid]?.avatarUrl ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  users[user?.uid]?.displayName || user?.displayName || 'User'
                                )}&background=10b981&color=fff`
                              }
                              alt="Your avatar"
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-sm"
                            />
                            <div className="flex-1 flex flex-col gap-2">
                              <select
                                value={selectedGroupId || ''}
                                onChange={(e) => setSelectedGroupId(e.target.value || null)}
                                className="w-full text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
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

                      {imagePreview.length > 0 && (
                        <div className="mb-4">
                          <div
                            className={`grid gap-2 ${
                              imagePreview.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                            }`}
                          >
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

                  {/* Feed list */}
                  {loading ? (
                    <div className="flex justify-center py-12">
                      <div className="text-center">
                        <Loader className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
                        <p className="text-gray-600">Loading your feed...</p>
                      </div>
                    </div>
                  ) : posts.length > 0 ? (
                    <div className="space-y-6">
                      {posts.map((post) => (
                        <PostCard key={post.id} post={post} />
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

              {/* Discover */}
              {activeTab === 'discover' && (
                <div className="space-y-6">
                  {/* Search */}
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
                    <div
                      className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white p-6 rounded-2xl shadow-sm cursor-pointer hover:opacity-95"
                      onClick={() => navigate('/community/people')}
                    >
                      <Users className="w-8 h-8 mb-3" />
                      <h3 className="font-semibold mb-2">Find Partners</h3>
                      <p className="text-sm opacity-90">Connect with accountability partners</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-2xl shadow-sm">
                      <Video className="w-8 h-8 mb-3" />
                      <h3 className="font-semibold mb-2">Live Sessions</h3>
                      <p className="text-sm opacity-90">Join live wellness sessions</p>
                    </div>
                    <div
                      className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-2xl shadow-sm cursor-pointer hover:opacity-95"
                      onClick={() => setShowModal(true)}
                    >
                      <SettingsIcon className="w-8 h-8 mb-3" />
                      <h3 className="font-semibold mb-2">Create Group</h3>
                      <p className="text-sm opacity-90">Build your wellness community</p>
                    </div>
                  </div>

                  {/* Trending Groups */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Trending Groups</h2>
                    {groups.filter((group) => group.isPublic).length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No public groups yet</h3>
                        <p className="text-gray-600">Be the first to create a public group!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Messages */}
              {activeTab === 'messages' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-[32rem] grid grid-cols-1 md:grid-cols-3 overflow-hidden">
                  {/* Conversations list */}
                  <div className="border-r border-gray-100 hidden md:block">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                      <h2 className="text-lg font-bold text-gray-900">Messages</h2>
                      <button
                        onClick={() => setShowNewChatModal(true)}
                        className="text-emerald-600 text-sm font-medium hover:text-emerald-700"
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

                        return (
                          <button
                            key={c.id}
                            onClick={() => setActiveConversationId(c.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 ${
                              active ? 'bg-emerald-50' : ''
                            }`}
                          >
                            <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover" />
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 truncate">{name}</p>
                              <p className="text-sm text-gray-500 truncate">{preview}</p>
                            </div>
                          </button>
                        );
                      })}
                      {dmConversations.length === 0 && (
                        <div className="p-6 text-sm text-gray-500">No conversations yet.</div>
                      )}
                    </div>
                  </div>

                  {/* Chat pane */}
                  <div className="col-span-2 flex flex-col h-full">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 flex items-center gap-3">
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
                            <h3 className="font-semibold text-gray-900">{name}</h3>
                          </>
                        );
                      })()}
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
                      {activeConversationId ? (
                        dmMessages.map((m) => {
                          const mine = m.senderId === user.uid;
                          return (
                            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`px-3 py-2 rounded-2xl max-w-[75%] text-sm ${
                                  mine
                                    ? 'bg-emerald-600 text-white rounded-br-sm'
                                    : 'bg-white text-gray-900 border border-gray-100 rounded-bl-sm'
                                }`}
                              >
                                {m.text}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="h-full flex items-center justify-center text-gray-500">
                          Select a conversation to start chatting
                        </div>
                      )}
                    </div>

                    {/* Composer */}
                    <div className="p-3 border-t border-gray-100 flex items-center gap-2">
                      <input
                        value={dmText}
                        onChange={(e) => setDmText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendDM()}
                        placeholder="Write a message…"
                        disabled={!activeConversationId}
                        className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                      />
                      <button
                        onClick={handleSendDM}
                        disabled={!activeConversationId || !dmText.trim()}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50"
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
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">My Groups</h3>
                  <button className="text-emerald-600 hover:text-emerald-700 text-sm font-medium">
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
                  {groups.filter((group) => group.members?.includes(user?.uid)).length === 0 && (
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
                  <div className="flex items-center gap-2">
                    <button
                      className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                      onClick={() => navigate('/community/people')}
                    >
                      Find more
                    </button>
                    <button
                      className="text-sm text-gray-500 hover:text-gray-700"
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
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
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
                          <p className="font-medium text-gray-900 truncate">
                            {otherUser?.displayName || 'User'}
                          </p>
                          <p className="text-xs text-gray-500">Connected</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            onClick={() => openChatWith(otherUserId)}
                          >
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
                      <button
                        className="text-emerald-600 hover:text-emerald-700 text-sm font-medium mt-2"
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
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                  <h3 className="font-bold text-gray-900 mb-4">Group Invitations</h3>
                  <div className="space-y-3">
                    {pendingInvitations.slice(0, 3).map((invitation) => (
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
                  {groups
                    .filter((group) => group.isPublic && !group.members?.includes(user?.uid))
                    .slice(0, 3)
                    .map((group) => (
                      <GroupCard key={group.id} group={group} />
                    ))}
                  {groups.filter((g) => g.isPublic && !g.members?.includes(user?.uid)).length === 0 && (
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
                    <span className="font-bold">
                      {groups.filter((g) => g.members?.includes(user?.uid)).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm opacity-90">Connections</span>
                    <span className="font-bold">{connections.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm opacity-90">Posts This Month</span>
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
                          className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                        >
                          <img
                            src={avatar}
                            alt={name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-medium text-gray-900">{name}</p>
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

          {/* Connection Requests Modal */}
          {showRequestsModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Connection Requests</h2>
                  <button onClick={() => setShowRequestsModal(false)} className="text-gray-400 hover:text-gray-600 p-2">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {incomingRequests.length === 0 ? (
                  <div className="text-sm text-gray-600 py-8 text-center">
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
                        <div key={req.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl">
                          <div className="flex items-center gap-3">
                            <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover" />
                            <div>
                              <p className="font-medium text-gray-900">{name}</p>
                              <p className="text-xs text-gray-500">wants to connect</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeclineRequest(req.id)}
                              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
                            >
                              Decline
                            </button>
                            <button
                              onClick={() => handleAcceptRequest(req.id)}
                              className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
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
    </SidebarLayout>
  );
};

export default CommunityPage;







