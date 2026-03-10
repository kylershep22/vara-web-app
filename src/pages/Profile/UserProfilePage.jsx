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
  Camera,
} from 'lucide-react';

import { useParams, useNavigate, Link } from 'react-router-dom';

import { db, storage } from '../../firebase';
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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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

  // If no search term, return empty array
  if (!trimmed) {
    return [];
  }

  // Try keyword search first (case-insensitive)
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
    } catch (e) {
      console.log('Keyword search not available, falling back to prefix search');
    }
  }

  // Fall back to prefix search on displayName
  try {
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
  } catch (e) {
    console.error('Search error:', e);
    // If all else fails, do a simple client-side search on all searchable users
    try {
      const simpleQuery = query(
        collection(db, 'users'),
        where('searchable', '==', true),
        limit(50)
      );
      const snap = await getDocs(simpleQuery);
      const lowerTerm = trimmed.toLowerCase();
      return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u =>
          u.id !== currentUid &&
          (u.displayName?.toLowerCase().includes(lowerTerm) ||
           u.bio?.toLowerCase().includes(lowerTerm))
        )
        .slice(0, 25);
    } catch (e2) {
      console.error('Fallback search also failed:', e2);
      return [];
    }
  }
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

async function getProfileStats(userId, currentUserId) {
  try {
    const isOwnProfile = userId === currentUserId;

    // Posts are always queryable (public)
    const postsSnap = await getDocs(query(collection(db, 'posts'), where('authorId', '==', userId)));

    // Only query personal data if viewing own profile
    if (isOwnProfile) {
      const [connectionsSnap, groupsSnap, goalsSnap] = await Promise.all([
        getDocs(query(collection(db, 'connections'), where('participants', 'array-contains', userId), where('status', '==', 'active'))),
        getDocs(query(collection(db, 'groups'), where('members', 'array-contains', userId))),
        getDocs(query(collection(db, 'goals'), where('userId', '==', userId))),
      ]);

      return {
        posts: postsSnap.size,
        connections: connectionsSnap.size,
        groups: groupsSnap.size,
        goals: goalsSnap.size,
      };
    } else {
      // For other users' profiles, only show post count
      return {
        posts: postsSnap.size,
        connections: 0,
        groups: 0,
        goals: 0,
      };
    }
  } catch (e) {
    console.error('Error fetching stats:', e);
    return { posts: 0, connections: 0, groups: 0, goals: 0 };
  }
}

async function fetchUserPosts(userId, lastDoc = null, limitCount = 10) {
  try {
    let q = query(
      collection(db, 'posts'),
      where('authorId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    if (lastDoc) {
      q = query(
        collection(db, 'posts'),
        where('authorId', '==', userId),
        orderBy('timestamp', 'desc'),
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
  <span className={`inline-flex items-center px-3 py-1 rounded-full bg-teal-light text-evergreen-teal text-vara-xs font-medium ${className}`}>
    {children}
  </span>
);

// ---------------------------------------
// ACTIVITY FEED TAB OPTIONS
// ---------------------------------------
const ActivityTab = ({ active, label, onClick }) => (
  <button
    onClick={onClick}
    className={`px-vara-base py-2 text-vara-sm font-medium border-b-2 transition-colors ${
      active
        ? 'border-evergreen-teal text-evergreen-teal'
        : 'border-transparent text-muted-sage-gray hover:text-soft-charcoal hover:border-divider'
    }`}
  >
    {label}
  </button>
);

// ---------------------------------------
// PROFILE STATS CARD
// ---------------------------------------
const ProfileStatsCard = ({ stats, isMe }) => {
  const statItems = [
    { value: stats.posts, label: 'Posts', link: null }, // No link - posts are visible on this page
    { value: stats.connections, label: 'Connections', link: '/community/people' },
    { value: stats.groups, label: 'Groups', link: '/community' },
    { value: stats.goals, label: 'Active Goals', link: '/goals-habits' },
  ];

  return (
    <div className="bg-white rounded-vara-lg p-vara-lg shadow-vara-sm border border-divider">
      <h3 className="text-vara-sm font-semibold text-soft-charcoal mb-vara-base">Profile Stats</h3>
      <div className="grid grid-cols-2 gap-vara-base">
        {statItems.map((item, idx) => {
          const content = (
            <>
              <div className="text-vara-xl font-bold text-evergreen-teal">{item.value}</div>
              <div className="text-vara-xs text-muted-sage-gray mt-1">{item.label}</div>
            </>
          );

          if (item.link) {
            return (
              <Link
                key={idx}
                to={item.link}
                className="text-center hover:bg-dew-sage-light rounded-vara-md p-2 transition-colors cursor-pointer"
              >
                {content}
              </Link>
            );
          }

          return (
            <div key={idx} className="text-center p-2">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ---------------------------------------
// POST CARD COMPONENT
// ---------------------------------------
const PostCard = ({ post, authorProfile, onLike, onComment, isMe }) => {
  const [showComments, setShowComments] = useState(false);
  const likesCount = Array.isArray(post.likes) ? post.likes.length : 0;
  const commentsCount = Array.isArray(post.comments) ? post.comments.length : 0;

  return (
    <div className="bg-white rounded-vara-lg p-vara-lg shadow-vara-sm border border-divider hover:shadow-vara-md transition-shadow">
      {/* Post Header */}
      <div className="flex items-start justify-between mb-vara-base">
        <div className="flex items-center gap-vara-md">
          <img
            src={authorProfile?.avatarUrl || avatarFor(authorProfile?.displayName)}
            alt={authorProfile?.displayName}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div>
            <div className="font-semibold text-soft-charcoal">{authorProfile?.displayName || 'User'}</div>
            <div className="flex items-center gap-vara-sm text-vara-xs text-muted-sage-gray">
              <span>{formatDate(post.timestamp)}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {post.groupName}
              </span>
            </div>
          </div>
        </div>
        <button className="p-2 rounded-vara-md hover:bg-dew-sage-light">
          <MoreHorizontal className="w-5 h-5 text-muted-sage-gray" />
        </button>
      </div>

      {/* Post Content */}
      <div className="mb-vara-base">
        <p className="text-soft-charcoal whitespace-pre-wrap">{post.content || post.body}</p>
      </div>

      {/* Post Images (if any) */}
      {post.images && post.images.length > 0 && (
        <div className={`mb-vara-base grid gap-vara-sm ${
          post.images.length === 1 ? 'grid-cols-1' :
          post.images.length === 2 ? 'grid-cols-2' :
          post.images.length === 3 ? 'grid-cols-3' :
          'grid-cols-2'
        }`}>
          {post.images.map((imageUrl, idx) => (
            <div key={idx} className="rounded-vara-lg overflow-hidden">
              <img
                src={imageUrl}
                alt={`Post image ${idx + 1}`}
                className="w-full h-auto object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Engagement Bar */}
      <div className="flex items-center justify-between py-3 border-t border-divider">
        <div className="flex items-center gap-vara-lg">
          <button
            onClick={onLike}
            className="flex items-center gap-vara-sm text-muted-sage-gray hover:text-evergreen-teal transition-colors"
          >
            <Heart className={`w-5 h-5 ${likesCount > 0 ? 'fill-evergreen-teal text-evergreen-teal' : ''}`} />
            <span className="text-vara-sm font-medium">{likesCount}</span>
          </button>
          <button
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-vara-sm text-muted-sage-gray hover:text-evergreen-teal transition-colors"
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-vara-sm font-medium">{commentsCount}</span>
          </button>
          <button className="flex items-center gap-vara-sm text-muted-sage-gray hover:text-evergreen-teal transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
        <button className="text-muted-sage-gray hover:text-evergreen-teal">
          <Bookmark className="w-5 h-5" />
        </button>
      </div>

      {/* Comments Section */}
      {showComments && commentsCount > 0 && (
        <div className="mt-4 pt-4 border-t border-divider space-y-3">
          {post.comments?.slice(0, 3).map((comment, idx) => (
            <div key={idx} className="flex gap-vara-sm">
              <div className="w-8 h-8 rounded-full bg-dew-sage-light flex-shrink-0" />
              <div className="flex-1">
                <div className="bg-mist-white rounded-vara-md p-3">
                  <div className="font-medium text-vara-sm text-soft-charcoal">{comment.authorName || 'User'}</div>
                  <p className="text-vara-sm text-soft-charcoal mt-1">{comment.text}</p>
                </div>
                <div className="flex items-center gap-vara-md mt-1 text-vara-xs text-muted-sage-gray ml-2">
                  <span>{formatDate(comment.createdAt)}</span>
                  <button className="hover:underline">Like</button>
                  <button className="hover:underline">Reply</button>
                </div>
              </div>
            </div>
          ))}
          {commentsCount > 3 && (
            <button className="text-vara-sm text-evergreen-teal hover:underline ml-10">
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
  const { user, isAuthReady } = useAuth();
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
  const [stats, setStats] = useState({ posts: 0, connections: 0, groups: 0, goals: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // Activity Feed (only posts tab now since About is in left sidebar)
  const [activeTab, setActiveTab] = useState('posts');
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const observerTarget = useRef(null);

  // File upload refs
  const bannerInputRef = useRef(null);
  const avatarInputRef = useRef(null);
  const [uploading, setUploading] = useState({ banner: false, avatar: false });

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
        const profileStats = await getProfileStats(viewedUserId, user?.uid);
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

  // Banner upload handler
  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    setUploading(prev => ({ ...prev, banner: true }));
    try {
      const storageRef = ref(storage, `users/${user.uid}/banner_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'users', user.uid), { bannerUrl: downloadURL });
      setProfile(prev => ({ ...prev, bannerUrl: downloadURL }));
    } catch (error) {
      console.error('Error uploading banner:', error);
      alert('Failed to upload banner. Please try again.');
    } finally {
      setUploading(prev => ({ ...prev, banner: false }));
    }
  };

  // Avatar upload handler
  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    setUploading(prev => ({ ...prev, avatar: true }));
    try {
      const storageRef = ref(storage, `users/${user.uid}/avatar_${Date.now()}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'users', user.uid), { avatarUrl: downloadURL });
      setProfile(prev => ({ ...prev, avatarUrl: downloadURL }));
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setUploading(prev => ({ ...prev, avatar: false }));
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
      <div className="min-h-screen bg-mist-white flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-evergreen-teal mx-auto mb-vara-base" />
          <p className="text-muted-sage-gray">Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-mist-white">
        <div className="max-w-5xl mx-auto p-vara-lg">
          {/* Header / Banner */}
          <div className="relative mb-vara-lg">
            {/* Banner with fun gradient pattern */}
            <div className="relative h-44 md:h-56 rounded-vara-lg overflow-hidden">
              {profile.bannerUrl ? (
                <img
                  src={profile.bannerUrl}
                  alt="Profile banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-teal-medium via-evergreen-teal to-evergreen-teal relative">
                  {/* Decorative circles */}
                  <div className="absolute top-vara-base right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                  <div className="absolute bottom-10 left-16 w-40 h-40 bg-teal-medium/20 rounded-full blur-3xl" />
                  <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-teal-300/15 rounded-full blur-2xl" />
                </div>
              )}

              {/* Banner edit button (only for own profile) */}
              {isMe && (
                <>
                  <input
                    type="file"
                    ref={bannerInputRef}
                    onChange={handleBannerUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => bannerInputRef.current?.click()}
                    disabled={uploading.banner}
                    className="absolute top-vara-base right-4 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-all"
                  >
                    {uploading.banner ? (
                      <Loader className="w-5 h-5 animate-spin" />
                    ) : (
                      <Camera className="w-5 h-5" />
                    )}
                  </button>
                </>
              )}
            </div>

            <div className="absolute -bottom-8 left-6 flex items-end gap-vara-base">
              {/* Avatar with edit button */}
              <div className="relative">
                <img
                  src={profile.avatarUrl || avatarFor(profile.displayName)}
                  alt="avatar"
                  className="w-24 h-24 rounded-vara-lg object-cover ring-4 ring-white shadow-vara-md bg-white"
                />
                {isMe && (
                  <>
                    <input
                      type="file"
                      ref={avatarInputRef}
                      onChange={handleAvatarUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploading.avatar}
                      className="absolute bottom-0 right-0 p-1.5 rounded-full bg-evergreen-teal hover:opacity-90 text-white shadow-vara-lg transition-all"
                    >
                      {uploading.avatar ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </button>
                  </>
                )}
              </div>
              <div className="pb-2">
                <div className="flex items-center gap-vara-sm">
                  <h1 className="text-vara-xl font-bold text-soft-charcoal">{profile.displayName || 'User'}</h1>
                  <Pill>
                    {profile.privacy === 'public' && <><Globe className="w-3 h-3 mr-1" /> Public</>}
                    {profile.privacy === 'connections' && <><Users className="w-3 h-3 mr-1" /> Connections</>}
                    {profile.privacy === 'private' && <><Lock className="w-3 h-3 mr-1" /> Private</>}
                  </Pill>
                </div>
                <p className="text-muted-sage-gray">{profile.location || (isMe ? 'Add your location' : '')}</p>
              </div>
            </div>

            {/* Right-side banner actions */}
            <div className="absolute right-6 -bottom-6 flex items-center gap-vara-sm">
              {isMe ? (
                <>
                  <button
                    onClick={() => setEditOpen(true)}
                    className="inline-flex items-center gap-vara-sm px-3 py-2 rounded-vara-md bg-evergreen-teal text-white hover:opacity-90"
                  >
                    <Edit3 className="w-4 h-4" /> Edit Profile
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onMessage}
                    className="inline-flex items-center gap-vara-sm px-3 py-2 rounded-vara-md bg-soft-charcoal text-white hover:bg-black"
                  >
                    <MessageCircle className="w-4 h-4" /> Message
                  </button>
                  <button
                    onClick={onConnect}
                    className="inline-flex items-center gap-vara-sm px-3 py-2 rounded-vara-md bg-evergreen-teal text-white hover:opacity-90"
                  >
                    <UserPlus className="w-4 h-4" /> {isConnected ? 'Connected' : 'Connect'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-vara-lg mt-10">
            {/* Left Sidebar: About + Stats */}
            <div className="space-y-6">
              {/* About card */}
              <div className="bg-white rounded-vara-lg p-vara-lg shadow-vara-sm border border-divider">
                <div className="flex items-center justify-between mb-vara-base">
                  <h2 className="text-vara-lg font-bold text-soft-charcoal">About</h2>
                  {isMe && (
                    <button
                      onClick={() => setEditOpen(true)}
                      className="p-2 rounded-vara-md hover:bg-dew-sage-light"
                    >
                      <Edit3 className="w-4 h-4 text-muted-sage-gray" />
                    </button>
                  )}
                </div>
                <p className="text-soft-charcoal text-vara-sm whitespace-pre-wrap">{profile.bio || (isMe ? 'Tell the community about your wellness journey…' : '')}</p>

                <div className="mt-4 flex flex-wrap gap-vara-sm">
                  {(profile.interests || []).slice(0, 6).map((i) => (
                    <span key={i} className="px-2 py-1 rounded-full bg-dew-sage-light text-soft-charcoal text-vara-xs">{i}</span>
                  ))}
                  {(profile.interests || []).length === 0 && isMe && (
                    <span className="text-muted-sage-gray text-vara-xs">Add interests to connect with others</span>
                  )}
                </div>

                {profile.goals?.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-divider">
                    <h3 className="text-vara-xs font-semibold text-soft-charcoal mb-2 flex items-center gap-1">
                      <Target className="w-3 h-3" /> Top Goals
                    </h3>
                    <div className="flex flex-wrap gap-vara-sm">
                      {profile.goals.slice(0, 3).map((g) => (
                        <span key={g} className="px-2 py-1 rounded-full bg-teal-light text-evergreen-teal text-vara-xs">{g}</span>
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
                  <div className="bg-white rounded-vara-lg p-vara-base shadow-vara-sm border border-divider">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-soft-charcoal">Requests</h3>
                      <Pill>{incoming.length} pending</Pill>
                    </div>
                    {incoming.length === 0 ? (
                      <p className="text-vara-sm text-muted-sage-gray">No incoming requests.</p>
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
                        <div className="mt-5 mb-2 text-vara-xs font-semibold text-muted-sage-gray">Outgoing</div>
                        <div className="space-y-2">
                          {outgoing.map((inv) => (
                            <OutgoingRow key={inv.id} invite={inv} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="bg-white rounded-vara-lg p-vara-base shadow-vara-sm border border-divider">
                    <h3 className="font-bold text-soft-charcoal mb-3">Find people</h3>
                    <div className="relative mb-3">
                      <Search className="w-4 h-4 text-muted-sage-gray absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                        placeholder="Search by name…"
                        className="w-full pl-9 pr-24 py-2 border border-divider rounded-vara-lg focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
                      />
                      <button
                        onClick={doSearch}
                        disabled={searching}
                        className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-vara-md bg-evergreen-teal text-white text-vara-sm hover:opacity-90 disabled:opacity-50"
                      >
                        {searching ? 'Searching…' : 'Search'}
                      </button>
                    </div>

                    {results.length === 0 && !searching ? (
                      <div className="text-vara-sm text-muted-sage-gray">
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
              {/* Posts Feed */}
              <div className="bg-white rounded-vara-lg shadow-vara-sm border border-divider">
                <div className="border-b border-divider px-vara-lg py-vara-base">
                  <h2 className="text-vara-lg font-bold text-soft-charcoal">Posts</h2>
                </div>

                {/* Posts Content */}
                <div className="p-vara-lg">
                  <div className="space-y-6">
                    {postsLoading && posts.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader className="w-8 h-8 animate-spin text-evergreen-teal" />
                      </div>
                    ) : posts.length === 0 ? (
                      <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 text-muted-sage-gray mx-auto mb-vara-base" />
                        <p className="text-muted-sage-gray">{isMe ? 'You haven\'t posted anything yet' : 'No posts yet'}</p>
                        {isMe && (
                          <button
                            onClick={() => navigate('/community')}
                            className="mt-4 px-vara-base py-2 rounded-vara-md bg-evergreen-teal text-white hover:opacity-90"
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
                          <div ref={observerTarget} className="flex justify-center py-vara-base">
                            {postsLoading && <Loader className="w-6 h-6 animate-spin text-evergreen-teal" />}
                          </div>
                        )}
                        {!hasMore && posts.length > 0 && (
                          <div className="text-center py-vara-base text-vara-sm text-muted-sage-gray">
                            You've reached the end
                          </div>
                        )}
                      </>
                    )}
                  </div>
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
    <div className="flex items-center gap-vara-md p-2 rounded-vara-lg hover:bg-dew-sage-light">
      <img
        src={(fromUser?.avatarUrl) || avatarFor(fromUser?.displayName)}
        alt={fromUser?.displayName || 'User'}
        className="w-9 h-9 rounded-vara-md object-cover"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-soft-charcoal truncate text-vara-sm">{fromUser?.displayName || 'Someone'}</p>
        <p className="text-vara-xs text-muted-sage-gray">wants to connect</p>
      </div>
      <div className="flex gap-1">
        <button onClick={onAccept} className="px-2.5 py-1.5 rounded-vara-md bg-evergreen-teal text-white text-vara-xs hover:opacity-90">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={onDecline} className="px-2.5 py-1.5 rounded-vara-md bg-dew-sage-light text-soft-charcoal text-vara-xs hover:bg-dew-sage">
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
    <div className="flex items-center gap-vara-md p-2 rounded-vara-lg hover:bg-dew-sage-light">
      <img
        src={(toUser?.avatarUrl) || avatarFor(toUser?.displayName)}
        alt={toUser?.displayName || 'User'}
        className="w-8 h-8 rounded-vara-md object-cover"
      />
      <div className="flex-1 min-w-0">
        <p className="text-vara-sm font-medium text-soft-charcoal truncate">{toUser?.displayName || 'User'}</p>
        <p className="text-vara-xs text-muted-sage-gray flex items-center gap-1"><ArrowLeftRight className="w-3 h-3" /> pending…</p>
      </div>
    </div>
  );
};

const UserResultRow = ({ me, user, outgoing, onConnect, quickMsg, setQuickMsg, onMessage }) => {
  const pending = outgoing.some(i => i.to === user.id && i.status === 'pending');

  return (
    <div className="p-3 rounded-vara-lg border border-divider hover:shadow-vara-sm transition bg-white">
      <div className="flex items-start gap-vara-md">
        <Link to={`/profile/${user.id}`} className="shrink-0">
          <img
            src={user.avatarUrl || avatarFor(user.displayName)}
            alt={user.displayName || 'User'}
            className="w-10 h-10 rounded-vara-md object-cover hover:opacity-90"
          />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <Link to={`/profile/${user.id}`} className="font-semibold text-soft-charcoal text-vara-sm truncate hover:underline">
              {user.displayName || 'User'}
            </Link>
            <span className="text-vara-xs text-muted-sage-gray">{user.location}</span>
          </div>

          {user.bio && <p className="text-vara-sm text-soft-charcoal line-clamp-2 mt-0.5">{user.bio}</p>}

          <div className="mt-2 flex flex-wrap gap-1">
            {(user.interests || []).slice(0, 3).map((i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-dew-sage-light text-soft-charcoal text-vara-xs">{i}</span>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-vara-sm">
            <button
              disabled={pending}
              onClick={onConnect}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-vara-md text-vara-xs font-medium transition
                ${pending ? 'bg-dew-sage-light text-muted-sage-gray cursor-not-allowed' : 'bg-evergreen-teal text-white hover:opacity-90'}`}
            >
              <UserPlus className="w-3 h-3" /> {pending ? 'Requested' : 'Connect'}
            </button>

            <Link
              to={`/profile/${user.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-vara-md text-vara-xs font-medium border border-divider hover:bg-dew-sage-light"
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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-vara-base">
      <div className="w-full max-w-2xl bg-white rounded-vara-lg shadow-xl overflow-hidden">
        <div className="p-vara-base border-b border-divider flex items-center justify-between">
          <h3 className="text-vara-lg font-bold text-soft-charcoal">Edit Profile</h3>
          <button onClick={onClose} className="p-2 rounded-vara-md hover:bg-dew-sage-light">
            <X className="w-5 h-5 text-muted-sage-gray" />
          </button>
        </div>

        <form onSubmit={onSave} className="p-vara-lg space-y-5 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">Display Name</label>
            <input
              value={profile.displayName}
              onChange={(e) => setProfile(p => ({ ...p, displayName: e.target.value }))}
              className="w-full px-3 py-2 border border-divider rounded-vara-md focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
              required
            />
          </div>

          <div>
            <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">Bio</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-divider rounded-vara-md focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
              placeholder="Share your wellness journey…"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">Location (optional)</label>
              <input
                value={profile.location}
                onChange={(e) => setProfile(p => ({ ...p, location: e.target.value }))}
                className="w-full px-3 py-2 border border-divider rounded-vara-md focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
                placeholder="City, Country"
              />
            </div>

            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">Privacy</label>
              <select
                value={profile.privacy}
                onChange={(e) => setProfile(p => ({ ...p, privacy: e.target.value }))}
                className="w-full px-3 py-2 border border-divider rounded-vara-md focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
              >
                <option value="public">Public</option>
                <option value="connections">Connections</option>
                <option value="private">Private</option>
              </select>
              <div className="flex items-center gap-vara-sm mt-2">
                <input
                  id="searchable"
                  type="checkbox"
                  checked={!!profile.searchable}
                  onChange={(e) => setProfile(p => ({ ...p, searchable: e.target.checked }))}
                  className="rounded text-evergreen-teal"
                />
                <label htmlFor="searchable" className="text-vara-sm text-soft-charcoal">Allow people to find me in search</label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">Interests</label>
            <div className="flex items-center gap-vara-sm">
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
                className="flex-1 px-3 py-2 border border-divider rounded-vara-md focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
              />
              <button
                type="button"
                onClick={() => { addChip(interestInput, 'interests'); setInterestInput(''); }}
                className="px-3 py-2 rounded-vara-md bg-soft-charcoal text-white hover:bg-black"
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-vara-sm">
              {(profile.interests || []).map((i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-dew-sage-light text-soft-charcoal text-vara-xs inline-flex items-center gap-vara-sm">
                  {i}
                  <button type="button" onClick={() => setProfile(p => ({ ...p, interests: p.interests.filter(x => x !== i) }))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">Goals</label>
            <div className="flex items-center gap-vara-sm">
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
                className="flex-1 px-3 py-2 border border-divider rounded-vara-md focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
              />
              <button
                type="button"
                onClick={() => { addChip(goalInput, 'goals'); setGoalInput(''); }}
                className="px-3 py-2 rounded-vara-md bg-soft-charcoal text-white hover:bg-black"
              >
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-vara-sm">
              {(profile.goals || []).map((g) => (
                <span key={g} className="px-3 py-1 rounded-full bg-teal-light text-evergreen-teal text-vara-xs inline-flex items-center gap-vara-sm">
                  {g}
                  <button type="button" onClick={() => setProfile(p => ({ ...p, goals: p.goals.filter(x => x !== g) }))}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-vara-md pt-2 border-t border-divider">
            <button type="button" onClick={onClose} className="px-vara-base py-2 rounded-vara-md bg-dew-sage-light text-soft-charcoal hover:bg-dew-sage">
              Cancel
            </button>
            <button type="submit" className="px-vara-base py-2 rounded-vara-md bg-evergreen-teal text-white hover:opacity-90">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;
