/**
 * TriggerStep - Step 4 (skippable)
 * Trigger type, cue value, implementation intention preview
 */

import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Animated, ScrollView, Modal, Dimensions } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Input } from '../../';
import { Colors, Spacing, Typography, Layout } from '../../../constants';
import { getBrainStateForTimeString, ALL_BRAIN_STATE_WINDOWS, BrainStateWindow } from '../../../constants/brainStateWindows';
import { WizardStepProps } from './types';

const CUE_OPTIONS = [
  { type: 'time' as const, label: 'Time', icon: 'clock-outline' },
  { type: 'after_habit' as const, label: 'After Habit', icon: 'link-variant' },
  { type: 'location' as const, label: 'Location', icon: 'map-marker' },
  { type: 'emotion' as const, label: 'Feeling', icon: 'emoticon-happy-outline' },
];

export const TriggerStep: React.FC<WizardStepProps> = ({ formData, onUpdateFormData }) => {
  const [learnMoreVisible, setLearnMoreVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  const brainState = useMemo(() => {
    if (formData.cueType !== 'time' || !formData.cueValue) return null;
    return getBrainStateForTimeString(formData.cueValue);
  }, [formData.cueType, formData.cueValue]);

  React.useEffect(() => {
    if (brainState) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [brainState, fadeAnim]);

  const getCuePrefix = () => {
    switch (formData.cueType) {
      case 'time': return 'At';
      case 'after_habit': return 'After';
      case 'location': return 'At';
      case 'emotion': return 'When I feel';
    }
  };

  const getInputLabel = () => {
    switch (formData.cueType) {
      case 'time': return 'Time (e.g., 7:00 AM)';
      case 'after_habit': return 'After which habit/routine?';
      case 'location': return 'Where?';
      case 'emotion': return 'When you feel...';
    }
  };

  const getPlaceholder = () => {
    switch (formData.cueType) {
      case 'time': return '7:00 AM';
      case 'after_habit': return 'After morning coffee';
      case 'location': return 'At my desk';
      case 'emotion': return 'Stressed';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headline}>Your when/where plan</Text>
      <Text style={styles.subtitle}>
        Having a clear plan can help you follow through.
      </Text>

      <Text style={styles.fieldLabel}>Trigger Type</Text>
      <View style={styles.cueTypeButtons}>
        {CUE_OPTIONS.map((cueOption) => (
          <TouchableOpacity
            key={cueOption.type}
            onPress={() => onUpdateFormData({ cueType: cueOption.type })}
            style={[
              styles.cueTypeButton,
              formData.cueType === cueOption.type && styles.cueTypeButtonActive,
            ]}
          >
            <Icon
              name={cueOption.icon}
              size={16}
              color={formData.cueType === cueOption.type ? Colors.textOnPrimary : Colors.textSecondary}
            />
            <Text
              style={[
                styles.cueTypeButtonText,
                formData.cueType === cueOption.type && styles.cueTypeButtonTextActive,
              ]}
            >
              {cueOption.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Input
        label={getInputLabel()}
        value={formData.cueValue}
        onChangeText={(text) => onUpdateFormData({ cueValue: text })}
        placeholder={getPlaceholder()}
        style={styles.input}
      />

      {formData.cueValue ? (
        <View style={styles.intentionPreview}>
          <Text style={styles.intentionPreviewLabel}>Your plan:</Text>
          <Text style={styles.intentionPreviewText}>
            "{getCuePrefix()} {formData.cueValue}, I will {formData.name.toLowerCase() || '...'}"
          </Text>
        </View>
      ) : null}

      {brainState && (
        <Animated.View
          style={[
            styles.brainStateCallout,
            { backgroundColor: brainState.background, opacity: fadeAnim },
          ]}
        >
          <View style={styles.brainStateHeader}>
            <View>
              <Text style={[styles.brainStateEyebrow, { color: brainState.textColor }]}>
                BRAIN STATE · {brainState.timeRange}
              </Text>
              <Text style={[styles.brainStateLabel, { color: brainState.textColor }]}>
                {brainState.label}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setLearnMoreVisible(true)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={[styles.brainStateLearnMore, { color: brainState.textColor }]}>
                Learn more →
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.brainStateDesc, { color: brainState.textColor }]}>
            {brainState.description}
          </Text>
          <View style={styles.brainStateChips}>
            {brainState.chips.map((chip) => (
              <View
                key={chip}
                style={[
                  styles.brainStateChip,
                  { backgroundColor: `${brainState.textColor}1A` },
                ]}
              >
                <Text style={[styles.brainStateChipText, { color: brainState.textColor }]}>
                  {chip}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Learn More Bottom Sheet */}
      <Modal
        visible={learnMoreVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLearnMoreVisible(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setLearnMoreVisible(false)}
        >
          <View style={styles.sheetContainer} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <TouchableOpacity
              style={styles.sheetCloseButton}
              onPress={() => setLearnMoreVisible(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Icon name="close" size={24} color="#6F7F77" />
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>Brain States & Your Habits</Text>
            <Text style={styles.sheetSubtitle}>
              Your brain naturally moves through different states throughout the day. Understanding them helps you schedule habits when your brain is most ready.
            </Text>
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {ALL_BRAIN_STATE_WINDOWS.map((w) => (
                <View key={w.label} style={[styles.sheetCard, { backgroundColor: w.background }]}>
                  <Text style={[styles.sheetCardTitle, { color: w.textColor }]}>{w.label}</Text>
                  <Text style={[styles.sheetCardTime, { color: `${w.textColor}B3` }]}>{w.timeRange}</Text>
                  <Text style={[styles.sheetCardDesc, { color: w.textColor }]}>{w.description}</Text>
                  <View style={styles.brainStateChips}>
                    {w.chips.map((chip) => (
                      <View
                        key={chip}
                        style={[styles.brainStateChip, { backgroundColor: `${w.textColor}1A` }]}
                      >
                        <Text style={[styles.brainStateChipText, { color: w.textColor }]}>{chip}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.base,
  },
  headline: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontSize: Typography.fontSize.sm,
  },
  input: {
    marginBottom: Spacing.base,
  },
  cueTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  cueTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cueTypeButtonActive: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  cueTypeButtonText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  cueTypeButtonTextActive: {
    color: Colors.textOnPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  intentionPreview: {
    backgroundColor: Colors.background.default,
    padding: Spacing.base,
    borderRadius: Layout.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.evergreenTeal,
  },
  intentionPreviewLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    marginBottom: Spacing['2xs'],
  },
  intentionPreviewText: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    fontSize: Typography.fontSize.sm,
  },
  // Brain-State Callout
  brainStateCallout: {
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
    marginBottom: 12,
  },
  brainStateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brainStateEyebrow: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.08 * 10,
    marginBottom: 2,
  },
  brainStateLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  brainStateLearnMore: {
    fontSize: 11,
    fontWeight: '700',
  },
  brainStateDesc: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 12 * 1.55,
    marginTop: 8,
    opacity: 0.85,
  },
  brainStateChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  brainStateChip: {
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  brainStateChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Learn More Bottom Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: Dimensions.get('window').height * 0.85,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#B8CDBA',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B5E57',
    marginBottom: 8,
  },
  sheetSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6F7F77',
    lineHeight: 14 * 1.55,
    marginBottom: 16,
  },
  sheetScroll: {
    flex: 1,
  },
  sheetCard: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  sheetCardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  sheetCardTime: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  sheetCardDesc: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 12 * 1.55,
    marginTop: 6,
  },
});
