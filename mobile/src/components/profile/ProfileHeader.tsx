/**
 * Profile Header Component
 * Banner, avatar, name, and location display/edit
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image, TextInput, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface ProfileHeaderProps {
  avatarUrl: string;
  bannerUrl: string;
  displayName: string;
  location: string;
  editMode: boolean;
  uploading: boolean;
  onUploadAvatar: () => void;
  onUploadBanner: () => void;
  onDisplayNameChange: (text: string) => void;
  onLocationChange: (text: string) => void;
  inputAccessoryViewID?: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  avatarUrl,
  bannerUrl,
  displayName,
  location,
  editMode,
  uploading,
  onUploadAvatar,
  onUploadBanner,
  onDisplayNameChange,
  onLocationChange,
  inputAccessoryViewID,
}) => {
  return (
    <>
      {/* Banner */}
      <View style={styles.bannerContainer}>
        {bannerUrl ? (
          <Image source={{ uri: bannerUrl }} style={styles.banner} />
        ) : (
          <LinearGradient
            colors={[Colors.dewSage, Colors.silverSage, Colors.dewSage]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerPlaceholder}
          />
        )}
        {editMode && (
          <TouchableOpacity
            style={styles.bannerEditButton}
            onPress={onUploadBanner}
            disabled={uploading}
          >
            <Ionicons name="camera" size={20} color={Colors.white} />
          </TouchableOpacity>
        )}
      </View>

      {/* Avatar & Name */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {displayName ? displayName[0].toUpperCase() : 'U'}
              </Text>
            </View>
          )}
          {editMode && (
            <TouchableOpacity
              style={styles.avatarEditButton}
              onPress={onUploadAvatar}
              disabled={uploading}
            >
              <Ionicons name="camera" size={16} color={Colors.white} />
            </TouchableOpacity>
          )}
        </View>

        {editMode ? (
          <TextInput
            style={styles.nameInput}
            value={displayName}
            onChangeText={onDisplayNameChange}
            placeholder="Display Name"
            placeholderTextColor={Colors.textSecondary}
            inputAccessoryViewID={inputAccessoryViewID}
            returnKeyType="done"
          />
        ) : (
          <Text style={styles.name}>{displayName || 'User'}</Text>
        )}

        {editMode ? (
          <TextInput
            style={styles.locationInput}
            value={location}
            onChangeText={onLocationChange}
            placeholder="Location"
            placeholderTextColor={Colors.textSecondary}
            inputAccessoryViewID={inputAccessoryViewID}
            returnKeyType="done"
          />
        ) : (
          location && <Text style={styles.location}>{location}</Text>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    height: 160,
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
  },
  bannerEditButton: {
    position: 'absolute',
    top: Spacing.base,
    right: Spacing.base,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: Spacing.sm,
    borderRadius: Layout.borderRadius['2xl'],
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: -40,
    paddingHorizontal: Spacing.base,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: Colors.mistWhite,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 80,
    borderWidth: 4,
    borderColor: Colors.mistWhite,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.evergreenTeal,
    padding: Spacing.xs,
    borderRadius: 15,
    borderWidth: Layout.borderWidth.medium,
    borderColor: Colors.white,
  },
  name: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: Colors.softCharcoal,
    marginTop: 10,
    marginBottom: 2,
  },
  nameInput: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: Colors.softCharcoal,
    textAlign: 'center',
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
    paddingVertical: Spacing.xs,
    minWidth: 200,
    marginTop: 10,
    marginBottom: 2,
  },
  location: {
    fontSize: 14,
    color: Colors.mutedSageGray,
    marginBottom: 12,
  },
  locationInput: {
    fontSize: 14,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
    paddingVertical: Spacing.xs,
    minWidth: 150,
    marginBottom: 12,
  },
});
