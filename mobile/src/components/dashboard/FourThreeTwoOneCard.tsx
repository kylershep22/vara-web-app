/**
 * 4-3-2-1 Daily Practice Card
 * Simple daily practice framework for wellness
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Card, Checkbox, Button, Modal, Portal, TextInput, Chip } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { FourThreeTwoOneEntry, BodyFuelOption } from '../../types';
import {
  getTodayEntry,
  toggleFourMinutes,
  updateThreeWins,
  updateTwoFuel,
  toggleOneConnection,
  getCurrentStreak,
} from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';

// Body fuel options with labels and icons
const BODY_FUEL_OPTIONS: { value: BodyFuelOption; label: string; icon: string }[] = [
  { value: 'healthy_meal', label: 'Healthy Meal', icon: 'food-apple' },
  { value: 'hydration', label: 'Hydration', icon: 'water' },
  { value: 'vitamins', label: 'Vitamins', icon: 'pill' },
  { value: 'fruits_veggies', label: 'Fruits & Veggies', icon: 'carrot' },
  { value: 'protein', label: 'Protein', icon: 'food-steak' },
  { value: 'exercise', label: 'Exercise', icon: 'run' },
  { value: 'rest', label: 'Rest', icon: 'sleep' },
  { value: 'stretch', label: 'Stretch', icon: 'yoga' },
  { value: 'other', label: 'Other', icon: 'dots-horizontal' },
];

interface FourThreeTwoOneCardProps {
  /** Called when any part of the 4-3-2-1 practice is updated */
  onChange?: (entry: FourThreeTwoOneEntry) => void;
  /** When true, the card starts in collapsed state */
  defaultCollapsed?: boolean;
}

export const FourThreeTwoOneCard: React.FC<FourThreeTwoOneCardProps> = ({ onChange, defaultCollapsed = false }) => {
  const { user } = useAuth();
  const [entry, setEntry] = useState<FourThreeTwoOneEntry | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(!defaultCollapsed);

  // Modal states
  const [winsModalVisible, setWinsModalVisible] = useState(false);
  const [fuelModalVisible, setFuelModalVisible] = useState(false);

  // Form states
  const [win1, setWin1] = useState('');
  const [win2, setWin2] = useState('');
  const [win3, setWin3] = useState('');
  const [selectedFuelOptions, setSelectedFuelOptions] = useState<BodyFuelOption[]>([]);

  // Load today's entry and streak
  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async (notifyParent = false) => {
    if (!user) return;

    try {
      setLoading(true);
      const todayEntry = await getTodayEntry(user.uid);
      const currentStreak = await getCurrentStreak(user.uid);

      setEntry(todayEntry);
      setStreak(currentStreak);

      // Populate form states from entry
      if (todayEntry) {
        setWin1(todayEntry.threeWins.wins?.[0] || '');
        setWin2(todayEntry.threeWins.wins?.[1] || '');
        setWin3(todayEntry.threeWins.wins?.[2] || '');
        setSelectedFuelOptions(todayEntry.twoFuel.options || []);

        // Notify parent of changes (for wellness score recalculation)
        if (notifyParent && onChange) {
          onChange(todayEntry);
        }
      }
    } catch (error) {
      console.error('Error loading 4-3-2-1 data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFourMinutesToggle = async () => {
    if (!user || !entry) return;

    try {
      await toggleFourMinutes(user.uid);
      await loadData(true); // Notify parent to refresh wellness score
    } catch (error) {
      console.error('Error toggling 4 minutes:', error);
    }
  };

  const handleSaveWins = async () => {
    if (!user) return;

    try {
      const wins = [win1, win2, win3].filter(w => w.trim().length > 0);
      await updateThreeWins(user.uid, true, wins.length > 0 ? wins : undefined);
      setWinsModalVisible(false);
      await loadData(true); // Notify parent to refresh wellness score
    } catch (error) {
      console.error('Error saving wins:', error);
    }
  };

  const handleMarkWinsWithoutWriting = async () => {
    if (!user) return;

    try {
      await updateThreeWins(user.uid, true);
      setWinsModalVisible(false);
      await loadData(true); // Notify parent to refresh wellness score
    } catch (error) {
      console.error('Error marking wins:', error);
    }
  };

  const handleSaveFuel = async () => {
    if (!user || selectedFuelOptions.length < 2) return;

    try {
      await updateTwoFuel(user.uid, true, selectedFuelOptions);
      setFuelModalVisible(false);
      await loadData(true); // Notify parent to refresh wellness score
    } catch (error) {
      console.error('Error saving fuel:', error);
    }
  };

  const handleToggleFuelOption = (option: BodyFuelOption) => {
    setSelectedFuelOptions(prev => {
      if (prev.includes(option)) {
        return prev.filter(o => o !== option);
      } else {
        return [...prev, option];
      }
    });
  };

  const handleOneConnectionToggle = async () => {
    if (!user || !entry) return;

    try {
      await toggleOneConnection(user.uid);
      await loadData(true); // Notify parent to refresh wellness score
    } catch (error) {
      console.error('Error toggling connection:', error);
    }
  };

  if (loading || !entry) {
    return (
      <Card style={styles.card}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </Card>
    );
  }

  const allCompleted = entry.completed;
  const completionCount = [
    entry.fourMinutes,
    entry.threeWins.completed,
    entry.twoFuel.completed,
    entry.oneConnection,
  ].filter(Boolean).length;

  return (
    <>
      <Card style={styles.card}>
        {/* Collapsible Header */}
        <TouchableOpacity
          style={styles.collapsibleHeader}
          onPress={() => setIsExpanded(!isExpanded)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          accessibilityLabel={`4-3-2-1 Daily Practice. ${completionCount} of 4 complete. ${isExpanded ? 'Tap to collapse' : 'Tap to expand'}`}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>4-3-2-1 Daily Practice</Text>
              <Text style={styles.subtitle}>4 min quiet, 3 wins, 2 body fuels, 1 connection</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.progressText}>{completionCount}/4</Text>
              <Icon
                name={isExpanded ? 'chevron-up' : 'chevron-right'}
                size={16}
                color={Colors.silverSage}
                style={styles.chevron}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* Expanded Content */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {allCompleted && (
              <View style={styles.completionBanner}>
                <Icon name="check-circle" size={20} color={Colors.success} />
                <Text variant="bodyMedium" style={styles.completionText}>
                  Amazing! You completed today's practice
                </Text>
              </View>
            )}

            {/* 4 Minutes */}
            <TouchableOpacity
          style={[styles.item, entry.fourMinutes && styles.itemCompleted]}
          onPress={handleFourMinutesToggle}
          activeOpacity={0.7}
        >
          <View style={styles.checkboxContainer}>
            <Checkbox
              status={entry.fourMinutes ? 'checked' : 'unchecked'}
              color={Colors.evergreenTeal}
              onPress={handleFourMinutesToggle}
            />
          </View>
          <View style={styles.itemContent}>
            <Text variant="bodyLarge" style={styles.itemTitle}>
              4 minutes to yourself
            </Text>
            <Text variant="bodySmall" style={styles.itemDescription}>
              Uninterrupted alone time
            </Text>
          </View>
          {entry.fourMinutes && (
            <Icon name="check-circle" size={20} color={Colors.success} style={styles.completionIcon} />
          )}
        </TouchableOpacity>

        {/* 3 Wins */}
        <TouchableOpacity
          style={[styles.item, entry.threeWins.completed && styles.itemCompleted]}
          onPress={() => setWinsModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.checkboxContainer}>
            <Checkbox
              status={entry.threeWins.completed ? 'checked' : 'unchecked'}
              color={Colors.evergreenTeal}
              onPress={() => setWinsModalVisible(true)}
            />
          </View>
          <View style={styles.itemContent}>
            <Text variant="bodyLarge" style={styles.itemTitle}>
              3 wins from the day
            </Text>
            <Text variant="bodySmall" style={styles.itemDescription}>
              Tap to add wins or mark complete
            </Text>
          </View>
          {entry.threeWins.completed && (
            <Icon name="check-circle" size={20} color={Colors.success} style={styles.completionIcon} />
          )}
        </TouchableOpacity>

        {/* 2 Fuel */}
        <TouchableOpacity
          style={[styles.item, entry.twoFuel.completed && styles.itemCompleted]}
          onPress={() => setFuelModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.checkboxContainer}>
            <Checkbox
              status={entry.twoFuel.completed ? 'checked' : 'unchecked'}
              color={Colors.evergreenTeal}
              onPress={() => setFuelModalVisible(true)}
            />
          </View>
          <View style={styles.itemContent}>
            <Text variant="bodyLarge" style={styles.itemTitle}>
              2 ways you fueled your body
            </Text>
            <Text variant="bodySmall" style={styles.itemDescription}>
              Nutrition, movement, or rest
            </Text>
            {entry.twoFuel.completed && entry.twoFuel.options && (
              <View style={styles.selectedOptions}>
                {entry.twoFuel.options.map((opt, idx) => (
                  <Text key={idx} variant="bodySmall" style={styles.selectedOption}>
                    • {BODY_FUEL_OPTIONS.find(o => o.value === opt)?.label}
                  </Text>
                ))}
              </View>
            )}
          </View>
          {entry.twoFuel.completed && (
            <Icon name="check-circle" size={20} color={Colors.success} style={styles.completionIcon} />
          )}
        </TouchableOpacity>

        {/* 1 Connection */}
        <TouchableOpacity
          style={[styles.item, entry.oneConnection && styles.itemCompleted]}
          onPress={handleOneConnectionToggle}
          activeOpacity={0.7}
        >
          <View style={styles.checkboxContainer}>
            <Checkbox
              status={entry.oneConnection ? 'checked' : 'unchecked'}
              color={Colors.evergreenTeal}
              onPress={handleOneConnectionToggle}
            />
          </View>
          <View style={styles.itemContent}>
            <Text variant="bodyLarge" style={styles.itemTitle}>
              1 connection with another person
            </Text>
            <Text variant="bodySmall" style={styles.itemDescription}>
              Friend, family, or colleague
            </Text>
          </View>
          {entry.oneConnection && (
            <Icon name="check-circle" size={20} color={Colors.success} style={styles.completionIcon} />
          )}
        </TouchableOpacity>
          </View>
        )}
      </Card>

      {/* 3 Wins Modal */}
      <Portal>
        <Modal
          visible={winsModalVisible}
          onDismiss={() => {
            Keyboard.dismiss();
            setWinsModalVisible(false);
          }}
          contentContainerStyle={styles.winsModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
          >
            <Text variant="titleLarge" style={styles.modalTitle}>
              3 Wins from Today
            </Text>
            <Text variant="bodyMedium" style={styles.modalDescription}>
              Celebrate small accomplishments! (Optional - or just mark complete)
            </Text>

            <ScrollView
              style={styles.winsScrollView}
              contentContainerStyle={styles.winsScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <TextInput
                label="Win #1"
                value={win1}
                onChangeText={setWin1}
                mode="outlined"
                style={styles.input}
                placeholder="Made my bed, did the dishes, etc."
                outlineColor={Colors.border}
                activeOutlineColor={Colors.evergreenTeal}
                returnKeyType="next"
              />
              <TextInput
                label="Win #2"
                value={win2}
                onChangeText={setWin2}
                mode="outlined"
                style={styles.input}
                placeholder="Small wins count!"
                outlineColor={Colors.border}
                activeOutlineColor={Colors.evergreenTeal}
                returnKeyType="next"
              />
              <TextInput
                label="Win #3"
                value={win3}
                onChangeText={setWin3}
                mode="outlined"
                style={styles.input}
                placeholder="Any progress is progress"
                outlineColor={Colors.border}
                activeOutlineColor={Colors.evergreenTeal}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={handleMarkWinsWithoutWriting}
                style={styles.modalButton}
                textColor={Colors.evergreenTeal}
              >
                Mark Complete
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveWins}
                style={styles.modalButton}
                buttonColor={Colors.evergreenTeal}
              >
                Save Wins
              </Button>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>

      {/* 2 Fuel Modal */}
      <Portal>
        <Modal
          visible={fuelModalVisible}
          onDismiss={() => setFuelModalVisible(false)}
          contentContainerStyle={styles.fuelModal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            How Did You Fuel Your Body?
          </Text>
          <Text variant="bodyMedium" style={styles.modalDescription}>
            Select at least 2 ways you nourished yourself today
          </Text>

          <View style={styles.optionsGrid}>
            {BODY_FUEL_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                icon={option.icon}
                selected={selectedFuelOptions.includes(option.value)}
                onPress={() => handleToggleFuelOption(option.value)}
                style={[
                  styles.optionChip,
                  selectedFuelOptions.includes(option.value) && styles.optionChipSelected,
                ]}
                selectedColor={Colors.evergreenTeal}
                textStyle={styles.optionChipText}
              >
                {option.label}
              </Chip>
            ))}
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setFuelModalVisible(false)}
              style={styles.modalButton}
              textColor={Colors.textSecondary}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveFuel}
              style={styles.modalButton}
              buttonColor={Colors.evergreenTeal}
              disabled={selectedFuelOptions.length < 2}
            >
              Save ({selectedFuelOptions.length}/2)
            </Button>
          </View>
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.base,
    padding: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
  },
  loadingContainer: {
    padding: Spacing.lg,
    alignItems: 'center',
  },
  collapsibleHeader: {
    // Touchable header
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.mutedSageGray || '#6F7F77',
    marginTop: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.mutedSageGray || '#6F7F77',
    marginRight: 4,
  },
  chevron: {
    marginLeft: 2,
  },
  expandedContent: {
    marginTop: Spacing.base,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: `${Colors.dewSage}80`,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.sunriseAmber + '20',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.sm,
    gap: 4,
  },
  streakText: {
    color: Colors.sunriseAmber,
    fontWeight: Typography.fontWeight.semibold,
  },
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '15',
    padding: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Spacing.base,
    gap: Spacing.xs,
  },
  completionText: {
    color: Colors.success,
    fontWeight: Typography.fontWeight.semibold,
    flex: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background.surface,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  itemCompleted: {
    backgroundColor: Colors.evergreenTeal + '08',
    borderColor: Colors.evergreenTeal + '40',
  },
  checkboxContainer: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemContent: {
    flex: 1,
    justifyContent: 'center',
  },
  completionIcon: {
    marginLeft: Spacing.xs,
  },
  itemTitle: {
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  itemDescription: {
    color: Colors.textSecondary,
  },
  selectedOptions: {
    marginTop: Spacing.xs,
  },
  selectedOption: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.sm,
  },
  winsModal: {
    backgroundColor: Colors.background.card,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
  },
  winsScrollView: {
    maxHeight: 250,
    marginVertical: Spacing.base,
  },
  winsScrollContent: {
    paddingBottom: Spacing.sm,
  },
  fuelModal: {
    backgroundColor: Colors.background.card,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
    color: Colors.textPrimary,
  },
  modalDescription: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  input: {
    marginBottom: Spacing.base,
    backgroundColor: Colors.background.card,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.base,
  },
  modalButton: {
    flex: 1,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginVertical: Spacing.base,
  },
  optionChip: {
    marginBottom: Spacing.xs,
  },
  optionChipSelected: {
    backgroundColor: Colors.evergreenTeal + '20',
  },
  optionChipText: {
    fontSize: Typography.fontSize.sm,
  },
});
