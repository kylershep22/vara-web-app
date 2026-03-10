import React, { useEffect, useState, useCallback } from "react";
import { Users, Inbox, Check, X, Loader, Trash2, UserPlus } from "lucide-react";
import {
  fetchIncomingConnectionRequests,
  fetchSentConnectionRequests,
  fetchUserConnections,
  acceptConnection,
  declineConnection,
  cancelConnectionRequest,
  removeConnection,
  getUserById,
} from "../../services/communityService";

export default function ConnectionsModal({ userId, open, onClose }) {
  const [tab, setTab] = useState("incoming");
  const [incoming, setIncoming] = useState([]);
  const [sent, setSent] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [i, s, c] = await Promise.all([
        fetchIncomingConnectionRequests(userId),
        fetchSentConnectionRequests(userId),
        fetchUserConnections(userId),
      ]);
      setIncoming(i);
      setSent(s);
      setConnections(c);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  if (!open) return null;

  const tabItems = [
    { key: "incoming", label: "Requests", count: incoming.length },
    { key: "connections", label: "Connections", count: connections.length },
    { key: "sent", label: "Sent", count: sent.length },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-vara-base">
      <div className="bg-white w-full max-w-3xl rounded-vara-lg shadow-vara-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-vara-lg py-vara-base border-b border-divider">
          <div className="flex items-center gap-vara-md">
            <div className="w-10 h-10 rounded-vara-md bg-teal-light flex items-center justify-center">
              <Users className="text-evergreen-teal" size={20} />
            </div>
            <div>
              <h3 className="text-vara-lg font-semibold text-soft-charcoal">Connections</h3>
              <p className="text-vara-xs text-muted-sage-gray">Manage requests and your network</p>
            </div>
          </div>
          <button className="p-2 rounded-vara-md hover:bg-dew-sage-light text-muted-sage-gray" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Segmented Tabs */}
        <div className="px-vara-lg pt-vara-base">
          <div className="flex bg-dew-sage-light rounded-vara-lg p-1 w-fit">
            {tabItems.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-vara-base py-2 rounded-vara-md text-vara-sm font-medium transition-all ${
                  tab === t.key ? "bg-white text-evergreen-teal shadow-vara-sm" : "text-muted-sage-gray hover:text-soft-charcoal"
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className="ml-2 text-vara-xs bg-evergreen-teal text-white px-2 py-0.5 rounded-vara-pill">
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-vara-lg max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center gap-vara-sm text-muted-sage-gray">
              <Loader className="animate-spin" size={16} /> Loading...
            </div>
          )}

          {!loading && tab === "incoming" && (
            <div className="space-y-vara-md">
              {incoming.length === 0 ? (
                <div className="text-vara-sm text-muted-sage-gray">No pending requests.</div>
              ) : (
                incoming.map((req) => (
                  <IncomingRow
                    key={req.id}
                    req={req}
                    onAccept={async () => { await acceptConnection(req); await refresh(); }}
                    onDecline={async () => { await declineConnection(req.id); await refresh(); }}
                  />
                ))
              )}
            </div>
          )}

          {!loading && tab === "connections" && (
            <div className="space-y-vara-md">
              {connections.length === 0 ? (
                <div className="text-vara-sm text-muted-sage-gray">You have no connections yet.</div>
              ) : (
                connections.map((conn) => (
                  <ConnectionRow
                    key={conn.id}
                    conn={conn}
                    selfId={userId}
                    onRemove={async () => { await removeConnection(conn.id); await refresh(); }}
                  />
                ))
              )}
            </div>
          )}

          {!loading && tab === "sent" && (
            <div className="space-y-vara-md">
              {sent.length === 0 ? (
                <div className="text-vara-sm text-muted-sage-gray">No sent requests.</div>
              ) : (
                sent.map((req) => (
                  <SentRow
                    key={req.id}
                    req={req}
                    onCancel={async () => { await cancelConnectionRequest(req.id); await refresh(); }}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function IncomingRow({ req, onAccept, onDecline }) {
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => setInfo(await getUserById(req.fromUserId)))();
  }, [req.fromUserId]);

  return (
    <div className="flex items-center justify-between p-vara-base bg-mist-white rounded-vara-lg">
      <div className="flex items-center gap-vara-md">
        <div className="w-10 h-10 rounded-full bg-teal-light flex items-center justify-center">
          <Inbox size={18} className="text-evergreen-teal" />
        </div>
        <div>
          <div className="font-medium text-soft-charcoal text-vara-sm">
            {info?.displayName || info?.name || "New user"}
          </div>
          <div className="text-vara-xs text-muted-sage-gray">{info?.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-vara-sm">
        <button
          disabled={busy}
          onClick={async () => { setBusy(true); try { await onAccept(); } finally { setBusy(false); } }}
          className="inline-flex items-center gap-1 px-3 py-2 bg-evergreen-teal text-white rounded-vara-md text-vara-sm hover:opacity-90 disabled:opacity-60"
        >
          <Check size={16} /> Accept
        </button>
        <button
          disabled={busy}
          onClick={async () => { setBusy(true); try { await onDecline(); } finally { setBusy(false); } }}
          className="inline-flex items-center gap-1 px-3 py-2 bg-dew-sage-light text-soft-charcoal rounded-vara-md text-vara-sm hover:bg-dew-sage disabled:opacity-60"
        >
          <X size={16} /> Decline
        </button>
      </div>
    </div>
  );
}

function ConnectionRow({ conn, selfId, onRemove }) {
  const [other, setOther] = useState(null);

  useEffect(() => {
    const otherId = conn.participants?.find((m) => m !== selfId);
    if (otherId) (async () => setOther(await getUserById(otherId)))();
  }, [conn, selfId]);

  return (
    <div className="flex items-center justify-between p-vara-base bg-white border border-divider rounded-vara-lg">
      <div className="flex items-center gap-vara-md">
        <div className="w-10 h-10 rounded-full bg-dew-sage-light flex items-center justify-center">
          <Users size={18} className="text-evergreen-teal" />
        </div>
        <div>
          <div className="font-medium text-soft-charcoal text-vara-sm">
            {other?.displayName || other?.name || "User"}
          </div>
          <div className="text-vara-xs text-muted-sage-gray">{other?.email}</div>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="inline-flex items-center gap-1 px-3 py-2 bg-[rgba(217,122,110,0.15)] text-soft-coral rounded-vara-md text-vara-sm hover:opacity-80"
      >
        <Trash2 size={16} /> Remove
      </button>
    </div>
  );
}

function SentRow({ req, onCancel }) {
  const [info, setInfo] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => setInfo(await getUserById(req.toUserId)))();
  }, [req.toUserId]);

  return (
    <div className="flex items-center justify-between p-vara-base bg-mist-white rounded-vara-lg">
      <div className="flex items-center gap-vara-md">
        <div className="w-10 h-10 rounded-full bg-dew-sage-light flex items-center justify-center">
          <UserPlus size={18} className="text-muted-sage-gray" />
        </div>
        <div>
          <div className="font-medium text-soft-charcoal text-vara-sm">
            {info?.displayName || info?.name || "User"}
          </div>
          <div className="text-vara-xs text-muted-sage-gray">{info?.email}</div>
        </div>
      </div>
      <button
        disabled={busy}
        onClick={async () => { setBusy(true); try { await onCancel(); } finally { setBusy(false); } }}
        className="inline-flex items-center gap-1 px-3 py-2 bg-dew-sage-light text-soft-charcoal rounded-vara-md text-vara-sm hover:bg-dew-sage disabled:opacity-60"
      >
        <X size={16} /> Cancel
      </button>
    </div>
  );
}
