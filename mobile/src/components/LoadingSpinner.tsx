/**
 * Loading Spinner Component
 * Displays a centered loading indicator with brand text
 * so users know the app is loading (not stuck on splash).
 */

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import Text from './shared/Text';
import { Colors, Spacing } from '../constants';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
  /**
   * Full-screen only. Drops the Mist White fill so the spinner sits over
   * whatever the caller has already painted behind it. Added for Today (R3a),
   * whose environmental background must not be covered by an opaque ground on
   * the cold-load path. Every other caller omits it and keeps the fill.
   */
  transparentGround?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = 'large',
  fullScreen = true,
  transparentGround = false,
}) => {
  return (
    <View
      style={[
        styles.container,
        fullScreen && styles.fullScreen,
        fullScreen && transparentGround && styles.transparentGround,
      ]}
    >
      {fullScreen && (
        <Text style={styles.brandText}>vara</Text>
      )}
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
  transparentGround: {
    backgroundColor: 'transparent',
  },
  brandText: {
    fontSize: 32,
    fontWeight: '600',
    color: Colors.evergreenTeal,
    letterSpacing: 2,
    marginBottom: 24,
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
