/**
 * Loading Spinner Component
 * Displays a centered loading indicator
 */

import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Colors, Spacing } from '../constants';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = 'large',
  fullScreen = true,
}) => {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator
        size={size}
        color={Colors.evergreenTeal}
        style={styles.spinner}
      />
      {message && (
        <Text style={styles.message}>
          {message}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  spinner: {
    marginBottom: Spacing.base,
  },
  message: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

export default LoadingSpinner;
