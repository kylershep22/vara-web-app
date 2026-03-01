/**
 * WizardContainer
 * Multi-step habit creation wizard
 * Manages step index, shared form state, and navigation
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { EnhancedModal } from '../../';
import { Colors } from '../../../constants';
import { Habit } from '../../../types';
import { StepProgressBar } from './StepProgressBar';
import { ActionStep } from './ActionStep';
import { IdentityStep } from './IdentityStep';
import { ScalingStep } from './ScalingStep';
import { TriggerStep } from './TriggerStep';
import { IntentionStep } from './IntentionStep';
import { ReviewStep } from './ReviewStep';
import { HabitFormData, WizardStep, WIZARD_STEPS, DEFAULT_FORM_DATA } from './types';

interface WizardContainerProps {
  visible: boolean;
  onDismiss: () => void;
  editingHabit?: Habit | null;
  onComplete: (formData: HabitFormData) => void;
}

export const WizardContainer: React.FC<WizardContainerProps> = ({
  visible,
  onDismiss,
  editingHabit,
  onComplete,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<HabitFormData>(() => {
    if (editingHabit) {
      return {
        name: editingHabit.name || '',
        category: editingHabit.category || '',
        type: editingHabit.type || 'daily',
        frequency: editingHabit.frequency || 7,
        identity: editingHabit.identity || '',
        identityStatement: editingHabit.identityStatement || '',
        outcomeGoal: editingHabit.outcomeGoal || '',
        fullVersion: editingHabit.fullVersion || '',
        quickStartVersion: editingHabit.quickStartVersion || '',
        justShowUpVersion: editingHabit.justShowUpVersion || '',
        cueType: editingHabit.cue?.type || 'time',
        cueValue: editingHabit.cue?.value || '',
        implementationIntention: editingHabit.implementationIntention || '',
        intention: editingHabit.intention,
        problem: editingHabit.problem || '',
      };
    }
    return { ...DEFAULT_FORM_DATA };
  });

  // Reset state when modal opens
  React.useEffect(() => {
    if (visible) {
      setCurrentStepIndex(0);
      if (editingHabit) {
        setFormData({
          name: editingHabit.name || '',
          category: editingHabit.category || '',
          type: editingHabit.type || 'daily',
          frequency: editingHabit.frequency || 7,
          identity: editingHabit.identity || '',
          identityStatement: editingHabit.identityStatement || '',
          outcomeGoal: editingHabit.outcomeGoal || '',
          fullVersion: editingHabit.fullVersion || '',
          quickStartVersion: editingHabit.quickStartVersion || '',
          justShowUpVersion: editingHabit.justShowUpVersion || '',
          cueType: editingHabit.cue?.type || 'time',
          cueValue: editingHabit.cue?.value || '',
          implementationIntention: editingHabit.implementationIntention || '',
          intention: editingHabit.intention,
          problem: editingHabit.problem || '',
        });
      } else {
        setFormData({ ...DEFAULT_FORM_DATA });
      }
    }
  }, [visible, editingHabit]);

  const currentStep = WIZARD_STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === WIZARD_STEPS.length - 1;

  // Steps 2-5 are skippable (identity, scaling, trigger, intention)
  const isSkippable = currentStepIndex >= 1 && currentStepIndex <= 4;

  const handleUpdateFormData = useCallback((updates: Partial<HabitFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleNext = () => {
    if (isLastStep) {
      onComplete(formData);
    } else {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    setCurrentStepIndex((prev) => prev + 1);
  };

  const canProceed = () => {
    if (currentStep === 'action') {
      return formData.name.trim().length > 0;
    }
    return true; // All other steps are optional
  };

  const getStepTitle = (): string => {
    if (editingHabit) return 'Edit Habit';
    switch (currentStep) {
      case 'action': return 'New Habit';
      case 'identity': return 'New Habit';
      case 'scaling': return 'New Habit';
      case 'trigger': return 'New Habit';
      case 'intention': return 'New Habit';
      case 'review': return 'New Habit';
      default: return 'New Habit';
    }
  };

  const getSubmitLabel = (): string => {
    if (isLastStep) {
      return editingHabit ? 'Update' : 'Save habit';
    }
    return 'Next';
  };

  const renderStep = () => {
    const stepProps = { formData, onUpdateFormData: handleUpdateFormData };

    switch (currentStep) {
      case 'action':
        return <ActionStep {...stepProps} />;
      case 'identity':
        return <IdentityStep {...stepProps} />;
      case 'scaling':
        return <ScalingStep {...stepProps} />;
      case 'trigger':
        return <TriggerStep {...stepProps} />;
      case 'intention':
        return <IntentionStep {...stepProps} />;
      case 'review':
        return <ReviewStep {...stepProps} />;
    }
  };

  return (
    <EnhancedModal
      visible={visible}
      onDismiss={onDismiss}
      title={getStepTitle()}
      subtitle="Build consistency, one day at a time"
      headerIcon="refresh"
      inputAccessoryViewID="habit-wizard"
      maxHeightPercent={0.9}
      footer={
        <View style={styles.footer}>
          {/* Left side: Back button */}
          <View style={styles.footerLeft}>
            {!isFirstStep && (
              <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Right side: Skip + Next/Save */}
          <View style={styles.footerRight}>
            {isSkippable && !isLastStep && (
              <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleNext}
              style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
              disabled={!canProceed()}
            >
              <Text style={styles.nextButtonText}>{getSubmitLabel()}</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
    >
      <StepProgressBar
        totalSteps={WIZARD_STEPS.length}
        currentStep={currentStepIndex}
      />
      <View style={styles.stepContent}>
        {renderStep()}
        <View style={styles.bottomSpacer} />
      </View>
    </EnhancedModal>
  );
};

const styles = StyleSheet.create({
  stepContent: {
    flex: 1,
  },
  bottomSpacer: {
    height: 24,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#B8CDBA40',
  },
  footerLeft: {
    flex: 1,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6F7F77',
  },
  skipButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6F7F77',
  },
  nextButton: {
    backgroundColor: '#1B5E57',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
