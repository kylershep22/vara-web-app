/**
 * Goals Screen
 * Manage user goals with progress tracking
 */

import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, FAB, Portal, Modal, Button as PaperButton, SegmentedButtons, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Card, LoadingSpinner, ProgressBar, BrainPillarBadge } from '../components';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useGoals } from '../hooks';
import { createGoal, updateGoal, deleteGoal, updateGoalProgress } from '../services/firebase';
import { Goal, BrainPillar } from '../types';
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
}

const GoalsScreen: React.FC<GoalsScreenProps> = ({ hideHeader = false }) => {
  const { user } = useAuth();
  const { goals, loading, error: goalsError } = useGoals();
  const [filter, setFilter] = useState('all');
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
        await createGoal(user!.uid, {
          ...formData,
          status: 'active',
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
    <Card style={styles.goalCard}>
      <TouchableOpacity onPress={() => handleEditGoal(item)}>
        <View style={styles.goalHeader}>
          <View style={styles.goalTitleContainer}>
            <Text variant="titleMedium" style={styles.goalTitle}>
              {item.title}
            </Text>
            <View style={styles.goalMeta}>
              <Text variant="bodySmall" style={styles.goalFocus}>
                {item.primaryFocus}
              </Text>
              {item.timeframe && (
                <Text variant="bodySmall" style={styles.goalTimeframe}>
                  • {item.timeframe}
                </Text>
              )}
            </View>

            {/* Brain Health Pillars - Display if any pillars selected */}
            {item.brainPillars && item.brainPillars.length > 0 && (
              <View style={styles.pillarsDisplay}>
                {item.brainPillars.map((pillar) => (
                  <BrainPillarBadge key={pillar} pillar={pillar} style={styles.pillarBadge} />
                ))}
              </View>
            )}
          </View>
          <View
            style={[
              styles.statusBadge,
              item.status === 'completed' && styles.statusCompleted,
              item.status === 'paused' && styles.statusPaused,
            ]}
          >
            <Text variant="bodySmall" style={styles.statusText}>
              {item.status}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <ProgressBar progress={item.progress} style={styles.progressContainer} />

        {/* Progress Controls */}
        {item.status === 'active' && (
          <View style={styles.progressControls}>
            <TouchableOpacity
              onPress={() => handleUpdateProgress(item.id, Math.max(0, item.progress - 10))}
              style={styles.progressButton}
            >
              <Text style={styles.progressButtonText}>-10%</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleUpdateProgress(item.id, Math.min(100, item.progress + 10))}
              style={styles.progressButton}
            >
              <Text style={styles.progressButtonText}>+10%</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Actions */}
        <View style={styles.goalActions}>
          <Button
            variant="text"
            onPress={() => handleCompleteGoal(item.id, item.status)}
            style={styles.actionButton}
          >
            {item.status === 'completed' ? 'Reactivate' : 'Complete'}
          </Button>
          <Button variant="text" onPress={() => handleEditGoal(item)} style={styles.actionButton}>
            Edit
          </Button>
          <Button
            variant="text"
            onPress={() => handleDeleteGoal(item.id)}
            style={styles.deleteButton}
          >
            Delete
          </Button>
        </View>
      </TouchableOpacity>
    </Card>
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
          <Text variant="titleMedium" style={[styles.emptyTitle, { color: Colors.error }]}>
            Unable to Load Goals
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            There was a problem loading your goals. Please check your connection and try again.
          </Text>
          <Text variant="bodySmall" style={[styles.emptyText, { marginTop: Spacing.sm }]}>
            Error: {goalsError.message}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.screenTitle}>
            Goals
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Track your progress toward your dreams
          </Text>
        </View>
      )}

      {/* Filter */}
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={filter}
          onValueChange={setFilter}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Done' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎯</Text>
          <Text variant="titleMedium" style={styles.emptyTitle}>
            No goals yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Set your first goal to start your wellness journey!
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredGoals}
          renderItem={renderGoalItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB */}
      <FAB
        icon="plus"
        label="New Goal"
        style={styles.fab}
        onPress={handleCreateGoal}
        color={Colors.textOnPrimary}
      />

      {/* Create/Edit Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              showsVerticalScrollIndicator={true}
              contentContainerStyle={styles.scrollContent}
            >
              <Text variant="headlineSmall" style={styles.modalTitle}>
                {editingGoal ? 'Edit Goal' : 'New Goal'}
              </Text>

              <Input
                label="Goal Title *"
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
                placeholder="e.g., Exercise 3 times per week"
                style={styles.input}
              />

              {/* Focus Area Dropdown */}
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                Focus Area * (SMART Goal Category)
              </Text>
              <Menu
                visible={focusMenuVisible}
                onDismiss={() => setFocusMenuVisible(false)}
                anchor={
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setFocusMenuVisible(true)}
                  >
                    <Text style={formData.primaryFocus ? styles.dropdownText : styles.dropdownPlaceholder}>
                      {formData.primaryFocus || 'Select focus area...'}
                    </Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>
                }
              >
                {FOCUS_OPTIONS.map((option) => (
                  <Menu.Item
                    key={option.value}
                    onPress={() => handleFocusChange(option.value)}
                    title={option.label}
                  />
                ))}
              </Menu>

              {/* Timeframe Dropdown */}
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                Timeframe (Time-bound)
              </Text>
              <Menu
                visible={timeframeMenuVisible}
                onDismiss={() => setTimeframeMenuVisible(false)}
                anchor={
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setTimeframeMenuVisible(true)}
                  >
                    <Text style={formData.timeframe ? styles.dropdownText : styles.dropdownPlaceholder}>
                      {formData.timeframe || 'Select timeframe...'}
                    </Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>
                }
              >
                {TIMEFRAME_OPTIONS.map((option) => (
                  <Menu.Item
                    key={option.value}
                    onPress={() => {
                      setFormData({ ...formData, timeframe: option.value });
                      setTimeframeMenuVisible(false);
                    }}
                    title={option.label}
                  />
                ))}
              </Menu>

              {/* Brain Health Pillars */}
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                What does this goal support? (Optional)
              </Text>
              <Text variant="bodySmall" style={styles.helpText}>
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

              <View style={styles.modalActions}>
                <PaperButton
                  mode="outlined"
                  onPress={() => setModalVisible(false)}
                  style={styles.modalButton}
                >
                  Cancel
                </PaperButton>
                <PaperButton
                  mode="contained"
                  onPress={handleSubmit}
                  loading={submitting}
                  disabled={submitting}
                  style={styles.modalButton}
                  buttonColor={Colors.evergreenTeal}
                >
                  {editingGoal ? 'Update' : 'Create'}
                </PaperButton>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
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
    marginBottom: Spacing.md,
  },
  segmentedButtons: {
    backgroundColor: Colors.surface,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  goalCard: {
    marginBottom: Spacing.md,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
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
    fontSize: Typography.fontSize.xs - 2,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
  },
  progressContainer: {
    marginBottom: Spacing.md,
  },
  progressControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.md,
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
  emptyIcon: {
    fontSize: Typography.fontSize['5xl'] + 16,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    backgroundColor: Colors.evergreenTeal,
  },
  modal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  scrollContent: {
    // No bottom padding needed - modalActions handles spacing
  },
  modalTitle: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.lg,
    fontWeight: Typography.fontWeight.semibold,
  },
  input: {
    marginBottom: Spacing.md,
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
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
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
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
    marginBottom: Spacing.md,
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
