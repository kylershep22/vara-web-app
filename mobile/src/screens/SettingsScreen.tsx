// mobile/src/screens/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Colors as colors, Spacing as spacing } from '../constants';

interface Settings {
  notificationsEnabled: boolean;
  reminderTime: string;
  tone: 'gentle' | 'encouraging' | 'direct';
  intensity: 'low' | 'standard' | 'high';
  theme: 'system' | 'light' | 'dark';
  privacy: 'public' | 'connections' | 'private';
  searchable: boolean;
}

const SettingsScreen = () => {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<Settings>({
    notificationsEnabled: true,
    reminderTime: '08:00',
    tone: 'gentle',
    intensity: 'standard',
    theme: 'system',
    privacy: 'public',
    searchable: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const userDoc = await getDoc(doc(db, 'users', user.uid));

      if (userDoc.exists()) {
        const data = userDoc.data();
        setSettings({
          notificationsEnabled: data.notificationsEnabled !== false,
          reminderTime: data.reminderTime || '08:00',
          tone: data.tone || 'gentle',
          intensity: data.intensity || 'standard',
          theme: data.theme || 'system',
          privacy: data.privacy || 'public',
          searchable: data.searchable !== false,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (updates: Partial<Settings>) => {
    if (!user) return;

    try {
      setSaving(true);
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      setSettings(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Contact Support',
              'Please contact support@vara.app to delete your account.'
            );
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Email</Text>
              <Text style={styles.settingValue}>{user?.email}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
              <Text style={styles.settingDescription}>
                Get daily reminders and updates
              </Text>
            </View>
            <Switch
              value={settings.notificationsEnabled}
              onValueChange={(value) =>
                handleSaveSettings({ notificationsEnabled: value })
              }
              trackColor={{ false: '#D5E3D1', true: colors.primary }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View>
              <Text style={styles.settingLabel}>Reminder Time</Text>
              <Text style={styles.settingDescription}>
                Current: {settings.reminderTime}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </View>
        </View>
      </View>

      {/* AI Companion Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Companion</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              Alert.alert(
                'Tone',
                'How would you like your AI coach to communicate?',
                [
                  {
                    text: 'Gentle',
                    onPress: () => handleSaveSettings({ tone: 'gentle' }),
                  },
                  {
                    text: 'Encouraging',
                    onPress: () => handleSaveSettings({ tone: 'encouraging' }),
                  },
                  {
                    text: 'Direct',
                    onPress: () => handleSaveSettings({ tone: 'direct' }),
                  },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Tone</Text>
              <Text style={styles.settingValue}>
                {settings.tone.charAt(0).toUpperCase() + settings.tone.slice(1)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              Alert.alert(
                'Intensity',
                'How intense should your coaching be?',
                [
                  {
                    text: 'Low',
                    onPress: () => handleSaveSettings({ intensity: 'low' }),
                  },
                  {
                    text: 'Standard',
                    onPress: () => handleSaveSettings({ intensity: 'standard' }),
                  },
                  {
                    text: 'High',
                    onPress: () => handleSaveSettings({ intensity: 'high' }),
                  },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Intensity</Text>
              <Text style={styles.settingValue}>
                {settings.intensity.charAt(0).toUpperCase() + settings.intensity.slice(1)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Privacy Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy & Visibility</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              Alert.alert(
                'Profile Visibility',
                'Who can see your profile?',
                [
                  {
                    text: 'Public 🌐',
                    onPress: () => handleSaveSettings({ privacy: 'public' }),
                  },
                  {
                    text: 'Connections 👥',
                    onPress: () => handleSaveSettings({ privacy: 'connections' }),
                  },
                  {
                    text: 'Private 🔒',
                    onPress: () => handleSaveSettings({ privacy: 'private' }),
                  },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Profile Visibility</Text>
              <Text style={styles.settingValue}>
                {settings.privacy.charAt(0).toUpperCase() + settings.privacy.slice(1)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Searchable</Text>
              <Text style={styles.settingDescription}>
                Allow people to find you in search
              </Text>
            </View>
            <Switch
              value={settings.searchable}
              onValueChange={(value) => handleSaveSettings({ searchable: value })}
              trackColor={{ false: '#D5E3D1', true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>

      {/* Appearance Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              Alert.alert(
                'Theme',
                'Choose your app theme',
                [
                  {
                    text: 'System',
                    onPress: () => handleSaveSettings({ theme: 'system' }),
                  },
                  {
                    text: 'Light ☀️',
                    onPress: () => handleSaveSettings({ theme: 'light' }),
                  },
                  {
                    text: 'Dark 🌙',
                    onPress: () => handleSaveSettings({ theme: 'dark' }),
                  },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Theme</Text>
              <Text style={styles.settingValue}>
                {settings.theme.charAt(0).toUpperCase() + settings.theme.slice(1)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Data & Privacy Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data & Privacy</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Request Data Export</Text>
              <Text style={styles.settingDescription}>
                Download a copy of your data
              </Text>
            </View>
            <Ionicons name="download-outline" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Subscription Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Current Plan</Text>
              <Text style={styles.settingValue}>Free</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Upgrade to Premium</Text>
              <Text style={styles.settingDescription}>
                Unlock AI features and more
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Actions</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.settingRow} onPress={handleLogout}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: colors.primary }]}>Logout</Text>
            </View>
            <Ionicons name="log-out-outline" size={20} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow} onPress={handleDeleteAccount}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: '#EF4444' }]}>Delete Account</Text>
              <Text style={styles.settingDescription}>
                Permanently delete your account
              </Text>
            </View>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>Vara Wellness App</Text>
        <Text style={styles.appInfoText}>Version 1.0.0</Text>
      </View>

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
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  card: {
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  settingDescription: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: spacing.md,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  appInfoText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
});

export default SettingsScreen;
