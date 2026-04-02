import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import {
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  doc,
  arrayUnion,
} from 'firebase/firestore';
import SidebarLayout from '../../components/layout/SidebarLayout';
import { UsersRound, Globe, Lock, Plus, Users } from 'lucide-react';
import CreateGroupModal from './CreateGroupModal';

const normalizeGroup = (raw, id) => {
  const members = Array.isArray(raw?.members) ? raw.members : [];
  const isPublic =
    typeof raw?.isPublic === 'boolean'
      ? raw.isPublic
      : (raw?.type || raw?.visibility || '').toLowerCase() === 'public';
  return {
    id,
    ...raw,
    isPublic,
    members,
    memberCount:
      typeof raw?.memberCount === 'number' ? raw.memberCount : members.length,
  };
};

const GroupCard = ({ group, showJoin, onJoin, joining }) => {
  return (
    <div className="bg-white rounded-vara-lg border border-divider p-vara-base shadow-vara-sm hover:shadow-vara-md transition flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <Link
            to={`/group/${group.id}`}
            className="text-vara-base font-semibold text-soft-charcoal hover:text-evergreen-teal transition-colors line-clamp-1"
          >
            {group.name}
          </Link>
          {group.description && (
            <p className="text-vara-sm text-muted-sage-gray mt-1 line-clamp-2">
              {group.description}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-vara-xs font-medium ${
            group.isPublic
              ? 'bg-teal-light text-evergreen-teal'
              : 'bg-dew-sage-light text-muted-sage-gray'
          }`}
        >
          {group.isPublic ? (
            <Globe className="w-3 h-3" />
          ) : (
            <Lock className="w-3 h-3" />
          )}
          {group.isPublic ? 'Public' : 'Private'}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-vara-sm text-muted-sage-gray">
          <Users className="w-4 h-4" />
          {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
        </span>

        {showJoin ? (
          <button
            onClick={() => onJoin(group)}
            disabled={joining === group.id}
            className="px-vara-base py-1.5 bg-evergreen-teal text-white text-vara-sm font-medium rounded-vara-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {joining === group.id ? 'Joining…' : 'Join'}
          </button>
        ) : (
          <Link
            to={`/group/${group.id}`}
            className="px-vara-base py-1.5 border border-divider text-vara-sm font-medium text-soft-charcoal rounded-vara-md hover:bg-dew-sage-light transition-colors"
          >
            View
          </Link>
        )}
      </div>
    </div>
  );
};

const GroupsPage = () => {
  const { user, isAuthReady } = useAuth();

  const [myGroups, setMyGroups] = useState([]);
  const [publicGroups, setPublicGroups] = useState([]);
  const [loadingMine, setLoadingMine] = useState(true);
  const [loadingPublic, setLoadingPublic] = useState(true);
  const [joining, setJoining] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // My groups — array-contains query
  useEffect(() => {
    if (!isAuthReady || !user) return;

    const q = query(
      collection(db, 'groups'),
      where('members', 'array-contains', user.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      setMyGroups(snap.docs.map((d) => normalizeGroup(d.data(), d.id)));
      setLoadingMine(false);
    });

    return () => unsub();
  }, [user, isAuthReady]);

  // All public groups — filter out ones user is already in on client
  useEffect(() => {
    if (!isAuthReady || !user) return;

    // Query public groups via both possible field names
    const q = query(
      collection(db, 'groups'),
      where('isPublic', '==', true)
    );

    const unsub = onSnapshot(q, (snap) => {
      const groups = snap.docs
        .map((d) => normalizeGroup(d.data(), d.id))
        .filter((g) => !g.members.includes(user.uid));
      setPublicGroups(groups);
      setLoadingPublic(false);
    });

    return () => unsub();
  }, [user, isAuthReady]);

  const handleJoin = async (group) => {
    if (!user?.uid) return;
    setJoining(group.id);
    try {
      await updateDoc(doc(db, 'groups', group.id), {
        members: arrayUnion(user.uid),
        memberCount: (group.memberCount || 0) + 1,
      });
      // The snapshot listeners will update both lists automatically
    } catch (err) {
      console.error('Error joining group:', err);
    } finally {
      setJoining(null);
    }
  };

  const handleGroupCreated = () => {
    setShowCreateModal(false);
    // myGroups listener will pick up the new group automatically
  };

  if (!isAuthReady) {
    return (
      <SidebarLayout>
        <div className="max-w-2xl mx-auto p-vara-lg">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-dew-sage-light rounded w-1/3" />
            <div className="h-4 bg-dew-sage-light rounded w-2/3" />
            <div className="h-32 bg-dew-sage-light rounded" />
          </div>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="max-w-2xl mx-auto p-vara-lg space-y-vara-lg">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-vara-md">
            <div className="w-10 h-10 rounded-vara-md bg-teal-light flex items-center justify-center">
              <UsersRound className="w-5 h-5 text-evergreen-teal" />
            </div>
            <h1 className="text-vara-2xl font-semibold text-soft-charcoal">Groups</h1>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-vara-sm px-vara-base py-2 bg-evergreen-teal text-white text-vara-sm font-medium rounded-vara-md hover:opacity-90 transition-colors shadow-vara-sm"
          >
            <Plus className="w-4 h-4" />
            Create Group
          </button>
        </div>

        {/* My Groups */}
        <section>
          <h2 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-base">
            My Groups
          </h2>

          {loadingMine ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-vara-base animate-pulse">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 bg-dew-sage-light rounded-vara-lg" />
              ))}
            </div>
          ) : myGroups.length === 0 ? (
            <div className="text-center py-10 bg-mist-white rounded-vara-lg border border-divider">
              <UsersRound className="w-10 h-10 text-muted-sage-gray mx-auto mb-3" />
              <p className="text-soft-charcoal font-medium">You haven't joined any groups yet</p>
              <p className="text-vara-sm text-muted-sage-gray mt-1">
                Discover groups below or create your own.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-vara-base">
              {myGroups.map((group) => (
                <GroupCard key={group.id} group={group} showJoin={false} />
              ))}
            </div>
          )}
        </section>

        {/* Discover Groups */}
        <section>
          <h2 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-base">
            Discover Groups
          </h2>

          {loadingPublic ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-vara-base animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-dew-sage-light rounded-vara-lg" />
              ))}
            </div>
          ) : publicGroups.length === 0 ? (
            <div className="text-center py-10 bg-mist-white rounded-vara-lg border border-divider">
              <Globe className="w-10 h-10 text-muted-sage-gray mx-auto mb-3" />
              <p className="text-soft-charcoal font-medium">No public groups to discover</p>
              <p className="text-vara-sm text-muted-sage-gray mt-1">
                You're already a member of all public groups, or none exist yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-vara-base">
              {publicGroups.map((group) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  showJoin
                  onJoin={handleJoin}
                  joining={joining}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <CreateGroupModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleGroupCreated}
        />
      )}
    </SidebarLayout>
  );
};

export default GroupsPage;
