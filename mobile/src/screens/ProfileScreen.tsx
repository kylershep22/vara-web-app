// mobile/src/screens/ProfileScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Keyboard,
  InputAccessoryView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { ProfileHeader } from '../components';
import { db, storage } from '../config/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Colors as colors, Spacing as spacing, Typography, Layout } from '../constants';

const INPUT_ACCESSORY_VIEW_ID = 'profileInputAccessory';

interface UserProfile {
  displayName: string;
  email: string;
  bio: string;
  location: string;
  avatarUrl: string;
  bannerUrl: string;
  privacy: 'public' | 'connections' | 'private';
  searchable: boolean;
  interests: string[];
  goals: string[];
}

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
};

const ProfileScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [profile, setProfile] = useState<UserProfile>({
    displayName: '',
    email: '',
    bio: '',
    location: '',
    avatarUrl: '',
    bannerUrl: '',
    privacy: 'public',
    searchable: true,
    interests: [],
    goals: [],
  });
  const [activeData, setActiveData] = useState<{
    groups: { name: string; id: string }[];
    challenges: { name: string; id: string; dayPosition: string }[];
    connectionsCount: number;
  }>({ groups: [], challenges: [], connectionsCount: 0 });
  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    type: 'post' | 'check-in' | 'group-join';
    description: string;
    timestamp: Date;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newInterest, setNewInterest] = useState('');
  const [newGoal, setNewGoal] = useState('');

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user || !db) return;

    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfile({
          displayName: data.displayName || '',
          email: user.email || '',
          bio: data.bio || '',
          location: data.location || '',
          avatarUrl: data.avatarUrl || '',
          bannerUrl: data.bannerUrl || '',
          privacy: data.privacy || 'public',
          searchable: data.searchable !== false,
          interests: data.interests || [],
          goals: data.goals || [],
        });
      }

      // Load active data
      try {
        // Fetch user's groups
        const groupsQuery = query(collection(db, 'groups'), where('members', 'array-contains', user.uid));
        const groupsSnap = await getDocs(groupsQuery);
        const userGroups = groupsSnap.docs.map(d => ({ id: d.id, name: d.data().name }));

        // Fetch active challenges
        const challengesQuery = query(collection(db, 'challenges'), where('members', 'array-contains', user.uid));
        const challengesSnap = await getDocs(challengesQuery);
        const now = new Date();
        const activeChallenges = challengesSnap.docs
          .filter(d => {
            const endDate = d.data().endDate?.toDate?.() || new Date(d.data().endDate);
            return endDate > now;
          })
          .map(d => {
            const data = d.data();
            const startDate = data.startDate?.toDate?.() || new Date(data.startDate);
            const elapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const endDate = data.endDate?.toDate?.() || new Date(data.endDate);
            const total = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            return {
              id: d.id,
              name: data.name || data.title || 'Challenge',
              dayPosition: `Day ${Math.min(elapsed, total)} of ${total}`,
            };
          });

        // Fetch connections count
        const connQuery1 = query(collection(db, 'connections'), where('a', '==', user.uid), where('status', '==', 'accepted'));
        const connQuery2 = query(collection(db, 'connections'), where('b', '==', user.uid), where('status', '==', 'accepted'));
        const [connSnap1, connSnap2] = await Promise.all([getDocs(connQuery1), getDocs(connQuery2)]);
        const connectionsCount = connSnap1.size + connSnap2.size;

        setActiveData({ groups: userGroups, challenges: activeChallenges, connectionsCount });
      } catch (err) {
        console.error('Error loading active data:', err);
      }

      // Load recent activity
      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const activities: typeof recentActivity = [];

        // Recent posts
        const postsQuery = query(
          collection(db, 'posts'),
          where('userId', '==', user.uid),
        );
        const postsSnap = await getDocs(postsQuery);
        postsSnap.docs.forEach(d => {
          const data = d.data();
          const ts = data.createdAt?.toDate?.() || (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : null);
          if (ts && ts > sevenDaysAgo) {
            activities.push({
              id: d.id,
              type: 'post',
              description: data.content?.substring(0, 60) || 'Shared a post',
              timestamp: ts,
            });
          }
        });

        // Recent challenge check-ins
        try {
          const checkInsQuery = query(
            collection(db, 'challengeCheckIns'),
            where('userId', '==', user.uid),
          );
          const checkInsSnap = await getDocs(checkInsQuery);
          checkInsSnap.docs.forEach(d => {
            const data = d.data();
            const ts = data.createdAt?.toDate?.() || (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : null);
            if (ts && ts > sevenDaysAgo) {
              activities.push({
                id: d.id,
                type: 'check-in',
                description: data.note?.substring(0, 60) || 'Checked in to a challenge',
                timestamp: ts,
              });
            }
          });
        } catch (checkInErr) {
          console.error('Error loading check-in activity:', checkInErr);
        }

        // Recent group joins (groups where user is a member, created recently)
        try {
          const groupsQuery = query(
            collection(db, 'groups'),
            where('members', 'array-contains', user.uid),
          );
          const groupsSnap = await getDocs(groupsQuery);
          groupsSnap.docs.forEach(d => {
            const data = d.data();
            const ts = data.updatedAt?.toDate?.() || data.createdAt?.toDate?.() || null;
            if (ts && ts > sevenDaysAgo && data.memberCount > 1) {
              activities.push({
                id: `group-${d.id}`,
                type: 'group-join',
                description: `Joined ${data.name || 'a group'}`,
                timestamp: ts,
              });
            }
          });
        } catch (groupErr) {
          console.error('Error loading group activity:', groupErr);
        }

        // Sort by most recent and limit to 5
        activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setRecentActivity(activities.slice(0, 5));
      } catch (err) {
        console.error('Error loading recent activity:', err);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleSaveProfile = async () => {
    if (!user || !db) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: profile.displayName,
        bio: profile.bio,
        location: profile.location,
        privacy: profile.privacy,
        searchable: profile.searchable,
        interests: profile.interests,
        goals: profile.goals,
        updatedAt: serverTimestamp(),
      });

      Alert.alert('Success', 'Profile updated successfully!');
      setEditMode(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const handleUploadImage = async (type: 'avatar' | 'banner') => {
    if (!user || !db) return;

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.length > 0) {
      setUploading(true);
      try {
        const uri = result.assets[0].uri;
        const response = await fetch(uri);
        const blob = await response.blob();

        const filename = `${user.uid}/${type}_${Date.now()}.jpg`;
        const storageRef = ref(storage, `users/${filename}`);

        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        const userRef = doc(db, 'users', user.uid);
        const updateData = type === 'avatar'
          ? { avatarUrl: downloadURL }
          : { bannerUrl: downloadURL };

        await updateDoc(userRef, {
          ...updateData,
          updatedAt: serverTimestamp(),
        });

        setProfile(prev => ({
          ...prev,
          [type === 'avatar' ? 'avatarUrl' : 'bannerUrl']: downloadURL,
        }));

        Alert.alert('Success', `${type === 'avatar' ? 'Avatar' : 'Banner'} updated!`);
      } catch (error) {
        console.error('Error uploading image:', error);
        Alert.alert('Error', 'Failed to upload image');
      } finally {
        setUploading(false);
      }
    }
  };

  const addInterest = () => {
    if (newInterest.trim() && !profile.interests.includes(newInterest.trim())) {
      setProfile(prev => ({
        ...prev,
        interests: [...prev.interests, newInterest.trim()],
      }));
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setProfile(prev => ({
      ...prev,
      interests: prev.interests.filter(i => i !== interest),
    }));
  };

  const addGoal = () => {
    if (newGoal.trim() && !profile.goals.includes(newGoal.trim())) {
      setProfile(prev => ({
        ...prev,
        goals: [...prev.goals, newGoal.trim()],
      }));
      setNewGoal('');
    }
  };

  const removeGoal = (goal: string) => {
    setProfile(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g !== goal),
    }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Back Arrow - Top Left */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={20} color={colors.evergreenTeal} />
      </TouchableOpacity>

      {/* Settings Button - Top Right */}
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate('Settings')}
      >
        <Ionicons name="settings-outline" size={18} color={colors.evergreenTeal} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <ProfileHeader
          avatarUrl={profile.avatarUrl}
          bannerUrl={profile.bannerUrl}
          displayName={profile.displayName}
          location={profile.location}
          editMode={editMode}
          uploading={uploading}
          onUploadAvatar={() => handleUploadImage('avatar')}
          onUploadBanner={() => handleUploadImage('banner')}
          onDisplayNameChange={(text) => setProfile(prev => ({ ...prev, displayName: text }))}
          onLocationChange={(text) => setProfile(prev => ({ ...prev, location: text }))}
          inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
        />

        {/* Edit/Save Button */}
        <View style={styles.actionButtons}>
        {editMode ? (
          <>
            <TouchableOpacity style={styles.cancelButton} onPress={() => {
              setEditMode(false);
              loadProfile();
            }}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.editButton} onPress={() => setEditMode(true)}>
            <Ionicons name="create-outline" size={14} color={colors.evergreenTeal} style={{ marginRight: spacing.xs }} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
        </View>

        {/* Currently Active */}
        <View style={styles.activeContainer}>
          <View style={styles.activeCard}>
            <Text style={styles.activeHeader}>CURRENTLY ACTIVE</Text>
            <View style={styles.activeItems}>
              {activeData.groups.length > 0 && (
                <View style={styles.activeItem}>
                  <View style={styles.activeIconContainer}>
                    <Icon name="account-group" size={16} color={colors.evergreenTeal} />
                  </View>
                  <View style={styles.activeItemContent}>
                    <Text style={styles.activeItemLabel}>Groups</Text>
                    <Text style={styles.activeItemDetail} numberOfLines={1}>
                      {activeData.groups.map(g => g.name).join(', ')}
                    </Text>
                  </View>
                </View>
              )}

              {activeData.challenges.length > 0 && (
                <View style={styles.activeItem}>
                  <View style={styles.activeIconContainer}>
                    <Icon name="trophy-outline" size={16} color={colors.evergreenTeal} />
                  </View>
                  <View style={styles.activeItemContent}>
                    <Text style={styles.activeItemLabel}>Challenges</Text>
                    {activeData.challenges.map(c => (
                      <Text key={c.id} style={styles.activeItemDetail} numberOfLines={1}>
                        {c.name} · {c.dayPosition}
                      </Text>
                    ))}
                  </View>
                </View>
              )}

              {activeData.connectionsCount > 0 && (
                <View style={styles.activeItem}>
                  <View style={styles.activeIconContainer}>
                    <Icon name="account-multiple" size={16} color={colors.evergreenTeal} />
                  </View>
                  <View style={styles.activeItemContent}>
                    <Text style={styles.activeItemLabel}>Connections</Text>
                    <Text style={styles.activeItemDetail}>{activeData.connectionsCount} connection{activeData.connectionsCount !== 1 ? 's' : ''}</Text>
                  </View>
                </View>
              )}

              {activeData.groups.length === 0 && activeData.challenges.length === 0 && activeData.connectionsCount === 0 && (
                <Text style={styles.nudgeText}>Join a group or start a challenge to get active in the community!</Text>
              )}
            </View>
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <Text style={styles.cardHeader}>About</Text>
            {editMode ? (
              <TextInput
                style={styles.bioInput}
                value={profile.bio}
                onChangeText={(text) => setProfile(prev => ({ ...prev, bio: text }))}
                placeholder="Tell the community about your wellness journey..."
                multiline
                numberOfLines={4}
                inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
                blurOnSubmit={false}
              />
            ) : (
              <Text style={styles.bioText}>
                {profile.bio || 'No bio yet. Tap Edit Profile to add one!'}
              </Text>
            )}
          </View>
        </View>

        {/* Interests */}
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Interests</Text>
            {editMode && (
              <View style={styles.addItemContainer}>
                <TextInput
                  style={styles.addItemInput}
                  value={newInterest}
                  onChangeText={setNewInterest}
                  placeholder="Add an interest"
                  inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
                  returnKeyType="done"
                  onSubmitEditing={addInterest}
                />
                <TouchableOpacity style={styles.addItemButton} onPress={addInterest}>
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.tagsContainer}>
              {profile.interests.length > 0 ? (
                profile.interests.map((interest, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{interest}</Text>
                    {editMode && (
                      <TouchableOpacity onPress={() => removeInterest(interest)}>
                        <Ionicons name="close-circle" size={16} color={colors.secondary.sage} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>
                  {editMode ? 'Add interests to connect with others' : 'No interests added yet'}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Goals */}
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Wellness Goals</Text>
            {editMode && (
              <View style={styles.addItemContainer}>
                <TextInput
                  style={styles.addItemInput}
                  value={newGoal}
                  onChangeText={setNewGoal}
                  placeholder="Add a goal"
                  inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
                  returnKeyType="done"
                  onSubmitEditing={addGoal}
                />
                <TouchableOpacity style={styles.addItemButton} onPress={addGoal}>
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.tagsContainer}>
              {profile.goals.length > 0 ? (
                profile.goals.map((goal, index) => (
                  <View key={index} style={[styles.tag, styles.goalTag]}>
                    <Text style={[styles.tagText, styles.goalTagText]}>{goal}</Text>
                    {editMode && (
                      <TouchableOpacity onPress={() => removeGoal(goal)}>
                        <Ionicons name="close-circle" size={16} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyText}>
                  {editMode ? 'Add your wellness goals' : 'No goals added yet'}
                </Text>
              )}
            </View>
          </View>
        </View>

      {/* Recent Activity */}
      {!editMode && recentActivity.length > 0 && (
        <View style={styles.cardContainer}>
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Recent Activity</Text>
            {recentActivity.map((activity, index) => (
              <View
                key={activity.id}
                style={[
                  styles.activityItem,
                  index < recentActivity.length - 1 && styles.activityItemBorder,
                ]}
              >
                <Text style={styles.activityDescription} numberOfLines={1}>
                  {activity.description}
                </Text>
                <Text style={styles.activityTime}>
                  {formatRelativeTime(activity.timestamp)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Privacy Settings (in edit mode) */}
      {editMode && (
        <View style={styles.cardContainer}>
          <View style={styles.card}>
          <Text style={styles.cardHeader}>Privacy</Text>
          <View style={styles.privacyOption}>
            <Text style={styles.privacyLabel}>Profile Visibility</Text>
            <View style={styles.privacyButtons}>
              {(['public', 'connections', 'private'] as const).map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.privacyButton,
                    profile.privacy === option && styles.privacyButtonActive,
                  ]}
                  onPress={() => setProfile(prev => ({ ...prev, privacy: option }))}
                >
                  <Text
                    style={[
                      styles.privacyButtonText,
                      profile.privacy === option && styles.privacyButtonTextActive,
                    ]}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setProfile(prev => ({ ...prev, searchable: !prev.searchable }))}
          >
            <View style={[styles.checkbox, profile.searchable && styles.checkboxChecked]}>
              {profile.searchable && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>Allow people to find me in search</Text>
          </TouchableOpacity>
          </View>
        </View>
      )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Keyboard Accessory Toolbar (iOS) */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={INPUT_ACCESSORY_VIEW_ID}>
          <View style={styles.keyboardAccessory}>
            <TouchableOpacity
              onPress={() => Keyboard.dismiss()}
              style={styles.keyboardAccessoryButton}
            >
              <Text style={styles.keyboardAccessoryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.mistWhite,
  },
  backButton: {
    position: 'absolute',
    top: 12,
    left: 16,
    zIndex: 10,
  },
  settingsButton: {
    position: 'absolute',
    top: 12,
    right: 16,
    zIndex: 10,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.mistWhite,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.mutedSageGray,
  },
  // Action Buttons (Edit/Save/Cancel)
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    marginTop: spacing.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.evergreenTeal,
  },
  editButtonText: {
    color: colors.evergreenTeal,
    fontSize: 14,
    fontWeight: '500' as const,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  cancelButtonText: {
    color: colors.softCharcoal,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.evergreenTeal,
    paddingVertical: spacing.sm,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  // Generic card container and card styles
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
    marginBottom: 12,
  },
  // Bio
  bioText: {
    fontSize: 14,
    color: colors.softCharcoal,
    lineHeight: 14 * 1.5,
  },
  bioInput: {
    fontSize: 14,
    color: colors.softCharcoal,
    lineHeight: 14 * 1.5,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 8,
    padding: spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  // Add item (edit mode)
  addItemContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: 12,
  },
  addItemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 14,
    color: colors.softCharcoal,
  },
  addItemButton: {
    backgroundColor: colors.evergreenTeal,
    padding: spacing.sm,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Tags (Interests)
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dewSageLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: colors.evergreenTeal,
  },
  // Goal Tags
  goalTag: {
    backgroundColor: colors.tealLight,
    borderWidth: 1,
    borderColor: colors.tealMedium,
  },
  goalTagText: {
    color: colors.evergreenTeal,
  },
  emptyText: {
    fontSize: 12,
    color: colors.mutedSageGray,
    fontStyle: 'italic',
  },
  // Privacy (edit mode)
  privacyOption: {
    marginBottom: spacing.md,
  },
  privacyLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.softCharcoal,
    marginBottom: spacing.sm,
  },
  privacyButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  privacyButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.divider,
    alignItems: 'center',
  },
  privacyButtonActive: {
    backgroundColor: colors.evergreenTeal,
    borderColor: colors.evergreenTeal,
  },
  privacyButtonText: {
    fontSize: 12,
    color: colors.mutedSageGray,
  },
  privacyButtonTextActive: {
    color: colors.white,
    fontWeight: '600' as const,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.evergreenTeal,
    borderColor: colors.evergreenTeal,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.softCharcoal,
  },
  // Currently Active card
  activeContainer: {
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  activeCard: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    ...Layout.shadow.sm,
  },
  activeHeader: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.evergreenTeal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  activeItems: {
    flexDirection: 'column',
    gap: 12,
  },
  activeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.dewSageLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeItemContent: {
    flex: 1,
  },
  activeItemLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: colors.softCharcoal,
  },
  activeItemDetail: {
    fontSize: 12,
    color: colors.mutedSageGray,
  },
  nudgeText: {
    fontSize: 14,
    color: colors.mutedSageGray,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  // Recent Activity styles
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  activityItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  activityDescription: {
    fontSize: 14,
    color: colors.softCharcoal,
    flex: 1,
  },
  activityTime: {
    fontSize: 12,
    color: colors.mutedSageGray,
    flexShrink: 0,
    marginLeft: 12,
  },
  // Keyboard Accessory Toolbar
  keyboardAccessory: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingHorizontal: 16,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  keyboardAccessoryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.evergreenTeal,
    borderRadius: 8,
  },
  keyboardAccessoryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600' as const,
  },
});

export default ProfileScreen;
