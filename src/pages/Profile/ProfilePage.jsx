// src/pages/Profile/ProfilePage.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  AlertCircle
} from 'lucide-react';

import { useParams, useNavigate } from 'react-router-dom';

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
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';

import SidebarLayout from '../../components/layout/SidebarLayout';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

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
  privacy: 'public',        // "public" | "connections" | "private"
  searchable: true,
  avatarUrl: '',
  bannerUrl: '',
};

const avatarFor = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=10b981&color=fff`;

// ---------- Firestore ops (kept local for now) ----------
async function readUser(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: uid, ...snap.data() } : null;
}

async function writeUser(uid, partial) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, partial);
  } else {
    await setDoc(ref, { ...defaultProfile, ...partial });
  }
}

async function sendConnectionInvite(fromUid, toUid) {
  // prevents duplicate outgoing pending invites
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
  // 1) create connection
  await addDoc(collection(db, 'connections'), {
    participants: [invite.from, invite.to],
    createdAt: serverTimestamp(),
    status: 'active',
  });
  // 2) mark invite accepted
  await updateDoc(doc(db, 'connectionInvites', invite.id), { status: 'accepted' });
}

async function declineInvite(invite, actingUid) {
  if (invite.to !== actingUid) throw new Error('Only recipient can decline');
  await updateDoc(doc(db, 'connectionInvites', invite.id), { status: 'declined' });
}

async function peopleSearch({ term, currentUid }) {
  // Only show searchable users and not yourself
  const trimmed = (term || '').trim();

  // Attempt 1: keyword index if you add it later
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
      // fall through to prefix search if index not present
    }
  }

  // Attempt 2: prefix search on displayName
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
  // naive find by participants; you can add composite index later
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
  // update conversation preview
  await updateDoc(doc(db, 'conversations', conversationId), {
    lastMessageAt: serverTimestamp(),
    lastMessageText: text.slice(0, 200),
  });
}

// ----- Minimal service-name wrappers to match earlier suggestion -----
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
  // Query connections where "a" participates & status active, then check if "b" is also a participant
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

// small util
const Pill = ({ children }) => (
  <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
    {children}
  </span>
);

// ---------------------------------------
// PAGE
// ---------------------------------------
const ProfilePage = () => {
  const { user, isAuthReady } = useAuthLazily();
  const { uid: routeUid } = useParams();
  const navigate = useNavigate();

  // Which profile are we viewing?
  const viewedUserId = routeUid || user?.uid || null;
  const isMe = !!user?.uid && !!viewedUserId && user.uid === viewedUserId;

  const [profile, setProfile] = useState(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  // connection state when viewing others
  const [isConnected, setIsConnected] = useState(false);

  // invites & connections UX (only when viewing self)
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);

  // people search (only when viewing self)
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);

  // DM quick send (search results rows)
  const [quickMsg, setQuickMsg] = useState({}); // {userId: 'hello'}

  // "Preview as others"
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

  // Load viewed profile (+ self-only panels)
  useEffect(() => {
    if (!isAuthReady || !viewedUserId) return;

    (async () => {
      setLoading(true);
      try {
        // 1) Load the profile we're viewing
        const p = await getUserProfile(viewedUserId);
        if (p) setProfile(prev => ({ ...prev, ...p }));

        // 2) If viewing self, load requests; otherwise check connection status
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
        // eslint-disable-next-line no-console
        console.error('Profile load error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [isAuthReady, user?.uid, viewedUserId]);

  const upsertProfile = async (e) => {
    e?.preventDefault?.();
    if (!user?.uid) return;
    await upsertUserProfile(user.uid, profile);
    setEditOpen(false);
  };

  const handleChipInput = (value, listKey) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setProfile(p => {
      const setArr = new Set([...(p[listKey] || []), trimmed]);
      return { ...p, [listKey]: Array.from(setArr).slice(0, 20) };
    });
  };

  const removeChip = (item, listKey) => {
    setProfile(p => ({ ...p, [listKey]: (p[listKey] || []).filter(x => x !== item) }));
  };

  const doSearch = async () => {
    if (!user?.uid) return;
    setSearching(true);
    try {
      const res = await peopleSearch({ term: searchTerm, currentUid: user.uid });
      setResults(res);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  // ---- New: minimal action handlers to match your spec ----
  async function onConnect() {
    if (!user?.uid || !viewedUserId || isMe) return;
    try {
      await requestConnection(user.uid, viewedUserId);
      // Optimistic: not connected yet, but invite sent
      setIsConnected(false);
      alert('Connection request sent.');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('requestConnection error', e);
    }
  }

  async function onMessage() {
    if (!user?.uid || !viewedUserId) return;
    try {
      const id = await findOrCreateConversation(user.uid, viewedUserId);
      // Navigate to your messages route if available
      // Example: navigate(`/messages/${id}`);
      alert('Opening conversation… (wire your /messages route)');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('findOrCreateConversation error', e);
    }
  }

  async function onSaveProfile(patch) {
    if (!user?.uid) return;
    await upsertUserProfile(user.uid, patch);
    setProfile(prev => ({ ...prev, ...patch }));
  }

  // existing handlers (search/requests)
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
      // eslint-disable-next-line no-console
      console.error('Invite error', e);
    }
  };

  const handleAccept = async (invite) => {
    if (!user?.uid) return;
    try {
      await acceptInvite(invite, user.uid);
      setIncoming(prev => prev.filter(i => i.id !== invite.id));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Accept error', e);
    }
  };

  const handleDecline = async (invite) => {
    if (!user?.uid) return;
    try {
      await declineInvite(invite, user.uid);
      setIncoming(prev => prev.filter(i => i.id !== invite.id));
    } catch (e) {
      // eslint-disable-next-line no-console
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
      // If you have a /messages route, navigate here:
      // navigate(`/messages/${convId}`)
      alert('Conversation ready! (Wire to your Messages route)');
    } catch (e) {
      // eslint-disable-next-line no-console
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

            {/* Right-side banner actions: either Edit/Preview (me) or Connect/Message (others) */}
            <div className="absolute right-6 -bottom-6 flex items-center gap-2">
              {isMe ? (
                <>
                  <button
                    onClick={() => setEditOpen(true)}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Edit3 className="w-4 h-4" /> Edit Profile
                  </button>
                  {/* Optional: quick link to view as others – scrolls to preview card */}
                  <a
                    href="#preview-as-others"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-black"
                  >
                    <Eye className="w-4 h-4" /> Preview as others
                  </a>
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
            {/* Left: About / Edit / Preview */}
            <div className="lg:col-span-2 space-y-6">
              {/* About card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">About</h2>
                  {isMe && (
                    <button
                      onClick={() => setEditOpen(true)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <Edit3 className="w-4 h-4" /> Edit Profile
                    </button>
                  )}
                </div>
                <p className="text-gray-800 whitespace-pre-wrap">{profile.bio || (isMe ? 'Tell the community about your wellness journey…' : '')}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(profile.interests || []).map((i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs">{i}</span>
                  ))}
                  {(profile.interests || []).length === 0 && isMe && (
                    <span className="text-gray-500 text-sm">Add interests to get better suggestions</span>
                  )}
                </div>

                {profile.goals?.length ? (
                  <div className="mt-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Top Goals</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.goals.slice(0, 5).map((g) => (
                        <span key={g} className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs">{g}</span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Preview as others (self only) */}
              {isMe && (
                <div id="preview-as-others" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Preview as others</h2>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Eye className="w-4 h-4" />
                      Visible by: {publicView.privacy === 'public' ? 'Everyone' : publicView.privacy === 'connections' ? 'Connections' : 'Only you'}
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <img
                      src={publicView.avatarUrl || avatarFor(publicView.displayName)}
                      alt="preview"
                      className="w-16 h-16 rounded-xl object-cover ring-2 ring-white shadow-sm"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{publicView.displayName || 'Name hidden until set'}</p>
                      <p className="text-gray-600 text-sm">{publicView.bio || '—'}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(publicView.interests || []).map((i) => (
                          <span key={i} className="px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs">{i}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Requests + People search (self only) */}
            <div className="space-y-6">
              {isMe && (
                <>
                  {/* Requests panel */}
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

                  {/* People search + suggestions */}
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-900 mb-3">Find people</h3>
                    <div className="relative mb-3">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && doSearch()}
                        placeholder="Search by name or interest…"
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
                        Suggestions update as you set <span className="font-medium">interests</span> and <span className="font-medium">goals</span>.
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

              {/* Small settings pointer */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <Settings className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-semibold text-gray-900">App settings</p>
                    <p className="text-sm text-gray-600">Global preferences live in Settings (notifications, theme, etc.).</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Drawer / Modal */}
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
        <p className="font-medium text-gray-900 truncate">{fromUser?.displayName || 'Someone'}</p>
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
        {/* Make avatar and name link to profile */}
        <Link to={`/profile/${user.id}`} className="shrink-0">
          <img
            src={user.avatarUrl || avatarFor(user.displayName)}
            alt={user.displayName || 'User'}
            className="w-10 h-10 rounded-lg object-cover hover:opacity-90"
          />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <Link to={`/profile/${user.id}`} className="font-semibold text-gray-900 truncate hover:underline">
              {user.displayName || 'User'}
            </Link>
            <span className="text-xs text-gray-500">{user.location}</span>
          </div>

          {user.bio && <p className="text-sm text-gray-700 line-clamp-2 mt-0.5">{user.bio}</p>}

          <div className="mt-2 flex flex-wrap gap-2">
            {(user.interests || []).slice(0, 6).map((i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-xs">{i}</span>
            ))}
          </div>

          {/* Actions: Connect here, or View Profile to message/connect there */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              disabled={pending}
              onClick={onConnect}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition
                ${pending ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
            >
              <UserPlus className="w-4 h-4" /> {pending ? 'Requested' : 'Connect'}
            </button>

            <Link
              to={`/profile/${user.id}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50"
            >
              View Profile
            </Link>

            {/* (Optional) keep your quick message for power users */}
            <div className="flex-1 min-w-[200px] flex items-center gap-2">
              <input
                value={quickMsg}
                onChange={(e) => setQuickMsg(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onMessage()}
                placeholder="Say hi…"
                className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button onClick={onMessage} className="px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-black">
                <Send className="w-4 h-4" />
              </button>
            </div>
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

        <form onSubmit={onSave} className="p-6 space-y-5">
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

          {/* Interests */}
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

          {/* Goals */}
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
              Save
            </button>
          </div>

          <div className="mt-3 flex items-start gap-2 text-xs text-gray-500">
            <AlertCircle className="w-4 h-4 mt-0.5" />
            <p>
              Tip: later you can add a <code>keywords</code> array field (lowercased tokens from name & interests)
              for faster fuzzy search. This UI already tries that if present.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;


