import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { db, auth } from '../../firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  orderBy,
  limit,
} from 'firebase/firestore';

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
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Load latest 5 notifications
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotifications(data);
    });

    return () => unsubscribe();
  }, []);

  const handleNotificationClick = async (notif) => {
    try {
      await updateDoc(doc(db, 'notifications', notif.id), {
        read: true,
      });
      onClose();
      if (notif.link) navigate(notif.link);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
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
              !notif.read ? 'bg-emerald-50 font-medium' : 'bg-white'
            }`}
          >
            {notif.text ||
              (notif.type === 'group_invite'
                ? 'You were invited to join a group.'
                : notif.type === 'daily_plan'
                ? 'Your new daily wellness plan is ready.'
                : 'You have a new notification.')}
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
