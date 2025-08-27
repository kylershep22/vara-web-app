// src/components/notifications/NotificationBell.jsx
import React, { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { db, auth } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import NotificationDropdown from "./NotificationDropdown";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    let unsubAuth;
    let unsubBell;

    unsubAuth = onAuthStateChanged(auth, (user) => {
      // Cleanup previous listener when auth changes
      if (unsubBell) { unsubBell(); unsubBell = undefined; }

      if (!user) {
        setUnreadCount(0);
        return;
      }

      // ✅ Rules-aligned: only recipientId == uid (no legacy listener here)
      const q = query(
        collection(db, "notifications"),
        where("recipientId", "==", user.uid),
        where("read", "==", false),
        orderBy("createdAt", "desc"),
        limit(25)
      );

      unsubBell = onSnapshot(
        q,
        (snap) => {
          setUnreadCount(snap.size);
        },
        (err) => {
          // Suppress noisy permission/index logs in prod
          if (process.env.NODE_ENV !== "production") {
            console.debug("[NotificationBell] listener suppressed error:", err?.code || err);
          }
          setUnreadCount(0);
        }
      );
    });

    return () => {
      if (unsubAuth) unsubAuth();
      if (unsubBell) unsubBell();
    };
  }, []);

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        onClick={() => setIsOpen((v) => !v)}
        className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl hover:bg-[#D5E3D1] transition-colors"
      >
        <Bell size={20} className="text-[#1B5E57]" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#1B5E57] text-white text-[10px] leading-none flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <NotificationDropdown isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}



