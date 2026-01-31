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
  Keyboard,
  InputAccessoryView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { ProfileHeader, ProfileStats } from '../components';
import { db, storage } from '../config/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
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

interface ProfileStats {
  posts: number;
  connections: number;
  groups: number;
  goals: number;
}

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
    <View style={styles.container}>
      {/* Settings Button - Top Right */}
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate('Settings')}
      >
        <Ionicons name="settings-outline" size={24} color={colors.primary} />
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
            <Ionicons name="create-outline" size={18} color="#fff" style={{ marginRight: spacing.xs }} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        )}
        </View>

        {/* Stats */}
        <ProfileStats
          posts={stats.posts}
          connections={stats.connections}
          groups={stats.groups}
          goals={stats.goals}
        />

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
            inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
            blurOnSubmit={false}
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
    backgroundColor: colors.background,
  },
  settingsButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    right: spacing.md,
    zIndex: 10,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: Layout.borderRadius['2xl'],
    ...Layout.shadow.md,
  },
  scrollContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: Typography.fontSize.sm,
    color: colors.text.secondary,
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
    backgroundColor: colors.evergreenTeal,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: Layout.borderRadius.lg,
  },
  editButtonText: {
    color: colors.textOnPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
    borderWidth: Layout.borderWidth.thin,
    borderColor: colors.borderLight,
  },
  cancelButtonText: {
    color: colors.textPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.evergreenTeal,
    paddingVertical: spacing.sm,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    color: colors.textOnPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
  section: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: Layout.borderRadius.xl,
    ...Layout.shadow.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  bioText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textPrimary,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
  },
  bioInput: {
    fontSize: Typography.fontSize.sm,
    color: colors.textPrimary,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
    borderWidth: Layout.borderWidth.thin,
    borderColor: colors.borderLight,
    borderRadius: Layout.borderRadius.md,
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
    borderWidth: Layout.borderWidth.thin,
    borderColor: colors.borderLight,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  addItemButton: {
    backgroundColor: colors.evergreenTeal,
    padding: spacing.sm,
    borderRadius: Layout.borderRadius.md,
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
    backgroundColor: colors.inputBackground,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: Layout.borderRadius.xl,
  },
  tagText: {
    fontSize: Typography.fontSize.xs,
    color: colors.textPrimary,
  },
  goalTag: {
    backgroundColor: colors.mintCream,
  },
  goalTagText: {
    color: colors.evergreenTeal,
  },
  emptyText: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  privacyOption: {
    marginBottom: spacing.md,
  },
  privacyLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  privacyButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  privacyButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: Layout.borderRadius.md,
    borderWidth: Layout.borderWidth.thin,
    borderColor: colors.borderLight,
    alignItems: 'center',
  },
  privacyButtonActive: {
    backgroundColor: colors.evergreenTeal,
    borderColor: colors.evergreenTeal,
  },
  privacyButtonText: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
  },
  privacyButtonTextActive: {
    color: colors.textOnPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: Layout.borderWidth.medium,
    borderColor: colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.evergreenTeal,
    borderColor: colors.evergreenTeal,
  },
  checkboxLabel: {
    fontSize: Typography.fontSize.sm,
    color: colors.textPrimary,
  },
  // Keyboard Accessory Toolbar
  keyboardAccessory: {
    backgroundColor: colors.surface,
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  keyboardAccessoryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.evergreenTeal,
    borderRadius: Layout.borderRadius.md,
  },
  keyboardAccessoryButtonText: {
    color: colors.textOnPrimary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default ProfileScreen;
