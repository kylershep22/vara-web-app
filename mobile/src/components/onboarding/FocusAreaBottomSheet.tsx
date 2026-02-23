/**
 * FocusAreaBottomSheet Component
 * Bottom sheet for selecting/adjusting focus area
 *
 * Specs:
 * - White bg, 16px top radius, 24px padding
 * - Handle bar: 40px × 4px, Silver Sage, centered
 * - 5 focus option cards with icon, title, subtitle
 * - Selected: Teal border, Dew Sage bg, checkmark
 * - CTA: "Continue with [Focus Name]"
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { BrainPillar } from '../../types';
import { getAllFocusAreas, getFocusAreaData } from '../../utils/onboardingInsights';
import Button from '../Button';

interface FocusAreaBottomSheetProps {
  visible: boolean;
  selectedFocus: BrainPillar;
  recommendedFocus?: BrainPillar;
  onSelect: (focus: BrainPillar) => void;
  onDismiss: () => void;
}

const ICON_CIRCLE_SIZE = 40;
const ICON_SIZE = 20;

const FocusAreaBottomSheet: React.FC<FocusAreaBottomSheetProps> = ({
  visible,
  selectedFocus,
  recommendedFocus,
  onSelect,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const focusAreas = getAllFocusAreas();

  const handleSelectFocus = useCallback(
    (pillar: BrainPillar) => {
      Haptics.selectionAsync();
      onSelect(pillar);
    },
    [onSelect]
  );

  const handleContinue = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  }, [onDismiss]);

  const selectedFocusData = getFocusAreaData(selectedFocus);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      {/* Overlay */}
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <View />
      </Pressable>

      {/* Bottom Sheet */}
      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
        {/* Handle Bar */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <Text style={styles.title}>Choose your starting focus</Text>
        <Text style={styles.subtitle}>
          This helps Vara personalize your experience
        </Text>

        {/* Focus Options */}
        <ScrollView
          style={styles.optionsContainer}
          contentContainerStyle={styles.optionsContent}
          showsVerticalScrollIndicator={false}
        >
          {focusAreas.map((area) => {
            const isSelected = selectedFocus === area.pillar;
            const isRecommended = recommendedFocus === area.pillar;

            return (
              <TouchableOpacity
                key={area.pillar}
                onPress={() => handleSelectFocus(area.pillar)}
                style={[
                  styles.optionCard,
                  isSelected && styles.optionCardSelected,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${area.title}: ${area.subtitle}${isRecommended ? ', recommended' : ''}`}
              >
                {/* Icon Circle */}
                <View
                  style={[
                    styles.iconCircle,
                    isSelected && styles.iconCircleSelected,
                  ]}
                >
                  <Icon
                    name={area.icon as any}
                    size={ICON_SIZE}
                    color={Colors.evergreenTeal}
                  />
                </View>

                {/* Content */}
                <View style={styles.optionContent}>
                  <View style={styles.optionTitleRow}>
                    <Text style={styles.optionTitle}>{area.title}</Text>
                    {isRecommended && (
                      <View style={styles.recommendedBadge}>
                        <Text style={styles.recommendedText}>Recommended</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.optionSubtitle}>{area.subtitle}</Text>
                </View>

                {/* Checkmark */}
                {isSelected && (
                  <Icon
                    name="check"
                    size={20}
                    color={Colors.evergreenTeal}
                    style={styles.checkmark}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <Button
            variant="primary"
            onPress={handleContinue}
            fullWidth
          >
            Continue with {selectedFocusData.title}
          </Button>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Layout.borderRadius.xl,
    borderTopRightRadius: Layout.borderRadius.xl,
    paddingHorizontal: Spacing.lg,
    maxHeight: '85%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.silverSage,
    borderRadius: 2,
  },
  title: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  optionsContainer: {
    flexGrow: 0,
    maxHeight: 350,
  },
  optionsContent: {
    gap: Spacing.md,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.silverSage,
    padding: Spacing.base,
  },
  optionCardSelected: {
    borderColor: Colors.evergreenTeal,
    borderWidth: 1.5,
    backgroundColor: `${Colors.dewSage}4D`, // 30% opacity
  },
  iconCircle: {
    width: ICON_CIRCLE_SIZE,
    height: ICON_CIRCLE_SIZE,
    borderRadius: ICON_CIRCLE_SIZE / 2,
    backgroundColor: `${Colors.dewSage}80`, // 50% opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  iconCircleSelected: {
    backgroundColor: Colors.dewSage,
  },
  optionContent: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  optionTitle: {
    color: Colors.softCharcoal,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },
  optionSubtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    marginTop: 2,
  },
  recommendedBadge: {
    backgroundColor: `${Colors.evergreenTeal}1A`, // 10% opacity
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.sm,
  },
  recommendedText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  checkmark: {
    marginLeft: Spacing.sm,
  },
  buttonContainer: {
    marginTop: Spacing.lg,
  },
});

export default FocusAreaBottomSheet;
