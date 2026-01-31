/**
 * Welcome Screen (Temporary)
 * This is a placeholder screen to verify the app is working
 * Will be replaced with proper navigation and auth flow
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { Colors, Spacing, Typography, Layout } from '../constants';

const WelcomeScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text variant="displayMedium" style={styles.title}>
          Vara Wellness
        </Text>

        <Text variant="bodyLarge" style={styles.subtitle}>
          Mobile App Foundation Setup Complete! ✓
        </Text>

        <View style={styles.infoBox}>
          <Text variant="titleMedium" style={styles.infoTitle}>
            Phase 2 Complete:
          </Text>
          <Text variant="bodyMedium" style={styles.infoText}>
            ✓ Expo project initialized
          </Text>
          <Text variant="bodyMedium" style={styles.infoText}>
            ✓ Dependencies installed
          </Text>
          <Text variant="bodyMedium" style={styles.infoText}>
            ✓ Design system configured
          </Text>
          <Text variant="bodyMedium" style={styles.infoText}>
            ✓ Firebase setup ready
          </Text>
          <Text variant="bodyMedium" style={styles.infoText}>
            ✓ Environment variables configured
          </Text>
        </View>

        <Text variant="bodyMedium" style={styles.nextSteps}>
          Next: Configure .env file and continue with Phase 3 (Authentication & Security)
        </Text>

        <Button
          mode="contained"
          onPress={() => console.log('Button pressed!')}
          style={styles.button}
        >
          Test Button
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  title: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.md,
    fontWeight: Typography.fontWeight.semibold,
  },
  infoText: {
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  nextSteps: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    fontStyle: 'italic',
  },
  button: {
    marginTop: Spacing.md,
  },
});

export default WelcomeScreen;
