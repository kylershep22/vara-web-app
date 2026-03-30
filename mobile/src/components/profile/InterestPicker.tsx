/**
 * Interest Picker Component
 * Allows users to select from standardized wellness interests
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import {
  WELLNESS_INTERESTS,
  WELLNESS_GOALS,
  INTEREST_CATEGORIES,
  GOAL_CATEGORIES,
  getInterestById,
  getGoalById,
  type WellnessInterest,
  type WellnessGoal,
} from '../../constants/interests';

interface PickerItem {
  id: string;
  label: string;
  category: string;
}

interface CategoryDef {
  id: string;
  label: string;
  icon: string;
}

interface InterestPickerProps {
  selectedInterests: string[];
  onInterestsChange: (interests: string[]) => void;
  maxSelections?: number;
  showPrivacyToggle?: boolean;
  isPublic?: boolean;
  onPrivacyChange?: (isPublic: boolean) => void;
  /** Override items and categories to reuse for goals */
  items?: readonly PickerItem[];
  categories?: readonly CategoryDef[];
  label?: string;
  modalTitle?: string;
  addButtonLabel?: string;
  emptyText?: string;
  lookupFn?: (id: string) => PickerItem | undefined;
}

export const InterestPicker: React.FC<InterestPickerProps> = ({
  selectedInterests,
  onInterestsChange,
  maxSelections = 10,
  showPrivacyToggle = true,
  isPublic = true,
  onPrivacyChange,
  items = WELLNESS_INTERESTS,
  categories = INTEREST_CATEGORIES,
  label = 'Interests',
  modalTitle = 'Select Interests',
  addButtonLabel = 'Add Interests',
  emptyText = 'No interests selected',
  lookupFn = getInterestById,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');

  const filteredInterests = useMemo(() => {
    let interests = [...items];

    // Filter by category
    if (selectedCategory) {
      interests = interests.filter((i) => i.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      interests = interests.filter((i) =>
        i.label.toLowerCase().includes(query)
      );
    }

    return interests;
  }, [selectedCategory, searchQuery]);

  const toggleInterest = (interestId: string) => {
    if (selectedInterests.includes(interestId)) {
      onInterestsChange(selectedInterests.filter((id) => id !== interestId));
    } else if (selectedInterests.length < maxSelections) {
      onInterestsChange([...selectedInterests, interestId]);
    }
  };

  const removeInterest = (interestId: string) => {
    onInterestsChange(selectedInterests.filter((id) => id !== interestId));
  };

  return (
    <View style={styles.container}>
      {/* Header with Privacy Toggle */}
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {showPrivacyToggle && onPrivacyChange && (
          <TouchableOpacity
            style={styles.privacyToggle}
            onPress={() => onPrivacyChange(!isPublic)}
          >
            <Icon
              name={isPublic ? 'eye' : 'eye-off'}
              size={18}
              color={isPublic ? Colors.evergreenTeal : Colors.textSecondary}
            />
            <Text
              style={[
                styles.privacyText,
                isPublic && styles.privacyTextActive,
              ]}
            >
              {isPublic ? 'Public' : 'Private'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Selected Interests */}
      <View style={styles.selectedContainer}>
        {selectedInterests.length > 0 ? (
          <View style={styles.chipsContainer}>
            {selectedInterests.map((interestId) => {
              const interest = lookupFn(interestId);
              return (
                <View key={interestId} style={styles.chip}>
                  <Text style={styles.chipText}>{interest?.label || interestId}</Text>
                  <TouchableOpacity
                    onPress={() => removeInterest(interestId)}
                    accessibilityLabel="Remove interest"
                  >
                    <Icon name="close-circle" size={18} color={Colors.evergreenTeal} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>{emptyText}</Text>
        )}
      </View>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Icon name="plus" size={20} color={Colors.evergreenTeal} />
        <Text style={styles.addButtonText}>
          {addButtonLabel} ({selectedInterests.length}/{maxSelections})
        </Text>
      </TouchableOpacity>

      {/* Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Icon name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchbar}>
            <Icon name="magnify" size={20} color={Colors.evergreenTeal} />
            <TextInput
              placeholder="Search interests..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchbarInput}
              placeholderTextColor={Colors.textSecondary}
            />
          </View>

          {/* Category Filters */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
            contentContainerStyle={styles.categoryContainer}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                !selectedCategory && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text
                style={[
                  styles.categoryText,
                  !selectedCategory && styles.categoryTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryChip,
                  selectedCategory === category.id && styles.categoryChipActive,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Icon
                  name={category.icon as any}
                  size={16}
                  color={
                    selectedCategory === category.id
                      ? Colors.textOnPrimary
                      : Colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category.id && styles.categoryTextActive,
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Interests Grid */}
          <ScrollView style={styles.interestsList}>
            <View style={styles.interestsGrid}>
              {filteredInterests.map((interest) => {
                const isSelected = selectedInterests.includes(interest.id);
                const isDisabled =
                  !isSelected && selectedInterests.length >= maxSelections;

                return (
                  <TouchableOpacity
                    key={interest.id}
                    style={[
                      styles.interestItem,
                      isSelected && styles.interestItemSelected,
                      isDisabled && styles.interestItemDisabled,
                    ]}
                    onPress={() => toggleInterest(interest.id)}
                    disabled={isDisabled}
                  >
                    <Text
                      style={[
                        styles.interestItemText,
                        isSelected && styles.interestItemTextSelected,
                        isDisabled && styles.interestItemTextDisabled,
                      ]}
                    >
                      {interest.label}
                    </Text>
                    {isSelected && (
                      <Icon
                        name="check"
                        size={16}
                        color={Colors.textOnPrimary}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Other / Custom Input */}
          <View style={styles.customInputContainer}>
            <Text style={styles.customInputLabel}>Other</Text>
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInputField}
                value={customInput}
                onChangeText={setCustomInput}
                placeholder="Type your own..."
                placeholderTextColor={Colors.textSecondary}
                returnKeyType="done"
                onSubmitEditing={() => {
                  const val = customInput.trim();
                  if (val && !selectedInterests.includes(val) && selectedInterests.length < maxSelections) {
                    onInterestsChange([...selectedInterests, val]);
                    setCustomInput('');
                  }
                }}
              />
              <TouchableOpacity
                style={[styles.customAddButton, (!customInput.trim() || selectedInterests.length >= maxSelections) && { opacity: 0.4 }]}
                onPress={() => {
                  const val = customInput.trim();
                  if (val && !selectedInterests.includes(val) && selectedInterests.length < maxSelections) {
                    onInterestsChange([...selectedInterests, val]);
                    setCustomInput('');
                  }
                }}
                disabled={!customInput.trim() || selectedInterests.length >= maxSelections}
              >
                <Icon name="plus" size={20} color={Colors.textOnPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Done Button */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.doneButtonText}>
                Done ({selectedInterests.length} selected)
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.inputBackground,
  },
  privacyText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  privacyTextActive: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  selectedContainer: {
    minHeight: 40,
    marginBottom: Spacing.sm,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.mintCream,
    height: 32,
    paddingHorizontal: Spacing.sm,
    borderRadius: Layout.borderRadius.full,
  },
  chipText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xs,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.evergreenTeal,
    borderStyle: 'dashed',
    borderRadius: Layout.borderRadius.md,
  },
  addButtonText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  searchbar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Spacing.sm,
    height: 48,
    gap: Spacing.xs,
  },
  searchbarInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  categoryScroll: {
    maxHeight: 50,
  },
  categoryContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  categoryChipActive: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  categoryText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  categoryTextActive: {
    color: Colors.textOnPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  interestsList: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.base,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  interestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  interestItemSelected: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  interestItemDisabled: {
    opacity: 0.5,
  },
  interestItemText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
  },
  interestItemTextSelected: {
    color: Colors.textOnPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  interestItemTextDisabled: {
    color: Colors.textSecondary,
  },
  customInputContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  customInputLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  customInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  customInputField: {
    flex: 1,
    height: 42,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Spacing.sm,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  customAddButton: {
    width: 42,
    height: 42,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  doneButton: {
    backgroundColor: Colors.evergreenTeal,
    paddingVertical: Spacing.base,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
  },
  doneButtonText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default InterestPicker;
