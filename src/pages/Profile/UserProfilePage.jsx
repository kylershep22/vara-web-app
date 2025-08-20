// src/pages/Profile/UserProfilePage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SidebarLayout from "../../components/layout/SidebarLayout";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  addDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  Edit3,
  UserPlus,
  Send,
  ArrowLeftRight,
  MapPin,
  Globe,
  Users,
  Lock,
  Loader,
} from "lucide-react";

// ---------------- helpers ----------------

const avatarFor = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}&background=10b981&color=fff`;

async function fetchUser(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: uid, ...snap.data() } : null;
}

async function getOutgoingInvites(uid) {
  const q1 = query(
    collection(db, "connectionInvites"),
    where("from", "==", uid),
    where("status", "==", "pending"),
    limit(100)
  );
  const snap = await getDocs(q1);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function getConnections(uid) {
  const q1 = query(
    collection(db, "connections"),
    where("participants", "array-contains", uid),
    limit(200)
  );
  const snap = await getDocs(q1);
  const set = new Set();
  snap.docs.forEach((d) => {
    const arr = d.data().participants || [];
    const other = arr.find((x) => x !== uid);
    if (other) set.add(other);
  });
  return set; // Set<userId>
}

async function sendConnectionInvite(fromUid, toUid) {
  // avoid duplicates
  const q1 = query(
    collection(db, "connectionInvites"),
    where("from", "==", fromUid),
    where("to", "==", toUid),
    where("status", "==", "pending"),
    limit(1)
  );
  const existing = await getDocs(q1);
  if (!existing.empty) return existing.docs[0].id;

  const ref = await addDoc(collection(db, "connectionInvites"), {
    from: fromUid,
    to: toUid,
    status: "pending",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

async function findOrCreateConversation(a, b) {
  const q1 = query(
    collection(db, "conversations"),
    where("participants", "array-contains", a),
    limit(50)
  );
  const snap = await getDocs(q1);
  const existing = snap.docs.find((d) => {
    const arr = d.data().participants || [];
    return arr.includes(a) && arr.includes(b) && arr.length === 2;
    });
  if (existing) return existing.id;

  const ref = await addDoc(collection(db, "conversations"), {
    participants: [a, b],
    lastMessageAt: serverTimestamp(),
    lastMessageText: "",
  });
  return ref.id;
}

async function sendDirectMessage({ conversationId, from, to, text }) {
  await addDoc(collection(db, "directMessages"), {
    conversationId,
    senderId: from,
    receiverId: to,
    text,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "conversations", conversationId), {
    lastMessageAt: serverTimestamp(),
    lastMessageText: text.slice(0, 200),
  });
}

// Fetch up to 10 tag labels by slug (for display if user uses normalized fields)
async function fetchTagLabels(slugs = []) {
  const out = {};
  if (!slugs?.length) return out;

  // Firestore "in" supports up to 10 values; we only display a handful anyway
  const chunk = slugs.slice(0, 10);
  // There is no cross-collection where; our tags live in "tags" with doc id = slug (from seeding tool).
  // Try direct gets by id for robustness.
  await Promise.all(
    chunk.map(async (slug) => {
      const snap = await getDoc(doc(db, "tags", slug));
      if (snap.exists()) out[slug] = snap.data().label || slug;
      else out[slug] = slug;
    })
  );
  return out;
}

// ---------------- page ----------------

export default function UserProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { uid: viewedUid } = useParams();

  const [target, setTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  // connection state
  const [outgoing, setOutgoing] = useState([]);
  const [connectedSet, setConnectedSet] = useState(new Set());

  // quick message
  const [quickMsg, setQuickMsg] = useState("");

  // tag label caches for normalized fields
  const [interestLabels, setInterestLabels] = useState({});
  const [focusLabels, setFocusLabels] = useState({});

  const isMe = user?.uid && viewedUid === user.uid;

  useEffect(() => {
    if (!viewedUid) return;
    (async () => {
      setLoading(true);
      try {
        const t = await fetchUser(viewedUid);
        setTarget(t);

        if (user?.uid) {
          const [out, connected] = await Promise.all([
            getOutgoingInvites(user.uid),
            getConnections(user.uid),
          ]);
          setOutgoing(out);
          setConnectedSet(connected);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [viewedUid, user?.uid]);

  // Resolve labels for normalized slugs if the plain-text arrays aren't present
  useEffect(() => {
    (async () => {
      if (!target) return;
      if ((!target.interests || target.interests.length === 0) && target.interestsSlugs?.length) {
        const map = await fetchTagLabels(target.interestsSlugs);
        setInterestLabels(map);
      }
      if ((!target.focus || target.focus.length === 0) && target.focusSlugs?.length) {
        const map = await fetchTagLabels(target.focusSlugs);
        setFocusLabels(map);
      }
    })();
  }, [target]);

  // privacy gating
  const viewerIsConnected = useMemo(
    () => (user?.uid ? connectedSet.has(viewedUid) : false),
    [connectedSet, user?.uid, viewedUid]
  );

  const canSeeDetails = useMemo(() => {
    if (!target) return false;
    if (isMe) return true;
    const p = target.privacy || "public";
    if (p === "public") return true;
    if (p === "connections") return viewerIsConnected;
    return false; // private
  }, [target, isMe, viewerIsConnected]);

  const pendingToThisUser = useMemo(
    () => outgoing.some((i) => i.to === viewedUid && i.status === "pending"),
    [outgoing, viewedUid]
  );

  const handleConnect = async () => {
    if (!user?.uid || !viewedUid) return;
    try {
      await sendConnectionInvite(user.uid, viewedUid);
      // optimistic
      setOutgoing((prev) => [
        { id: `local_${Date.now()}`, from: user.uid, to: viewedUid, status: "pending" },
        ...prev,
      ]);
    } catch (e) {
      console.error("Invite error", e);
      alert("Failed to send request.");
    }
  };

  const handleMessage = async () => {
    if (!user?.uid || !viewedUid) return;
    try {
      const convId = await findOrCreateConversation(user.uid, viewedUid);
      const text = (quickMsg || "").trim();
      if (text) {
        await sendDirectMessage({ conversationId: convId, from: user.uid, to: viewedUid, text });
        setQuickMsg("");
      }
      // If you have a messages route, navigate there:
      // navigate(`/messages/${convId}`);
      alert("Conversation ready! (Wire to your Messages route)");
    } catch (e) {
      console.error("DM error", e);
      alert("Failed to start conversation.");
    }
  };

  // Optional: if someone opens /u/:uid for themselves, send them to /profile
  useEffect(() => {
    if (isMe) {
      // Comment this out if you want to allow seeing your own profile in this view.
      // navigate("/profile", { replace: true });
    }
  }, [isMe, navigate]);

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-[60vh] flex items-center justify-center text-[#3E3E3E]">
          <Loader className="w-5 h-5 animate-spin mr-2" />
          Loading profile…
        </div>
      </SidebarLayout>
    );
  }

  if (!target) {
    return (
      <SidebarLayout>
        <div className="p-6 max-w-3xl mx-auto">
          <p className="text-gray-700">This user could not be found.</p>
          <div className="mt-4">
            <Link
              to="/community"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200"
            >
              Back to Community
            </Link>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-[#F3F4EF]">
        <div className="max-w-5xl mx-auto p-6">
          {/* Banner */}
          <div className="relative mb-8">
            <div className="h-40 md:h-52 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600" />
            <div className="absolute -bottom-8 left-6 flex items-end gap-4">
              <img
                src={target.avatarUrl || avatarFor(target.displayName)}
                alt="avatar"
                className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white shadow-md bg-white"
              />
              <div className="pb-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {target.displayName || "User"}
                  </h1>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
                    {(!target.privacy || target.privacy === "public") && (
                      <>
                        <Globe className="w-3 h-3 mr-1" /> Public
                      </>
                    )}
                    {target.privacy === "connections" && (
                      <>
                        <Users className="w-3 h-3 mr-1" /> Connections
                      </>
                    )}
                    {target.privacy === "private" && (
                      <>
                        <Lock className="w-3 h-3 mr-1" /> Private
                      </>
                    )}
                  </span>
                </div>
                {canSeeDetails && target.location ? (
                  <p className="text-gray-600 flex items-center gap-1">
                    <MapPin className="w-4 h-4" /> {target.location}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex justify-end mb-6 mt-10">
            {isMe ? (
              <Link
                to="/profile/edit"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Edit3 className="w-4 h-4" /> Edit Profile
              </Link>
            ) : (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleConnect}
                  disabled={viewerIsConnected || pendingToThisUser}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition ${
                    viewerIsConnected
                      ? "bg-emerald-50 text-emerald-700 cursor-not-allowed"
                      : pendingToThisUser
                      ? "bg-gray-100 text-gray-600 cursor-not-allowed"
                      : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  {viewerIsConnected ? (
                    <>
                      <ArrowLeftRight className="w-4 h-4" /> Connected
                    </>
                  ) : pendingToThisUser ? (
                    <>
                      <ArrowLeftRight className="w-4 h-4" /> Requested
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" /> Connect
                    </>
                  )}
                </button>

                <div className="flex-1 sm:flex-none flex items-center gap-2">
                  <input
                    value={quickMsg}
                    onChange={(e) => setQuickMsg(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleMessage()}
                    placeholder="Say hi…"
                    className="w-full sm:w-64 px-3 py-2 bg-gray-50 border border-[#E6EEE2] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleMessage}
                    className="px-3 py-2 rounded-lg bg-gray-900 text-white hover:bg-black"
                    title="Send"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* About / Details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-gray-900 mb-2">About</h2>

                {canSeeDetails ? (
                  <>
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {target.bio || "—"}
                    </p>

                    {/* Interests */}
                    {(target.interests?.length ||
                      target.interestsSlugs?.length) && (
                      <div className="mt-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                          Interests
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {(target.interests?.length
                            ? target.interests
                            : (target.interestsSlugs || []).map(
                                (s) => interestLabels[s] || s
                              )
                          )
                            .slice(0, 10)
                            .map((i) => (
                              <span
                                key={i}
                                className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs"
                              >
                                {i}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Focus Areas */}
                    {(target.focus?.length || target.focusSlugs?.length) && (
                      <div className="mt-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2">
                          Focus Areas
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {(target.focus?.length
                            ? target.focus
                            : (target.focusSlugs || []).map(
                                (s) => focusLabels[s] || s
                              )
                          )
                            .slice(0, 10)
                            .map((f) => (
                              <span
                                key={f}
                                className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs"
                              >
                                {f}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-gray-600 text-sm">
                    This profile is{" "}
                    <span className="inline-flex items-center gap-1 font-medium">
                      {target.privacy === "private" ? (
                        <>
                          <Lock className="w-3 h-3" /> Private
                        </>
                      ) : (
                        <>
                          <Users className="w-3 h-3" /> Connections-only
                        </>
                      )}
                    </span>
                    . Send a connection request to see more.
                  </div>
                )}
              </div>
            </div>

            {/* Right rail (optional future: mutuals, activity, etc.) */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Profile Visibility
                </h3>
                <p className="text-sm text-gray-700">
                  {(!target.privacy || target.privacy === "public") && "Public — anyone can see your profile."}
                  {target.privacy === "connections" && "Connections — only your connections can see your details."}
                  {target.privacy === "private" && "Private — only you can see your details."}
                </p>
                {isMe && (
                  <Link
                    to="/profile/edit"
                    className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 text-sm"
                  >
                    <Edit3 className="w-4 h-4" /> Change privacy
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
