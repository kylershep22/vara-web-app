/**
 * Connections Service
 * Handles mutual connections, suggested connections, and connection-related calculations
 */

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit,
  Timestamp,
  Firestore,
} from 'firebase/firestore';
import { db as firebaseDb } from '../../config/firebase';

// Type assertion for db - Firebase config handles null case at runtime
const db = firebaseDb as Firestore;

// Type for user profile with additional connection metadata
// Defined independently to avoid type conflicts with UserProfile
export interface EnhancedUserProfile {
  id: string;
  uid: string;
  displayName: string;
  email?: string;
  bio?: string;
  avatar?: string;
  avatarUrl?: string;
  location?: string;
  privacy?: 'public' | 'connections' | 'private';
  interests?: string[];
  interestsPublic?: boolean;
  goals?: string[];
  goalsPublic?: boolean;
  // Additional connection metadata
  mutualConnections?: string[];
  mutualConnectionCount?: number;
  lastActiveAt?: Timestamp | Date;
  sharedGroups?: string[];
  sharedGroupNames?: string[];
  sharedInterests?: string[];
  suggestionReason?: 'group' | 'interests' | 'friends_of_friends';
}

/**
 * Get all accepted connection IDs for a user
 */
export async function getConnectionIds(userId: string): Promise<string[]> {
  const connectionsRef = collection(db, 'connections');

  // Query where user is 'a'
  const queryA = query(
    connectionsRef,
    where('a', '==', userId),
    where('status', '==', 'accepted')
  );

  // Query where user is 'b'
  const queryB = query(
    connectionsRef,
    where('b', '==', userId),
    where('status', '==', 'accepted')
  );

  const [snapshotA, snapshotB] = await Promise.all([
    getDocs(queryA),
    getDocs(queryB),
  ]);

  const connectionIds: string[] = [];

  snapshotA.forEach((doc) => {
    const data = doc.data();
    connectionIds.push(data.b);
  });

  snapshotB.forEach((doc) => {
    const data = doc.data();
    connectionIds.push(data.a);
  });

  return [...new Set(connectionIds)]; // Remove duplicates
}

/**
 * Calculate mutual connections between current user and another user
 */
export async function getMutualConnections(
  currentUserId: string,
  otherUserId: string
): Promise<string[]> {
  const [currentUserConnections, otherUserConnections] = await Promise.all([
    getConnectionIds(currentUserId),
    getConnectionIds(otherUserId),
  ]);

  // Find intersection
  const mutualConnections = currentUserConnections.filter((id) =>
    otherUserConnections.includes(id)
  );

  return mutualConnections;
}

/**
 * Get mutual connection profiles (with display names)
 */
export async function getMutualConnectionProfiles(
  currentUserId: string,
  otherUserId: string,
  maxProfiles: number = 3
): Promise<EnhancedUserProfile[]> {
  const mutualIds = await getMutualConnections(currentUserId, otherUserId);

  if (mutualIds.length === 0) return [];

  // Fetch profiles for mutual connections (limit to avoid too many reads)
  const profilesToFetch = mutualIds.slice(0, maxProfiles);
  const profiles: EnhancedUserProfile[] = [];

  for (const id of profilesToFetch) {
    const userDoc = await getDoc(doc(db, 'users', id));
    if (userDoc.exists()) {
      profiles.push({
        id: userDoc.id,
        uid: userDoc.id,
        ...userDoc.data(),
      } as EnhancedUserProfile);
    }
  }

  return profiles;
}

/**
 * Get groups that a user belongs to
 */
export async function getUserGroups(userId: string): Promise<string[]> {
  const groupsRef = collection(db, 'groups');
  const q = query(groupsRef, where('members', 'array-contains', userId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => doc.id);
}

/**
 * Get user interests from their profile
 */
export async function getUserInterests(userId: string): Promise<string[]> {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) return [];

  const data = userDoc.data();
  return data.interests || [];
}

/**
 * Get suggested connections based on hierarchy:
 * 1. Same groups (highest priority)
 * 2. Similar interests
 * 3. Friends of friends (lowest priority)
 */
export async function getSuggestedConnections(
  currentUserId: string,
  maxSuggestions: number = 10
): Promise<EnhancedUserProfile[]> {
  const suggestions: Map<string, EnhancedUserProfile> = new Map();
  const existingConnections = await getConnectionIds(currentUserId);

  // Helper to add a suggestion if not already connected or self
  const addSuggestion = (
    profile: EnhancedUserProfile,
    reason: 'group' | 'interests' | 'friends_of_friends',
    sharedItem?: string[]
  ) => {
    if (
      profile.uid === currentUserId ||
      existingConnections.includes(profile.uid) ||
      suggestions.has(profile.uid)
    ) {
      return;
    }

    const enhanced = { ...profile };
    enhanced.suggestionReason = reason;

    if (reason === 'group') {
      enhanced.sharedGroups = sharedItem;
    } else if (reason === 'interests') {
      enhanced.sharedInterests = sharedItem;
    }

    suggestions.set(profile.uid, enhanced);
  };

  // 1. Get suggestions from same groups (highest priority)
  const userGroups = await getUserGroups(currentUserId);

  // Map of groupId -> groupName for resolving names later
  const groupNameMap: Map<string, string> = new Map();

  for (const groupId of userGroups) {
    if (suggestions.size >= maxSuggestions) break;

    const groupDoc = await getDoc(doc(db, 'groups', groupId));
    if (!groupDoc.exists()) continue;

    const groupData = groupDoc.data();
    const groupName = groupData.name || 'Unnamed Group';
    groupNameMap.set(groupId, groupName);
    const members = groupData.members || [];

    for (const memberId of members) {
      if (suggestions.size >= maxSuggestions) break;
      if (memberId === currentUserId || existingConnections.includes(memberId)) continue;

      const memberDoc = await getDoc(doc(db, 'users', memberId));
      if (memberDoc.exists()) {
        const existing = suggestions.get(memberId);
        const sharedGroups = existing?.sharedGroups || [];

        addSuggestion(
          {
            id: memberDoc.id,
            uid: memberDoc.id,
            ...memberDoc.data(),
          } as EnhancedUserProfile,
          'group',
          [...sharedGroups, groupId]
        );
      }
    }
  }

  // Resolve group names for group-based suggestions
  for (const [, suggestion] of suggestions) {
    if (suggestion.suggestionReason === 'group' && suggestion.sharedGroups) {
      suggestion.sharedGroupNames = suggestion.sharedGroups
        .map((gId) => groupNameMap.get(gId))
        .filter((name): name is string => !!name);
    }
  }

  // 2. Get suggestions from similar interests
  if (suggestions.size < maxSuggestions) {
    const userInterests = await getUserInterests(currentUserId);

    if (userInterests.length > 0) {
      // Find users with similar interests who have interests public
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('interestsPublic', '==', true),
        limit(50) // Limit initial query to avoid excessive reads
      );

      const snapshot = await getDocs(q);

      for (const userDoc of snapshot.docs) {
        if (suggestions.size >= maxSuggestions) break;

        const userData = userDoc.data();
        const theirInterests = userData.interests || [];

        // Find shared interests
        const sharedInterests = userInterests.filter((i) =>
          theirInterests.includes(i)
        );

        if (sharedInterests.length >= 2) {
          // Require at least 2 shared interests
          addSuggestion(
            {
              id: userDoc.id,
              uid: userDoc.id,
              ...userData,
            } as EnhancedUserProfile,
            'interests',
            sharedInterests
          );
        }
      }
    }
  }

  // 3. Get friends of friends (lowest priority)
  if (suggestions.size < maxSuggestions) {
    for (const friendId of existingConnections) {
      if (suggestions.size >= maxSuggestions) break;

      const friendsOfFriend = await getConnectionIds(friendId);

      for (const fofId of friendsOfFriend) {
        if (suggestions.size >= maxSuggestions) break;
        if (fofId === currentUserId || existingConnections.includes(fofId)) continue;

        const fofDoc = await getDoc(doc(db, 'users', fofId));
        if (fofDoc.exists()) {
          // Calculate mutual connections for this suggestion
          const mutuals = await getMutualConnections(currentUserId, fofId);

          addSuggestion(
            {
              id: fofDoc.id,
              uid: fofDoc.id,
              ...fofDoc.data(),
              mutualConnections: mutuals,
              mutualConnectionCount: mutuals.length,
            } as EnhancedUserProfile,
            'friends_of_friends'
          );
        }
      }
    }
  }

  // Convert map to array and sort by priority
  const priorityOrder = { group: 0, interests: 1, friends_of_friends: 2 };
  return Array.from(suggestions.values())
    .sort((a, b) => {
      const priorityA = priorityOrder[a.suggestionReason || 'friends_of_friends'];
      const priorityB = priorityOrder[b.suggestionReason || 'friends_of_friends'];
      return priorityA - priorityB;
    })
    .slice(0, maxSuggestions);
}

/**
 * Format last active timestamp to readable string
 */
export function formatLastActive(lastActiveAt?: Timestamp | Date): string {
  if (!lastActiveAt) return 'Unknown';

  const date = lastActiveAt instanceof Timestamp
    ? lastActiveAt.toDate()
    : lastActiveAt;

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 5) return 'Active now';
  if (diffMins < 60) return `Active ${diffMins}m ago`;
  if (diffHours < 24) return `Active ${diffHours}h ago`;
  if (diffDays === 1) return 'Active yesterday';
  if (diffDays < 7) return `Active ${diffDays}d ago`;
  if (diffDays < 30) return `Active ${Math.floor(diffDays / 7)}w ago`;
  return `Active ${Math.floor(diffDays / 30)}mo ago`;
}

/**
 * Get suggestion reason label
 */
export function getSuggestionReasonLabel(
  reason?: 'group' | 'interests' | 'friends_of_friends',
  sharedGroups?: string[],
  sharedInterests?: string[],
  mutualCount?: number,
  sharedGroupNames?: string[]
): string {
  switch (reason) {
    case 'group':
      if (sharedGroupNames && sharedGroupNames.length > 0) {
        return sharedGroupNames.length === 1
          ? `In ${sharedGroupNames[0]}`
          : `In ${sharedGroupNames[0]} + ${sharedGroupNames.length - 1} more`;
      }
      return sharedGroups && sharedGroups.length > 0
        ? `In ${sharedGroups.length} shared group${sharedGroups.length > 1 ? 's' : ''}`
        : 'In a shared group';
    case 'interests':
      return sharedInterests && sharedInterests.length > 0
        ? `${sharedInterests.length} shared interest${sharedInterests.length > 1 ? 's' : ''}`
        : 'Similar interests';
    case 'friends_of_friends':
      return mutualCount && mutualCount > 0
        ? `${mutualCount} mutual connection${mutualCount > 1 ? 's' : ''}`
        : 'Friend of a friend';
    default:
      return 'Suggested for you';
  }
}
