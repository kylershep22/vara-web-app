/**
 * Connected Apps Screen
 * Collects user feedback on desired integrations
 * Replaces the old "Coming Soon" wearables placeholder
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { serverTimestamp, type Timestamp } from 'firebase/firestore';
import { setUserPrivate } from '../services/firebase/userPrivate.service';
import { getMergedUserData } from '../services/firebase/userMigrationRead';

const VARA_COLORS = {
  teal: '#1B5E57',
  mistWhite: '#FAFAF6',
  charcoal: '#3E3E3E',
  sageGray: '#6F7F77',
  dewSage: '#D5E3D1',
};

const CONNECTED_APPS = [
  { id: 'apple-watch', label: 'Apple Watch', icon: 'watch' },
  { id: 'fitbit', label: 'Fitbit', icon: 'watch-variant' },
  { id: 'garmin', label: 'Garmin', icon: 'watch-vibrate' },
  { id: 'strava', label: 'Strava', icon: 'run-fast' },
  { id: 'peloton', label: 'Peloton', icon: 'bike' },
  { id: 'oura-ring', label: 'Oura Ring', icon: 'ring' },
  { id: 'whoop', label: 'WHOOP', icon: 'arm-flex' },
  { id: 'google-fit', label: 'Google Fit', icon: 'google-fit' },
  { id: 'samsung-health', label: 'Samsung Health', icon: 'cellphone' },
];

const ConnectedAppsScreen: React.FC = () => {
  const { user } = useAuth();
  const [showPicker, setShowPicker] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [otherText, setOtherText] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user already submitted
  useEffect(() => {
    if (!user?.uid || !db) {
      setLoading(false);
      return;
    }
    const check = async () => {
      try {
        // MIGRATION_FALLBACK — picks moved to userPrivate in slice 2; an
        // earlier submission may still only exist on users/{uid}.
        const merged = await getMergedUserData(user.uid);
        if (merged?.connectedAppsPicks) {
          setHasSubmitted(true);
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [user]);

  const toggleApp = useCallback((appId: string) => {
    Haptics.selectionAsync();
    setSelected((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user?.uid || !db || (selected.length === 0 && !otherText.trim())) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const picks = [...selected];
    if (otherText.trim()) picks.push(`other: ${otherText.trim()}`);

    try {
      await setUserPrivate(user.uid, {
        connectedAppsPicks: picks,
        connectedAppsSubmittedAt: serverTimestamp() as unknown as Timestamp,
      });
      setHasSubmitted(true);
      setShowPicker(false);
    } catch (err) {
      console.error('Error saving connected apps picks:', err);
    }
  }, [user, selected, otherText]);

  if (loading) return null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {hasSubmitted ? (
          // Post-submission quiet state
          <View style={styles.card}>
            <View style={styles.iconRow}>
              <Icon name="check-circle" size={32} color={VARA_COLORS.teal} />
            </View>
            <Text style={styles.headline}>
              Thanks! Your input shapes what we build next.
            </Text>
          </View>
        ) : (
          // Pre-submission feedback card
          <View style={styles.card}>
            <View style={styles.iconRow}>
              <Icon name="link-variant" size={32} color={VARA_COLORS.teal} />
            </View>
            <Text style={styles.headline}>What apps do you use?</Text>
            <Text style={styles.body}>
              We're building smart connections so Vara can work with tools you already use.
              Tell us what matters to you.
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => setShowPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.ctaText}>Share your pick</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Multi-select bottom sheet */}
      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPicker(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select your apps</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Icon name="close" size={24} color={VARA_COLORS.charcoal} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            Pick everything you use. This helps us prioritize.
          </Text>

          {/* App grid */}
          <ScrollView style={styles.appList} contentContainerStyle={styles.appGrid}>
            {CONNECTED_APPS.map((app) => {
              const isSelected = selected.includes(app.id);
              return (
                <TouchableOpacity
                  key={app.id}
                  style={[styles.appChip, isSelected && styles.appChipSelected]}
                  onPress={() => toggleApp(app.id)}
                  activeOpacity={0.7}
                >
                  <Icon
                    name={app.icon as any}
                    size={20}
                    color={isSelected ? '#FFFFFF' : VARA_COLORS.sageGray}
                  />
                  <Text style={[styles.appChipText, isSelected && styles.appChipTextSelected]}>
                    {app.label}
                  </Text>
                  {isSelected && <Icon name="check" size={16} color="#FFFFFF" />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Other text input */}
          <View style={styles.otherSection}>
            <Text style={styles.otherLabel}>Other</Text>
            <TextInput
              style={styles.otherInput}
              value={otherText}
              onChangeText={setOtherText}
              placeholder="Something else? Type it here..."
              placeholderTextColor={VARA_COLORS.sageGray}
              returnKeyType="done"
            />
          </View>

          {/* Submit */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                (selected.length === 0 && !otherText.trim()) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={selected.length === 0 && !otherText.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.submitText}>
                Submit{selected.length > 0 ? ` (${selected.length} selected)` : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VARA_COLORS.mistWhite,
  },
  scrollContent: {
    padding: Spacing.lg,
  },

  // Feedback card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: VARA_COLORS.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconRow: {
    marginBottom: 16,
  },
  headline: {
    fontSize: 18,
    fontWeight: '700',
    color: VARA_COLORS.teal,
    marginBottom: 8,
    lineHeight: 24,
  },
  body: {
    fontSize: 14,
    color: VARA_COLORS.sageGray,
    lineHeight: 21,
    marginBottom: 20,
  },
  ctaButton: {
    borderWidth: 1.5,
    borderColor: VARA_COLORS.teal,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '600',
    color: VARA_COLORS.teal,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: VARA_COLORS.mistWhite,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(27,94,87,0.08)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: VARA_COLORS.charcoal,
  },
  modalSubtitle: {
    fontSize: 14,
    color: VARA_COLORS.sageGray,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },

  // App grid
  appList: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  appGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingVertical: Spacing.base,
  },
  appChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(27,94,87,0.12)',
  },
  appChipSelected: {
    backgroundColor: VARA_COLORS.teal,
    borderColor: VARA_COLORS.teal,
  },
  appChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: VARA_COLORS.charcoal,
  },
  appChipTextSelected: {
    color: '#FFFFFF',
  },

  // Other
  otherSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(27,94,87,0.08)',
    paddingTop: Spacing.base,
  },
  otherLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: VARA_COLORS.sageGray,
    marginBottom: 6,
  },
  otherInput: {
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: VARA_COLORS.charcoal,
    borderWidth: 1,
    borderColor: 'rgba(27,94,87,0.1)',
  },

  // Footer
  modalFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(27,94,87,0.08)',
  },
  submitButton: {
    backgroundColor: VARA_COLORS.teal,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ConnectedAppsScreen;
