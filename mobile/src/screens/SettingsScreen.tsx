// mobile/src/screens/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Linking,
  Text,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useAIConsent } from '../context/AIConsentContext';
import { useNotifications } from '../hooks/useNotifications';
import { useSubscription } from '../hooks/useSubscription';
import { useFeatureUnlock } from '../hooks/useFeatureUnlock';
import { FEATURE_METADATA, FeatureId } from '../constants/featureUnlock';
import Purchases from 'react-native-purchases';
import { db } from '../config/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAccountActions } from '../hooks/useAccountActions';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from '../constants/legal';
import { EventCodeSheet } from '../components/events/EventCodeSheet';

interface Settings {
  notificationsEnabled: boolean;
  reminderTime: string;
  tone: 'gentle' | 'encouraging' | 'direct';
  intensity: 'low' | 'standard' | 'high';
  privacy: 'public' | 'connections' | 'private';
  searchable: boolean;
  reflectionEnabled: boolean;
}

// The coach "invite code" channel ('RedeemCode') is only registered in
// PaywallStack, not in the main app tree where Settings lives — so the row's
// navigation silently fails. Keep it hidden until that channel is mounted.
// Flip to true once 'RedeemCode' is reachable from the main navigator.
const SHOW_REDEEM_INVITE_ROW = false;

const SettingsScreen = () => {
  const { user } = useAuth();
  const { deleting, confirmLogout, confirmDeleteAccount } = useAccountActions();
  const { hasConsent: aiConsent, setConsent: setAIConsent } = useAIConsent();
  const navigation = useNavigation();
  const { permissionStatus, requestPermissions } = useNotifications();
  const { status: subscriptionStatus, formattedType, description: subscriptionDescription } = useSubscription();
  const { access, selectedPillarInfo, unlockAll, loading: featureUnlockLoading } = useFeatureUnlock();
  const [unlockingFeatures, setUnlockingFeatures] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    notificationsEnabled: true,
    reminderTime: '08:00',
    tone: 'gentle',
    intensity: 'standard',
    privacy: 'public',
    searchable: true,
    reflectionEnabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  const [eventCodeSheetVisible, setEventCodeSheetVisible] = useState(false);
  const [eventName, setEventName] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
    const loadEventData = async () => {
      try {
        if (!db) return;
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists() && userSnap.data().eventData) {
          setEventName(userSnap.data().eventData.eventName);
        }
      } catch {}
    };
    loadEventData();
  }, [user]);

  const loadSettings = async () => {
    if (!user || !db) return;

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
          privacy: data.privacy || 'public',
          searchable: data.searchable !== false,
          reflectionEnabled: data.reflectionEnabled !== false,
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
    if (!user || !db) return;

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

  // Opens the native iOS "manage subscriptions" sheet. Falls back to the
  // RevenueCat-provided management URL if the SDK call is unavailable (e.g.
  // pre-iOS 13) or has no sheet to show.
  const handleManageSubscription = async () => {
    try {
      await Purchases.showManageSubscriptions();
    } catch {
      try {
        const info = await Purchases.getCustomerInfo();
        if (info.managementURL) {
          await Linking.openURL(info.managementURL);
          return;
        }
      } catch {
        // fall through to the neutral notice below
      }
      Alert.alert(
        'Manage subscription',
        'You can manage your subscription from your device Settings, under your Apple ID > Subscriptions.'
      );
    }
  };

  const openLegalUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Unavailable', 'Could not open the link. Please try again later.');
    });
  };

  const handleUnlockAllFeatures = () => {
    Alert.alert(
      'Explore All Features',
      'This will immediately unlock all app features. You can always explore at your own pace, but this removes the gradual unlock schedule.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Explore All',
          onPress: async () => {
            setUnlockingFeatures(true);
            try {
              await unlockAll();
              Alert.alert(
                'Features Unlocked',
                'All features are now available! Explore everything Vara has to offer.'
              );
            } catch (error) {
              console.error('Error unlocking features:', error);
              Alert.alert('Error', 'Failed to unlock features. Please try again.');
            } finally {
              setUnlockingFeatures(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.evergreenTeal} />
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.screenTitle}>
            Settings
          </Text>
          <Text style={styles.subtitle}>
            Customize your experience
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer}>
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

      {/* Feature Access Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feature Access</Text>
        <View style={styles.card}>
          {/* Current Focus Pillar */}
          {selectedPillarInfo && (
            <>
              <View style={styles.settingRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Your Focus</Text>
                  <Text style={styles.settingValue}>{selectedPillarInfo.title}</Text>
                  <Text style={styles.settingDescription}>
                    {selectedPillarInfo.subtitle}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name={selectedPillarInfo.icon as any}
                  size={24}
                  color={selectedPillarInfo.color}
                />
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* Unlock Status */}
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Feature Unlock Progress</Text>
              {featureUnlockLoading ? (
                <Text style={styles.settingDescription}>Loading...</Text>
              ) : access.allUnlocked ? (
                <Text style={[styles.settingValue, { color: Colors.evergreenTeal }]}>
                  All features unlocked
                </Text>
              ) : (
                <Text style={styles.settingDescription}>
                  Day {access.currentDay} of 14
                </Text>
              )}
            </View>
            {access.allUnlocked && (
              <Ionicons name="checkmark-circle" size={20} color={Colors.evergreenTeal} />
            )}
          </View>

          {/* Available Features List - show when not all unlocked */}
          {!access.allUnlocked && !featureUnlockLoading && access.unlockedFeatures.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.featureListContainer}>
                <Text style={styles.featureListLabel}>Currently available:</Text>
                <View style={styles.featureChips}>
                  {access.unlockedFeatures.slice(0, 6).map((featureId: FeatureId) => (
                    <View key={featureId} style={styles.featureChip}>
                      <MaterialCommunityIcons
                        name={FEATURE_METADATA[featureId]?.icon as any || 'check'}
                        size={12}
                        color={Colors.evergreenTeal}
                      />
                      <Text style={styles.featureChipText}>
                        {FEATURE_METADATA[featureId]?.name || featureId}
                      </Text>
                    </View>
                  ))}
                  {access.unlockedFeatures.length > 6 && (
                    <View style={styles.featureChip}>
                      <Text style={styles.featureChipText}>
                        +{access.unlockedFeatures.length - 6} more
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          )}

          {/* Unlock All Button - only show if not already unlocked */}
          {!access.allUnlocked && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.settingRow}
                onPress={handleUnlockAllFeatures}
                disabled={unlockingFeatures}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: Colors.evergreenTeal }]}>
                    Explore All Features
                  </Text>
                  <Text style={styles.settingDescription}>
                    Ready for more? Skip the gradual unlock
                  </Text>
                </View>
                {unlockingFeatures ? (
                  <ActivityIndicator size="small" color={Colors.evergreenTeal} />
                ) : (
                  <Ionicons name="lock-open-outline" size={20} color={Colors.evergreenTeal} />
                )}
              </TouchableOpacity>
            </>
          )}
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
              <ActivityIndicator size="small" color={Colors.evergreenTeal} />
            ) : (
              <Switch
                value={settings.notificationsEnabled && permissionStatus === 'granted'}
                onValueChange={handleToggleNotifications}
                trackColor={{ false: '#D5E3D1', true: Colors.evergreenTeal }}
                thumbColor="#fff"
                disabled={requestingPermissions}
              />
            )}
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('NotificationSettings' as never)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Notification Preferences</Text>
              <Text style={styles.settingDescription}>
                Customize what notifications you receive
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Features Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Features</Text>
        <View style={styles.card}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1, marginRight: Spacing.base }}>
              <Text style={styles.settingLabel}>Use AI features</Text>
              <Text style={styles.settingDescription}>
                Let Vara use OpenAI to power your daily plan, AI chat, and journal tools. OpenAI
                doesn't use this data to train their models.
              </Text>
            </View>
            <Switch
              value={!!aiConsent}
              onValueChange={async (value) => {
                try {
                  await setAIConsent(value);
                } catch (err) {
                  Alert.alert('Error', "Couldn't update AI setting. Please try again.");
                }
              }}
              trackColor={{ false: '#D5E3D1', true: Colors.evergreenTeal }}
              thumbColor="#fff"
            />
          </View>
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
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
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
              trackColor={{ false: '#D5E3D1', true: Colors.evergreenTeal }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => (navigation as any).navigate('MutedAccounts')}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Muted Accounts</Text>
              <Text style={styles.settingDescription}>
                Manage people you've muted in the community
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Data & Privacy Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data & Privacy</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.settingRow} onPress={() => Linking.openURL('https://www.varawellness.co/privacy-policy')}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow} onPress={() => Linking.openURL('https://www.varawellness.co/terms-of-service')}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => {
              Alert.alert(
                'Request Data Export',
                'To request an export of your data, please contact support@varawellness.co and we\'ll send you a copy.',
                [{ text: 'OK' }]
              );
            }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Request Data Export</Text>
              <Text style={styles.settingDescription}>
                Download a copy of your data
              </Text>
            </View>
            <Ionicons name="download-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Event Code Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Event Code</Text>
        <View style={styles.card}>
          {eventName ? (
            <View style={styles.settingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Event Code</Text>
                <Text style={styles.settingDescription}>{eventName}</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color={Colors.evergreenTeal} />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setEventCodeSheetVisible(true)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Event Code</Text>
                <Text style={styles.settingDescription}>Enter a code from a workshop or event</Text>
              </View>
              <Text style={{ fontSize: 14, color: Colors.textSecondary }}>Enter</Text>
            </TouchableOpacity>
          )}
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
              {subscriptionStatus?.type === 'trial' && subscriptionStatus.trialDaysRemaining != null && (
                <Text style={styles.trialIndicator}>
                  You're in your free trial. {subscriptionStatus.trialDaysRemaining} day{subscriptionStatus.trialDaysRemaining !== 1 ? 's' : ''} remaining.
                </Text>
              )}
            </View>
            {subscriptionStatus?.type === 'premium' && (
              <Ionicons name="star" size={20} color={Colors.sunriseAmber} />
            )}
            {subscriptionStatus?.type === 'coaching' && (
              <Ionicons name="heart" size={20} color={Colors.evergreenTeal} />
            )}
          </View>

          {/* Manage subscription — only for active store subscribers. Trial,
              coaching, and event access have no App Store subscription to manage. */}
          {subscriptionStatus?.type === 'premium' && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.settingRow}
                onPress={handleManageSubscription}
                accessibilityRole="button"
                accessibilityLabel="Manage subscription"
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingLabel}>Manage subscription</Text>
                  <Text style={styles.settingDescription}>
                    Change or cancel your plan
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </>
          )}

          {/* Coach "invite code" channel is not yet mounted in the main app tree —
              the 'RedeemCode' route lives only in PaywallStack, so this tap silently
              fails. Hide this dead entry point until that channel lands. (Do NOT
              delete RedeemCodeScreen or its PaywallStack registration.) Users who
              need a code reach it via the paywall's "Have a code?" affordance. */}
          {SHOW_REDEEM_INVITE_ROW && subscriptionStatus?.type !== 'coaching' && (
            <>
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
                <Ionicons name="gift-outline" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Legal Section — Terms of Use (EULA) + Privacy Policy, reliably
          accessible in-app per App Store Review Guideline 3.1.2. */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Legal</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => openLegalUrl(TERMS_OF_USE_URL)}
            accessibilityRole="link"
            accessibilityLabel="Terms of Use"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Terms of Use</Text>
            </View>
            <Ionicons name="open-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => openLegalUrl(PRIVACY_POLICY_URL)}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Privacy Policy</Text>
            </View>
            <Ionicons name="open-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* More Section — utilities re-homed from the dissolved Wellness tab
          (B-3d.4): Connected Apps + Help & Support. Both routes live in the
          parent AppStack, so navigate() bubbles up from this ProfileStack
          screen and resolves under either IA. */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>More</Text>
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('WearableIntegration' as never)}
            accessibilityRole="button"
            accessibilityLabel="Connected Apps"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Connected Apps</Text>
              <Text style={styles.settingDescription}>
                Tell us what tools you use
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => navigation.navigate('HelpSupport' as never)}
            accessibilityRole="button"
            accessibilityLabel="Help and Support"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.settingLabel}>Help & Support</Text>
              <Text style={styles.settingDescription}>
                FAQs, feedback & contact
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Account Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Actions</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.settingRow} onPress={confirmLogout}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: Colors.evergreenTeal }]}>Logout</Text>
            </View>
            <Ionicons name="log-out-outline" size={20} color={Colors.evergreenTeal} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow} onPress={confirmDeleteAccount} disabled={deleting}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: Colors.softCoral }]}>
                {deleting ? 'Deleting Account...' : 'Delete Account'}
              </Text>
              <Text style={styles.settingDescription}>
                Permanently delete your account and all data
              </Text>
            </View>
            {deleting ? (
              <ActivityIndicator size="small" color={Colors.softCoral} />
            ) : (
              <Ionicons name="trash-outline" size={20} color={Colors.softCoral} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>Vara Wellness App</Text>
        <Text style={styles.appInfoText}>Version 1.0.0</Text>
      </View>

      <View style={{ height: Spacing.xl }} />
    </ScrollView>
      <EventCodeSheet
        visible={eventCodeSheetVisible}
        onDismiss={() => setEventCodeSheetVisible(false)}
        onSuccess={(name) => {
          setEventName(name);
          setEventCodeSheetVisible(false);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  scrollContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  headerTitles: {
    flex: 1,
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.mistWhite,
  },
  loadingText: {
    marginTop: Spacing.base,
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.base,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(27,94,87,0.06)',
    ...Platform.select({
      ios: {
        shadowColor: Colors.evergreenTeal,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
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
    padding: Spacing.base,
  },
  settingLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: 2,
  },
  settingValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
  settingDescription: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },
  divider: {
    height: Layout.borderWidth.thin,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.base,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  appInfoText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
  },
  featureListContainer: {
    padding: Spacing.base,
    paddingTop: Spacing.sm,
  },
  featureListLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  featureChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dewSage,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
    gap: 4,
  },
  featureChipText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  trialIndicator: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    marginTop: 4,
  },
});

export default SettingsScreen;
