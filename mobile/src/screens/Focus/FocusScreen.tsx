/**
 * FocusScreen
 * Pomodoro-only focus screen
 *
 * Routines have been relocated to the Track page.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ColorTokens,
  SpacingTokens,
  TypographyTokens,
  FocusCopy,
} from '../../tokens/design-tokens';
import { PomodoroTab } from './PomodoroTab';

export const FocusScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{FocusCopy.pageTitle}</Text>
        <Text style={styles.subtitle}>{FocusCopy.pomodoroSubtitle}</Text>
      </View>

      {/* Pomodoro Content */}
      <View style={styles.content}>
        <PomodoroTab showAdvancedDuration />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ColorTokens.backgroundPrimary,
  },
  header: {
    paddingHorizontal: SpacingTokens.lg,
    paddingVertical: SpacingTokens.base,
  },
  title: {
    fontSize: TypographyTokens.fontH1,
    fontWeight: '600',
    color: ColorTokens.primary,
  },
  subtitle: {
    fontSize: 14,
    color: ColorTokens.textSecondary,
    marginTop: SpacingTokens.xs,
  },
  content: {
    flex: 1,
  },
});

export default FocusScreen;
