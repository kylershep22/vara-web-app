// src/pages/Community/PeopleSearchPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SidebarLayout from "../../components/layout/SidebarLayout";
import TagPicker from "../../components/tags/TagPicker";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";

import {
  collection,
  query,
  where,
  orderBy,
  startAt,
  endAt,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";

import {
  Search,
  UserPlus,
  Send,
  Loader,
  ArrowLeftRight,
  MapPin,
  ExternalLink,
} from "lucide-react";

// Import new connections service
import {
  sendConnectionRequest,
  getPendingSentRequests,
  getAcceptedConnections
} from "../../services/db/connections.service";

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

const avatarFor = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "User"
  )}&background=10b981&color=fff`;

// Get pending sent requests (using new connections service)
async function getOutgoingInvites(uid) {
  return await getPendingSentRequests(uid);
}

// Get accepted connections (using new connections service)
async function getConnections(uid) {
  const connections = await getAcceptedConnections(uid);
  const set = new Set();
  connections.forEach((conn) => {
    const other = conn.participants.find((x) => x !== uid);
    if (other) set.add(other);
  });
  return set; // Set<userId>
}

// Send connection invite (using new connections service)
async function sendConnectionInvite(fromUid, toUid) {
  try {
    const connectionId = await sendConnectionRequest(fromUid, toUid);
    return connectionId;
  } catch (error) {
    // If error says connection already exists, that's okay
    if (error.message.includes('already exists')) {
      return null;
    }
    throw error;
  }
}

async function findOrCreateConversation(a, b) {
  // Simple find by participants; optimize with composite index later if needed
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

  const docRef = await addDoc(collection(db, "conversations"), {
    participants: [a, b],
    lastMessageAt: serverTimestamp(),
    lastMessageText: "",
  });
  return docRef.id;
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

// ------------------------------------------------------------------
// Tag label cache (maps slug -> friendly label)
// We read from `tags` for both categories to label interestsSlugs/focusSlugs.
// ------------------------------------------------------------------
function useTagLabelCache() {
  const [map, setMap] = useState({}); // { [slug]: label }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const qi = query(
          collection(db, "tags"),
          where("category", "==", "interest"),
          limit(500)
        );
        const qf = query(
          collection(db, "tags"),
          where("category", "==", "focus"),
          limit(500)
        );

        const [si, sf] = await Promise.all([getDocs(qi), getDocs(qf)]);
        if (!mounted) return;

        const m = {};
        [...si.docs, ...sf.docs].forEach((d) => {
          const data = d.data() || {};
          const slug = data.slug;
          const label = data.label || slug;
          if (slug) m[slug] = label;
        });
        setMap(m);
      } catch (e) {
        console.error("Tag cache load failed", e);
        setMap({});
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const labelFor = (slug) => map[slug] || slug;
  return { labelFor };
}

// ------------------------------------------------------------------
// Search strategy:
//  A) If any tags selected → Firestore query on a single `array-contains-any`
//     (no orderBy to avoid composite index), then client-filter the rest.
//  B) If no tags and term length >= 2 → try keywords (`array-contains`),
//     else fallback to name prefix search.
// ------------------------------------------------------------------
async function searchPeople({ term, interests = [], focus = [], currentUid }) {
  const t = (term || "").trim().toLowerCase();

  // A) Tag-driven search
  if (interests.length || focus.length) {
    const useInterestsFirst = interests.length >= focus.length;
    const primaryField = useInterestsFirst ? "interestsSlugs" : "focusSlugs";
    const primaryValues = (useInterestsFirst ? interests : focus).slice(0, 10);
    const secondaryField = useInterestsFirst ? "focusSlugs" : "interestsSlugs";
    const secondaryValues = (useInterestsFirst ? focus : interests).map((x) =>
      (x || "").toLowerCase()
    );

    // Note: no orderBy here → avoids composite index requirement.
    const q1 = query(
      collection(db, "users"),
      where("searchable", "==", true),
      where(primaryField, "array-contains-any", primaryValues),
      limit(50)
    );
    const snap = await getDocs(q1);
    let users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    users = users.filter((u) => u.id !== currentUid);

    // Client-filter on secondary tag filter (if provided)
    if (secondaryValues.length) {
      users = users.filter((u) => {
        const arr = (u[secondaryField] || []).map((s) => (s || "").toLowerCase());
        return secondaryValues.some((slug) => arr.includes(slug));
      });
    }

    // Client-filter by term (name or keywords)
    if (t) {
      users = users.filter((u) => {
        const dn = (u.displayName || "").toLowerCase();
        const kws = (u.keywords || []).map((k) => (k || "").toLowerCase());
        return dn.includes(t) || kws.includes(t);
      });
    }

    return users;
  }

  // B1) Keyword search (fast if your profiles wrote `keywords`)
  if (t.length >= 2) {
    try {
      const qk = query(
        collection(db, "users"),
        where("searchable", "==", true),
        where("keywords", "array-contains", t),
        limit(25)
      );
      const ksnap = await getDocs(qk);
      const arr = ksnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.id !== currentUid);
      if (arr.length) return arr;
    } catch (e) {
      // If an index is missing or rules block, we'll fall back silently.
      console.warn("Keyword search failed; falling back to prefix", e);
    }
  }

  // B2) Prefix search on displayName
  try {
    let q2;
    if (t) {
      q2 = query(
        collection(db, "users"),
        where("searchable", "==", true),
        orderBy("displayName"),
        startAt(t),
        endAt(t + "\uf8ff"),
        limit(25)
      );
    } else {
      q2 = query(
        collection(db, "users"),
        where("searchable", "==", true),
        orderBy("displayName"),
        limit(25)
      );
    }
    const snap2 = await getDocs(q2);
    return snap2.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((u) => u.id !== currentUid);
  } catch (e) {
    console.error("Name prefix search failed", e);
    return [];
  }
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------

export default function PeopleSearchPage() {
  const { user } = useAuth();

  const [term, setTerm] = useState("");
  const [interestSlugs, setInterestSlugs] = useState([]);
  const [focusSlugs, setFocusSlugs] = useState([]);

  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);

  const [outgoing, setOutgoing] = useState([]); // pending invites from me
  const [connectedSet, setConnectedSet] = useState(new Set()); // Set of userIds already connected with
  const [quickMsg, setQuickMsg] = useState({}); // { [userId]: "hi" }

  const { labelFor } = useTagLabelCache();

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const [out, connected] = await Promise.all([
          getOutgoingInvites(user.uid),
          getConnections(user.uid),
        ]);
        setOutgoing(out);
        setConnectedSet(connected);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [user?.uid]);

  // Optional: preload some suggestions
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const q1 = query(
          collection(db, "users"),
          where("searchable", "==", true),
          orderBy("displayName"),
          limit(12)
        );
        const snap = await getDocs(q1);
        const arr = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((u) => u.id !== user.uid);
        setResults(arr);
      } catch (e) {
        // non-fatal
        console.warn("Suggestion preload failed", e);
      }
    })();
  }, [user?.uid]);

  const doSearch = async () => {
    if (!user?.uid) return;
    setSearching(true);
    try {
      const users = await searchPeople({
        term,
        interests: interestSlugs,
        focus: focusSlugs,
        currentUid: user.uid,
      });
      setResults(users);
    } catch (e) {
      console.error(e);
      alert("Search failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const clearFilters = () => {
    setTerm("");
    setInterestSlugs([]);
    setFocusSlugs([]);
    setResults([]);
  };

  const isPendingTo = (userId) =>
    outgoing.some((i) => i.addresseeId === userId && i.status === "pending");

  const isConnectedTo = (userId) => connectedSet.has(userId);

  const onConnect = async (targetUserId) => {
    if (!user?.uid) return;
    try {
      await sendConnectionInvite(user.uid, targetUserId);
      // optimistic UI - use new field names
      setOutgoing((prev) => {
        const exists = prev.find(
          (i) => i.addresseeId === targetUserId && i.status === "pending"
        );
        if (exists) return prev;
        return [
          {
            id: `local_${Date.now()}`,
            requesterId: user.uid,
            addresseeId: targetUserId,
            participants: [user.uid, targetUserId],
            status: "pending",
          },
          ...prev,
        ];
      });
    } catch (e) {
      console.error("Invite error", e);
      alert("Failed to send request.");
    }
  };

  const onMessage = async (targetUser) => {
    if (!user?.uid) return;
    try {
      const convId = await findOrCreateConversation(user.uid, targetUser.id);
      const text = (quickMsg[targetUser.id] || "").trim();
      if (text) {
        await sendDirectMessage({
          conversationId: convId,
          from: user.uid,
          to: targetUser.id,
          text,
        });
        setQuickMsg((s) => ({ ...s, [targetUser.id]: "" }));
      }
      // If you have a messages route, navigate there:
      // navigate(`/messages/${convId}`);
      alert("Conversation ready! (Wire to your Messages route)");
    } catch (e) {
      console.error("DM error", e);
      alert("Failed to start conversation.");
    }
  };

  const headerSubtitle = useMemo(() => {
    const parts = [];
    if (interestSlugs.length) parts.push(`${interestSlugs.length} interests`);
    if (focusSlugs.length) parts.push(`${focusSlugs.length} focus areas`);
    return parts.length
      ? `Filtered by ${parts.join(" • ")}`
      : "Search and connect with other members";
  }, [interestSlugs.length, focusSlugs.length]);

  return (
    <SidebarLayout>
      <div className="p-vara-lg max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-vara-lg">
          <h1 className="text-vara-xl font-bold text-soft-charcoal">Find People</h1>
          <p className="text-vara-sm text-muted-sage-gray">{headerSubtitle}</p>
        </div>

        {/* Filters card */}
        <div className="bg-white rounded-vara-lg p-5 shadow-vara-sm border border-divider mb-vara-lg">
          <div className="grid grid-cols-1 gap-vara-base">
            {/* Search by name/keyword */}
            <div className="relative">
              <Search className="w-4 h-4 text-muted-sage-gray absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doSearch()}
                placeholder="Search by name or keyword…"
                className="w-full pl-9 pr-36 py-2 border border-divider rounded-vara-lg focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-vara-sm">
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 rounded-vara-md bg-dew-sage-light text-soft-charcoal hover:bg-dew-sage-light text-vara-sm"
                >
                  Clear
                </button>
                <button
                  onClick={doSearch}
                  disabled={searching}
                  className="px-3 py-1.5 rounded-vara-md bg-evergreen-teal text-white text-vara-sm hover:opacity-90 disabled:opacity-60"
                >
                  {searching ? "Searching…" : "Search"}
                </button>
              </div>
            </div>

            {/* Interests */}
            <div>
              <div className="text-vara-sm font-medium text-soft-charcoal mb-1">
                Interests
              </div>
              <TagPicker
                category="interest"
                selectedSlugs={interestSlugs}
                onChange={setInterestSlugs}
                placeholder="Choose interests (Yoga, Running, Meditation…)"
                max={12}
              />
            </div>

            {/* Focus Areas */}
            <div>
              <div className="text-vara-sm font-medium text-soft-charcoal mb-1">
                Focus Areas
              </div>
              <TagPicker
                category="focus"
                selectedSlugs={focusSlugs}
                onChange={setFocusSlugs}
                placeholder="Choose focus areas (Sleep, Stress, Anxiety…)"
                max={6}
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-3">
          {searching && (
            <div className="flex items-center gap-vara-sm text-muted-sage-gray">
              <Loader className="w-4 h-4 animate-spin" />
              Searching…
            </div>
          )}

          {!searching && results.length === 0 && (
            <div className="text-vara-sm text-muted-sage-gray">
              No people yet. Try adjusting filters or removing the name search.
            </div>
          )}

          {!searching &&
            results.map((u) => {
              const pending = isPendingTo(u.id);
              const connected = isConnectedTo(u.id);
              const interestChips = u.interestsSlugs?.length
                ? u.interestsSlugs.slice(0, 6).map((slug) => (
                    <span
                      key={slug}
                      className="px-2 py-0.5 rounded-md bg-dew-sage-light text-soft-charcoal text-vara-xs"
                    >
                      {labelFor(slug)}
                    </span>
                  ))
                : (u.interests || []).slice(0, 6).map((i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-dew-sage-light text-soft-charcoal text-vara-xs"
                    >
                      {i}
                    </span>
                  ));

              const focusChips = (u.focusSlugs || []).slice(0, 4).map((slug) => (
                <span
                  key={slug}
                  className="px-2 py-0.5 rounded-md bg-teal-light text-evergreen-teal text-[11px] font-medium"
                >
                  {labelFor(slug)}
                </span>
              ));

              return (
                <div
                  key={u.id}
                  className="p-vara-base rounded-vara-lg border border-divider bg-white hover:shadow-vara-sm transition"
                >
                  <div className="flex items-start gap-vara-md">
                    <Link to={`/u/${u.id}`} className="shrink-0">
                      <img
                        src={u.avatarUrl || avatarFor(u.displayName)}
                        alt={u.displayName || "User"}
                        className="w-12 h-12 rounded-vara-lg object-cover ring-2 ring-white shadow-vara-sm hover:opacity-90"
                      />
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-vara-md">
                        <div className="min-w-0">
                          <div className="flex items-center gap-vara-sm">
                            <Link
                              to={`/u/${u.id}`}
                              className="font-semibold text-soft-charcoal truncate hover:underline"
                            >
                              {u.displayName || "User"}
                            </Link>
                            {u.location && (
                              <span className="inline-flex items-center gap-1 text-vara-xs text-muted-sage-gray">
                                <MapPin className="w-3 h-3" />
                                {u.location}
                              </span>
                            )}
                          </div>

                          {u.bio && (
                            <p className="text-vara-sm text-soft-charcoal line-clamp-2 mt-0.5">
                              {u.bio}
                            </p>
                          )}

                          {(u.interestsSlugs?.length ||
                            u.interests?.length ||
                            u.focusSlugs?.length) ? (
                            <div className="mt-2 flex flex-wrap gap-vara-sm">
                              {interestChips}
                              {focusChips}
                            </div>
                          ) : null}
                        </div>

                        {/* View Profile */}
                        <Link
                          to={`/u/${u.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-vara-md text-vara-sm bg-dew-sage-light text-soft-charcoal hover:bg-dew-sage-light shrink-0"
                          title="Open profile"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Profile
                        </Link>
                      </div>

                      {/* Actions */}
                      <div className="mt-3 flex items-center gap-vara-sm">
                        <button
                          onClick={() => onConnect(u.id)}
                          disabled={pending || connected}
                          className={`inline-flex items-center gap-vara-sm px-3 py-1.5 rounded-vara-md text-vara-sm font-medium transition ${
                            connected
                              ? "bg-teal-light text-evergreen-teal cursor-not-allowed"
                              : pending
                              ? "bg-dew-sage-light text-muted-sage-gray cursor-not-allowed"
                              : "bg-evergreen-teal text-white hover:opacity-90"
                          }`}
                        >
                          {connected ? (
                            <>
                              <ArrowLeftRight className="w-4 h-4" /> Connected
                            </>
                          ) : pending ? (
                            <>
                              <ArrowLeftRight className="w-4 h-4" /> Requested
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4" /> Connect
                            </>
                          )}
                        </button>

                        {/* Quick message */}
                        <div className="flex-1 flex items-center gap-vara-sm">
                          <input
                            value={quickMsg[u.id] || ""}
                            onChange={(e) =>
                              setQuickMsg((s) => ({ ...s, [u.id]: e.target.value }))
                            }
                            onKeyDown={(e) => e.key === "Enter" && onMessage(u)}
                            placeholder="Say hi…"
                            className="w-full px-3 py-1.5 bg-mist-white border border-divider rounded-vara-md text-vara-sm focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
                          />
                          <button
                            onClick={() => onMessage(u)}
                            className="px-3 py-1.5 rounded-vara-md bg-soft-charcoal text-white hover:opacity-90"
                            title="Send"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Hint */}
        <div className="text-[12px] text-muted-sage-gray mt-6">
          Tip: profiles that set Interests/Focus are easier to find. Your Edit Profile saves a lightweight
          <code> keywords</code> index for better matching.
        </div>
      </div>
    </SidebarLayout>
  );
}


