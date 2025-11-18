// src/components/notifications/NotificationDropdown.jsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { markNotificationAsRead } from "../../services/db/notifications.service";
import { subscribeToAllNotifications } from "../../services/db/notifications.service";

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

  // Load latest notifications
  useEffect(() => {
    let unsubAuth;
    let unsubNotifications;

    unsubAuth = onAuthStateChanged(auth, (user) => {
      // Cleanup previous listener when auth changes
      if (unsubNotifications) {
        unsubNotifications();
        unsubNotifications = undefined;
      }

      if (!user) {
        setNotifications([]);
        return;
      }

      // Subscribe to all notifications (limited to 5 most recent)
      unsubNotifications = subscribeToAllNotifications(user.uid, (notifs) => {
        // Show only 5 most recent
        setNotifications(notifs.slice(0, 5));
      }, 5);
    });

    return () => {
      if (unsubAuth) unsubAuth();
      if (unsubNotifications) unsubNotifications();
    };
  }, []);

  const handleNotificationClick = async (notif) => {
    try {
      await markNotificationAsRead(notif.id);
      onClose();
      if (notif.link) navigate(notif.link);
    } catch (error) {
      console.error("Error marking notification as read:", error);
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
            {notif.body || notif.text ||
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




