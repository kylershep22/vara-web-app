import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase'; // ✅ corrected path
import ChatWindow from '../components/chat/ChatWindow'; // ✅ corrected path
import { Loader } from 'lucide-react';

export default function GroupDetailPage() {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const docRef = doc(db, 'groups', groupId);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
          setGroup({ id: snapshot.id, ...snapshot.data() });
        }
      } catch (error) {
        console.error('Error fetching group:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchGroup();
  }, [groupId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-gray-800">Group not found</h2>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-emerald-800 flex items-center gap-2">
          <span>{group.emoji || '👥'}</span>
          {group.name}
        </h1>
        <p className="text-gray-600 mt-2">{group.description}</p>
        <p className="text-sm text-gray-400 mt-1">Category: {group.category} • Type: {group.groupType}</p>
      </div>

      <ChatWindow groupId={group.id} />
    </div>
  );
}

