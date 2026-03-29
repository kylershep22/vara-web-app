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
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Input, Button } from '../../components';
import { EnhancedModal } from '../../components/shared/EnhancedModal';
import { Colors, Spacing, Typography, Layout } from '../../constants';

type FrequencyType = 'daily' | 'specific_days' | 'flexible';
type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface SimpleHabitCreateScreenProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (data: SimpleHabitFormData) => void;
}

export interface SimpleHabitFormData {
  name: string;
  frequencyType: FrequencyType;
  specificDays: number[];
  timeOfDay: TimeOfDay;
  intention: string;
}

export const SimpleHabitCreateScreen: React.FC<SimpleHabitCreateScreenProps> = ({
  visible,
  onDismiss,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily');
  const [specificDays, setSpecificDays] = useState<number[]>([]);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('anytime');
  const [intention, setIntention] = useState('');
  const [showIntention, setShowIntention] = useState(false);
  const [showCaptured, setShowCaptured] = useState(false);

  const resetForm = () => {
    setName('');
    setFrequencyType('daily');
    setSpecificDays([]);
    setTimeOfDay('anytime');
    setIntention('');
    setShowIntention(false);
    setShowCaptured(false);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    onSave({
      name: name.trim(),
      frequencyType,
      specificDays,
      timeOfDay,
      intention: intention.trim(),
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

  const selectTimeOfDay = (time: TimeOfDay) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeOfDay(time);
  };

  if (showCaptured) {
    return (
      <EnhancedModal visible={visible} onDismiss={handleDismiss}>
        <View style={styles.capturedContainer}>
          <Text style={styles.capturedText}>Saved.</Text>
        </View>
      </EnhancedModal>
    );
  }

  return (
    <EnhancedModal visible={visible} onDismiss={handleDismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Text style={styles.title}>New rhythm</Text>

          {/* Habit Name */}
          <Input
            label="What's the habit?"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Morning walk, Read 10 pages"
            style={styles.input}
            autoFocus
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
              { value: 'morning' as TimeOfDay, label: 'Morning' },
              { value: 'afternoon' as TimeOfDay, label: 'Afternoon' },
              { value: 'evening' as TimeOfDay, label: 'Evening' },
              { value: 'anytime' as TimeOfDay, label: 'Anytime' },
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

          {/* Save Button */}
          <View style={styles.saveContainer}>
            <Button
              variant="primary"
              onPress={handleSave}
              fullWidth
              disabled={!name.trim()}
              accessibilityLabel="Save rhythm"
            >
              Save rhythm
            </Button>
            <Text style={styles.saveSubtext}>You can always adjust this later</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </EnhancedModal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
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
