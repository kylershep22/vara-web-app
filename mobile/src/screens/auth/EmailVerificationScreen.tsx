/**
 * Email Verification Screen
 * Prompts user to verify their email address
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components';
import { Colors, Spacing } from '../../constants';
import { useAuth } from '../../context/AuthContext';

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
      await refreshUser();

      if (user?.emailVerified) {
        setSnackbarMessage('Email verified! Redirecting...');
        setSnackbarType('success');
        setSnackbarVisible(true);

        // Navigate to main app after short delay
        setTimeout(() => {
          // Navigation will be handled by auth state change
        }, 1500);
      } else {
        setSnackbarMessage('Email not verified yet. Please check your inbox.');
        setSnackbarType('error');
        setSnackbarVisible(true);
      }
    } catch (error) {
      console.error('Error checking verification:', error);
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
        {/* Icon */}
        <Text style={styles.icon}>📧</Text>

        {/* Header */}
        <View style={styles.header}>
          <Text variant="displaySmall" style={styles.title}>
            Verify Your Email
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            We sent a verification link to
          </Text>
          <Text variant="bodyLarge" style={styles.email}>
            {user?.email}
          </Text>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsBox}>
          <Text variant="bodyMedium" style={styles.instructionText}>
            1. Check your email inbox (and spam folder)
          </Text>
          <Text variant="bodyMedium" style={styles.instructionText}>
            2. Click the verification link in the email
          </Text>
          <Text variant="bodyMedium" style={styles.instructionText}>
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
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 80,
    marginBottom: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  title: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  email: {
    color: Colors.evergreenTeal,
    fontWeight: '600',
    textAlign: 'center',
  },
  instructionsBox: {
    backgroundColor: Colors.dewSage,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    width: '100%',
  },
  instructionText: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    lineHeight: 22,
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
    borderRadius: 8,
    padding: Spacing.md,
    width: '100%',
  },
  helpText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  snackbar: {
    backgroundColor: Colors.error,
  },
  snackbarSuccess: {
    backgroundColor: Colors.success,
  },
});

export default EmailVerificationScreen;
