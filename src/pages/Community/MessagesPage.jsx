import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from 'firebase/firestore';
import SidebarLayout from '../../components/layout/SidebarLayout';
import { MessageCircle } from 'lucide-react';

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

const MessagesPage = () => {
  const { user, isAuthReady } = useAuth();
  const navigate = useNavigate();

  const [conversations, setConversations] = useState([]);
  const [participants, setParticipants] = useState({}); // uid -> profile
  const [loading, setLoading] = useState(true);

  // Subscribe to conversations
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const convs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setConversations(convs);
      setLoading(false);

      // Collect other participant UIDs we haven't fetched yet
      const uidsNeeded = new Set();
      convs.forEach((c) => {
        (c.participants || []).forEach((uid) => {
          if (uid !== user.uid) uidsNeeded.add(uid);
        });
      });

      uidsNeeded.forEach(async (uid) => {
        setParticipants((prev) => {
          if (prev[uid]) return prev; // already fetched
          return prev;
        });
        try {
          const snap = await getDoc(doc(db, 'users', uid));
          if (snap.exists()) {
            setParticipants((prev) => ({ ...prev, [uid]: snap.data() }));
          }
        } catch (err) {
          console.error('Error fetching participant profile:', err);
        }
      });
    });

    return () => unsub();
  }, [user, isAuthReady]);

  const getOtherUid = (conv) =>
    (conv.participants || []).find((uid) => uid !== user?.uid);

  const getInitial = (name) =>
    name ? name.charAt(0).toUpperCase() : '?';

  if (!isAuthReady) {
    return (
      <SidebarLayout>
        <div className="max-w-2xl mx-auto p-vara-lg">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-dew-sage-light rounded w-1/3" />
            <div className="h-16 bg-dew-sage-light rounded" />
            <div className="h-16 bg-dew-sage-light rounded" />
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="max-w-2xl mx-auto p-vara-lg space-y-vara-lg">
        {/* Page Header */}
        <div className="flex items-center gap-vara-md">
          <div className="w-10 h-10 rounded-vara-md bg-teal-light flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-evergreen-teal" />
          </div>
          <h1 className="text-vara-2xl font-semibold text-soft-charcoal">Messages</h1>
        </div>

        {/* Conversations List */}
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-dew-sage-light rounded-vara-lg" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-14 bg-mist-white rounded-vara-lg border border-divider">
            <MessageCircle className="w-12 h-12 text-muted-sage-gray mx-auto mb-3" />
            <p className="text-soft-charcoal font-medium">No conversations yet</p>
            <p className="text-vara-sm text-muted-sage-gray mt-1">
              Start a conversation by visiting someone's profile.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-divider bg-white rounded-vara-lg border border-divider shadow-vara-sm overflow-hidden">
            {conversations.map((conv) => {
              const otherUid = getOtherUid(conv);
              const profile = participants[otherUid];
              const displayName = profile?.displayName || profile?.name || 'User';
              const avatarUrl = profile?.avatarUrl || profile?.photoURL;
              const lastText = conv.lastMessage?.text || '';
              const timestamp = conv.updatedAt || conv.lastMessage?.createdAt;

              return (
                <button
                  key={conv.id}
                  onClick={() => navigate(`/u/${otherUid}`)}
                  className="w-full flex items-center gap-vara-md p-vara-base hover:bg-mist-white transition-colors text-left"
                >
                  {/* Avatar */}
                  <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-teal-medium to-evergreen-teal flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-white font-semibold text-vara-base">
                        {getInitial(displayName)}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-soft-charcoal truncate">
                        {displayName}
                      </span>
                      {timestamp && (
                        <span className="shrink-0 text-vara-xs text-muted-sage-gray">
                          {formatTimeAgo(timestamp)}
                        </span>
                      )}
                    </div>
                    {lastText ? (
                      <p className="text-vara-sm text-muted-sage-gray truncate mt-0.5">
                        {lastText}
                      </p>
                    ) : (
                      <p className="text-vara-sm text-muted-sage-gray italic mt-0.5">
                        No messages yet
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
};

export default MessagesPage;
