/**
 * AmbientSoundSelector Component
 * Expandable panel for selecting ambient sounds
 *
 * Per Focus Page Spec Section 5.6:
 * - Trigger: Headphones icon in timer controls
 * - Panel: Card with 200ms ease-out height animation
 * - Options: Grid of 4 small cards (Soft Rain, Forest, Ocean Waves, White Noise)
 * - Tap selected sound again to deselect
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, LayoutAnimation, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  ColorTokens,
  SpacingTokens,
  RadiusTokens,
  ShadowTokens,
} from '../../../constants/designTokens';
import { FocusCopy, AmbientSounds } from '../../../constants/focusContent';
import { useReducedMotion } from '../../../hooks/useReducedMotion';

interface AmbientSoundSelectorProps {
  /** Whether the panel is expanded */
  isExpanded: boolean;
  /** Currently selected sound ID (null if none) */
  selectedSound: string | null;
  /** Callback when sound selection changes */
  onSoundSelect: (soundId: string | null) => void;
}

export const AmbientSoundSelector: React.FC<AmbientSoundSelectorProps> = ({
  isExpanded,
  selectedSound,
  onSoundSelect,
}) => {
  const reduceMotion = useReducedMotion();

  // Animate expansion
  useEffect(() => {
    if (!reduceMotion) {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(
          200,
          LayoutAnimation.Types.easeOut,
          LayoutAnimation.Properties.opacity
        )
      );
    }
  }, [isExpanded, reduceMotion]);

  if (!isExpanded) {
    return null;
  }

  const handleSoundPress = (soundId: string) => {
    Haptics.selectionAsync();
    // Toggle off if already selected
    if (selectedSound === soundId) {
      onSoundSelect(null);
    } else {
      onSoundSelect(soundId);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{FocusCopy.ambientPanelLabel}</Text>
      <View style={styles.grid}>
        {AmbientSounds.map((sound) => {
          const isSelected = selectedSound === sound.id;

          return (
            <TouchableOpacity
              key={sound.id}
              style={[
                styles.soundCard,
                isSelected && styles.soundCardSelected,
              ]}
              onPress={() => handleSoundPress(sound.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${sound.label}${isSelected ? ', selected' : ''}`}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{sound.emoji}</Text>
              <Text
                style={[
                  styles.soundLabel,
                  isSelected && styles.soundLabelSelected,
                ]}
                numberOfLines={1}
              >
                {sound.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: ColorTokens.backgroundSurface,
    borderRadius: RadiusTokens.lg,
    padding: SpacingTokens.base,
    marginBottom: SpacingTokens.base,
    ...ShadowTokens.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: ColorTokens.textSecondary,
    marginBottom: SpacingTokens.md,
  },
  grid: {
    flexDirection: 'row',
    gap: SpacingTokens.sm,
  },
  soundCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: RadiusTokens.md,
    borderWidth: 1,
    borderColor: ColorTokens.secondary,
    backgroundColor: ColorTokens.backgroundSurface,
  },
  soundCardSelected: {
    borderWidth: 1.5,
    borderColor: ColorTokens.primary,
    backgroundColor: ColorTokens.primaryLight,
  },
  emoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  soundLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: ColorTokens.textSecondary,
    textAlign: 'center',
  },
  soundLabelSelected: {
    color: ColorTokens.primary,
  },
});

export default AmbientSoundSelector;
