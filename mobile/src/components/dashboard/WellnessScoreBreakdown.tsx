/**
 * Wellness Score Breakdown
 *
 * Modal view showing the detailed breakdown of the wellness score
 * with all 4 pillars and their individual components.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  Dimensions,
  Text,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { DailyWellnessScore, WellnessScorePillar, WellnessScoreComponent, WellnessIncompleteAction } from '../../types';
import { getScoreColor, getScoreLabel } from '../../services/firebase';

const { width } = Dimensions.get('window');

interface WellnessScoreBreakdownProps {
  visible: boolean;
  onClose: () => void;
  score: DailyWellnessScore | null;
  onNavigate?: (route: string) => void;
}

// Pillar metadata for display
const PILLAR_META: Record<string, { icon: string; color: string; label: string; description: string }> = {
  foundation: {
    icon: 'home-heart',
    color: Colors.evergreenTeal,
    label: 'Foundation',
    description: 'Sleep, hydration, and stress levels',
  },
  consistency: {
    icon: 'calendar-check',
    color: Colors.sunriseAmber,
    label: 'Consistency',
    description: 'Habits, daily practices, and momentum',
  },
  mind: {
    icon: 'head-heart',
    color: Colors.lavenderMist,
    label: 'Mind',
    description: 'Mood, reflection, and nervous system',
  },
  growth: {
    icon: 'sprout',
    color: Colors.success,
    label: 'Growth',
    description: 'Challenges and meaningful connections',
  },
};

// Component to render a single pillar card
const PillarCard: React.FC<{
  pillar: WellnessScorePillar;
  pillarKey: string;
  onNavigate?: (route: string) => void;
}> = ({
  pillar,
  pillarKey,
  onNavigate,
}) => {
  const meta = PILLAR_META[pillarKey];
  const weightPercent = Math.round(pillar.weight * 100);

  return (
    <View style={styles.pillarCard}>
      {/* Pillar Header */}
      <View style={styles.pillarHeader}>
        <View style={[styles.pillarIconContainer, { backgroundColor: meta.color + '20' }]}>
          <Icon name={meta.icon} size={24} color={meta.color} />
        </View>
        <View style={styles.pillarTitleContainer}>
          <Text style={styles.pillarTitle}>{meta.label}</Text>
          <Text style={styles.pillarWeight}>{weightPercent}% of total</Text>
        </View>
        <View style={styles.pillarScoreContainer}>
          <Text style={[styles.pillarScore, { color: meta.color }]}>
            {pillar.score}
          </Text>
          <Text style={styles.pillarScoreLabel}>/100</Text>
        </View>
      </View>

      {/* Pillar Description */}
      <Text style={styles.pillarDescription}>{meta.description}</Text>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${pillar.score}%`, backgroundColor: meta.color },
            ]}
          />
        </View>
      </View>

      {/* Components */}
      <View style={styles.componentsContainer}>
        {pillar.components.map((component, index) => (
          <ComponentRow
            key={index}
            component={component}
            pillarColor={meta.color}
            onNavigate={onNavigate}
          />
        ))}
      </View>
    </View>
  );
};

// Component to render a single component row
const ComponentRow: React.FC<{
  component: WellnessScoreComponent;
  pillarColor: string;
  onNavigate?: (route: string) => void;
}> = ({
  component,
  pillarColor,
  onNavigate,
}) => {
  const statusConfig: Record<string, { icon: string; color: string }> = {
    positive: { icon: 'check-circle', color: Colors.success },
    neutral: { icon: 'minus-circle', color: Colors.sunriseAmber },
    negative: { icon: 'alert-circle', color: Colors.error },
    missing: { icon: 'circle-outline', color: Colors.textSecondary },
  };

  const statusIcon = statusConfig[component.status] || statusConfig.neutral;
  const isMissing = component.status === 'missing';

  const handlePress = () => {
    if (component.actionRoute && onNavigate) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onNavigate(component.actionRoute);
    }
  };

  const content = (
    <View style={[styles.componentRow, isMissing && styles.componentRowMissing]}>
      <Icon name={statusIcon.icon} size={16} color={statusIcon.color} />
      <Text style={[styles.componentLabel, isMissing && styles.componentLabelMissing]}>
        {component.label}
      </Text>
      {isMissing && component.actionLabel ? (
        <View style={styles.actionLabelContainer}>
          <Text style={styles.actionLabelText}>{component.actionLabel}</Text>
          <Icon name="chevron-right" size={14} color={Colors.evergreenTeal} />
        </View>
      ) : (
        <Text style={[styles.componentContribution, { color: pillarColor }]}>
          +{Math.round(component.contribution)}
        </Text>
      )}
    </View>
  );

  if (isMissing && component.actionRoute && onNavigate) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// Component to render an incomplete action item
const IncompleteActionItem: React.FC<{
  action: WellnessIncompleteAction;
  onNavigate?: (route: string) => void;
}> = ({ action, onNavigate }) => {
  const handlePress = () => {
    if (onNavigate) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onNavigate(action.route);
    }
  };

  const pillarMeta = PILLAR_META[action.pillar];

  return (
    <TouchableOpacity
      style={styles.incompleteActionItem}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.actionPillarBadge, { backgroundColor: pillarMeta.color + '20' }]}>
        <Icon name={pillarMeta.icon} size={16} color={pillarMeta.color} />
      </View>
      <View style={styles.actionContent}>
        <Text style={styles.actionDescription}>{action.description}</Text>
        <Text style={styles.actionPillarLabel}>{pillarMeta.label}</Text>
      </View>
      <Icon name="chevron-right" size={20} color={Colors.textSecondary} />
    </TouchableOpacity>
  );
};

export const WellnessScoreBreakdown: React.FC<WellnessScoreBreakdownProps> = ({
  visible,
  onClose,
  score,
  onNavigate,
}) => {
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const handleNavigate = (route: string) => {
    // Close the modal first, then navigate
    onClose();
    if (onNavigate) {
      onNavigate(route);
    }
  };

  if (!score) return null;

  const scoreColorType = getScoreColor(score.score);
  const scoreColor = scoreColorType === 'error'
    ? Colors.error
    : scoreColorType === 'warning'
    ? Colors.sunriseAmber
    : Colors.evergreenTeal;

  // Check for incomplete actions
  const hasIncompleteActions = score.incompleteActions && score.incompleteActions.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wellness Breakdown</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Overall Score Section */}
          <View style={styles.overallSection}>
            <View style={styles.overallScoreContainer}>
              <Text style={[styles.overallScore, { color: scoreColor }]}>
                {score.score}
              </Text>
              <Text style={styles.overallLabel}>{getScoreLabel(score.score)}</Text>
              {score.componentsTracked !== undefined && score.componentsTotal !== undefined && (
                <Text style={styles.trackingLabel}>
                  {score.componentsTracked}/{score.componentsTotal} tracked
                </Text>
              )}
            </View>

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              {score.topContributor && (
                <View style={styles.quickStat}>
                  <Icon name="arrow-up-circle" size={20} color={Colors.success} />
                  <Text style={styles.quickStatLabel}>Helping</Text>
                  <Text style={styles.quickStatValue}>{score.topContributor}</Text>
                </View>
              )}
              {score.topDetractor && score.topDetractor !== 'None' && (
                <View style={styles.quickStat}>
                  <Icon name="arrow-down-circle" size={20} color={Colors.error} />
                  <Text style={styles.quickStatLabel}>Opportunity</Text>
                  <Text style={styles.quickStatValue}>{score.topDetractor}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Incomplete Actions Section - Prominently displayed */}
          {hasIncompleteActions && (
            <View style={styles.incompleteActionsSection}>
              <View style={styles.incompleteActionsHeader}>
                <Icon name="clipboard-list-outline" size={20} color={Colors.evergreenTeal} />
                <Text style={styles.incompleteActionsTitle}>Complete Your Score</Text>
              </View>
              <Text style={styles.incompleteActionsSubtitle}>
                Track these to get a more accurate wellness score
              </Text>
              <View style={styles.incompleteActionsList}>
                {score.incompleteActions.map((action, index) => (
                  <IncompleteActionItem
                    key={index}
                    action={action}
                    onNavigate={handleNavigate}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Pillars Section */}
          <View style={styles.pillarsSection}>
            <Text style={styles.sectionTitle}>Score Breakdown</Text>

            <PillarCard pillar={score.pillars.foundation} pillarKey="foundation" onNavigate={handleNavigate} />
            <PillarCard pillar={score.pillars.consistency} pillarKey="consistency" onNavigate={handleNavigate} />
            <PillarCard pillar={score.pillars.mind} pillarKey="mind" onNavigate={handleNavigate} />
            <PillarCard pillar={score.pillars.growth} pillarKey="growth" onNavigate={handleNavigate} />
          </View>

          {/* Suggestion */}
          {score.suggestion && (
            <View style={styles.suggestionSection}>
              <View style={styles.suggestionHeader}>
                <Icon name="lightbulb-on" size={20} color={Colors.sunriseAmber} />
                <Text style={styles.suggestionTitle}>Suggested Action</Text>
              </View>
              <Text style={styles.suggestionText}>{score.suggestion}</Text>
            </View>
          )}

          {/* How It Works */}
          <View style={styles.howItWorksSection}>
            <Text style={styles.howItWorksTitle}>How your score is calculated</Text>
            <Text style={styles.howItWorksText}>
              Your wellness score combines physical foundation (sleep, hydration, stress),
              behavioral consistency (habits, daily practices), mental state (mood, journaling),
              and personal growth (challenges, connection). Track more activities to get
              a complete picture of your daily wellness.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  overallSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  overallScoreContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  overallScore: {
    fontSize: 32,
    fontWeight: Typography.fontWeight.bold,
    lineHeight: 80,
  },
  overallLabel: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textSecondary,
    marginTop: -Spacing.xs,
  },
  trackingLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  quickStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.base,
  },
  quickStat: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    minWidth: 120,
  },
  quickStatLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  quickStatValue: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 2,
  },
  completenessSection: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    width: '100%',
  },
  completenessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  completenessLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  missingDataText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  pillarsSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  pillarCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  pillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  pillarIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  pillarTitleContainer: {
    flex: 1,
  },
  pillarTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  pillarWeight: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  pillarScoreContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  pillarScore: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
  },
  pillarScoreLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginLeft: 2,
  },
  pillarDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  progressBarContainer: {
    marginBottom: Spacing.base,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: Colors.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  componentsContainer: {
    gap: Spacing.sm,
  },
  componentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  componentLabel: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  componentContribution: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  componentRowMissing: {
    backgroundColor: Colors.borderLight + '50',
    marginHorizontal: -Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
  },
  componentLabelMissing: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  actionLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionLabelText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  // Incomplete Actions Section
  incompleteActionsSection: {
    backgroundColor: Colors.evergreenTeal + '10',
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.evergreenTeal + '30',
  },
  incompleteActionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  incompleteActionsTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  incompleteActionsSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  incompleteActionsList: {
    gap: Spacing.sm,
  },
  incompleteActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    gap: Spacing.base,
  },
  actionPillarBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionDescription: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
  },
  actionPillarLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  suggestionSection: {
    backgroundColor: Colors.sunriseAmber + '15',
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  suggestionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  suggestionText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize.base * 1.5,
  },
  howItWorksSection: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  howItWorksTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  howItWorksText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSize.sm * 1.5,
  },
});

export default WellnessScoreBreakdown;
