/**
 * Loading Spinner Component
 * Displays a centered loading indicator with brand text
 * so users know the app is loading (not stuck on splash).
 */

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import Text from './shared/Text';
import { Colors, Spacing } from '../constants';
import { SurfaceTier } from './shared/SurfaceTier';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
  /**
   * Full-screen only. Drops the Mist White fill so the spinner sits over
   * whatever the caller has already painted behind it, and puts the wordmark
   * and message on the immersive surface tier so they are never raw on it.
   * Added for Today (R3a), whose environmental background must not be covered
   * by an opaque ground on the cold-load path. Every other caller omits it and
   * renders exactly as before.
   */
  transparentGround?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message,
  size = 'large',
  fullScreen = true,
  transparentGround = false,
}) => {
  const content = (
    <>
      {fullScreen && (
        <Text style={styles.brandText}>vara</Text>
      )}
      <ActivityIndicator
        size={size}
        color={Colors.evergreenTeal}
        style={styles.spinner}
      />
      {message && (
        <Text style={[styles.message, transparentGround && styles.messageOnGround]}>
          {message}
        </Text>
      )}
    </>
  );

  return (
    <View
      style={[
        styles.container,
        fullScreen && styles.fullScreen,
        fullScreen && transparentGround && styles.transparentGround,
      ]}
    >
      {/* With no fill of its own, the spinner's text would sit raw on whatever
          is behind it. On Today that is artwork, so the text takes the
          immersive surface tier (standards 2.8). */}
      {fullScreen && transparentGround ? (
        <SurfaceTier style={styles.loadingSurface} testID="loading-surface">
          {content}
        </SurfaceTier>
      ) : (
        content
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
  loadingSurface: {
    alignItems: 'center',
    padding: Spacing.lg,
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
  // On an environmental ground the message sits on the surface tier, where
  // Muted Sage Gray misses 4.5:1 over the darkest art (R3a).
  messageOnGround: {
    color: Colors.softCharcoal,
  },
});

export default LoadingSpinner;
