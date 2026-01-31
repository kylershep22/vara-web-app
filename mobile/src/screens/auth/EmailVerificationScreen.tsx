/**
 * Email Verification Screen
 * Prompts user to verify their email address
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, AuthHeader } from '../../components';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../config/firebase';

interface EmailVerificationScreenProps {
  navigation?: any;
}

const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({ navigation }) => {
  const { user, sendVerificationEmail, refreshUser, logout, isLoading } = useAuth();

  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'error' | 'success'>('success');
  const [isChecking, setIsChecking] = useState(false);

  /**
   * Check if email is verified (polls Firebase)
   */
  const checkEmailVerified = async () => {
    setIsChecking(true);
    try {
      // Reload the user from Firebase to get fresh email verification status
      await refreshUser();

      // Check the fresh user data directly from Firebase auth
      const currentUser = auth.currentUser;

      if (currentUser?.emailVerified) {
        setSnackbarMessage('Email verified! Redirecting...');
        setSnackbarType('success');
        setSnackbarVisible(true);

        // The AppNavigator will automatically redirect to onboarding or main app
        // based on the email verification status from auth state listener
      } else {
        setSnackbarMessage('Email not verified yet. Please check your inbox.');
        setSnackbarType('error');
        setSnackbarVisible(true);
      }
    } catch (error) {
      console.error('Error checking verification:', error);
      setSnackbarMessage('Error checking verification. Please try again.');
      setSnackbarType('error');
      setSnackbarVisible(true);
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * Resend verification email
   */
  const handleResendEmail = async () => {
    try {
      await sendVerificationEmail();
      setSnackbarMessage('Verification email sent! Check your inbox.');
      setSnackbarType('success');
      setSnackbarVisible(true);
    } catch (error: any) {
      let errorMessage = 'Failed to send email. Please try again.';
      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please wait a few minutes before trying again.';
      }
      setSnackbarMessage(errorMessage);
      setSnackbarType('error');
      setSnackbarVisible(true);
    }
  };

  /**
   * Logout and return to login screen
   */
  const handleLogout = async () => {
    try {
      await logout();
      // Navigation will be handled by auth state change
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <AuthHeader
          title="Verify Your Email"
          subtitle={`We sent a verification link to\n${user?.email || ''}`}
          icon="email-check"
          iconSize={64}
        />

        {/* Instructions */}
        <View style={styles.instructionsBox}>
          <Text variant="bodyMedium" style={styles.instructionText}>
            1. Check your email inbox (and spam folder)
          </Text>
          <Text variant="bodyMedium" style={styles.instructionText}>
            2. Click the verification link in the email
          </Text>
          <Text variant="bodyMedium" style={styles.instructionTextLast}>
            3. Come back here and tap "I've Verified My Email"
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {/* Check Verification Button */}
          <Button
            variant="primary"
            onPress={checkEmailVerified}
            loading={isChecking}
            disabled={isChecking || isLoading}
            fullWidth
            style={styles.button}
          >
            I've Verified My Email
          </Button>

          {/* Resend Email Button */}
          <Button
            variant="outline"
            onPress={handleResendEmail}
            loading={isLoading}
            disabled={isLoading || isChecking}
            fullWidth
            style={styles.button}
          >
            Resend Verification Email
          </Button>

          {/* Logout Button */}
          <Button
            variant="text"
            onPress={handleLogout}
            disabled={isLoading || isChecking}
            fullWidth
            style={styles.logoutButton}
          >
            Log Out
          </Button>
        </View>

        {/* Help Text */}
        <View style={styles.helpBox}>
          <Text variant="bodySmall" style={styles.helpText}>
            Didn't receive the email? Check your spam folder or try resending.
          </Text>
          <Text variant="bodySmall" style={styles.helpText}>
            {'\n'}
            Still having trouble? Contact support for help.
          </Text>
        </View>
      </ScrollView>

      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={4000}
        action={{
          label: 'Dismiss',
          onPress: () => setSnackbarVisible(false),
        }}
        style={[
          styles.snackbar,
          snackbarType === 'success' && styles.snackbarSuccess,
        ]}
      >
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsBox: {
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    width: '100%',
    overflow: 'visible',
  },
  instructionText: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    lineHeight: 24, // Absolute value for proper text rendering (16px font * 1.5)
  },
  instructionTextLast: {
    color: Colors.textPrimary,
    lineHeight: 24,
    marginBottom: 0, // No margin on last item to prevent clipping
  },
  actions: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  button: {
    marginBottom: Spacing.md,
  },
  logoutButton: {
    marginTop: Spacing.md,
  },
  helpBox: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    width: '100%',
  },
  helpText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20, // Absolute value (14px font * ~1.4)
  },
  snackbar: {
    backgroundColor: Colors.error,
  },
  snackbarSuccess: {
    backgroundColor: Colors.success,
  },
});

export default EmailVerificationScreen;
