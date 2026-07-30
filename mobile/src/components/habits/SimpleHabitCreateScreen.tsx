/**
 * SimpleHabitCreateScreen
 * Single-screen habit creation for Dashboard V2.
 * Replaces the 6-step WizardContainer.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Input from '../Input';
import Button from '../Button';
import { EnhancedModal } from '../../components/shared/EnhancedModal';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { HabitCategorySelect } from './HabitCategorySelect';
import {
  habitBenefitsFromFocusWindow,
  type HabitCategoryKey,
} from '../../constants/habitTaxonomy';
import {
  rhythmNudgeAcceptLabel,
  rhythmNudgeSentence,
  suggestedTimeOfDayFromRhythms,
} from '../../constants/rhythmTimeOfDay';
// The single shared definition. There used to be a local copy of this union
// here, which could drift from the model's; do not reintroduce one.
import type { HabitTimeOfDay } from '../../types/models';

type FrequencyType = 'daily' | 'specific_days' | 'flexible';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface SimpleHabitCreateScreenProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (data: SimpleHabitFormData) => void;
  /**
   * The user's stored focus-rhythm windows, read by the caller (which holds the
   * auth context) and passed in so this sheet stays presentational. Absent or
   * empty simply means no nudge.
   */
  focusRhythmWindows?: string[];
}

export interface SimpleHabitFormData {
  name: string;
  // Required, and non-null by construction: save is blocked until a chip is
  // chosen, so this is never a placeholder value the user did not pick.
  category: HabitCategoryKey;
  frequencyType: FrequencyType;
  specificDays: number[];
  timeOfDay: HabitTimeOfDay;
  intention: string;
  notePromptEnabled: boolean;
}

export const SimpleHabitCreateScreen: React.FC<SimpleHabitCreateScreenProps> = ({
  visible,
  onDismiss,
  onSave,
  focusRhythmWindows,
}) => {
  const [name, setName] = useState('');
  // No default: null until the user picks one, and save stays blocked until then.
  const [category, setCategory] = useState<HabitCategoryKey | null>(null);
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily');
  const [specificDays, setSpecificDays] = useState<number[]>([]);
  const [timeOfDay, setTimeOfDay] = useState<HabitTimeOfDay>('anytime');
  const [intention, setIntention] = useState('');
  const [showIntention, setShowIntention] = useState(false);
  const [notePromptEnabled, setNotePromptEnabled] = useState(false);
  const [showCaptured, setShowCaptured] = useState(false);
  // Once the user has touched the time control at all, the nudge retires. It
  // has been seen and answered, whether they took it or chose something else,
  // and re-offering after an explicit override would be nagging.
  const [timeOfDayTouched, setTimeOfDayTouched] = useState(false);

  // The suggestion is a synchronous table lookup on every render, so it tracks
  // the category the moment it changes. Silent unless the habit is one that
  // benefits from a focus window AND the stored rhythms point somewhere.
  const suggestedTimeOfDay = habitBenefitsFromFocusWindow(category)
    ? suggestedTimeOfDayFromRhythms(focusRhythmWindows ?? [])
    : null;
  // `anytime` can never be suggested: it is excluded from SuggestedSlot at the
  // type level, so null is the only "nothing to offer" case to handle.
  const showRhythmNudge = !timeOfDayTouched && suggestedTimeOfDay !== null;

  const resetForm = () => {
    setName('');
    setCategory(null);
    setFrequencyType('daily');
    setSpecificDays([]);
    setTimeOfDay('anytime');
    setIntention('');
    setShowIntention(false);
    setNotePromptEnabled(false);
    setShowCaptured(false);
    setTimeOfDayTouched(false);
  };

  const handleSave = () => {
    // Both are required. The button is already disabled without them; this
    // guard is what makes `category` non-null for the callback's type.
    if (!name.trim() || !category) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    onSave({
      name: name.trim(),
      category,
      frequencyType,
      specificDays,
      timeOfDay,
      intention: intention.trim(),
      notePromptEnabled,
    });

    setShowCaptured(true);
    setTimeout(() => {
      setShowCaptured(false);
      resetForm();
      onDismiss();
    }, 2000);
  };

  const handleDismiss = () => {
    resetForm();
    onDismiss();
  };

  const toggleDay = (dayIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSpecificDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const selectFrequency = (type: FrequencyType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFrequencyType(type);
    if (type !== 'specific_days') setSpecificDays([]);
  };

  const acceptRhythmSuggestion = () => {
    if (!suggestedTimeOfDay) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeOfDay(suggestedTimeOfDay);
    setTimeOfDayTouched(true);
  };

  const selectTimeOfDay = (time: HabitTimeOfDay) => {
    setTimeOfDayTouched(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeOfDay(time);
  };

  if (showCaptured) {
    return (
      <EnhancedModal visible={visible} onDismiss={handleDismiss} title="New Habit">
        <View style={styles.capturedContainer}>
          <Text style={styles.capturedText}>Saved.</Text>
        </View>
      </EnhancedModal>
    );
  }

  return (
    <EnhancedModal visible={visible} onDismiss={handleDismiss} title="New Habit">
      <View style={styles.scrollContent}>
          {/* Habit Name */}
          <Input
            label="What's the habit?"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Morning walk, Read 10 pages"
            style={styles.input}
            autoFocus
          />

          {/* Kind of habit. Required, no default: this is the only moment the
              app can learn what a habit IS, since nothing about a created habit
              links back to where it came from. */}
          <HabitCategorySelect
            value={category}
            onChange={setCategory}
            testIDPrefix="habit-create-category"
          />

          {/* Frequency */}
          <Text style={styles.sectionLabel}>How often?</Text>
          <View style={styles.chipRow}>
            {([
              { value: 'daily' as FrequencyType, label: 'Every day' },
              { value: 'specific_days' as FrequencyType, label: 'Specific days' },
              { value: 'flexible' as FrequencyType, label: 'Flexible' },
            ]).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, frequencyType === opt.value && styles.chipSelected]}
                onPress={() => selectFrequency(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, frequencyType === opt.value && styles.chipTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Specific Days Dots */}
          {frequencyType === 'specific_days' && (
            <View style={styles.daysRow}>
              {DAY_LABELS.map((label, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.dayDot, specificDays.includes(index) && styles.dayDotSelected]}
                  onPress={() => toggleDay(index)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayDotText, specificDays.includes(index) && styles.dayDotTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Time of Day */}
          <Text style={styles.sectionLabel}>When?</Text>
          <View style={styles.chipRow}>
            {([
              { value: 'morning' as HabitTimeOfDay, label: 'Morning' },
              { value: 'afternoon' as HabitTimeOfDay, label: 'Afternoon' },
              { value: 'evening' as HabitTimeOfDay, label: 'Evening' },
              { value: 'anytime' as HabitTimeOfDay, label: 'Anytime' },
            ]).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, timeOfDay === opt.value && styles.chipSelected]}
                onPress={() => selectTimeOfDay(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, timeOfDay === opt.value && styles.chipTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Rhythm nudge. Sits under the control it steers, because it drives
              the SAME chips above rather than offering a second way to set a
              time. Offer-to-tap, never pre-select: Anytime stays lit until the
              user acts, so an accepted suggestion is visibly their choice.

              Contained on its own sage ground so it is legible as an offer from
              the app. Unstyled, it stacked into the form and read as two more
              rows, with an accept button that matched a selected time chip
              exactly. */}
          {showRhythmNudge && suggestedTimeOfDay && (
            <View style={styles.nudge} testID="habit-create-rhythm-nudge">
              <Text style={styles.nudgeText}>
                {rhythmNudgeSentence(suggestedTimeOfDay)}
              </Text>
              <TouchableOpacity
                style={styles.nudgeAccept}
                onPress={acceptRhythmSuggestion}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`${rhythmNudgeSentence(suggestedTimeOfDay)} ${rhythmNudgeAcceptLabel(
                  suggestedTimeOfDay
                )}`}
                testID="habit-create-rhythm-nudge-accept"
              >
                <Text style={styles.nudgeAcceptText}>
                  {rhythmNudgeAcceptLabel(suggestedTimeOfDay)}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* One-line Intention */}
          {!showIntention ? (
            <TouchableOpacity onPress={() => setShowIntention(true)} style={styles.addIntentionLink}>
              <Icon name="plus" size={16} color={Colors.evergreenTeal} />
              <Text style={styles.addIntentionText}>Add a one-line intention (optional)</Text>
            </TouchableOpacity>
          ) : (
            <Input
              label="Why does this matter to you?"
              value={intention}
              onChangeText={setIntention}
              placeholder="Why does this matter to you?"
              style={styles.input}
            />
          )}

          {/* Note prompt — grouped with the optional intention above, since both
              are things you may add to a habit rather than things it needs. */}
          <View style={styles.noteToggleRow}>
            <View style={styles.noteToggleText}>
              <Text style={styles.noteToggleLabel}>Add a note when I complete this</Text>
              <Text style={styles.noteToggleHelper}>A quick line you can look back on.</Text>
            </View>
            <Switch
              value={notePromptEnabled}
              onValueChange={setNotePromptEnabled}
              trackColor={{ false: '#D5E3D1', true: Colors.evergreenTeal }}
              thumbColor="#fff"
              accessibilityLabel="Add a note when I complete this"
              testID="habit-create-note-prompt-toggle"
            />
          </View>

          {/* Save Button */}
          <View style={styles.saveContainer}>
            <Button
              variant="primary"
              onPress={handleSave}
              fullWidth
              disabled={!name.trim() || !category}
              accessibilityLabel="Save Habit"
            >
              Save Habit
            </Button>
            <Text style={styles.saveSubtext}>You can always adjust this later</Text>
          </View>
      </View>
    </EnhancedModal>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.lg,
  },
  input: {
    marginBottom: Spacing.base,
  },
  sectionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  chip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.pill,
    backgroundColor: Colors.background.default,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  chipSelected: {
    backgroundColor: Colors.dewSage,
    borderColor: Colors.evergreenTeal,
  },
  chipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
    paddingHorizontal: Spacing.xs,
  },
  dayDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.default,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayDotSelected: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  dayDotText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  dayDotTextSelected: {
    color: Colors.white,
  },
  // A quiet block on the sheet's own surface, not a card: it is a remark about
  // the control above it, not a second thing to fill in.
  // A soft Dew Sage ground, so the offer reads as the app saying something
  // rather than as two more form rows. Containment and ground do the work: no
  // border, no icon, no accent stripe. This must not read as a warning.
  //
  // Radius lg (12), not pill: a pill this size would read as an oversized chip,
  // which is the exact confusion being fixed.
  nudge: {
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  nudgeText: {
    fontSize: Typography.fontSize.sm,
    // 8.02:1 on Dew Sage. NOT mutedSageGray, which is 3.16:1 on this ground.
    color: Colors.softCharcoal,
    marginBottom: Spacing.sm,
  },
  // White fill, teal label, teal edge. Deliberately unlike BOTH neighbours it
  // was being confused with: the time chips above are sage-filled pills (a
  // selected one was previously pixel-identical to this), and the Save button
  // below is a teal fill. White is a treatment neither uses, and it carries
  // less weight than Save, which is correct for an optional offer.
  //
  // White on Dew Sage is only 1.33:1 as a surface pair, so the 1.5px teal edge
  // (5.6:1 against the ground) is what defines the button's shape. Do not drop
  // it to a hairline or the button floats.
  nudgeAccept: {
    // The 48px target. Self-aligned so it is a button-sized affordance rather
    // than a full-width bar competing with Save.
    minHeight: 48,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.base,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.evergreenTeal,
  },
  nudgeAcceptText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    // 10.0:1 on white.
    color: Colors.evergreenTeal,
  },
  addIntentionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.base,
  },
  addIntentionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  noteToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingVertical: Spacing.sm,
  },
  noteToggleText: {
    flex: 1,
    marginRight: Spacing.base,
  },
  noteToggleLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
  },
  noteToggleHelper: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  saveContainer: {
    marginTop: Spacing.xl,
  },
  saveSubtext: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  capturedContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  capturedText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
});
