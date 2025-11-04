// src/components/notifications/NotificationDropdown.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  orderBy,
  limit,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const NotificationDropdown = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Load latest notifications with progressive fallback (primary -> legacy)
  useEffect(() => {
    let unsubAuth;
    let unsubPrimary;
    let unsubLegacy;
    let triedLegacy = false;     // ensure we attach legacy at most once
    let sawPrimaryOnce = false;  // know when we evaluated primary at least once

    unsubAuth = onAuthStateChanged(auth, (user) => {
      // Cleanup previous listeners whenever auth changes
      if (unsubPrimary) { unsubPrimary(); unsubPrimary = undefined; }
      if (unsubLegacy) { unsubLegacy(); unsubLegacy = undefined; }
      triedLegacy = false;
      sawPrimaryOnce = false;

      if (!user) {
        setNotifications([]);
        return;
      }

      const base = collection(db, "notifications");

      // Primary (rules-aligned): recipientId == uid
      const qPrimary = query(
        base,
        where("recipientId", "==", user.uid),
        orderBy("createdAt", "desc"),
        limit(5)
      );

      unsubPrimary = onSnapshot(
        qPrimary,
        (snap) => {
          sawPrimaryOnce = true;

          const primaryDocs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          if (primaryDocs.length > 0) {
            // We have primary data — no need to try legacy
            setNotifications(primaryDocs);
            // If a legacy listener was attached previously, turn it off
            if (unsubLegacy) { unsubLegacy(); unsubLegacy = undefined; }
            return;
          }

          // Primary returned empty: try legacy *once* if not already done
          if (!triedLegacy && !unsubLegacy) {
            triedLegacy = true;
            const qLegacy = query(
              base,
              where("userId", "==", user.uid),
              orderBy("createdAt", "desc"),
              limit(5)
            );
            unsubLegacy = onSnapshot(
              qLegacy,
              (legacySnap) => {
                const legacyDocs = legacySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
                setNotifications(legacyDocs);
              },
              (err) => {
                // Silences expected permission/index noise from legacy path
                if (process.env.NODE_ENV !== "production") {
                  console.debug("[notifications dropdown] legacy listener suppressed error:", err?.code || err);
                }
              }
            );
          } else {
            // No primary data and we won't (or can't) use legacy
            setNotifications([]);
          }
        },
        (err) => {
          // Silences expected permission/index noise from primary path
          if (process.env.NODE_ENV !== "production") {
            console.debug("[notifications dropdown] primary listener suppressed error:", err?.code || err);
          }
          // If primary listener itself fails at startup, we can still attempt legacy once.
          if (!sawPrimaryOnce && !triedLegacy && !unsubLegacy && user) {
            triedLegacy = true;
            const qLegacy = query(
              base,
              where("userId", "==", user.uid),
              orderBy("createdAt", "desc"),
              limit(5)
            );
            unsubLegacy = onSnapshot(
              qLegacy,
              (legacySnap) => {
                const legacyDocs = legacySnap.docs.map((d) => ({ id: d.id, ...d.data() }));
                setNotifications(legacyDocs);
              },
              (legacyErr) => {
                if (process.env.NODE_ENV !== "production") {
                  console.debug("[notifications dropdown] legacy listener suppressed error:", legacyErr?.code || legacyErr);
                }
                setNotifications([]);
              }
            );
          } else {
            setNotifications([]);
          }
        }
      );
    });

    return () => {
      if (unsubAuth) unsubAuth();
      if (unsubPrimary) unsubPrimary();
      if (unsubLegacy) unsubLegacy();
    };
  }, []);

  const handleNotificationClick = async (notif) => {
    try {
      await updateDoc(doc(db, "notifications", notif.id), { read: true });
      onClose();
      if (notif.link) navigate(notif.link);
    } catch (error) {
      // Keep quiet here as well; failed updates (permissions) shouldn’t break UX
      if (process.env.NODE_ENV !== "production") {
        console.debug("[notifications dropdown] markAsRead suppressed error:", error?.code || error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-14 left-4 w-80 bg-white border border-gray-200 shadow-lg rounded-lg z-50"
    >
      <div className="p-3 border-b font-semibold text-gray-700">Notifications</div>
      <ul className="max-h-64 overflow-y-auto divide-y">
        {notifications.map((notif) => (
          <li
            key={notif.id}
            onClick={() => handleNotificationClick(notif)}
            className={`p-3 text-sm cursor-pointer hover:bg-gray-50 ${
              !notif.read ? "bg-emerald-50 font-medium" : "bg-white"
            }`}
          >
            {notif.text ||
              (notif.type === "group_invite"
                ? "You were invited to join a group."
                : notif.type === "daily_plan"
                ? "Your new daily wellness plan is ready."
                : "You have a new notification.")}
          </li>
        ))}
        {notifications.length === 0 && (
          <li className="p-3 text-sm text-gray-500">You're all caught up!</li>
        )}
      </ul>
      <div className="p-2 border-t text-right">
        <Link
          to="/notifications"
          className="text-sm text-emerald-700 hover:underline"
          onClick={onClose}
        >
          View All
        </Link>
      </div>
    </div>
  );
};

export default NotificationDropdown;




