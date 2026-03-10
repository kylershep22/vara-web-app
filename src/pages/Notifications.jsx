// src/pages/Notifications.jsx
import React, { useEffect, useState } from 'react';
import { auth } from '../firebase';
import SidebarLayout from '../components/layout/SidebarLayout';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { subscribeToAllNotifications, markNotificationAsRead } from '../services/db/notifications.service';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

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

      // Subscribe to all notifications using service
      unsubNotifications = subscribeToAllNotifications(user.uid, (notifs) => {
        setNotifications(notifs);
      }, 100); // Limit to 100 notifications
    });

    return () => {
      if (unsubAuth) unsubAuth();
      if (unsubNotifications) unsubNotifications();
    };
  }, []);

  const handleNotificationClick = async (notif) => {
    try {
      await markNotificationAsRead(notif.id);
      if (notif.link) navigate(notif.link);
    } catch (error) {
      console.error('Failed to update notification:', error);
    }
  };

  return (
    <SidebarLayout>
      <div className="p-6 max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Notifications</h1>
        <ul className="space-y-4">
          {notifications.map((notif) => (
            <li
              key={notif.id}
              className={`p-4 border rounded-md shadow-sm cursor-pointer hover:bg-dew-sage-light ${!notif.read ? 'bg-teal-light' : 'bg-white'
                }`}
              onClick={() => handleNotificationClick(notif)}
            >
              <p className="text-sm">
                {notif.body || notif.text ||
                  (notif.type === 'group_invite'
                    ? 'You were invited to join a group.'
                    : notif.type === 'daily_plan'
                      ? 'Your new daily wellness plan is ready.'
                      : 'You have a new notification.')}
              </p>
              <p className="text-xs text-muted-sage-gray mt-1">
                {notif.createdAt?.toDate
                  ? notif.createdAt.toDate().toLocaleString()
                  : ''}
              </p>
            </li>
          ))}
          {notifications.length === 0 && (
            <p className="text-muted-sage-gray text-sm">You're all caught up!</p>
          )}
        </ul>
      </div>
    </SidebarLayout>
  );
};

export default Notifications;


