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
  const [tab, setTab] = useState("incoming"); // incoming | connections | sent
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Users className="text-emerald-700" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Connections</h3>
              <p className="text-xs text-gray-500">Manage requests and your network</p>
            </div>
          </div>
          <button className="p-2 rounded-lg hover:bg-gray-100" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4">
          <div className="flex bg-gray-100 rounded-xl p-1 w-fit">
            {[
              { key: "incoming", label: "Requests", count: incoming.length },
              { key: "connections", label: "Your Connections", count: connections.length },
              { key: "sent", label: "Sent", count: sent.length },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  tab === t.key ? "bg-white shadow-sm" : "text-gray-600"
                }`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className="ml-2 text-xs bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader className="animate-spin" size={16} /> Loading…
            </div>
          )}

          {!loading && tab === "incoming" && (
            <div className="space-y-3">
              {incoming.length === 0 ? (
                <div className="text-sm text-gray-500">No pending requests.</div>
              ) : (
                incoming.map((req) => (
                  <IncomingRow
                    key={req.id}
                    req={req}
                    onAccept={async () => {
                      await acceptConnection(req);
                      await refresh();
                    }}
                    onDecline={async () => {
                      await declineConnection(req.id);
                      await refresh();
                    }}
                  />
                ))
              )}
            </div>
          )}

          {!loading && tab === "connections" && (
            <div className="space-y-3">
              {connections.length === 0 ? (
                <div className="text-sm text-gray-500">You have no connections yet.</div>
              ) : (
                connections.map((conn) => (
                  <ConnectionRow
                    key={conn.id}
                    conn={conn}
                    selfId={userId}
                    onRemove={async () => {
                      await removeConnection(conn.id);
                      await refresh();
                    }}
                  />
                ))
              )}
            </div>
          )}

          {!loading && tab === "sent" && (
            <div className="space-y-3">
              {sent.length === 0 ? (
                <div className="text-sm text-gray-500">No sent requests.</div>
              ) : (
                sent.map((req) => (
                  <SentRow
                    key={req.id}
                    req={req}
                    onCancel={async () => {
                      await cancelConnectionRequest(req.id);
                      await refresh();
                    }}
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
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
          <Inbox size={18} className="text-emerald-700" />
        </div>
        <div>
          <div className="font-medium text-gray-800">
            {info?.displayName || info?.name || "New user"}
          </div>
          <div className="text-xs text-gray-500">{info?.email}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onAccept();
            } finally {
              setBusy(false);
            }
          }}
          className="inline-flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          <Check size={16} /> Accept
        </button>
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onDecline();
            } finally {
              setBusy(false);
            }
          }}
          className="inline-flex items-center gap-1 px-3 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm hover:bg-gray-300 disabled:opacity-60"
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
    const otherId = conn.members?.find((m) => m !== selfId);
    if (otherId) (async () => setOther(await getUserById(otherId)))();
  }, [conn, selfId]);

  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
          <Users size={18} className="text-blue-700" />
        </div>
        <div>
          <div className="font-medium text-gray-800">
            {other?.displayName || other?.name || "User"}
          </div>
          <div className="text-xs text-gray-500">{other?.email}</div>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="inline-flex items-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
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
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
          <UserPlus size={18} className="text-gray-600" />
        </div>
        <div>
          <div className="font-medium text-gray-800">
            {info?.displayName || info?.name || "User"}
          </div>
          <div className="text-xs text-gray-500">{info?.email}</div>
        </div>
      </div>
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onCancel();
          } finally {
            setBusy(false);
          }
        }}
        className="inline-flex items-center gap-1 px-3 py-2 bg-gray-200 text-gray-800 rounded-lg text-sm hover:bg-gray-300 disabled:opacity-60"
      >
        <X size={16} /> Cancel
      </button>
    </div>
  );
}
