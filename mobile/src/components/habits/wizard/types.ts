/**
 * Habit Creation Wizard Types
 */

import { IntentionCategory, HabitIntention } from '../../../types/models';

export interface HabitFormData {
  // Step 1: Action (required)
  name: string;
  category: string;
  type: 'daily' | 'weekly' | 'custom';
  frequency: number;

  // Step 2: Identity (skippable)
  identity: string;
  identityStatement: string;
  outcomeGoal: string;

  // Step 3: Scaling (skippable)
  fullVersion: string;
  quickStartVersion: string;
  justShowUpVersion: string;

  // Step 4: Trigger (skippable)
  cueType: 'time' | 'location' | 'after_habit' | 'emotion';
  cueValue: string;
  implementationIntention: string;

  // Step 5: Intention (skippable)
  intention?: HabitIntention;

  // Step 6: Review
  problem: string;
}

export interface WizardStepProps {
  formData: HabitFormData;
  onUpdateFormData: (updates: Partial<HabitFormData>) => void;
}

export type WizardStep = 'action' | 'identity' | 'scaling' | 'trigger' | 'intention' | 'review';

export const WIZARD_STEPS: WizardStep[] = [
  'action',
  'identity',
  'scaling',
  'trigger',
  'intention',
  'review',
];

export const DEFAULT_FORM_DATA: HabitFormData = {
  name: '',
  category: '',
  type: 'daily',
  frequency: 7,
  identity: '',
  identityStatement: '',
  outcomeGoal: '',
  fullVersion: '',
  quickStartVersion: '',
  justShowUpVersion: '',
  cueType: 'time',
  cueValue: '',
  implementationIntention: '',
  problem: '',
};
