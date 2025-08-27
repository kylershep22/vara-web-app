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
  orderBy,
} from 'firebase/firestore';
import SidebarLayout from '../components/layout/SidebarLayout';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubAuth;
    let unsubPrimary;
    let unsubLegacy;

    unsubAuth = onAuthStateChanged(auth, (user) => {
      // Tear down old listeners when the user changes/logs out
      if (unsubPrimary) { unsubPrimary(); unsubPrimary = undefined; }
      if (unsubLegacy) { unsubLegacy(); unsubLegacy = undefined; }

      if (!user) {
        setNotifications([]);
        return;
      }

      const base = collection(db, 'notifications');

      // Primary (rules-aligned) query: recipientId == uid
      const qPrimary = query(
        base,
        where('recipientId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      // Legacy support: userId == uid
      const qLegacy = query(
        base,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );

      const aggregateAndSet = (primaryDocs = [], legacyDocs = []) => {
        const byId = new Map();
        [...primaryDocs, ...legacyDocs].forEach((d) => byId.set(d.id, d));
        const merged = Array.from(byId.values()).sort((a, b) => {
          const aTs = a.createdAt?.seconds ?? 0;
          const bTs = b.createdAt?.seconds ?? 0;
          return bTs - aTs;
        });
        setNotifications(merged);
      };

      let primaryBuffer = [];
      let legacyBuffer = [];

      unsubPrimary = onSnapshot(
        qPrimary,
        (snap) => {
          primaryBuffer = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          aggregateAndSet(primaryBuffer, legacyBuffer);
        },
        (err) => {
          console.warn('[notifications page] primary listener error:', err);
        }
      );

      unsubLegacy = onSnapshot(
        qLegacy,
        (snap) => {
          legacyBuffer = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          aggregateAndSet(primaryBuffer, legacyBuffer);
        },
        (err) => {
          console.warn('[notifications page] legacy listener error:', err);
        }
      );
    });

    return () => {
      if (unsubAuth) unsubAuth();
    };
  }, []);

  const markAsRead = async (notif) => {
    try {
      await updateDoc(doc(db, 'notifications', notif.id), { read: true });
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
                {notif.createdAt?.toDate
                  ? notif.createdAt.toDate().toLocaleString()
                  : ''}
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


