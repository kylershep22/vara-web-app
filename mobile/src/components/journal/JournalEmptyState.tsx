/**
 * JournalEmptyState Component
 *
 * Shown when the user has no journal entries yet. Centers a larger
 * illustrative notebook icon, a warm headline, supporting body copy, and
 * a single primary CTA that opens the new-entry flow — matching the empty
 * state pattern in Mobile_UI_Standards.docx and the wellness-tab screens.
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../Button';
import { Colors, Spacing, TextStyles } from '../../constants';

interface JournalEmptyStateProps {
  /** Opens the new-reflection flow. */
  onStartReflection: () => void;
}

export const JournalEmptyState: React.FC<JournalEmptyStateProps> = ({
  onStartReflection,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.illustration}>
        <Ionicons name="journal-outline" size={96} color={Colors.evergreenTeal} />
      </View>

      <Text style={styles.headline}>Every thought matters</Text>

      <Text style={styles.body}>
        {"Capture what's on your mind when you're ready. It only takes a moment."}
      </Text>

      <View style={styles.ctaContainer}>
        <Button
          variant="primary"
          fullWidth
          onPress={onStartReflection}
          accessibilityLabel="Start a reflection"
        >
          Start a reflection
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  illustration: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headline: {
    ...TextStyles.h3,
    color: Colors.evergreenTeal,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  body: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  ctaContainer: {
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.lg, // 24px horizontal margins per Primary Button spec
  },
});

export default JournalEmptyState;
