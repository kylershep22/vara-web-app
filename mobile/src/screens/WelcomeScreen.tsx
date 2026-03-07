/**
 * Welcome Screen (Temporary)
 * This is a placeholder screen to verify the app is working
 * Will be replaced with proper navigation and auth flow
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Colors, Spacing, Typography, Layout } from '../constants';

const WelcomeScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          Vara Wellness
        </Text>

        <Text style={styles.subtitle}>
          Your wellness journey starts here.
        </Text>
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
    marginBottom: Spacing.base,
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
    marginBottom: Spacing.base,
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
    marginTop: Spacing.base,
  },
});

export default WelcomeScreen;
