import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "../components/layout/SidebarLayout";
import { ArrowLeft, VolumeX, UserX } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getMutedUsers, unmuteUser } from "../services/db/mutedUsers.service";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function MutedAccounts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mutedUsers, setMutedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    loadMutedUsers();
  }, [user?.uid]);

  async function loadMutedUsers() {
    setLoading(true);
    try {
      const muted = await getMutedUsers(user.uid);
      const enriched = await Promise.all(
        muted.map(async (m) => {
          try {
            const userDoc = await getDoc(doc(db, "users", m.mutedUserId));
            return {
              ...m,
              displayName: userDoc.exists() ? userDoc.data().displayName || "Unknown User" : "Unknown User",
            };
          } catch {
            return { ...m, displayName: "Unknown User" };
          }
        })
      );
      setMutedUsers(enriched);
    } catch (err) {
      console.error("Failed to load muted users:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnmute(muteDoc) {
    try {
      await unmuteUser(muteDoc.id);
      setMutedUsers((prev) => prev.filter((m) => m.id !== muteDoc.id));
    } catch (err) {
      console.error("Failed to unmute user:", err);
    }
  }

  return (
    <SidebarLayout>
      <div className="max-w-2xl mx-auto px-vara-base py-vara-lg">
        <button
          onClick={() => navigate("/settings")}
          className="flex items-center gap-2 text-sm text-muted-sage-gray hover:text-soft-charcoal mb-6"
        >
          <ArrowLeft size={16} /> Back to Settings
        </button>

        <h1 className="text-vara-2xl font-semibold text-soft-charcoal mb-vara-lg flex items-center gap-3">
          <VolumeX size={24} className="text-evergreen-teal" />
          Muted Accounts
        </h1>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-evergreen-teal border-t-transparent rounded-full animate-spin" />
          </div>
        ) : mutedUsers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-vara-lg border border-divider">
            <UserX size={48} className="mx-auto mb-3 text-muted-sage-gray/40" />
            <p className="text-soft-charcoal font-medium mb-1">No muted accounts</p>
            <p className="text-sm text-muted-sage-gray">
              Muted users won't appear in your community feed.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {mutedUsers.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between bg-white rounded-vara-lg border border-divider p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-dew-sage-light flex items-center justify-center text-evergreen-teal font-medium">
                    {m.displayName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-soft-charcoal">{m.displayName}</span>
                </div>
                <button
                  onClick={() => handleUnmute(m)}
                  className="text-sm px-4 py-2 rounded-lg border border-divider text-soft-charcoal hover:bg-dew-sage-light transition"
                >
                  Unmute
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
