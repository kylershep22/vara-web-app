/**
 * Goals Screen
 * Manage user goals with progress tracking
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Platform, Modal as RNModal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, Input, Card, LoadingSpinner, ProgressBar, BrainPillarBadge, SwipeableGoalCard, ProgressUpdateModal, GoalMilestoneCheckmark, EnhancedModal, ModalFooterActions, BaseCard, InlineCreateButton } from '../components';
import { Colors, Spacing, Typography, Layout, getSuggestedMilestones, templatesToMilestones } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useGoals } from '../hooks';
import { createGoal, updateGoal, deleteGoal, updateGoalProgress, updateGoalProgressWithMilestones } from '../services/firebase';
import { Goal, BrainPillar, Milestone } from '../types';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

// Focus Area options with suggested brain health pillars
const FOCUS_OPTIONS = [
  {
    label: 'Physical Health & Fitness',
    value: 'Physical Health & Fitness',
    suggestedPillars: ['energy', 'resilience'] as BrainPillar[],
  },
  {
    label: 'Mental & Emotional Wellness',
    value: 'Mental & Emotional Wellness',
    suggestedPillars: ['resilience', 'focus'] as BrainPillar[],
  },
  {
    label: 'Lifestyle & Personal Growth',
    value: 'Lifestyle & Personal Growth',
    suggestedPillars: ['growth', 'focus'] as BrainPillar[],
  },
  {
    label: 'Sleep & Recovery',
    value: 'Sleep & Recovery',
    suggestedPillars: ['energy', 'resilience'] as BrainPillar[],
  },
];

// All available brain health pillars for selection
const BRAIN_PILLARS: { value: BrainPillar; label: string; description: string }[] = [
  { value: 'growth', label: 'Growth', description: 'Learning & trying new things' },
  { value: 'energy', label: 'Energy', description: 'Vitality & recharge' },
  { value: 'focus', label: 'Focus', description: 'Attention & clarity' },
  { value: 'resilience', label: 'Resilience', description: 'Recovery & strength' },
  { value: 'connection', label: 'Connection', description: 'Relationships & belonging' },
];

// Timeframe options from web app (research-backed)
const TIMEFRAME_OPTIONS = [
  { label: '21 days (Build a habit)', value: '21 days' },
  { label: '30 days (Monthly challenge)', value: '30 days' },
  { label: '66 days (Make it stick)', value: '66 days' },
  { label: '90 days (Transform your life)', value: '90 days' },
  { label: '6 months (Major change)', value: '6 months' },
  { label: '1 year (Long-term goal)', value: '1 year' },
];

interface GoalsScreenProps {
  hideHeader?: boolean;
  /** Filter passed from parent (PlanScreen) */
  externalFilter?: string;
  /** Show inline create button instead of FAB */
  showInlineCreate?: boolean;
}

const GoalsScreen: React.FC<GoalsScreenProps> = ({
  hideHeader = false,
  externalFilter,
  showInlineCreate = false,
}) => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { goals, loading, error: goalsError, retry: retryGoals } = useGoals();
  const [filter, setFilter] = useState(externalFilter || 'all');

  // Sync filter with external filter from PlanScreen
  useEffect(() => {
    if (externalFilter) {
      setFilter(externalFilter);
    }
  }, [externalFilter]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    primaryFocus: '',
    timeframe: '',
    progress: 0,
    brainPillars: [] as BrainPillar[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [focusMenuVisible, setFocusMenuVisible] = useState(false);
  const [timeframeMenuVisible, setTimeframeMenuVisible] = useState(false);

  // State for swipeable cards and progress modal
  const [revealedCardId, setRevealedCardId] = useState<string | null>(null);
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [progressModalGoal, setProgressModalGoal] = useState<Goal | null>(null);

  // State for milestone celebration
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState('');
  const [celebrationSubMessage, setCelebrationSubMessage] = useState('');

  // Filter goals
  const filteredGoals = goals.filter((goal) => {
    if (filter === 'active') return goal.status === 'active';
    if (filter === 'completed') return goal.status === 'completed';
    return true;
  });

  const handleCreateGoal = () => {
    setEditingGoal(null);
    setFormData({ title: '', primaryFocus: '', timeframe: '', progress: 0, brainPillars: [] });
    setModalVisible(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      title: goal.title,
      primaryFocus: goal.primaryFocus,
      timeframe: goal.timeframe,
      progress: goal.progress,
      brainPillars: goal.brainPillars || [],
    });
    setModalVisible(true);
  };

  const togglePillar = (pillar: BrainPillar) => {
    setFormData(prev => ({
      ...prev,
      brainPillars: prev.brainPillars.includes(pillar)
        ? prev.brainPillars.filter(p => p !== pillar)
        : [...prev.brainPillars, pillar],
    }));
  };

  const handleFocusChange = (focusValue: string) => {
    const selectedOption = FOCUS_OPTIONS.find(opt => opt.value === focusValue);
    setFormData(prev => ({
      ...prev,
      primaryFocus: focusValue,
      // Auto-suggest pillars based on focus area
      brainPillars: selectedOption?.suggestedPillars || prev.brainPillars,
    }));
    setFocusMenuVisible(false);
  };

  const handleSubmit = async () => {
    // Check user authentication first
    if (!user || !user.uid) {
      Alert.alert('Authentication Error', 'You must be logged in to create a goal. Please sign out and sign back in.');
      return;
    }

    if (!formData.title.trim() || !formData.primaryFocus.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, formData);
      } else {
        // Generate milestones based on focus area and timeframe
        const milestoneTemplates = getSuggestedMilestones(formData.primaryFocus, formData.timeframe);
        const milestones = templatesToMilestones(milestoneTemplates);

        await createGoal(user.uid, {
          ...formData,
          status: 'active',
          milestones,
        });
      }
      setModalVisible(false);
      setFormData({ title: '', primaryFocus: '', timeframe: '', progress: 0, brainPillars: [] });
    } catch (error: any) {
      console.error('Error saving goal:', error);
      const errorMessage = error?.message || 'Failed to save goal.';
      Alert.alert(
        'Unable to Save Goal',
        `${errorMessage}\n\nPlease check your internet connection and try again. If the problem persists, try signing out and back in.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGoal(goalId);
            } catch (error) {
              console.error('Error deleting goal:', error);
              Alert.alert('Error', 'Failed to delete goal');
            }
          },
        },
      ]
    );
  };

  const handleUpdateProgress = async (goalId: string, newProgress: number) => {
    try {
      await updateGoalProgress(goalId, newProgress);
      // Auto-complete if progress reaches 100%
      if (newProgress >= 100) {
        await updateGoal(goalId, { status: 'completed', progress: 100 });
      }
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  // Handlers for swipeable card interactions
  const handleRevealChange = useCallback((goalId: string, revealed: boolean) => {
    setRevealedCardId(revealed ? goalId : null);
  }, []);

  const handleQuickProgressUpdate = useCallback(async (goalId: string, increment: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const newProgress = Math.min(100, goal.progress + increment);

    try {
      const result = await updateGoalProgressWithMilestones(goalId, newProgress);

      // Show milestone celebration if any were completed
      if (result.completedMilestones && result.completedMilestones.length > 0) {
        const milestone = result.completedMilestones[0];
        setCelebrationMessage('Milestone Reached!');
        setCelebrationSubMessage(milestone.title);
        setCelebrationVisible(true);
      }

      // Auto-complete if progress reaches 100%
      if (newProgress >= 100) {
        await updateGoal(goalId, { status: 'completed' });
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      Alert.alert('Error', 'Failed to update progress');
    }
  }, [goals]);

  const handleMoreOptions = useCallback((goal: Goal) => {
    setProgressModalGoal(goal);
    setProgressModalVisible(true);
  }, []);

  const handleProgressModalUpdate = useCallback(async (goalId: string, newProgress: number, note?: string): Promise<Milestone[]> => {
    const result = await updateGoalProgressWithMilestones(goalId, newProgress, note);
    return result.completedMilestones || [];
  }, []);

  const handleGoalComplete = useCallback((goal: Goal) => {
    setCelebrationMessage('Goal Complete!');
    setCelebrationSubMessage(goal.title);
    setCelebrationVisible(true);
  }, []);

  const handleCelebrationComplete = useCallback(() => {
    setCelebrationVisible(false);
    setCelebrationMessage('');
    setCelebrationSubMessage('');
  }, []);

  const handleCompleteGoal = (goalId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'active' : 'completed';
    const actionText = newStatus === 'completed' ? 'Mark as Complete' : 'Mark as Active';

    Alert.alert(
      actionText,
      `Are you sure you want to ${actionText.toLowerCase()} this goal?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              const updates: any = { status: newStatus };
              if (newStatus === 'completed') {
                updates.progress = 100;
              }
              await updateGoal(goalId, updates);
            } catch (error) {
              console.error('Error updating goal status:', error);
              Alert.alert('Error', 'Failed to update goal status');
            }
          },
        },
      ]
    );
  };

  const renderGoalItem = ({ item }: { item: Goal }) => (
    <SwipeableGoalCard
      goal={item}
      isRevealed={revealedCardId === item.id}
      onRevealChange={handleRevealChange}
      onProgressUpdate={handleQuickProgressUpdate}
      onMoreOptions={handleMoreOptions}
      onPress={handleEditGoal}
    />
  );

  if (loading) {
    return <LoadingSpinner message="Loading goals..." />;
  }

  // Show error state if goals failed to load
  if (goalsError) {
    return (
      <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle" size={64} color={Colors.error} />
          <Text style={[styles.emptyTitle, { color: Colors.error }]}>
            Unable to Load Goals
          </Text>
          <Text style={styles.emptyText}>
            There was a problem loading your goals. Please check your connection and try again.
          </Text>
          <Text style={[styles.emptyText, { marginTop: Spacing.sm }]}>
            Error: {goalsError.message}
          </Text>
          <Button
            variant="outline"
            onPress={retryGoals}
            style={{ marginTop: 12 }}
          >
            Try again
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.screenTitle}>
            Goals
          </Text>
          <Text style={styles.subtitle}>
            Track your progress toward your dreams
          </Text>
        </View>
      )}

      {/* Filter - Only show when not using external filter from PlanScreen */}
      {!externalFilter && (
        <View style={styles.filterContainer}>
          <View style={{flexDirection: 'row', backgroundColor: Colors.dewSage + '30', borderRadius: 12, padding: 4}}>
            {[
              { value: 'all', label: 'All' },
              { value: 'active', label: 'Active' },
              { value: 'completed', label: 'Done' },
            ].map(btn => (
              <TouchableOpacity key={btn.value} onPress={() => setFilter(btn.value)}
                style={{flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: filter === btn.value ? Colors.surface : 'transparent', alignItems: 'center' as const}}>
                <Text style={{fontSize: 14, fontWeight: filter === btn.value ? '600' : '400', color: filter === btn.value ? Colors.evergreenTeal : Colors.textSecondary}}>{btn.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Inline Create Button - Only show when embedded in PlanScreen */}
      {showInlineCreate && (
        <InlineCreateButton
          label="Add a goal"
          onPress={handleCreateGoal}
        />
      )}

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Icon name="leaf" size={32} color={Colors.silverSage} />
          </View>
          <Text style={styles.emptyTitle}>
            A fresh space for your goals
          </Text>
          <Text style={styles.emptyText}>
            Add a goal whenever you're ready - no rush.
          </Text>
          {!showInlineCreate && (
            <Button
              variant="primary"
              onPress={handleCreateGoal}
              style={styles.emptyButton}
            >
              Add a goal
            </Button>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredGoals}
          renderItem={renderGoalItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB - Only show when NOT using inline create */}
      {!showInlineCreate && (
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCreateGoal}
          activeOpacity={0.8}
        >
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Create/Edit Modal */}
      <EnhancedModal
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        title={editingGoal ? 'Edit Goal' : 'New Goal'}
        subtitle="Track your progress toward your dreams"
        headerIcon="target"
        inputAccessoryViewID="goal-modal"
        footer={
          <ModalFooterActions
            onCancel={() => setModalVisible(false)}
            onSubmit={handleSubmit}
            submitLabel={editingGoal ? 'Update' : 'Create'}
            submitLoading={submitting}
            submitDisabled={submitting}
          />
        }
      >
        <Input
          label="Goal Title *"
          value={formData.title}
          onChangeText={(text) => setFormData({ ...formData, title: text })}
          placeholder="e.g., Exercise 3 times per week"
          style={styles.input}
          inputAccessoryViewID="goal-modal"
        />

        {/* Focus Area Dropdown */}
        <Text style={styles.fieldLabel}>
          Focus Area * (SMART Goal Category)
        </Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setFocusMenuVisible(!focusMenuVisible)}
        >
          <Text style={formData.primaryFocus ? styles.dropdownText : styles.dropdownPlaceholder}>
            {formData.primaryFocus || 'Select focus area...'}
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>
        {focusMenuVisible && (
          <View style={{backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.base, marginTop: -Spacing.base + 4}}>
            {FOCUS_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => handleFocusChange(option.value)}
                style={{paddingVertical: 12, paddingHorizontal: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.borderLight}}
              >
                <Text style={{fontSize: 14, color: Colors.textPrimary}}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Timeframe Dropdown */}
        <Text style={styles.fieldLabel}>
          Timeframe (Time-bound)
        </Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setTimeframeMenuVisible(!timeframeMenuVisible)}
        >
          <Text style={formData.timeframe ? styles.dropdownText : styles.dropdownPlaceholder}>
            {formData.timeframe || 'Select timeframe...'}
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>
        {timeframeMenuVisible && (
          <View style={{backgroundColor: Colors.surface, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.base, marginTop: -Spacing.base + 4}}>
            {TIMEFRAME_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  setFormData({ ...formData, timeframe: option.value });
                  setTimeframeMenuVisible(false);
                }}
                style={{paddingVertical: 12, paddingHorizontal: Spacing.base, borderBottomWidth: 1, borderBottomColor: Colors.borderLight}}
              >
                <Text style={{fontSize: 14, color: Colors.textPrimary}}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Brain Health Pillars */}
        <Text style={styles.fieldLabel}>
          What does this goal support? (Optional)
        </Text>
        <Text style={styles.helpText}>
          Select the areas of wellness this goal will help you build
        </Text>
        <View style={styles.pillarsContainer}>
          {BRAIN_PILLARS.map((pillar) => (
            <TouchableOpacity
              key={pillar.value}
              style={[
                styles.pillarChip,
                formData.brainPillars.includes(pillar.value) && styles.pillarChipSelected,
              ]}
              onPress={() => togglePillar(pillar.value)}
            >
              <BrainPillarBadge pillar={pillar.value} />
            </TouchableOpacity>
          ))}
        </View>
      </EnhancedModal>

      {/* Progress Update Modal */}
      <ProgressUpdateModal
        visible={progressModalVisible}
        goal={progressModalGoal}
        onClose={() => {
          setProgressModalVisible(false);
          setProgressModalGoal(null);
        }}
        onUpdateProgress={handleProgressModalUpdate}
        onGoalComplete={handleGoalComplete}
      />

      {/* Milestone Celebration Overlay */}
      <GoalMilestoneCheckmark
        visible={celebrationVisible}
        message={celebrationMessage}
        subMessage={celebrationSubMessage}
        onComplete={handleCelebrationComplete}
        duration={2500}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  filterContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.base,
  },
  segmentedButtons: {
    backgroundColor: Colors.surface,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  goalCard: {
    marginBottom: Spacing.base,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
  },
  goalTitleContainer: {
    flex: 1,
  },
  goalTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  goalMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  goalFocus: {
    color: Colors.textSecondary,
  },
  goalTimeframe: {
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  statusBadge: {
    backgroundColor: Colors.sunriseAmber,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.lg,
  },
  statusCompleted: {
    backgroundColor: Colors.success,
  },
  statusPaused: {
    backgroundColor: Colors.textSecondary,
  },
  statusText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    // Note: No uppercase per UI standards (sentence case only)
  },
  progressContainer: {
    marginBottom: Spacing.base,
  },
  progressControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.base,
    marginBottom: Spacing.sm,
  },
  progressButton: {
    backgroundColor: Colors.dewSage,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
  },
  progressButtonText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  goalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
  },
  actionButton: {
    marginLeft: Spacing.sm,
  },
  deleteButton: {
    marginLeft: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    color: Colors.softCharcoal,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    color: Colors.mutedSageGray,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    minWidth: 200,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 9999,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  input: {
    marginBottom: Spacing.base,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.xs,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.base,
  },
  dropdownText: {
    color: Colors.textPrimary,
    fontSize: Typography.fontSize.base,
    flex: 1,
  },
  dropdownPlaceholder: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.base,
    flex: 1,
  },
  dropdownArrow: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  helpText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.sm,
  },
  pillarsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  pillarChip: {
    borderRadius: Layout.borderRadius.md,
    borderWidth: Layout.borderWidth.thin,
    borderColor: 'transparent',
    opacity: 0.6,
  },
  pillarChipSelected: {
    opacity: 1,
    borderColor: Colors.evergreenTeal,
  },
  pillarsDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  pillarBadge: {
    marginRight: 0,
  },
});

export default GoalsScreen;
