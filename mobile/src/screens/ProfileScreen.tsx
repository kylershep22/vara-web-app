// mobile/src/screens/ProfileScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { db, storage } from '../config/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Colors as colors, Spacing as spacing } from '../constants';

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

interface ProfileStats {
  posts: number;
  connections: number;
  groups: number;
  goals: number;
}

const ProfileScreen = () => {
  const { user } = useAuth();
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
  const [stats, setStats] = useState<ProfileStats>({
    posts: 0,
    connections: 0,
    groups: 0,
    goals: 0,
  });
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
    if (!user) return;

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

      // Load stats (simplified for mobile)
      // In a real app, you'd fetch these from Firestore
      setStats({
        posts: 0,
        connections: 0,
        groups: 0,
        goals: 0,
      });
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
    if (!user) return;

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
    if (!user) return;

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

    if (!result.canceled && result.assets[0]) {
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
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Banner */}
      <View style={styles.bannerContainer}>
        {profile.bannerUrl ? (
          <Image source={{ uri: profile.bannerUrl }} style={styles.banner} />
        ) : (
          <View style={styles.bannerPlaceholder} />
        )}
        {editMode && (
          <TouchableOpacity
            style={styles.bannerEditButton}
            onPress={() => handleUploadImage('banner')}
            disabled={uploading}
          >
            <Ionicons name="camera" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Avatar & Name */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {profile.displayName ? profile.displayName[0].toUpperCase() : 'U'}
              </Text>
            </View>
          )}
          {editMode && (
            <TouchableOpacity
              style={styles.avatarEditButton}
              onPress={() => handleUploadImage('avatar')}
              disabled={uploading}
            >
              <Ionicons name="camera" size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        {editMode ? (
          <TextInput
            style={styles.nameInput}
            value={profile.displayName}
            onChangeText={(text) => setProfile(prev => ({ ...prev, displayName: text }))}
            placeholder="Display Name"
          />
        ) : (
          <Text style={styles.name}>{profile.displayName || 'User'}</Text>
        )}

        {editMode ? (
          <TextInput
            style={styles.locationInput}
            value={profile.location}
            onChangeText={(text) => setProfile(prev => ({ ...prev, location: text }))}
            placeholder="Location"
          />
        ) : (
          profile.location && <Text style={styles.location}>{profile.location}</Text>
        )}
      </View>

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
            <Ionicons name="create-outline" size={18} color="#fff" style={{ marginRight: spacing.xs }} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.posts}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.connections}</Text>
          <Text style={styles.statLabel}>Connections</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.groups}</Text>
          <Text style={styles.statLabel}>Groups</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.goals}</Text>
          <Text style={styles.statLabel}>Goals</Text>
        </View>
      </View>

      {/* Bio Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        {editMode ? (
          <TextInput
            style={styles.bioInput}
            value={profile.bio}
            onChangeText={(text) => setProfile(prev => ({ ...prev, bio: text }))}
            placeholder="Tell the community about your wellness journey..."
            multiline
            numberOfLines={4}
          />
        ) : (
          <Text style={styles.bioText}>
            {profile.bio || 'No bio yet. Tap Edit Profile to add one!'}
          </Text>
        )}
      </View>

      {/* Interests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Interests</Text>
        {editMode && (
          <View style={styles.addItemContainer}>
            <TextInput
              style={styles.addItemInput}
              value={newInterest}
              onChangeText={setNewInterest}
              placeholder="Add an interest"
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

      {/* Goals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Wellness Goals</Text>
        {editMode && (
          <View style={styles.addItemContainer}>
            <TextInput
              style={styles.addItemInput}
              value={newGoal}
              onChangeText={setNewGoal}
              placeholder="Add a goal"
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

      {/* Privacy Settings (in edit mode) */}
      {editMode && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
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
      )}

      <View style={{ height: spacing.xl }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAF6',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.text.secondary,
  },
  bannerContainer: {
    height: 180,
    position: 'relative',
  },
  banner: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  bannerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary,
  },
  bannerEditButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing.sm,
    borderRadius: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: -40,
    paddingHorizontal: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    padding: spacing.xs,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary.sage,
    paddingVertical: spacing.xs,
    minWidth: 200,
  },
  location: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  locationInput: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary.sage,
    paddingVertical: spacing.xs,
    minWidth: 150,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.background.surface,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.secondary.sage,
  },
  cancelButtonText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    backgroundColor: '#fff',
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  bioText: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
  },
  bioInput: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
    borderWidth: 1,
    borderColor: colors.secondary.sage,
    borderRadius: 8,
    padding: spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addItemContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  addItemInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.secondary.sage,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  addItemButton: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: colors.text.primary,
  },
  goalTag: {
    backgroundColor: '#E8F5F3',
  },
  goalTagText: {
    color: colors.primary,
  },
  emptyText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  privacyOption: {
    marginBottom: spacing.md,
  },
  privacyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
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
    borderColor: colors.secondary.sage,
    alignItems: 'center',
  },
  privacyButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  privacyButtonText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  privacyButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
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
    borderColor: colors.secondary.sage,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text.primary,
  },
});

export default ProfileScreen;
