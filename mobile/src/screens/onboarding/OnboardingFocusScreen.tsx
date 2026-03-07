/**
 * Onboarding Focus Screen
 * Let users choose their primary brain health pillar (single-select)
 *
 * Design Philosophy: Guide users to focus on one pillar initially to prevent
 * overwhelm. Features unlock progressively based on the selected pillar.
 * Users can always unlock all features at any time.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button } from '../../components';
import { Colors, Spacing, Typography, Layout, BRAIN_PILLARS } from '../../constants';
import type { BrainPillar, BrainPillarConfig } from '../../constants';
import { setSelectedPillar } from '../../services/firebase/featureUnlock.service';
import { useAuth } from '../../context/AuthContext';

// Re-export for backward compatibility with other onboarding screens
export type FocusArea = 'physical' | 'mental' | 'productivity' | 'growth' | 'community';

interface OnboardingFocusScreenProps {
  navigation: any;
  route: any;
}

const OnboardingFocusScreen: React.FC<OnboardingFocusScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [selectedPillar, setSelectedPillarState] = useState<BrainPillar | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSelectPillar = (pillar: BrainPillar) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPillarState(pillar);
  };

  const handleContinue = async () => {
    if (!selectedPillar || !user) return;

    setSaving(true);
    try {
      // Save the selected pillar to the user's profile
      await setSelectedPillar(user.uid, selectedPillar);

      // Map pillar to legacy focus areas for compatibility with QuickStart screen
      const pillarToFocusMap: Record<BrainPillar, FocusArea[]> = {
        focus: ['productivity', 'mental'],
        energy: ['physical', 'mental'],
        growth: ['growth', 'productivity'],
        resilience: ['mental', 'growth'],
        connection: ['community', 'mental'],
      };

      navigation.navigate('OnboardingQuickStart', {
        selectedFocus: pillarToFocusMap[selectedPillar],
        selectedPillar,
      });
    } catch (error) {
      console.error('Error saving pillar:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    // Skip to tour with no specific focus - will use defaults
    navigation.navigate('OnboardingTour', {
      selectedFocus: [],
      skipped: true,
    });
  };

  const renderPillarCard = (pillar: BrainPillarConfig) => {
    const isSelected = selectedPillar === pillar.id;

    return (
      <TouchableOpacity
        key={pillar.id}
        style={[
          styles.pillarCard,
          isSelected && styles.pillarCardSelected,
          { borderColor: isSelected ? pillar.color : Colors.border },
        ]}
        onPress={() => handleSelectPillar(pillar.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.pillarIcon, { backgroundColor: pillar.color + '20' }]}>
          <Icon name={pillar.icon as any} size={28} color={pillar.color} />
        </View>
        <View style={styles.pillarContent}>
          <Text style={styles.pillarTitle}>{pillar.title}</Text>
          <Text style={styles.pillarSubtitle}>{pillar.subtitle}</Text>
          <Text style={styles.pillarDescription}>{pillar.description}</Text>
        </View>
        {isSelected && (
          <View style={[styles.checkmark, { backgroundColor: pillar.color }]}>
            <Icon name="check" size={16} color={Colors.white} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
          <View style={styles.progressDot} />
        </View>

        {/* Header */}
        <Text style={styles.title}>
          Choose your starting focus
        </Text>

        <Text style={styles.subtitle}>
          We'll customize your experience based on your choice. Don't worry — you can unlock more features anytime!
        </Text>

        {/* Pillar Options */}
        <View style={styles.pillarsContainer}>
          {BRAIN_PILLARS.map(renderPillarCard)}
        </View>

        {/* Info note */}
        <View style={styles.infoNote}>
          <Icon name="information-outline" size={16} color={Colors.evergreenTeal} />
          <Text style={styles.infoNoteText}>
            More features unlock as you use the app, or you can unlock everything in Settings.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            variant="primary"
            onPress={handleContinue}
            disabled={!selectedPillar || saving}
            loading={saving}
            fullWidth
            style={styles.continueButton}
          >
            Continue with {selectedPillar ? BRAIN_PILLARS.find(p => p.id === selectedPillar)?.title : '...'}
          </Button>

          <Button
            variant="text"
            onPress={handleSkip}
            fullWidth
          >
            Skip for now
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.base,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderLight,
  },
  progressDotActive: {
    backgroundColor: Colors.evergreenTeal,
    width: 24,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: Typography.fontSize.sm * 1.5,
  },
  pillarsContainer: {
    marginBottom: Spacing.base,
  },
  pillarCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  pillarCardSelected: {
    backgroundColor: Colors.dewSage,
  },
  pillarIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  pillarContent: {
    flex: 1,
  },
  pillarTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  pillarSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  pillarDescription: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSize.xs * 1.4,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.xs,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  infoNoteText: {
    flex: 1,
    fontSize: Typography.fontSize.xs,
    color: Colors.evergreenTeal,
    lineHeight: Typography.fontSize.xs * 1.4,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: Spacing.sm,
  },
  continueButton: {
    marginBottom: Spacing.sm,
  },
});

export default OnboardingFocusScreen;
