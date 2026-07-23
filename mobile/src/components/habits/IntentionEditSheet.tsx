/**
 * IntentionEditSheet
 * Bottom sheet for editing a habit's intention
 * Uses EnhancedModal with category chip groups + custom input
 *
 * Titled to match the card that opens it on the habit detail screen ("Why this
 * one") and the question the create sheet already asks, so "Add your reason"
 * does not open a sheet about something called an intention.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Text } from 'react-native';
// Direct path, not the components barrel: the barrel pulls in the community
// and media trees (expo-video among them) for one modal.
import { EnhancedModal } from '../shared/EnhancedModal';
import { INTENTION_OPTIONS, INTENTION_CATEGORY_LABELS } from '../../constants/intentions';
import { IntentionCategory, HabitIntention } from '../../types/models';

const CATEGORIES: IntentionCategory[] = [
  'focus_clarity',
  'regulation_recovery',
  'sustainable_consistency',
  'energy_resilience',
];

interface IntentionEditSheetProps {
  visible: boolean;
  onDismiss: () => void;
  currentIntention?: HabitIntention;
  onSave: (intention?: HabitIntention) => void;
}

export const IntentionEditSheet: React.FC<IntentionEditSheetProps> = ({
  visible,
  onDismiss,
  currentIntention,
  onSave,
}) => {
  const [selectedIntention, setSelectedIntention] = useState<HabitIntention | undefined>(
    currentIntention
  );
  const [customText, setCustomText] = useState(
    currentIntention?.isCustom ? currentIntention.label : ''
  );

  useEffect(() => {
    if (visible) {
      setSelectedIntention(currentIntention);
      setCustomText(currentIntention?.isCustom ? currentIntention.label : '');
    }
  }, [visible, currentIntention]);

  const handleSelectChip = (category: IntentionCategory, label: string) => {
    if (
      selectedIntention &&
      !selectedIntention.isCustom &&
      selectedIntention.label === label &&
      selectedIntention.category === category
    ) {
      setSelectedIntention(undefined);
      return;
    }

    setCustomText('');
    setSelectedIntention({ label, category, isCustom: false });
  };

  const handleCustomTextChange = (text: string) => {
    setCustomText(text);
    if (text.trim()) {
      setSelectedIntention({
        label: text.trim(),
        category: 'sustainable_consistency',
        isCustom: true,
      });
    } else {
      setSelectedIntention(undefined);
    }
  };

  const handleSave = () => {
    onSave(selectedIntention);
    onDismiss();
  };

  const handleRemove = () => {
    onSave(undefined);
    onDismiss();
  };

  const isChipSelected = (category: IntentionCategory, label: string) => {
    return (
      selectedIntention !== undefined &&
      !selectedIntention.isCustom &&
      selectedIntention.label === label &&
      selectedIntention.category === category
    );
  };

  return (
    <EnhancedModal
      visible={visible}
      onDismiss={onDismiss}
      title="Why this one"
      subtitle="Why does this matter to you?"
      headerIcon="heart"
      maxHeightPercent={0.85}
      footer={
        <View style={styles.footer}>
          {currentIntention && (
            <TouchableOpacity onPress={handleRemove} style={styles.removeButton}>
              <Text style={styles.removeButtonText}>Remove intention</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Text style={styles.saveButtonText}>Update</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.content}>
        {CATEGORIES.map((category) => (
          <View key={category} style={styles.categoryGroup}>
            <Text style={styles.categoryLabel}>
              {INTENTION_CATEGORY_LABELS[category]}
            </Text>
            <View style={styles.chipRow}>
              {INTENTION_OPTIONS[category].map((label) => {
                const selected = isChipSelected(category, label);
                return (
                  <TouchableOpacity
                    key={label}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => handleSelectChip(category, label)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <View style={styles.customSection}>
          <Text style={styles.categoryLabel}>Or write your own</Text>
          <TextInput
            style={styles.customInput}
            value={customText}
            onChangeText={handleCustomTextChange}
            placeholder="e.g., Feel more confident at work"
            placeholderTextColor="#B8CDBA"
            maxLength={80}
          />
        </View>
      </View>
    </EnhancedModal>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  categoryGroup: {
    marginBottom: 16,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6F7F77',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 4,
    backgroundColor: '#D5E3D199',
  },
  chipSelected: {
    backgroundColor: '#1B5E57',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3E3E3E',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  customSection: {
    marginTop: 4,
    marginBottom: 16,
  },
  customInput: {
    borderWidth: 1,
    borderColor: '#B8CDBA',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#3E3E3E',
    backgroundColor: '#FFFFFF',
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
  removeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6F7F77',
  },
  saveButton: {
    backgroundColor: '#1B5E57',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
