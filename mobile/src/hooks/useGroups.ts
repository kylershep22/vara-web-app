/**
 * useGroups Hook
 * Hook for managing groups data
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Group,
  fetchPublicGroups,
  fetchUserGroups,
  joinGroup,
  leaveGroup,
} from '../services/firebase';

export const useGroups = (filter: 'all' | 'my' | 'public' = 'all') => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setGroups([]);
      setLoading(false);
      return;
    }

    loadGroups();
  }, [user, filter]);

  const loadGroups = async () => {
    setLoading(true);
    setError(null);

    try {
      let data: Group[] = [];

      if (filter === 'my') {
        data = await fetchUserGroups(user!.uid);
      } else if (filter === 'public') {
        data = await fetchPublicGroups();
      } else {
        // 'all': fetch both user groups and public groups, deduplicate
        const [userGroups, publicGroups] = await Promise.all([
          fetchUserGroups(user!.uid),
          fetchPublicGroups(),
        ]);

        const groupMap = new Map<string, Group>();
        [...userGroups, ...publicGroups].forEach((group) => {
          groupMap.set(group.id, group);
        });

        data = Array.from(groupMap.values());
      }

      setGroups(data);
    } catch (err) {
      console.error('Error loading groups:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user) return;

    try {
      await joinGroup(groupId, user.uid);
      await loadGroups(); // Refresh groups
    } catch (err) {
      console.error('Error joining group:', err);
      throw err;
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!user) return;

    try {
      await leaveGroup(groupId, user.uid);
      await loadGroups(); // Refresh groups
    } catch (err) {
      console.error('Error leaving group:', err);
      throw err;
    }
  };

  const isUserMember = (group: Group) => {
    return user ? group.members.includes(user.uid) : false;
  };

  return {
    groups,
    loading,
    error,
    joinGroup: handleJoinGroup,
    leaveGroup: handleLeaveGroup,
    isUserMember,
    refresh: loadGroups,
  };
};
