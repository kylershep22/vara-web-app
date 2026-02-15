/**
 * MoodGradientDot Component
 * Displays a gradient circle representing mood state
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getMoodConfig } from '../../constants/journalTags';

interface MoodGradientDotProps {
  /** Mood value (great, good, okay, bad, terrible) */
  mood: string;
  /** Size of the dot in pixels (default: 12) */
  size?: number;
  /** Additional style overrides */
  style?: ViewStyle;
}

/**
 * A gradient dot that represents mood state
 * Uses the MOOD_CONFIG from journalTags for gradient colors
 */
export const MoodGradientDot: React.FC<MoodGradientDotProps> = ({
  mood,
  size = 12,
  style,
}) => {
  const moodConfig = getMoodConfig(mood);

  return (
    <View
      style={[styles.container, { width: size, height: size }, style]}
      accessible
      accessibilityLabel={`Mood: ${moodConfig.label}`}
      accessibilityRole="image"
    >
      <LinearGradient
        colors={moodConfig.gradient as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, { borderRadius: size / 2 }]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
  },
});

export default MoodGradientDot;
