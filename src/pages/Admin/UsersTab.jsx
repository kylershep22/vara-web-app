import React, { useState, useCallback } from "react";
import {
  Search,
  ChevronLeft,
  User,
  Shield,
  ShieldOff,
  MessageSquareWarning,
  Clock,
  Ban,
  Undo2,
  AlertTriangle,
  Target,
  BookOpen,
  CheckSquare,
  MessageCircle,
  Repeat,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  searchUsers,
  getAdminUserDetail,
  grantAdminRole,
  revokeAdminRole,
} from "../../services/db/admin.service";
import { takeDirectModerationAction } from "../../services/db/adminModeration.service";

const STATUS_COLORS = {
  banned: "text-red-700 bg-red-50",
  suspended: "text-orange-700 bg-orange-50",
  active: "text-green-700 bg-green-50",
};

const STAT_CONFIG = [
  { key: "goals", label: "Goals", icon: Target },
  { key: "habits", label: "Habits", icon: Repeat },
  { key: "journalEntries", label: "Journal", icon: BookOpen },
  { key: "posts", label: "Posts", icon: MessageCircle },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
];

export default function UsersTab() {
  const { user } = useAuth();

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Detail state
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  // Action modal state
  const [modal, setModal] = useState(null); // { actionType, userName, userId }
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const handleSearch = useCallback(async () => {
    const term = searchTerm.trim();
    if (!term) return;

    setSearchLoading(true);
    setSearchError(null);
    try {
      const result = await searchUsers(term);
      setResults(result.users);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("User search failed:", err);
      }
      setSearchError("Failed to search users.");
    } finally {
      setSearchLoading(false);
    }
  }, [searchTerm]);

  const handleSelectUser = useCallback(async (userId) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const detail = await getAdminUserDetail(userId);
      setSelectedUser(detail);
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Failed to load user detail:", err);
      }
      setDetailError("Failed to load user details.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const refreshDetail = useCallback(async () => {
    if (!selectedUser) return;
    await handleSelectUser(selectedUser.id);
  }, [selectedUser, handleSelectUser]);

  const handleBack = () => {
    setSelectedUser(null);
    setDetailError(null);
  };

  const openModal = (actionType) => {
    setModal({ actionType, userName: selectedUser.displayName, userId: selectedUser.id });
    setReason("");
    setDuration("");
  };

  const closeModal = () => {
    setModal(null);
    setReason("");
    setDuration("");
  };

  const handleConfirmAction = async () => {
    if (!modal || !reason.trim()) return;

    setActionLoading(true);
    try {
      const { actionType, userId } = modal;

      if (actionType === "grant_admin") {
        await grantAdminRole(userId);
      } else if (actionType === "revoke_admin") {
        await revokeAdminRole(userId);
      } else {
        await takeDirectModerationAction({
          adminId: user.uid,
          targetUserId: userId,
          action: actionType,
          reason: reason.trim(),
          duration: actionType === "suspend" && duration ? duration : null,
        });
      }

      closeModal();
      await refreshDetail();
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.error("Action failed:", err);
      }
      setDetailError("Failed to complete action.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  // Detail View
  if (selectedUser || detailLoading) {
    return (
      <div>
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-evergreen-teal text-vara-sm font-medium mb-vara-base hover:underline"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to search
        </button>

        {detailLoading && !selectedUser && (
          <p className="text-muted-sage-gray text-vara-sm">Loading user details...</p>
        )}

        {detailError && (
          <div className="bg-red-50 text-red-700 p-vara-sm rounded-lg mb-vara-base text-vara-sm">
            {detailError}
          </div>
        )}

        {selectedUser && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-vara-base">
            {/* Column 1: Profile Summary */}
            <div className="bg-white border border-divider rounded-xl p-vara-base">
              <div className="flex flex-col items-center text-center mb-vara-base">
                {selectedUser.avatar ? (
                  <img
                    src={selectedUser.avatar}
                    alt={selectedUser.displayName}
                    className="w-20 h-20 rounded-full object-cover border-2 border-divider mb-vara-sm"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-dew-sage/30 flex items-center justify-center mb-vara-sm">
                    <User className="w-10 h-10 text-muted-sage-gray" />
                  </div>
                )}
                <h2 className="text-vara-lg font-semibold text-soft-charcoal">
                  {selectedUser.displayName || "Unknown"}
                </h2>
                <p className="text-vara-sm text-muted-sage-gray">{selectedUser.email}</p>
              </div>

              <div className="space-y-2 text-vara-sm">
                <div className="flex justify-between">
                  <span className="text-muted-sage-gray">Role</span>
                  <span className="font-medium text-soft-charcoal capitalize">
                    {selectedUser.role}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-sage-gray">Status</span>
                  <StatusBadge status={selectedUser.moderationStatus} />
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-sage-gray">Subscription</span>
                  <span className="font-medium text-soft-charcoal capitalize">
                    {selectedUser.subscription?.type || "unknown"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-sage-gray">Joined</span>
                  <span className="font-medium text-soft-charcoal">
                    {selectedUser.createdAt
                      ? new Date(selectedUser.createdAt.seconds * 1000).toLocaleDateString()
                      : "Unknown"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              {selectedUser.id !== user.uid && (
                <>
                  <div className="border-t border-divider my-vara-base" />
                  <div className="flex flex-wrap gap-2">
                    {/* Admin toggle */}
                    {selectedUser.role === "admin" ? (
                      <ActionButton
                        icon={ShieldOff}
                        label="Revoke Admin"
                        onClick={() => openModal("revoke_admin")}
                        className="bg-gray-50 text-gray-700 hover:bg-gray-100"
                      />
                    ) : (
                      <ActionButton
                        icon={Shield}
                        label="Grant Admin"
                        onClick={() => openModal("grant_admin")}
                        className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                      />
                    )}

                    {/* Moderation actions */}
                    {(selectedUser.moderationStatus === "suspended" ||
                      selectedUser.moderationStatus === "banned") ? (
                      <ActionButton
                        icon={Undo2}
                        label={
                          selectedUser.moderationStatus === "suspended"
                            ? "Unsuspend"
                            : "Unban"
                        }
                        onClick={() =>
                          openModal(
                            selectedUser.moderationStatus === "suspended"
                              ? "unsuspend"
                              : "unban"
                          )
                        }
                        className="bg-green-50 text-green-700 hover:bg-green-100"
                      />
                    ) : (
                      <>
                        <ActionButton
                          icon={MessageSquareWarning}
                          label="Warn"
                          onClick={() => openModal("warn")}
                          className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                        />
                        <ActionButton
                          icon={Clock}
                          label="Suspend"
                          onClick={() => openModal("suspend")}
                          className="bg-orange-50 text-orange-700 hover:bg-orange-100"
                        />
                        {selectedUser.moderationStatus !== "banned" && (
                          <ActionButton
                            icon={Ban}
                            label="Ban"
                            onClick={() => openModal("ban")}
                            className="bg-red-50 text-red-700 hover:bg-red-100"
                          />
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Column 2: Activity Stats */}
            <div className="bg-white border border-divider rounded-xl p-vara-base">
              <h3 className="text-vara-base font-semibold text-soft-charcoal mb-vara-sm">
                Activity Stats
              </h3>
              <div className="grid grid-cols-2 gap-vara-sm">
                {STAT_CONFIG.map(({ key, label, icon: Icon }) => (
                  <div
                    key={key}
                    className="bg-mist-white rounded-lg p-vara-sm text-center"
                  >
                    <Icon className="w-5 h-5 mx-auto mb-1 text-evergreen-teal" />
                    <p className="text-vara-xl font-bold text-soft-charcoal">
                      {selectedUser.activityStats?.[key] ?? 0}
                    </p>
                    <p className="text-vara-xs text-muted-sage-gray">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Moderation History */}
            <div className="bg-white border border-divider rounded-xl p-vara-base">
              <h3 className="text-vara-base font-semibold text-soft-charcoal mb-vara-sm">
                Moderation History
              </h3>
              <div className="max-h-96 overflow-y-auto space-y-vara-sm">
                {selectedUser.moderationHistory?.length > 0 ? (
                  selectedUser.moderationHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="border border-divider/50 rounded-lg p-vara-sm"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-vara-sm font-medium text-soft-charcoal capitalize">
                          {entry.action}
                        </span>
                        <span className="text-vara-xs text-muted-sage-gray">
                          {entry.timestamp
                            ? new Date(
                                entry.timestamp.seconds * 1000
                              ).toLocaleDateString()
                            : "Unknown"}
                        </span>
                      </div>
                      {entry.reason && (
                        <p className="text-vara-xs text-muted-sage-gray">
                          {entry.reason}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-vara-sm text-muted-sage-gray">
                    No moderation history.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Modal */}
        {modal && (
          <ActionModal
            modal={modal}
            reason={reason}
            setReason={setReason}
            duration={duration}
            setDuration={setDuration}
            loading={actionLoading}
            onConfirm={handleConfirmAction}
            onCancel={closeModal}
          />
        )}
      </div>
    );
  }

  // Search View (default)
  return (
    <div>
      {/* Search Bar */}
      <div className="flex gap-vara-sm mb-vara-base">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-sage-gray" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search users by name..."
            className="w-full pl-10 pr-vara-sm py-2 border border-divider rounded-lg text-vara-sm text-soft-charcoal focus:outline-none focus:ring-2 focus:ring-evergreen-teal/30"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searchLoading || !searchTerm.trim()}
          className="px-vara-base py-2 text-vara-sm rounded-lg bg-evergreen-teal text-white font-medium hover:bg-evergreen-teal/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {searchLoading ? "Searching..." : "Search"}
        </button>
      </div>

      {/* Error */}
      {searchError && (
        <div className="bg-red-50 text-red-700 p-vara-sm rounded-lg mb-vara-base text-vara-sm">
          {searchError}
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-vara-sm">
            <thead>
              <tr className="border-b border-divider text-left text-muted-sage-gray">
                <th className="pb-2 pr-3 font-medium">Name</th>
                <th className="pb-2 pr-3 font-medium">Email</th>
                <th className="pb-2 pr-3 font-medium">Role</th>
                <th className="pb-2 pr-3 font-medium">Status</th>
                <th className="pb-2 font-medium">Subscription</th>
              </tr>
            </thead>
            <tbody>
              {results.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => handleSelectUser(u.id)}
                  className="border-b border-divider/50 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="py-3 pr-3 font-medium text-soft-charcoal">
                    {u.displayName || "Unknown"}
                  </td>
                  <td className="py-3 pr-3 text-muted-sage-gray">{u.email}</td>
                  <td className="py-3 pr-3 text-soft-charcoal capitalize">{u.role}</td>
                  <td className="py-3 pr-3">
                    <StatusBadge status={u.moderationStatus} />
                  </td>
                  <td className="py-3 text-soft-charcoal capitalize">
                    {u.subscriptionType}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!searchLoading && results.length === 0 && !searchError && searchTerm.trim() && (
        <div className="text-center py-vara-2xl text-muted-sage-gray">
          <User className="w-12 h-12 mx-auto mb-vara-sm opacity-50" />
          <p className="text-vara-base font-medium">No users found</p>
          <p className="text-vara-sm">Try a different search term.</p>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const colorClass = STATUS_COLORS[status] || STATUS_COLORS.active;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass}`}
    >
      {status || "active"}
    </span>
  );
}

function ActionButton({ icon: Icon, label, onClick, className }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-vara-xs font-medium transition-colors ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

const ACTION_LABELS = {
  grant_admin: "Grant Admin",
  revoke_admin: "Revoke Admin",
  warn: "Warn",
  suspend: "Suspend",
  ban: "Ban",
  unsuspend: "Unsuspend",
  unban: "Unban",
};

function ActionModal({
  modal,
  reason,
  setReason,
  duration,
  setDuration,
  loading,
  onConfirm,
  onCancel,
}) {
  const label = ACTION_LABELS[modal.actionType] || modal.actionType;
  const isSuspend = modal.actionType === "suspend";
  const isBan = modal.actionType === "ban";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-vara-lg">
        <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-sm">
          {label}: {modal.userName}
        </h3>

        {isBan && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-vara-sm mb-vara-sm text-vara-sm">
            <AlertTriangle className="w-4 h-4 inline mr-1" />
            Banning will permanently restrict this user.
          </div>
        )}

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
              <option value="30d">30 days</option>
            </select>
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
            {loading ? "Processing..." : `Confirm ${label}`}
          </button>
        </div>
      </div>
    </div>
  );
}
