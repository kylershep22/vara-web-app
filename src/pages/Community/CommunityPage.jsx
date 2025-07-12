import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import SidebarLayout from '../../components/layout/SidebarLayout';
import CreateGroupModal from './CreateGroupModal';
import { db, auth } from '../../firebase';
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

const CommunityPage = () => {
  const [showModal, setShowModal] = useState(false);
  const [groups, setGroups] = useState([]);
  const user = auth.currentUser;

  // 🔄 Real-time listener for Firestore group documents
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'groups'), (snapshot) => {
      const fetchedGroups = snapshot.docs.map((doc) => ({
        groupsID: doc.id,
        ...doc.data(),
      }));
      setGroups(fetchedGroups);
    });

    return () => unsubscribe(); // cleanup listener
  }, []);

  // ✅ Create group and add creator as first member
  const handleCreateGroup = async (groupData) => {
    try {
      if (!user) return;

      const newGroup = {
        ...groupData,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        members: [user.uid],
      };

      await addDoc(collection(db, 'groups'), newGroup);
      setShowModal(false);
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  // 🔁 Toggle group membership
  const handleJoinLeave = async (groupId, isMember) => {
    try {
      if (!user) return;

      const groupRef = doc(db, 'groups', groupId);

      if (isMember) {
        await updateDoc(groupRef, {
          members: arrayRemove(user.uid),
        });
      } else {
        await updateDoc(groupRef, {
          members: arrayUnion(user.uid),
        });
      }
    } catch (error) {
      console.error('Failed to update group membership:', error);
    }
  };

  return (
    <SidebarLayout>
      <div className="p-6">
        <h1 className="text-3xl font-semibold mb-2">Vara Community</h1>
        <p className="text-gray-600 mb-6">
          Join a group to stay motivated and connected on your wellness journey.
        </p>

        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search groups..."
            className="border px-4 py-2 rounded-md w-full md:w-2/3"
          />
          <button
            onClick={() => setShowModal(true)}
            className="bg-emerald-700 text-white px-4 py-2 rounded-md hover:bg-emerald-800"
          >
            + Create Group
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => {
            const isMember = group.members?.includes(user?.uid);
            return (
              <div
                key={group.groupsID}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition"
              >
                {/* ✅ Group name links to GroupPage */}
                <Link
                  to={`/group/${group.groupsID}`}
                  className="text-xl font-semibold mb-2 block hover:underline text-emerald-800"
                >
                  {group.emoji || '🌱'} {group.name}
                </Link>
                <p className="text-sm text-gray-500 mb-2">
                  {group.members?.length || 0} member
                  {group.members?.length === 1 ? '' : 's'}
                </p>
                <p className="text-sm text-gray-600 mb-4 truncate">{group.description}</p>
                <button
                  onClick={() => handleJoinLeave(group.groupsID, isMember)}
                  className={`px-4 py-1 rounded-md text-sm font-semibold ${
                    isMember
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {isMember ? 'Leave Group' : 'Join Group'}
                </button>
              </div>
            );
          })}
        </div>

        <CreateGroupModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onCreate={handleCreateGroup}
        />
      </div>
    </SidebarLayout>
  );
};

export default CommunityPage;




