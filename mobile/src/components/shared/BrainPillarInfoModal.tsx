/**
 * Brain Pillar Info Modal
 * Educational modal explaining the 5 brain health pillars
 */

import React from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Modal, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { BrainPillar } from '../../types';

interface BrainPillarInfoModalProps {
  visible: boolean;
  onDismiss: () => void;
  highlightPillar?: BrainPillar;
}

interface PillarInfo {
  pillar: BrainPillar;
  label: string;
  icon: string;
  color: string;
  description: string;
  benefits: string[];
  examples: string[];
}

const PILLAR_INFO: PillarInfo[] = [
  {
    pillar: 'growth',
    label: 'Growth',
    icon: 'sprout',
    color: Colors.brainPillars.growth,
    description: 'Learning, adaptation, and trying new things (neuroplasticity)',
    benefits: [
      'Strengthens neural connections',
      'Improves memory and learning',
      'Builds cognitive flexibility',
      'Enhances creativity and problem-solving',
    ],
    examples: [
      'Learning a new skill',
      'Trying something uncomfortable',
      'Reading and studying',
      'Creative hobbies',
      'Mindfulness practices',
    ],
  },
  {
    pillar: 'energy',
    label: 'Energy',
    icon: 'lightning-bolt',
    color: Colors.brainPillars.energy,
    description: 'Sleep, nutrition, and vitality (neuroenergy)',
    benefits: [
      'Fuels brain function',
      'Supports memory consolidation',
      'Improves mental clarity',
      'Enhances physical vitality',
    ],
    examples: [
      'Quality sleep (7-9 hours)',
      'Healthy nutrition',
      'Hydration',
      'Regular movement',
      'Time outdoors',
    ],
  },
  {
    pillar: 'focus',
    label: 'Focus',
    icon: 'eye',
    color: Colors.brainPillars.focus,
    description: 'Attention, concentration, and clarity (neurofocus)',
    benefits: [
      'Sharpens attention span',
      'Improves working memory',
      'Enhances productivity',
      'Reduces mental fog',
    ],
    examples: [
      'Deep work sessions',
      'Meditation',
      'Breathwork',
      'Limiting distractions',
      'Single-tasking',
    ],
  },
  {
    pillar: 'resilience',
    label: 'Resilience',
    icon: 'shield-check',
    color: Colors.brainPillars.resilience,
    description: 'Stress management and recovery (neuroresilience)',
    benefits: [
      'Builds stress tolerance',
      'Speeds recovery from challenges',
      'Strengthens emotional regulation',
      'Improves mental toughness',
    ],
    examples: [
      'Stress management practices',
      'Recovery activities',
      'Challenging yourself',
      'Cold exposure',
      'Breathwork for calm',
    ],
  },
  {
    pillar: 'connection',
    label: 'Connection',
    icon: 'account-heart',
    color: Colors.brainPillars.connection,
    description: 'Social bonds and belonging (neurosocial health)',
    benefits: [
      'Reduces stress and anxiety',
      'Boosts mood and motivation',
      'Provides support network',
      'Enhances sense of purpose',
    ],
    examples: [
      'Quality time with loved ones',
      'Community involvement',
      'Meaningful conversations',
      'Group activities',
      'Acts of kindness',
    ],
  },
];

export const BrainPillarInfoModal: React.FC<BrainPillarInfoModalProps> = ({
  visible,
  onDismiss,
  highlightPillar,
}) => {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();

  // Calculate safe modal height accounting for safe areas
  const modalMaxHeight = screenHeight - insets.top - insets.bottom - 40;

  return (
    <Modal
      visible={visible}
      onRequestClose={onDismiss}
      transparent
      animationType="fade"
    >
      <View style={styles.modalOverlay}>
      <View style={[styles.modal, { maxHeight: modalMaxHeight }]}>
        <ScrollView
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.modalTitle}>
            Brain Health Pillars
          </Text>
          <Text style={styles.modalSubtitle}>
            5 science-backed foundations for optimal brain health
          </Text>

          {PILLAR_INFO.map((info, index) => (
            <View
              key={info.pillar}
              style={[
                styles.pillarCard,
                highlightPillar === info.pillar && styles.pillarCardHighlight,
                index === PILLAR_INFO.length - 1 && { marginBottom: 0 },
              ]}
              accessibilityLabel={`${info.label} pillar: ${info.description}`}
              accessibilityRole="summary"
            >
              {/* Header */}
              <View style={styles.pillarHeader}>
                <View
                  style={[
                    styles.pillarIconContainer,
                    { backgroundColor: info.color + '20' },
                  ]}
                >
                  <Icon name={info.icon} size={24} color={info.color} />
                </View>
                <View style={styles.pillarHeaderText}>
                  <Text style={[styles.pillarLabel, { color: info.color }]}>
                    {info.label}
                  </Text>
                  <Text style={styles.pillarDescription}>
                    {info.description}
                  </Text>
                </View>
              </View>

              {/* Benefits */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Benefits:
                </Text>
                {info.benefits.map((benefit, idx) => (
                  <View key={idx} style={styles.bulletPoint}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.bulletText}>
                      {benefit}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Examples */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Supported by:
                </Text>
                <View style={styles.examplesContainer}>
                  {info.examples.map((example, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.exampleChip,
                        { backgroundColor: info.color + '15', borderColor: info.color + '40' },
                      ]}
                    >
                      <Text style={styles.exampleText}>
                        {example}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ))}

          <View style={styles.modalActions}>
            <TouchableOpacity
              onPress={onDismiss}
              style={styles.closeButton}
            >
              <Text style={styles.closeButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    // maxHeight is now set dynamically with safe area insets
    overflow: 'hidden',
  },
  scrollContent: {
    paddingBottom: Spacing.sm,
  },
  modalTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  pillarCard: {
    backgroundColor: Colors.borderLight,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  pillarCardHighlight: {
    borderWidth: Layout.borderWidth.medium,
    borderColor: Colors.evergreenTeal,
  },
  pillarHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
  },
  pillarIconContainer: {
    width: 48,
    height: 48,
    borderRadius: Layout.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  pillarHeaderText: {
    flex: 1,
  },
  pillarLabel: {
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs / 2,
  },
  pillarDescription: {
    color: Colors.textSecondary,
    lineHeight: Typography.fontSize.sm * 1.4,
  },
  section: {
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs / 2,
    paddingLeft: Spacing.sm,
  },
  bullet: {
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
    fontSize: Typography.fontSize.sm,
  },
  bulletText: {
    flex: 1,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSize.sm * 1.4,
  },
  examplesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  exampleChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Layout.borderRadius.sm,
    borderWidth: Layout.borderWidth.thin,
  },
  exampleText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  modalActions: {
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  closeButton: {
    width: '100%',
    backgroundColor: Colors.evergreenTeal,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
  },
  closeButtonText: {
    color: Colors.textOnPrimary,
    fontWeight: Typography.fontWeight.semibold,
    fontSize: Typography.fontSize.base,
  },
});
