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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { useSubscription } from '../hooks/useSubscription';
import { db } from '../config/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Colors as colors, Spacing as spacing, Typography, Layout } from '../constants';

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
  const navigation = useNavigation();
  const { permissionStatus, requestPermissions } = useNotifications();
  const { status: subscriptionStatus, formattedType, description: subscriptionDescription } = useSubscription();
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
  const [requestingPermissions, setRequestingPermissions] = useState(false);

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

  const handleToggleNotifications = async (value: boolean) => {
    if (!value) {
      // User is disabling notifications - just save the setting
      await handleSaveSettings({ notificationsEnabled: false });
      return;
    }

    // User is enabling notifications - request permissions first
    setRequestingPermissions(true);
    try {
      const granted = await requestPermissions();

      if (granted) {
        // Permissions granted - save the setting
        await handleSaveSettings({ notificationsEnabled: true });
        Alert.alert(
          'Notifications Enabled',
          'You will now receive push notifications for messages and updates.'
        );
      } else {
        // Permissions denied
        Alert.alert(
          'Notifications Disabled',
          'Push notifications are disabled. To enable them, please allow notifications in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
        // Keep notifications disabled in settings
        setSettings(prev => ({ ...prev, notificationsEnabled: false }));
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert('Error', 'Failed to enable notifications');
      setSettings(prev => ({ ...prev, notificationsEnabled: false }));
    } finally {
      setRequestingPermissions(false);
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
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>
                {permissionStatus === 'granted'
                  ? 'Receive messages and updates'
                  : permissionStatus === 'denied'
                  ? 'Notifications blocked - open device settings to enable'
                  : 'Enable to receive messages and updates'}
              </Text>
            </View>
            {requestingPermissions ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Switch
                value={settings.notificationsEnabled && permissionStatus === 'granted'}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#D5E3D1', true: colors.primary }}
                thumbColor="#fff"
                disabled={requestingPermissions}
              />
            )}
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
              <Text style={styles.settingValue}>{formattedType || 'Loading...'}</Text>
              {subscriptionDescription && (
                <Text style={styles.settingDescription}>{subscriptionDescription}</Text>
              )}
            </View>
            {subscriptionStatus?.type === 'premium' && (
              <Ionicons name="star" size={20} color={colors.secondary.amber} />
            )}
            {subscriptionStatus?.type === 'coaching' && (
              <Ionicons name="heart" size={20} color={colors.evergreenTeal} />
            )}
          </View>

          {/* Show different options based on subscription type */}
          {subscriptionStatus?.type !== 'coaching' && (
            <>
              <View style={styles.divider} />

              {subscriptionStatus?.type === 'premium' ? (
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingLabel}>Manage Subscription</Text>
                    <Text style={styles.settingDescription}>
                      View or cancel in App Store
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.settingRow}
                  onPress={() => navigation.navigate('Paywall' as never)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.settingLabel}>Upgrade to Premium</Text>
                    <Text style={styles.settingDescription}>
                      Unlock all features
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
                </TouchableOpacity>
              )}

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.settingRow}
                onPress={() => navigation.navigate('RedeemCode' as never)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Redeem Invite Code</Text>
                  <Text style={styles.settingDescription}>
                    Have a code from a coach?
                  </Text>
                </View>
                <Ionicons name="gift-outline" size={20} color={colors.text.secondary} />
              </TouchableOpacity>
            </>
          )}
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
    backgroundColor: colors.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.default,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: Typography.fontSize.sm,
    color: colors.text.secondary,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: Layout.borderRadius.xl,
    ...Platform.select({
      ios: {
        shadowColor: colors.shadow,
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
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: Typography.fontSize.sm,
    color: colors.text.secondary,
  },
  settingDescription: {
    fontSize: Typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },
  divider: {
    height: Layout.borderWidth.thin,
    backgroundColor: colors.borderLight,
    marginHorizontal: spacing.md,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  appInfoText: {
    fontSize: Typography.fontSize.xs,
    color: colors.text.secondary,
  },
});

export default SettingsScreen;
