/**
 * Progress Update Modal
 * Modal for updating goal progress with increment options
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { AnimatedProgressBar } from '../shared/AnimatedProgressBar';
import { InlineCheckmark } from '../celebrations/GoalMilestoneCheckmark';
import { Goal, Milestone } from '../../types/models';

interface ProgressUpdateModalProps {
  visible: boolean;
  goal: Goal | null;
  onClose: () => void;
  onUpdateProgress: (goalId: string, newProgress: number, note?: string) => Promise<Milestone[]>;
  onGoalComplete: (goal: Goal) => void;
}

export const ProgressUpdateModal: React.FC<ProgressUpdateModalProps> = ({
  visible,
  goal,
  onClose,
  onUpdateProgress,
  onGoalComplete,
}) => {
  const [selectedIncrement, setSelectedIncrement] = useState<number | null>(null);
  const [customValue, setCustomValue] = useState('');
  const [note, setNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [completedMilestones, setCompletedMilestones] = useState<Milestone[]>([]);

  const modalScale = useSharedValue(0.9);
  const modalOpacity = useSharedValue(0);

  // Reset state when modal opens
  useEffect(() => {
    if (visible) {
      setSelectedIncrement(null);
      setCustomValue('');
      setNote('');
      setShowSuccess(false);
      setCompletedMilestones([]);

      modalScale.value = withSpring(1, { damping: 15, stiffness: 150 });
      modalOpacity.value = withTiming(1, { duration: 200 });
    } else {
      modalScale.value = withTiming(0.9, { duration: 150 });
      modalOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible]);

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: modalScale.value }],
    opacity: modalOpacity.value,
  }));

  const currentProgress = goal?.progress || 0;
  const previewProgress = selectedIncrement
    ? Math.min(100, currentProgress + selectedIncrement)
    : customValue
    ? Math.min(100, currentProgress + parseInt(customValue, 10) || 0)
    : currentProgress;

  const handleIncrementSelect = useCallback((increment: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIncrement(increment);
    setCustomValue('');
  }, []);

  const handleCustomChange = useCallback((text: string) => {
    const numValue = text.replace(/[^0-9]/g, '');
    setCustomValue(numValue);
    setSelectedIncrement(null);
  }, []);

  const handleSetTo100 = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedIncrement(100 - currentProgress);
    setCustomValue('');
  }, [currentProgress]);

  const handleConfirm = useCallback(async () => {
    if (!goal) return;

    const increment = selectedIncrement || parseInt(customValue, 10) || 0;
    if (increment <= 0) return;

    setIsUpdating(true);

    try {
      const newProgress = Math.min(100, currentProgress + increment);
      const milestones = await onUpdateProgress(goal.id, newProgress, note || undefined);

      setCompletedMilestones(milestones);
      setShowSuccess(true);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Check if goal is complete
      if (newProgress >= 100) {
        setTimeout(() => {
          onGoalComplete(goal);
          onClose();
        }, 1500);
      } else {
        // Auto-close after showing success
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error('Error updating progress:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsUpdating(false);
    }
  }, [goal, selectedIncrement, customValue, currentProgress, note, onUpdateProgress, onGoalComplete, onClose]);

  const canConfirm =
    (selectedIncrement !== null && selectedIncrement > 0) ||
    (customValue && parseInt(customValue, 10) > 0);

  if (!goal) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View style={[styles.modal, modalAnimatedStyle]}>
          {showSuccess ? (
            // Success state
            <View style={styles.successContainer}>
              <InlineCheckmark visible={true} size={64} />
              <Text style={styles.successTitle}>Progress Updated!</Text>
              {completedMilestones.length > 0 && (
                <Text style={styles.successSubtitle}>
                  Milestone reached: {completedMilestones[0].title}
                </Text>
              )}
            </View>
          ) : (
            // Normal state
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title} numberOfLines={2}>
                  {goal.title}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Icon name="close" size={24} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Current Progress */}
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Current Progress</Text>
                  <Text style={styles.progressValue}>
                    {Math.round(currentProgress)}%
                    {previewProgress !== currentProgress && (
                      <Text style={styles.progressPreview}>
                        {' '}
                        → {Math.round(previewProgress)}%
                      </Text>
                    )}
                  </Text>
                </View>
                <AnimatedProgressBar
                  progress={previewProgress}
                  milestones={goal.milestones}
                  showPercentage={false}
                  height={12}
                />
              </View>

              {/* Increment Options */}
              <Text style={styles.sectionTitle}>Add Progress</Text>
              <View style={styles.incrementGrid}>
                <TouchableOpacity
                  style={[
                    styles.incrementButton,
                    selectedIncrement === 10 && styles.incrementButtonSelected,
                    currentProgress + 10 > 100 && styles.incrementButtonDisabled,
                  ]}
                  onPress={() => handleIncrementSelect(10)}
                  disabled={currentProgress + 10 > 100}
                >
                  <Text
                    style={[
                      styles.incrementText,
                      selectedIncrement === 10 && styles.incrementTextSelected,
                    ]}
                  >
                    +10%
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.incrementButton,
                    selectedIncrement === 25 && styles.incrementButtonSelected,
                    currentProgress + 25 > 100 && styles.incrementButtonDisabled,
                  ]}
                  onPress={() => handleIncrementSelect(25)}
                  disabled={currentProgress + 25 > 100}
                >
                  <Text
                    style={[
                      styles.incrementText,
                      selectedIncrement === 25 && styles.incrementTextSelected,
                    ]}
                  >
                    +25%
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.incrementButton,
                    selectedIncrement === 50 && styles.incrementButtonSelected,
                    currentProgress + 50 > 100 && styles.incrementButtonDisabled,
                  ]}
                  onPress={() => handleIncrementSelect(50)}
                  disabled={currentProgress + 50 > 100}
                >
                  <Text
                    style={[
                      styles.incrementText,
                      selectedIncrement === 50 && styles.incrementTextSelected,
                    ]}
                  >
                    +50%
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.incrementButton,
                    styles.incrementButtonComplete,
                    currentProgress >= 100 && styles.incrementButtonDisabled,
                  ]}
                  onPress={handleSetTo100}
                  disabled={currentProgress >= 100}
                >
                  <Icon
                    name="flag-checkered"
                    size={16}
                    color={currentProgress >= 100 ? Colors.textSecondary : Colors.evergreenTeal}
                  />
                  <Text
                    style={[
                      styles.incrementText,
                      styles.incrementTextComplete,
                    ]}
                  >
                    Complete
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Custom Value */}
              <View style={styles.customSection}>
                <Text style={styles.customLabel}>Or enter custom:</Text>
                <View style={styles.customInputContainer}>
                  <Text style={styles.customPrefix}>+</Text>
                  <TextInput
                    style={styles.customInput}
                    value={customValue}
                    onChangeText={handleCustomChange}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.textSecondary}
                    maxLength={3}
                  />
                  <Text style={styles.customSuffix}>%</Text>
                </View>
              </View>

              {/* Optional Note */}
              <View style={styles.noteSection}>
                <Text style={styles.noteLabel}>Add a note (optional)</Text>
                <TextInput
                  style={styles.noteInput}
                  value={note}
                  onChangeText={setNote}
                  placeholder="How did it go?"
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Confirm Button */}
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !canConfirm && styles.confirmButtonDisabled,
                ]}
                onPress={handleConfirm}
                disabled={!canConfirm || isUpdating}
              >
                {isUpdating ? (
                  <Text style={styles.confirmButtonText}>Updating...</Text>
                ) : (
                  <Text style={styles.confirmButtonText}>
                    Update Progress
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius['2xl'],
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    padding: Spacing.lg,
    ...Layout.shadow.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Spacing.base,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  progressSection: {
    marginBottom: Spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  progressValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.evergreenTeal,
  },
  progressPreview: {
    color: Colors.sunriseAmber,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  incrementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  incrementButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.sm,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  incrementButtonSelected: {
    borderColor: Colors.evergreenTeal,
    backgroundColor: Colors.mintCream,
  },
  incrementButtonDisabled: {
    opacity: 0.4,
  },
  incrementButtonComplete: {
    borderColor: Colors.evergreenTeal,
    borderStyle: 'dashed',
  },
  incrementText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  incrementTextSelected: {
    color: Colors.evergreenTeal,
  },
  incrementTextComplete: {
    color: Colors.evergreenTeal,
  },
  customSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  customLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginRight: Spacing.base,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Spacing.sm,
  },
  customPrefix: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textSecondary,
  },
  customInput: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    minWidth: 50,
    textAlign: 'center',
  },
  customSuffix: {
    fontSize: Typography.fontSize.lg,
    color: Colors.textSecondary,
  },
  noteSection: {
    marginBottom: Spacing.lg,
  },
  noteLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  confirmButton: {
    backgroundColor: Colors.evergreenTeal,
    paddingVertical: Spacing.base,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: Colors.borderLight,
  },
  confirmButtonText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  successTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.evergreenTeal,
    marginTop: Spacing.base,
  },
  successSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
});

export default ProgressUpdateModal;
