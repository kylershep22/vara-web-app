// src/pages/Profile/ProfilePage.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  User,
  Edit3,
  MapPin,
  Shield,
  Eye,
  Users,
  MessageCircle,
  UserPlus,
  Check,
  X,
  Search,
  Loader,
  Send,
  ArrowLeftRight,
  Lock,
  Globe,
  Settings,
  AlertCircle,
  Heart,
  MessageSquare,
  TrendingUp,
  Calendar,
  Award,
  Target,
  Activity,
  Bookmark,
  Share2,
  MoreHorizontal,
  ChevronDown,
  Image as ImageIcon,
  Link as LinkIcon,
} from 'lucide-react';

import { useParams, useNavigate, Link } from 'react-router-dom';

import { db } from '../../firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  startAt,
  endAt,
  startAfter,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

import SidebarLayout from '../../components/layout/SidebarLayout';
import { useAuth } from '../../context/AuthContext';

// ---------- helpers ----------
const useAuthLazily = () => {
  const [state, setState] = useState({ user: null, isAuthReady: false });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import('../../context/AuthContext');
        const snap = mod.getAuthState ? mod.getAuthState() : { user: null, isAuthReady: false };
        if (mounted) setState(snap);
      } catch (e) {
        if (mounted) setState({ user: null, isAuthReady: false });
      }
    })();
    return () => { mounted = false; };
  }, []);

  return state;
};

const defaultProfile = {
  displayName: '',
  bio: '',
  interests: [],
  goals: [],
  location: '',
  privacy: 'public',
  searchable: true,
  avatarUrl: '',
  bannerUrl: '',
};

const avatarFor = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=10b981&color=fff`;

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp?.toDate?.() || new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
};

// ---------- Firestore ops ----------
async function readUser(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: uid, ...snap.data() } : null;
}

async function writeUser(uid, partial) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, { ...partial, updatedAt: serverTimestamp() });
  } else {
    await setDoc(ref, { ...defaultProfile, ...partial, createdAt: serverTimestamp() });
  }
}

async function sendConnectionInvite(fromUid, toUid) {
  const q = query(
    collection(db, 'connectionInvites'),
    where('from', '==', fromUid),
    where('to', '==', toUid),
    where('status', '==', 'pending')
  );
  const existing = await getDocs(q);
  if (!existing.empty) return existing.docs[0].id;

  const newDoc = await addDoc(collection(db, 'connectionInvites'), {
    from: fromUid,
    to: toUid,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return newDoc.id;
}

async function listIncomingInvites(uid) {
  const q = query(
    collection(db, 'connectionInvites'),
    where('to', '==', uid),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function listOutgoingInvites(uid) {
  const q = query(
    collection(db, 'connectionInvites'),
    where('from', '==', uid),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function acceptInvite(invite, actingUid) {
  if (invite.to !== actingUid) throw new Error('Only recipient can accept');
  await addDoc(collection(db, 'connections'), {
    participants: [invite.from, invite.to],
    createdAt: serverTimestamp(),
    status: 'active',
  });
  await updateDoc(doc(db, 'connectionInvites', invite.id), { status: 'accepted' });
}

async function declineInvite(invite, actingUid) {
  if (invite.to !== actingUid) throw new Error('Only recipient can decline');
  await updateDoc(doc(db, 'connectionInvites', invite.id), { status: 'declined' });
}

async function peopleSearch({ term, currentUid }) {
  const trimmed = (term || '').trim();

  if (trimmed.length >= 2) {
    const kw = trimmed.toLowerCase();
    const q1 = query(
      collection(db, 'users'),
      where('searchable', '==', true),
      where('keywords', 'array-contains', kw),
      limit(25)
    );
    try {
      const snap = await getDocs(q1);
      if (!snap.empty) {
        return snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(u => u.id !== currentUid);
      }
    } catch {
      // fall through to prefix search
    }
  }

  const q2 = query(
    collection(db, 'users'),
    where('searchable', '==', true),
    orderBy('displayName'),
    startAt(trimmed),
    endAt(trimmed + '\uf8ff'),
    limit(25)
  );
  const snap2 = await getDocs(q2);
  return snap2.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(u => u.id !== currentUid);
}

async function findOrCreateConversation(a, b) {
  const q1 = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', a),
    limit(50)
  );
  const snap = await getDocs(q1);
  const existing = snap.docs.find(d => {
    const arr = d.data().participants || [];
    return arr.includes(a) && arr.includes(b) && arr.length === 2 && (d.data().status ?? 'active') !== 'archived';
  });
  if (existing) return existing.id;

  const docRef = await addDoc(collection(db, 'conversations'), {
    participants: [a, b],
    lastMessageAt: serverTimestamp(),
    lastMessageText: '',
    status: 'active',
  });
  return docRef.id;
}

async function sendDirectMessage({ conversationId, from, to, text }) {
  await addDoc(collection(db, 'directMessages'), {
    conversationId,
    senderId: from,
    receiverId: to,
    text,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessageAt: serverTimestamp(),
    lastMessageText: text.slice(0, 200),
  });
}

async function getUserProfile(uid) {
  return readUser(uid);
}

async function upsertUserProfile(uid, patch) {
  return writeUser(uid, patch);
}

async function requestConnection(fromUid, toUid) {
  return sendConnectionInvite(fromUid, toUid);
}

async function areConnected(a, b) {
  const q1 = query(
    collection(db, 'connections'),
    where('participants', 'array-contains', a),
    where('status', '==', 'active'),
    limit(50)
  );
  const snap = await getDocs(q1);
  return snap.docs.some(d => {
    const arr = d.data().participants || [];
    return arr.includes(a) && arr.includes(b);
  });
}

async function getProfileStats(userId) {
  try {
    // Fetch counts for posts, connections, and goals
    const [postsSnap, connectionsSnap, goalsSnap, habitsSnap] = await Promise.all([
      getDocs(query(collection(db, 'posts'), where('authorId', '==', userId))),
      getDocs(query(collection(db, 'connections'), where('participants', 'array-contains', userId), where('status', '==', 'active'))),
      getDocs(query(collection(db, 'goals'), where('userId', '==', userId))),
      getDocs(query(collection(db, 'habits'), where('userId', '==', userId), where('status', '==', 'active'))),
    ]);

    return {
      posts: postsSnap.size,
      connections: connectionsSnap.size,
      goals: goalsSnap.size,
      habits: habitsSnap.size,
    };
  } catch (e) {
    console.error('Error fetching stats:', e);
    return { posts: 0, connections: 0, goals: 0, habits: 0 };
  }
}

async function fetchUserPosts(userId, lastDoc = null, limitCount = 10) {
  try {
    let q = query(
      collection(db, 'posts'),
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    if (lastDoc) {
      q = query(
        collection(db, 'posts'),
        where('authorId', '==', userId),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(limitCount)
      );
    }

    const snap = await getDocs(q);
    const posts = snap.docs.map(d => ({ id: d.id, ...d.data(), _doc: d }));

    // Fetch group names for each post
    const postsWithGroups = await Promise.all(
      posts.map(async (post) => {
        if (post.groupId) {
          try {
            const groupSnap = await getDoc(doc(db, 'groups', post.groupId));
            return { ...post, groupName: groupSnap.exists() ? groupSnap.data().name : 'Unknown Group' };
          } catch {
            return { ...post, groupName: 'Unknown Group' };
          }
        }
        return { ...post, groupName: 'Community Feed' };
      })
    );

    return {
      posts: postsWithGroups,
      lastDoc: snap.docs[snap.docs.length - 1],
      hasMore: snap.docs.length === limitCount,
    };
  } catch (e) {
    console.error('Error fetching posts:', e);
    return { posts: [], lastDoc: null, hasMore: false };
  }
}

// small util
const Pill = ({ children, className = '' }) => (
  <span className={`inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium ${className}`}>
    {children}
  </span>
);

// ---------------------------------------
// ACTIVITY FEED TAB OPTIONS
// ---------------------------------------
const ActivityTab = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-emerald-600 text-emerald-600'
        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
    }`}
  >
    {label}
  </button>
);

// ---------------------------------------
// PROFILE STATS CARD
// ---------------------------------------
const ProfileStatsCard = ({ stats, isMe }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
    <h3 className="text-sm font-semibold text-gray-700 mb-4">Profile Stats</h3>
    <div className="grid grid-cols-2 gap-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-emerald-600">{stats.posts}</div>
        <div className="text-xs text-gray-600 mt-1">Posts</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-emerald-600">{stats.connections}</div>
        <div className="text-xs text-gray-600 mt-1">Connections</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-emerald-600">{stats.goals}</div>
        <div className="text-xs text-gray-600 mt-1">Goals</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-emerald-600">{stats.habits}</div>
        <div className="text-xs text-gray-600 mt-1">Active Habits</div>
      </div>
    </div>
  </div>
);

// ---------------------------------------
// POST CARD COMPONENT
// ---------------------------------------
const PostCard = ({ post, authorProfile, onLike, onComment, isMe }) => {
  const [showComments, setShowComments] = useState(false);
  const likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
  const commentsCount = Array.isArray(post.comments) ? post.comments.length : 0;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img
            src={authorProfile?.avatarUrl || avatarFor(authorProfile?.displayName)}
            alt={authorProfile?.displayName}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <div className="font-semibold text-gray-900">{authorProfile?.displayName || 'User'}</div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{formatDate(post.createdAt)}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {post.groupName}
              </span>
            </div>
          </div>
        </div>
        <button className="p-2 rounded-lg hover:bg-gray-100">
          <MoreHorizontal className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Post Content */}
      <div className="mb-4">
        <p className="text-gray-800 whitespace-pre-wrap">{post.content || post.body}</p>
      </div>

      {/* Post Image (if any) */}
      {post.imageUrl && (
        <div className="mb-4 rounded-xl overflow-hidden">
          <img src={post.imageUrl} alt="Post" className="w-full h-auto" />
        </div>
      )}

      {/* Engagement Bar */}
      <div className="flex items-center justify-between py-3 border-t border-gray-100">
        <div className="flex items-center gap-6">
          <button
            onClick={onLike}
            className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-colors"
          >
            <Heart className={`w-5 h-5 ${likesCount > 0 ? 'fill-emerald-600 text-emerald-600' : ''}`} />
            <span className="text-sm font-medium">{likesCount}</span>
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm font-medium">{commentsCount}</span>
          </button>
          <button className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
        <button className="text-gray-600 hover:text-emerald-600">
          <Bookmark className="w-5 h-5" />
        </button>
      </div>

      {/* Comments Section */}
      {showComments && commentsCount > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          {post.comments?.slice(0, 3).map((comment, idx) => (
            <div key={idx} className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-sm text-gray-900">{comment.authorName || 'User'}</div>
                  <p className="text-sm text-gray-700 mt-1">{comment.text}</p>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 ml-2">
                  <span>{formatDate(comment.createdAt)}</span>
                  <button className="hover:underline">Like</button>
                  <button className="hover:underline">Reply</button>
                </div>
              </div>
            </div>
          ))}
          {commentsCount > 3 && (
            <button className="text-sm text-emerald-600 hover:underline ml-10">
              View all {commentsCount} comments
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------
// MAIN PAGE COMPONENT
// ---------------------------------------
const ProfilePage = () => {
  const { user, isAuthReady } = useAuthLazily();
  const { uid: routeUid } = useParams();
  const navigate = useNavigate();

  const viewedUserId = routeUid || user?.uid || null;
  const isMe = !!user?.uid && !!viewedUserId && user.uid === viewedUserId;

  const [profile, setProfile] = useState(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const [isConnected, setIsConnected] = useState(false);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [quickMsg, setQuickMsg] = useState({});

  // Profile Stats
  const [stats, setStats] = useState({ posts: 0, connections: 0, goals: 0, habits: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // Activity Feed
  const [activeTab, setActiveTab] = useState('posts'); // posts, about, connections
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);

  const publicView = useMemo(() => {
    const { displayName, bio, interests, goals, location, privacy, searchable, avatarUrl } = profile;
    return {
      displayName,
      bio: privacy === 'private' ? '' : bio,
      location: privacy === 'private' ? '' : location,
      interests: privacy === 'private' ? [] : (interests || []).slice(0, 6),
      goals: privacy === 'private' ? [] : (goals || []).slice(0, 3),
      avatarUrl,
      searchable,
      privacy,
    };
  }, [profile]);

  // Load profile + stats
  useEffect(() => {
    if (!isAuthReady || !viewedUserId) return;

    (async () => {
      setLoading(true);
      setStatsLoading(true);
      try {
        const p = await getUserProfile(viewedUserId);
        if (p) setProfile(prev => ({ ...prev, ...p }));

        // Load stats
        const profileStats = await getProfileStats(viewedUserId);
        setStats(profileStats);

        if (user?.uid) {
          if (user.uid !== viewedUserId) {
            const connected = await areConnected(user.uid, viewedUserId);
            setIsConnected(connected);
          } else {
            const [inc, out] = await Promise.all([
              listIncomingInvites(user.uid),
              listOutgoingInvites(user.uid),
            ]);
            setIncoming(inc);
            setOutgoing(out);
          }
        }
      } catch (e) {
        console.error('Profile load error', e);
      } finally {
        setLoading(false);
        setStatsLoading(false);
      }
    })();
  }, [isAuthReady, user?.uid, viewedUserId]);

  // Load initial posts
  useEffect(() => {
    if (!viewedUserId || activeTab !== 'posts') return;

    (async () => {
      setPostsLoading(true);
      try {
        const result = await fetchUserPosts(viewedUserId, null, 10);
        setPosts(result.posts);
        setLastDoc(result.lastDoc);
        setHasMore(result.hasMore);
      } catch (e) {
        console.error('Error loading posts:', e);
      } finally {
        setPostsLoading(false);
      }
    })();
  }, [viewedUserId, activeTab]);

  // Infinite scroll observer
  const loadMorePosts = useCallback(async () => {
    if (postsLoading || !hasMore || !lastDoc || activeTab !== 'posts') return;

    setPostsLoading(true);
    try {
      const result = await fetchUserPosts(viewedUserId, lastDoc, 10);
      setPosts(prev => [...prev, ...result.posts]);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (e) {
      console.error('Error loading more posts:', e);
    } finally {
      setPostsLoading(false);
    }
  }, [viewedUserId, lastDoc, hasMore, postsLoading, activeTab]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !postsLoading) {
          loadMorePosts();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loadMorePosts, hasMore, postsLoading]);

  const upsertProfile = async (e) => {
    e?.preventDefault?.();
    if (!user?.uid) return;
    await upsertUserProfile(user.uid, profile);
    setEditOpen(false);
  };

  const doSearch = async () => {
    if (!user?.uid) return;
    setSearching(true);
    try {
      const res = await peopleSearch({ term: searchTerm, currentUid: user.uid });
      setResults(res);
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  async function onConnect() {
    if (!user?.uid || !viewedUserId || isMe) return;
    try {
      await requestConnection(user.uid, viewedUserId);
      setIsConnected(false);
      alert('Connection request sent.');
    } catch (e) {
      console.error('requestConnection error', e);
    }
  }

  async function onMessage() {
    if (!user?.uid || !viewedUserId) return;
    try {
      const id = await findOrCreateConversation(user.uid, viewedUserId);
      alert('Opening conversation… (wire your /messages route)');
    } catch (e) {
      console.error('findOrCreateConversation error', e);
    }
  }

  const handleConnect = async (targetUserId) => {
    if (!user?.uid) return;
    try {
      await sendConnectionInvite(user.uid, targetUserId);
      setOutgoing(prev => {
        const exists = prev.find(i => i.to === targetUserId && i.status === 'pending');
        if (exists) return prev;
        return [{ id: `local_${Date.now()}`, from: user.uid, to: targetUserId, status: 'pending' }, ...prev];
      });
    } catch (e) {
      console.error('Invite error', e);
    }
  };

  const handleAccept = async (invite) => {
    if (!user?.uid) return;
    try {
      await acceptInvite(invite, user.uid);
      setIncoming(prev => prev.filter(i => i.id !== invite.id));
    } catch (e) {
      console.error('Accept error', e);
    }
  };

  const handleDecline = async (invite) => {
    if (!user?.uid) return;
    try {
      await declineInvite(invite, user.uid);
      setIncoming(prev => prev.filter(i => i.id !== invite.id));
    } catch (e) {
      console.error('Decline error', e);
    }
  };

  const startMessage = async (toUser) => {
    if (!user?.uid) return;
    try {
      const convId = await findOrCreateConversation(user.uid, toUser.id);
      const text = (quickMsg[toUser.id] || '').trim();
      if (text) {
        await sendDirectMessage({ conversationId: convId, from: user.uid, to: toUser.id, text });
        setQuickMsg(s => ({ ...s, [toUser.id]: '' }));
      }
      alert('Conversation ready! (Wire to your Messages route)');
    } catch (e) {
      console.error('DM error', e);
    }
  };

  if (!isAuthReady || !viewedUserId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          {/* Header / Banner */}
          <div className="relative mb-6">
            <div className="h-44 md:h-56 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600" />
            <div className="absolute -bottom-8 left-6 flex items-end gap-4">
              <img
                src={profile.avatarUrl || avatarFor(profile.displayName)}
                alt="avatar"
                className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white shadow-md bg-white"
              />
              <div className="pb-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">{profile.displayName || 'User'}</h1>
                  <Pill>
                    {profile.privacy === 'public' && <><Globe className="w-3 h-3 mr-1" /> Public</>}
                    {profile.privacy === 'connections' && <><Users className="w-3 h-3 mr-1" /> Connections</>}
                    {profile.privacy === 'private' && <><Lock className="w-3 h-3 mr-1" /> Private</>}
                  </Pill>
                </div>
                <p className="text-gray-600">{profile.location || (isMe ? 'Add your location' : '')}</p>
              </div>
            </div>

            {/* Right-side banner actions */}
            <div className="absolute right-6 -bottom-6 flex items-center gap-2">
              {isMe ? (
                <>
                  <button
                    onClick={() => setEditOpen(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Edit3 className="w-4 h-4" /> Edit Profile
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onMessage}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-black"
                  >
                    <MessageCircle className="w-4 h-4" /> Message
                  </button>
                  <button
                    onClick={onConnect}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <UserPlus className="w-4 h-4" /> {isConnected ? 'Connected' : 'Connect'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
            {/* Left Sidebar: About + Stats */}
            <div className="space-y-6">
              {/* About card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">About</h2>
                  {isMe && (
                    <button
                      onClick={() => setEditOpen(true)}
                      className="p-2 rounded-lg hover:bg-gray-100"
                    >
                      <Edit3 className="w-4 h-4 text-gray-600" />
                    </button>
                  )}
                </div>
                <p className="text-gray-800 text-sm whitespace-pre-wrap">{profile.bio || (isMe ? 'Tell the community about your wellness journey…' : '')}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(profile.interests || []).slice(0, 6).map((i) => (
                    <span key={i} className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">{i}</span>
                  ))}
                  {(profile.interests || []).length === 0 && isMe && (
                    <span className="text-gray-500 text-xs">Add interests to connect with others</span>
                  )}
                </div>

                {profile.goals?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                      <Target className="w-3 h-3" /> Top Goals
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.goals.slice(0, 3).map((g) => (
                        <span key={g} className="px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs">{g}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Stats Card */}
              {!statsLoading && <ProfileStatsCard stats={stats} isMe={isMe} />}

              {/* Requests + People search (self only) */}
              {isMe && (
                <>
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900">Requests</h3>
                      <Pill>{incoming.length} pending</Pill>
                    </div>
                    {incoming.length === 0 ? (
                      <p className="text-sm text-gray-500">No incoming requests.</p>
                    ) : (
                      <div className="space-y-3">
                        {incoming.map((inv) => (
                          <InviteRow
                            key={inv.id}
                            invite={inv}
                            onAccept={() => handleAccept(inv)}
                            onDecline={() => handleDecline(inv)}
                          />
                        ))}
                      </div>
                    )}

                    {outgoing.length > 0 && (
                      <>
                        <div className="mt-5 mb-2 text-xs font-semibold text-gray-500">Outgoing</div>
                        <div className="space-y-2">
                          {outgoing.map((inv) => (
                            <OutgoingRow key={inv.id} invite={inv} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-3">Find people</h3>
                    <div className="relative mb-3">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                        placeholder="Search by name…"
                        className="w-full pl-9 pr-24 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        onClick={doSearch}
                        disabled={searching}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {searching ? 'Searching…' : 'Search'}
                      </button>
                    </div>

                    {results.length === 0 && !searching ? (
                      <div className="text-sm text-gray-500">
                        Search for people in your wellness community
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {results.map((u) => (
                          <UserResultRow
                            key={u.id}
                            me={user}
                            user={u}
                            outgoing={outgoing}
                            onConnect={() => handleConnect(u.id)}
                            quickMsg={quickMsg[u.id] || ''}
                            setQuickMsg={(val) => setQuickMsg(s => ({ ...s, [u.id]: val }))}
                            onMessage={() => startMessage(u)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Right: Activity Feed (2 columns) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tab Navigation */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="border-b border-gray-100 flex">
                  <ActivityTab active={activeTab === 'posts'} label="Posts" onClick={() => setActiveTab('posts')} />
                  <ActivityTab active={activeTab === 'about'} label="About" onClick={() => setActiveTab('about')} />
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === 'posts' && (
                    <div className="space-y-6">
                      {postsLoading && posts.length === 0 ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader className="w-8 h-8 animate-spin text-emerald-600" />
                        </div>
                      ) : posts.length === 0 ? (
                        <div className="text-center py-12">
                          <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-600">{isMe ? 'You haven\'t posted anything yet' : 'No posts yet'}</p>
                          {isMe && (
                            <button
                              onClick={() => navigate('/community')}
                              className="mt-4 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              Share your first post
                            </button>
                          )}
                        </div>
                      ) : (
                        <>
                          {posts.map((post) => (
                            <PostCard
                              key={post.id}
                              post={post}
                              authorProfile={profile}
                              onLike={() => {}}
                              onComment={() => {}}
                              isMe={isMe}
                            />
                          ))}
                          {hasMore && (
                            <div ref={observerTarget} className="flex justify-center py-4">
                              {postsLoading && <Loader className="w-6 h-6 animate-spin text-emerald-600" />}
                            </div>
                          )}
                          {!hasMore && posts.length > 0 && (
                            <div className="text-center py-4 text-sm text-gray-500">
                              You've reached the end
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {activeTab === 'about' && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Full Bio</h3>
                        <p className="text-gray-800 whitespace-pre-wrap">
                          {profile.bio || (isMe ? 'Share your wellness journey with the community…' : 'No bio yet')}
                        </p>
                      </div>

                      {profile.interests && profile.interests.length > 0 && (
                        <div className="pt-6 border-t border-gray-100">
                          <h3 className="text-sm font-semibold text-gray-700 mb-3">Interests</h3>
                          <div className="flex flex-wrap gap-2">
                            {profile.interests.map((i) => (
                              <span key={i} className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm">
                                {i}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {profile.goals && profile.goals.length > 0 && (
                        <div className="pt-6 border-t border-gray-100">
                          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <Target className="w-4 h-4" /> Wellness Goals
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {profile.goals.map((g) => (
                              <span key={g} className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-sm">
                                {g}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Edit Modal */}
          {editOpen && isMe && (
            <EditProfileModal
              profile={profile}
              setProfile={setProfile}
              onClose={() => setEditOpen(false)}
              onSave={upsertProfile}
            />
          )}
        </div>
      </div>
    </SidebarLayout>
  );
};

// ---------- Subcomponents ----------
const InviteRow = ({ invite, onAccept, onDecline }) => {
  const [fromUser, setFromUser] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', invite.from));
        if (snap.exists()) setFromUser({ id: snap.id, ...snap.data() });
      } catch {}
    })();
  }, [invite.from]);

  return (
    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50">
      <img
        src={(fromUser?.avatarUrl) || avatarFor(fromUser?.displayName)}
        alt={fromUser?.displayName || 'User'}
        className="w-9 h-9 rounded-lg object-cover"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate text-sm">{fromUser?.displayName || 'Someone'}</p>
        <p className="text-xs text-gray-500">wants to connect</p>
      </div>
      <div className="flex gap-1">
        <button onClick={onAccept} className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={onDecline} className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs hover:bg-gray-200">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const OutgoingRow = ({ invite }) => {
  const [toUser, setToUser] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', invite.to));
        if (snap.exists()) setToUser({ id: snap.id, ...snap.data() });
      } catch {}
    })();
  }, [invite.to]);

  return (
    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50">
      <img
        src={(toUser?.avatarUrl) || avatarFor(toUser?.displayName)}
        alt={toUser?.displayName || 'User'}
        className="w-8 h-8 rounded-lg object-cover"
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{toUser?.displayName || 'User'}</p>
        <p className="text-xs text-gray-500 flex items-center gap-1"><ArrowLeftRight className="w-3 h-3" /> pending…</p>
      </div>
    </div>
  );
};

const UserResultRow = ({ me, user, outgoing, onConnect, quickMsg, setQuickMsg, onMessage }) => {
  const pending = outgoing.some(i => i.to === user.id && i.status === 'pending');

  return (
    <div className="p-3 rounded-xl border border-gray-100 hover:shadow-sm transition bg-white">
      <div className="flex items-start gap-3">
        <Link to={`/profile/${user.id}`} className="shrink-0">
          <img
            src={user.avatarUrl || avatarFor(user.displayName)}
            alt={user.displayName || 'User'}
            className="w-10 h-10 rounded-lg object-cover hover:opacity-90"
          />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <Link to={`/profile/${user.id}`} className="font-semibold text-gray-900 text-sm truncate hover:underline">
              {user.displayName || 'User'}
            </Link>
            <span className="text-xs text-gray-500">{user.location}</span>
          </div>

          {user.bio && <p className="text-sm text-gray-700 line-clamp-2 mt-0.5">{user.bio}</p>}

          <div className="mt-2 flex flex-wrap gap-1">
            {(user.interests || []).slice(0, 3).map((i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs">{i}</span>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              disabled={pending}
              onClick={onConnect}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition
                ${pending ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
            >
              <UserPlus className="w-3 h-3" /> {pending ? 'Requested' : 'Connect'}
            </button>

            <Link
              to={`/profile/${user.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 hover:bg-gray-50"
            >
              View Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditProfileModal = ({ profile, setProfile, onClose, onSave }) => {
  const [interestInput, setInterestInput] = useState('');
  const [goalInput, setGoalInput] = useState('');

  const addChip = (val, key) => {
    const trimmed = (val || '').trim();
    if (!trimmed) return;
    setProfile(p => {
      const setArr = new Set([...(p[key] || []), trimmed]);
      return { ...p, [key]: Array.from(setArr).slice(0, 20) };
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">Edit Profile</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={onSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              value={profile.displayName}
              onChange={(e) => setProfile(p => ({ ...p, displayName: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Share your wellness journey…"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
              <input
                value={profile.location}
                onChange={(e) => setProfile(p => ({ ...p, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="City, Country"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Privacy</label>
              <select
                value={profile.privacy}
                onChange={(e) => setProfile(p => ({ ...p, privacy: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="public">Public</option>
                <option value="connections">Connections</option>
                <option value="private">Private</option>
              </select>
              <div className="flex items-center gap-2 mt-2">
                <input
                  id="searchable"
                  type="checkbox"
                  checked={!!profile.searchable}
                  onChange={(e) => setProfile(p => ({ ...p, searchable: e.target.checked }))}
                  className="rounded text-emerald-600"
                />
                <label htmlFor="searchable" className="text-sm text-gray-700">Allow people to find me in search</label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Interests</label>
            <div className="flex items-center gap-2">
              <input
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addChip(interestInput, 'interests');
                    setInterestInput('');
                  }
                }}
                placeholder="Add an interest and press Enter"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => { addChip(interestInput, 'interests'); setInterestInput(''); }}
                className="px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-black"
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(profile.interests || []).map((i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs inline-flex items-center gap-2">
                  {i}
                  <button type="button" onClick={() => setProfile(p => ({ ...p, interests: p.interests.filter(x => x !== i) }))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goals</label>
            <div className="flex items-center gap-2">
              <input
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addChip(goalInput, 'goals');
                    setGoalInput('');
                  }
                }}
                placeholder="Add a goal and press Enter"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => { addChip(goalInput, 'goals'); setGoalInput(''); }}
                className="px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-black"
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(profile.goals || []).map((g) => (
                <span key={g} className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs inline-flex items-center gap-2">
                  {g}
                  <button type="button" onClick={() => setProfile(p => ({ ...p, goals: p.goals.filter(x => x !== g) }))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
