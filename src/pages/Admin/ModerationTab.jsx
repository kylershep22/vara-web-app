import React, { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Shield,
  Trash2,
  MessageSquareWarning,
  Ban,
  Clock,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  getModerationQueue,
  takeQueueModerationAction,
} from "../../services/db/adminModeration.service";

const SOURCE_LABELS = {
  user_report: "User Report",
  keyword_filter: "Keyword Filter",
  ai_review: "AI Review",
  moderation_error: "Needs Review",
};

const SEVERITY_STYLES = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-blue-100 text-blue-700",
};

const ACTIONS = [
  { id: "dismiss", label: "Dismiss", icon: Shield, color: "text-gray-600" },
  { id: "remove", label: "Remove", icon: Trash2, color: "text-red-600" },
  {
    id: "warn",
    label: "Warn",
    icon: MessageSquareWarning,
    color: "text-yellow-600",
  },
  {
    id: "remove_warn",
    label: "Remove + Warn",
    icon: AlertTriangle,
    color: "text-orange-600",
  },
  { id: "suspend", label: "Suspend", icon: Clock, color: "text-purple-600" },
  { id: "ban", label: "Ban", icon: Ban, color: "text-red-800" },
];

export default function ModerationTab() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState("pending");
  const [sourceFilter, setSourceFilter] = useState("");

  // Confirmation modal
  const [modal, setModal] = useState(null); // { item, action }
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchQueue = useCallback(
    async (append = false) => {
      try {
        setLoading(true);
        setError(null);
        const result = await getModerationQueue({
          status: statusFilter,
          source: sourceFilter || null,
          pageSize: 25,
          lastDoc: append ? lastDoc : null,
        });
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setLastDoc(result.lastDoc);
        setHasMore(result.hasMore);
      } catch (err) {
        if (process.env.NODE_ENV === "development") {
          console.error("Failed to fetch moderation queue:", err);
        }
        setError("Failed to load moderation queue.");
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, sourceFilter, lastDoc]
  );

  useEffect(() => {
    fetchQueue(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, sourceFilter]);

  const openModal = (item, action) => {
    setModal({ item, action });
    setReason("");
    setDuration("");
  };

  const closeModal = () => {
    setModal(null);
    setReason("");
    setDuration("");
  };

  const handleConfirm = async () => {
    if (!reason.trim()) return;
    if (!modal) return;

    setActionLoading(true);
    try {
      await takeQueueModerationAction({
        queueItemId: modal.item.id,
        adminId: user.uid,
        targetUserId: modal.item.authorId || modal.item.targetUserId,
        action: modal.action.id,
        reason: reason.trim(),
        duration:
          modal.action.id === "suspend" && duration ? duration : null,
      });
      closeModal();
      // Refresh queue
      await fetchQueue(false);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Moderation action failed:", err);
      }
      setError("Failed to complete moderation action.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div>
      {/* Filter Bar */}
      <div className="flex flex-wrap gap-vara-sm mb-vara-base">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-divider rounded-lg px-vara-sm py-2 text-vara-sm bg-white text-soft-charcoal"
        >
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="border border-divider rounded-lg px-vara-sm py-2 text-vara-sm bg-white text-soft-charcoal"
        >
          <option value="">All Sources</option>
          <option value="user_report">User Report</option>
          <option value="keyword_filter">Keyword Filter</option>
          <option value="ai_review">AI Review</option>
          <option value="moderation_error">Needs Review</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 p-vara-sm rounded-lg mb-vara-base text-vara-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && items.length === 0 && (
        <p className="text-muted-sage-gray text-vara-sm">
          Loading moderation queue...
        </p>
      )}

      {/* Empty State */}
      {!loading && items.length === 0 && !error && (
        <div className="text-center py-vara-2xl text-muted-sage-gray">
          <Shield className="w-12 h-12 mx-auto mb-vara-sm opacity-50" />
          <p className="text-vara-base font-medium">Queue is clear</p>
          <p className="text-vara-sm">
            No {statusFilter} items to review.
          </p>
        </div>
      )}

      {/* Queue Table */}
      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-vara-sm">
            <thead>
              <tr className="border-b border-divider text-left text-muted-sage-gray">
                <th className="pb-2 pr-3 font-medium">Severity</th>
                <th className="pb-2 pr-3 font-medium">Source</th>
                <th className="pb-2 pr-3 font-medium">Author</th>
                <th className="pb-2 pr-3 font-medium">Content</th>
                <th className="pb-2 pr-3 font-medium">Reason</th>
                <th className="pb-2 pr-3 font-medium">Confidence</th>
                <th className="pb-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <QueueRow
                  key={item.id}
                  item={item}
                  onAction={(action) => openModal(item, action)}
                  isReviewed={statusFilter === "reviewed"}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Load More */}
      {hasMore && !loading && (
        <div className="mt-vara-base text-center">
          <button
            onClick={() => fetchQueue(true)}
            className="text-evergreen-teal text-vara-sm font-medium hover:underline"
          >
            Load more
          </button>
        </div>
      )}

      {/* Confirmation Modal */}
      {modal && (
        <ConfirmationModal
          action={modal.action}
          onConfirm={handleConfirm}
          onCancel={closeModal}
          reason={reason}
          setReason={setReason}
          duration={duration}
          setDuration={setDuration}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

function QueueRow({ item, onAction, isReviewed }) {
  const severityClass =
    SEVERITY_STYLES[item.severity] || "bg-gray-100 text-gray-700";
  const sourceLabel =
    SOURCE_LABELS[item.source] || item.source || "Unknown";

  return (
    <tr className="border-b border-divider/50 hover:bg-gray-50">
      <td className="py-3 pr-3">
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${severityClass}`}
        >
          {item.severity || "unknown"}
        </span>
      </td>
      <td className="py-3 pr-3 text-muted-sage-gray">{sourceLabel}</td>
      <td className="py-3 pr-3 text-soft-charcoal font-medium">
        {item.authorName || item.authorId || "Unknown"}
      </td>
      <td className="py-3 pr-3 max-w-xs">
        <p className="truncate text-soft-charcoal">
          {item.contentPreview || item.content || "No content"}
        </p>
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt="Flagged content"
            className="mt-1 w-12 h-12 rounded object-cover border border-divider"
          />
        )}
      </td>
      <td className="py-3 pr-3 text-muted-sage-gray">
        {item.reason || "-"}
      </td>
      <td className="py-3 pr-3 text-muted-sage-gray">
        {item.aiConfidence != null
          ? `${Math.round(item.aiConfidence * 100)}%`
          : "-"}
      </td>
      <td className="py-3">
        {!isReviewed ? (
          <div className="flex flex-wrap gap-1">
            {ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => onAction(action)}
                  title={action.label}
                  className={`p-1.5 rounded hover:bg-gray-100 ${action.color}`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        ) : (
          <span className="text-xs text-muted-sage-gray italic">
            {item.action || "reviewed"}
          </span>
        )}
      </td>
    </tr>
  );
}

function ConfirmationModal({
  action,
  onConfirm,
  onCancel,
  reason,
  setReason,
  duration,
  setDuration,
  loading,
}) {
  const isBan = action.id === "ban";
  const isSuspend = action.id === "suspend";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-vara-lg">
        <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-sm">
          Confirm: {action.label}
        </h3>

        {isBan && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-vara-sm mb-vara-sm text-vara-sm">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            Banning is permanent and cannot be undone.
          </div>
        )}

        <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">
          Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          className="w-full border border-divider rounded-lg p-vara-sm text-vara-sm mb-vara-sm resize-none focus:outline-none focus:ring-2 focus:ring-evergreen-teal/30"
          placeholder="Describe the reason for this action..."
        />

        {isSuspend && (
          <div className="mb-vara-sm">
            <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">
              Duration
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full border border-divider rounded-lg px-vara-sm py-2 text-vara-sm bg-white"
            >
              <option value="">Select duration</option>
              <option value="1d">1 day</option>
              <option value="3d">3 days</option>
              <option value="7d">7 days</option>
              <option value="14d">14 days</option>
              <option value="30d">30 days</option>
            </select>
          </div>
        )}

        <div className="flex justify-end gap-vara-sm mt-vara-base">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-vara-base py-2 text-vara-sm rounded-lg border border-divider text-muted-sage-gray hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!reason.trim() || loading}
            className="px-vara-base py-2 text-vara-sm rounded-lg bg-evergreen-teal text-white font-medium hover:bg-evergreen-teal/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : `Confirm ${action.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}
