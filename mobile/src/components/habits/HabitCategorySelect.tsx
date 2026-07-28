/**
 * HabitCategorySelect
 * Required single-select over the nine controlled habit categories.
 *
 * Shared by the create sheet and the habit detail edit modal so the two can
 * never drift into offering different sets or different wording.
 *
 * There is deliberately NO default selection. A pre-selected chip would let
 * people submit a category they never actually chose, which re-opens the exact
 * cold-start gap this capture exists to close. The prompt is plain and carries
 * no warning about what happens if you skip: this is a recognition task on a
 * fragile surface, not a place to apply pressure.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Colors, Layout, Spacing, Typography } from '../../constants';
import {
  HABIT_CATEGORY_KEYS,
  HABIT_CATEGORY_LABELS,
  type HabitCategoryKey,
} from '../../constants/habitTaxonomy';

/**
 * The prompt, kept free of the required marker.
 *
 * The visible label appends an asterisk (matching the "Habit Name *"
 * convention used elsewhere), but this constant also serves as the radiogroup's
 * spoken label, and a screen reader would read a bare "*" aloud as "asterisk".
 * The requirement is conveyed to assistive tech as the WORD "Required" instead,
 * composed at the usage site below.
 *
 * Note: React Native's AccessibilityState has no `required` member (only
 * disabled / selected / checked / busy / expanded), so the semantic state route
 * is not available here; the spoken label is the equivalent.
 */
export const HABIT_CATEGORY_PROMPT = 'What kind of habit is this?';

/** The marker shown beside the visible prompt. Never spoken. */
const REQUIRED_MARK = ' *';

interface HabitCategorySelectProps {
  value: HabitCategoryKey | null;
  onChange: (key: HabitCategoryKey) => void;
  /** Prefixes each chip's testID, so create and edit can be targeted separately. */
  testIDPrefix?: string;
}

export const HabitCategorySelect: React.FC<HabitCategorySelectProps> = ({
  value,
  onChange,
  testIDPrefix = 'habit-category',
}) => {
  const handleSelect = (key: HabitCategoryKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(key);
  };

  return (
    <View>
      {/* The asterisk is visual only: the explicit accessibilityLabel keeps it
          out of the spoken string, and the group below says "Required" in
          words. Signalling the requirement here, before the user reaches a
          greyed-out Save, is the whole point of the marker. */}
      <Text style={styles.prompt} accessibilityLabel={HABIT_CATEGORY_PROMPT}>
        {HABIT_CATEGORY_PROMPT}
        <Text style={styles.requiredMark}>{REQUIRED_MARK}</Text>
      </Text>
      <View
        style={styles.chipRow}
        accessibilityRole="radiogroup"
        accessibilityLabel={`${HABIT_CATEGORY_PROMPT} Required.`}
      >
        {HABIT_CATEGORY_KEYS.map((key) => {
          const selected = value === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => handleSelect(key)}
              activeOpacity={0.7}
              accessibilityRole="radio"
              accessibilityState={{ selected, checked: selected }}
              accessibilityLabel={HABIT_CATEGORY_LABELS[key]}
              testID={`${testIDPrefix}-${key}`}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {HABIT_CATEGORY_LABELS[key]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  prompt: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  // Same weight and colour as the prompt itself: a marker, not an alarm.
  requiredMark: {
    color: Colors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // 8px, which is also the minimum spacing these targets are allowed to have.
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  chip: {
    // 48px floor. The frequency and time-of-day chip rows on the create sheet
    // are visually identical but shorter: they predate this floor and are
    // tracked as separate debt. Do not shrink these to match them.
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.pill,
    backgroundColor: Colors.background.default,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  // Selection is carried by background, border AND text weight, so it never
  // rests on hue alone.
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
});

export default HabitCategorySelect;
