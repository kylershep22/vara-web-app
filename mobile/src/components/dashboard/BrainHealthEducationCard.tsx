/**
 * Brain Health Education Card
 * Displays educational content about brain health tied to user's recent activity
 * Uses consistent Dew Sage + Evergreen Teal treatment
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import Card from '../Card';
import { BrainPillar } from '../../types/models';

interface EducationContent {
  pillar: BrainPillar;
  icon: string;
  title: string;
  fact: string;
  actionTip: string;
  learnMoreRoute: string;
}

// Educational content for each brain pillar - all use teal styling now
const EDUCATION_CONTENT: EducationContent[] = [
  // Energy pillar
  {
    pillar: 'energy',
    icon: 'lightning-bolt',
    title: 'Power Your Brain',
    fact: 'Your brain uses 20% of your body\'s energy despite being only 2% of your weight.',
    actionTip: 'Try a quick movement break to boost blood flow and mental clarity.',
    learnMoreRoute: 'Movement',
  },
  {
    pillar: 'energy',
    icon: 'sleep',
    title: 'Rest for Success',
    fact: 'During deep sleep, your brain clears toxins 10x faster than when awake.',
    actionTip: 'Prioritize 7-9 hours of quality sleep for optimal brain function.',
    learnMoreRoute: 'Sleep',
  },

  // Focus pillar
  {
    pillar: 'focus',
    icon: 'target',
    title: 'Master Your Focus',
    fact: 'The prefrontal cortex, responsible for focus, is the last brain region to fully develop.',
    actionTip: 'Work in 90-minute cycles with breaks to maintain peak concentration.',
    learnMoreRoute: 'Focus',
  },
  {
    pillar: 'focus',
    icon: 'meditation',
    title: 'Train Attention',
    fact: 'Just 8 weeks of mindfulness practice can measurably change brain structure.',
    actionTip: 'Try 5 minutes of focused breathing to strengthen your attention muscles.',
    learnMoreRoute: 'Breathwork',
  },

  // Growth pillar
  {
    pillar: 'growth',
    icon: 'brain',
    title: 'Grow Your Brain',
    fact: 'Neuroplasticity allows your brain to form new connections throughout your entire life.',
    actionTip: 'Learn something new today - even 15 minutes of learning stimulates brain growth.',
    learnMoreRoute: 'Masterclass',
  },
  {
    pillar: 'growth',
    icon: 'book-open-variant',
    title: 'Learn to Thrive',
    fact: 'Challenging mental activities build cognitive reserve that protects against decline.',
    actionTip: 'Journal your thoughts - writing strengthens neural pathways.',
    learnMoreRoute: 'Journal',
  },

  // Resilience pillar
  {
    pillar: 'resilience',
    icon: 'shield-check',
    title: 'Build Resilience',
    fact: 'Your vagus nerve connects brain and body, helping regulate stress response.',
    actionTip: 'Deep breathing activates your parasympathetic nervous system in seconds.',
    learnMoreRoute: 'Breathwork',
  },
  {
    pillar: 'resilience',
    icon: 'heart-pulse',
    title: 'Stress Mastery',
    fact: 'Moderate stress can actually improve memory and focus through hormesis.',
    actionTip: 'Reframe challenges as growth opportunities for your brain.',
    learnMoreRoute: 'BrainHealth',
  },

  // Connection pillar
  {
    pillar: 'connection',
    icon: 'account-group',
    title: 'Social Brain Health',
    fact: 'Strong social connections can reduce risk of cognitive decline by up to 50%.',
    actionTip: 'Reach out to someone today - social interaction is brain food.',
    learnMoreRoute: 'Community',
  },
  {
    pillar: 'connection',
    icon: 'account-heart',
    title: 'The Power of Connection',
    fact: 'Oxytocin released during social bonding improves memory and learning.',
    actionTip: 'Quality conversations matter more than quantity for brain health.',
    learnMoreRoute: 'Community',
  },
];

interface BrainHealthEducationCardProps {
  preferredPillar?: BrainPillar;
}

export const BrainHealthEducationCard: React.FC<BrainHealthEducationCardProps> = ({
  preferredPillar,
}) => {
  const navigation = useNavigation<any>();

  // Select content based on day of year and preferred pillar
  const content = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);

    // Filter by preferred pillar if provided
    let availableContent = EDUCATION_CONTENT;
    if (preferredPillar) {
      const pillarContent = EDUCATION_CONTENT.filter((c) => c.pillar === preferredPillar);
      if (pillarContent.length > 0) {
        availableContent = pillarContent;
      }
    }

    // Select based on day
    return availableContent[dayOfYear % availableContent.length];
  }, [preferredPillar]);

  const handleLearnMore = () => {
    navigation.navigate(content.learnMoreRoute);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Icon name={content.icon as any} size={24} color={Colors.evergreenTeal} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.pillarLabel}>
            {content.pillar.charAt(0).toUpperCase() + content.pillar.slice(1)}
          </Text>
          <Text style={styles.title}>{content.title}</Text>
        </View>
      </View>

      {/* Fact */}
      <View style={styles.factContainer}>
        <Icon name="lightbulb-outline" size={16} color={Colors.evergreenTeal} style={styles.factIcon} />
        <Text style={styles.factText}>{content.fact}</Text>
      </View>

      {/* Action Tip */}
      <View style={styles.tipContainer}>
        <Text style={styles.tipLabel}>Try this:</Text>
        <Text style={styles.tipText}>{content.actionTip}</Text>
      </View>

      {/* Learn More Button - Text only */}
      <TouchableOpacity
        style={styles.learnMoreButton}
        onPress={handleLearnMore}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Learn more about ${content.title}`}
      >
        <Text style={styles.learnMoreText}>Learn More</Text>
        <Icon name="arrow-right" size={14} color={Colors.evergreenTeal} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: `${Colors.dewSage}66`, // 40% opacity
    borderRadius: 14,
    borderLeftWidth: 3.5,
    borderLeftColor: Colors.evergreenTeal,
    padding: 16,
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${Colors.dewSage}80`, // 50% opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  pillarLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.evergreenTeal,
    textTransform: 'uppercase',
    letterSpacing: 0.03 * 11,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.evergreenTeal,
    marginTop: 2,
  },
  factContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
  },
  factIcon: {
    marginRight: Spacing.xs,
    marginTop: 2,
  },
  factText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textPrimary, // Soft Charcoal
    lineHeight: 14 * 1.55,
  },
  tipContainer: {
    marginBottom: Spacing.base,
  },
  tipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.evergreenTeal,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.textSecondary,
    lineHeight: 14 * 1.4,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  learnMoreText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.evergreenTeal,
    marginRight: 4,
  },
});

export default BrainHealthEducationCard;
