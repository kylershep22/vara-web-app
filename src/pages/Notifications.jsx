// src/pages/Notifications.jsx
import React, { useEffect, useState } from 'react';
import { db, auth } from '../firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from 'firebase/firestore';
import SidebarLayout from '../components/layout/SidebarLayout';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setNotifications(
        notifs.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)
      );
    });

    return () => unsubscribe();
  }, []);

  const markAsRead = async (notif) => {
    try {
      await updateDoc(doc(db, 'notifications', notif.id), {
        read: true,
      });
      if (notif.link) {
        navigate(notif.link);
      }
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
              className={`p-4 border rounded-md shadow-sm cursor-pointer hover:bg-gray-50 ${
                !notif.read ? 'bg-emerald-50' : 'bg-white'
              }`}
              onClick={() => markAsRead(notif)}
            >
              <p className="text-sm">
                {notif.text ||
                  (notif.type === 'group_invite'
                    ? 'You were invited to join a group.'
                    : notif.type === 'daily_plan'
                    ? 'Your new daily wellness plan is ready.'
                    : 'You have a new notification.')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {notif.createdAt?.toDate().toLocaleString()}
              </p>
            </li>
          ))}
          {notifications.length === 0 && (
            <p className="text-gray-500 text-sm">You're all caught up!</p>
          )}
        </ul>
      </div>
    </SidebarLayout>
  );
};

export default Notifications;
