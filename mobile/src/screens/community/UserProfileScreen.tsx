/**
 * UserProfileScreen
 * Read-only view of another user's profile, with connect/message actions.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileHeader } from '../../components';
import { Colors as colors, Spacing as spacing, Layout } from '../../constants';
import { db } from '../../config/firebase';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useConnections } from '../../hooks';
import { useStartConversation } from '../../hooks';

interface UserProfileData {
  displayName: string;
  bio: string;
  location: string;
  avatarUrl: string;
  bannerUrl: string;
  interests: string[];
  goals: string[];
}

const UserProfileScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const userId = route.params?.userId as string;

  const { isConnected, hasPendingRequest, sendRequest } = useConnections();
  const { startConversation } = useStartConversation();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [mutualGroups, setMutualGroups] = useState<string[]>([]);
  const [connectionsCount, setConnectionsCount] = useState(0);

  const connected = isConnected(userId);
  const pending = hasPendingRequest(userId);
  const isOwnProfile = user?.uid === userId;

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    if (!userId || !db) return;

    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', userId));

      if (!userDoc.exists()) {
        Alert.alert('Not Found', 'This user profile could not be found.');
        navigation.goBack();
        return;
      }

      const data = userDoc.data();
      setProfile({
        displayName: data.displayName || 'Unknown',
        bio: data.bio || '',
        location: data.location || '',
        avatarUrl: data.avatarUrl || '',
        bannerUrl: data.bannerUrl || '',
        interests: data.interests || [],
        goals: data.goals || [],
      });

      // Load mutual groups and connections count in parallel
      const [mutualGroupNames, connCount] = await Promise.all([
        loadMutualGroups(userId),
        loadConnectionsCount(userId),
      ]);
      setMutualGroups(mutualGroupNames);
      setConnectionsCount(connCount);
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadMutualGroups = async (otherUserId: string): Promise<string[]> => {
    if (!user) return [];
    try {
      const myGroupsQuery = query(collection(db, 'groups'), where('members', 'array-contains', user.uid));
      const myGroupsSnap = await getDocs(myGroupsQuery);
      const mutual: string[] = [];
      myGroupsSnap.docs.forEach(d => {
        const members = d.data().members || [];
        if (members.includes(otherUserId)) {
          mutual.push(d.data().name);
        }
      });
      return mutual;
    } catch {
      return [];
    }
  };

  const loadConnectionsCount = async (otherUserId: string): Promise<number> => {
    try {
      const q1 = query(collection(db, 'connections'), where('participants', 'array-contains', otherUserId), where('status', '==', 'accepted'));
      const snap = await getDocs(q1);
      return snap.size;
    } catch {
      return 0;
    }
  };

  const handleConnect = async () => {
    if (!profile) return;
    setSendingRequest(true);
    try {
      await sendRequest(userId);
      Alert.alert('Sent', `Connection request sent to ${profile.displayName}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to send connection request');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleMessage = async () => {
    try {
      const conversationId = await startConversation(userId);
      navigation.navigate('Chat', { conversationId, otherUserId: userId });
    } catch (error) {
      Alert.alert('Error', 'Failed to start conversation');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!profile) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={20} color={colors.evergreenTeal} />
      </TouchableOpacity>

      <ScrollView style={styles.scrollContainer}>
        <ProfileHeader
          avatarUrl={profile.avatarUrl}
          bannerUrl={profile.bannerUrl}
          displayName={profile.displayName}
          location={profile.location}
          editMode={false}
          uploading={false}
          onUploadAvatar={() => {}}
          onUploadBanner={() => {}}
          onDisplayNameChange={() => {}}
          onLocationChange={() => {}}
        />

        {/* Action Buttons */}
        {!isOwnProfile && (
          <View style={styles.actionButtons}>
            {connected ? (
              <TouchableOpacity style={styles.connectedButton} disabled>
                <Ionicons name="checkmark-circle" size={16} color={colors.evergreenTeal} />
                <Text style={styles.connectedButtonText}>Connected</Text>
              </TouchableOpacity>
            ) : pending ? (
              <TouchableOpacity style={styles.pendingButton} disabled>
                <Ionicons name="time-outline" size={16} color={colors.mutedSageGray} />
                <Text style={styles.pendingButtonText}>Requested</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.connectButton}
                onPress={handleConnect}
                disabled={sendingRequest}
              >
                {sendingRequest ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="person-add-outline" size={16} color="#fff" />
                    <Text style={styles.connectButtonText}>Connect</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {connected && (
              <TouchableOpacity style={styles.messageButton} onPress={handleMessage}>
                <Icon name="message-outline" size={16} color={colors.evergreenTeal} />
                <Text style={styles.messageButtonText}>Message</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Community Stats */}
        {(connectionsCount > 0 || mutualGroups.length > 0) && (
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Community</Text>
              <View style={styles.statsRow}>
                {connectionsCount > 0 && (
                  <View style={styles.statItem}>
                    <View style={styles.activeIconContainer}>
                      <Icon name="account-multiple" size={16} color={colors.evergreenTeal} />
                    </View>
                    <Text style={styles.statText}>
                      {connectionsCount} connection{connectionsCount !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
                {mutualGroups.length > 0 && (
                  <View style={styles.statItem}>
                    <View style={styles.activeIconContainer}>
                      <Icon name="account-group" size={16} color={colors.evergreenTeal} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.statText}>
                        {mutualGroups.length} mutual group{mutualGroups.length !== 1 ? 's' : ''}
                      </Text>
                      <Text style={styles.statDetail} numberOfLines={1}>
                        {mutualGroups.join(', ')}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Bio */}
        {profile.bio ? (
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>About</Text>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          </View>
        ) : null}

        {/* Interests */}
        {profile.interests.length > 0 && (
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Interests</Text>
              <View style={styles.tagsContainer}>
                {profile.interests.map((interest, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{interest}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* Goals */}
        {profile.goals.length > 0 && (
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <Text style={styles.cardHeader}>Wellness Goals</Text>
              <View style={styles.tagsContainer}>
                {profile.goals.map((goal, index) => (
                  <View key={index} style={[styles.tag, styles.goalTag]}>
                    <Text style={[styles.tagText, styles.goalTagText]}>{goal}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mistWhite,
  },
  scrollContainer: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 16,
    zIndex: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.mutedSageGray,
  },
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    marginTop: spacing.sm,
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.evergreenTeal,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: Layout.borderRadius.lg,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600' as const,
  },
  connectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.evergreenTeal,
  },
  connectedButtonText: {
    color: colors.evergreenTeal,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  pendingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  pendingButtonText: {
    color: colors.mutedSageGray,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.evergreenTeal,
  },
  messageButtonText: {
    color: colors.evergreenTeal,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  // Cards
  cardContainer: {
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    ...Layout.shadow.sm,
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.softCharcoal,
    marginBottom: 10,
  },
  // Community Stats
  statsRow: {
    gap: 10,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  activeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.dewSageLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.softCharcoal,
  },
  statDetail: {
    fontSize: 12,
    color: colors.mutedSageGray,
  },
  // Bio
  bioText: {
    fontSize: 14,
    color: colors.softCharcoal,
    lineHeight: 14 * 1.5,
  },
  // Tags
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dewSageLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.evergreenTeal,
  },
  goalTag: {
    backgroundColor: colors.tealLight,
    borderWidth: 1,
    borderColor: colors.tealMedium,
  },
  goalTagText: {
    color: colors.evergreenTeal,
  },
});

export default UserProfileScreen;
