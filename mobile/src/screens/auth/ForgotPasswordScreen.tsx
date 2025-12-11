/**
 * Forgot Password Screen
 * Send password reset email
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Text, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '../../components';
import { Colors, Spacing } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { validateEmail, getAuthErrorMessage } from '../../utils/validation';

interface ForgotPasswordScreenProps {
  navigation: any;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const { resetPassword, isLoading } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  // Error state
  const [emailError, setEmailError] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'error' | 'success'>('error');

  /**
   * Handle password reset submission
   */
  const handleResetPassword = async () => {
    // Clear previous errors
    setEmailError('');

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || '');
      return;
    }

    // Send password reset email
    try {
      await resetPassword(email.trim());

      // Show success state
      setEmailSent(true);
      setSnackbarMessage('Password reset email sent! Check your inbox.');
      setSnackbarType('success');
      setSnackbarVisible(true);
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error.code);
      setSnackbarMessage(errorMessage);
      setSnackbarType('error');
      setSnackbarVisible(true);
    }
  };

  /**
   * Navigate back to login
   */
  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.icon}>🔐</Text>
            <Text variant="displaySmall" style={styles.title}>
              {emailSent ? 'Check Your Email' : 'Forgot Password?'}
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              {emailSent
                ? 'We sent a password reset link to your email address'
                : 'Enter your email and we\'ll send you a link to reset your password'}
            </Text>
          </View>

          {/* Form */}
          {!emailSent ? (
            <View style={styles.form}>
              {/* Email Input */}
              <Input
                label="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setEmailError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                error={!!emailError}
                errorText={emailError}
                left={<Text>📧</Text>}
                style={styles.input}
              />

              {/* Submit Button */}
              <Button
                variant="primary"
                onPress={handleResetPassword}
                loading={isLoading}
                disabled={isLoading}
                fullWidth
                style={styles.submitButton}
              >
                Send Reset Link
              </Button>

              {/* Back to Login */}
              <TouchableOpacity onPress={handleBackToLogin} style={styles.backButton}>
                <Text variant="bodyMedium" style={styles.backText}>
                  ← Back to Login
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.successContainer}>
              {/* Success Message */}
              <View style={styles.successBox}>
                <Text variant="bodyMedium" style={styles.successText}>
                  If an account exists with{' '}
                  <Text style={styles.emailHighlight}>{email}</Text>, you'll receive an email with
                  instructions to reset your password.
                </Text>
                <Text variant="bodyMedium" style={styles.successText}>
                  {'\n'}
                  Check your spam folder if you don't see it in a few minutes.
                </Text>
              </View>

              {/* Resend Button */}
              <Button
                variant="outline"
                onPress={handleResetPassword}
                loading={isLoading}
                disabled={isLoading}
                fullWidth
                style={styles.resendButton}
              >
                Resend Email
              </Button>

              {/* Back to Login */}
              <Button
                variant="text"
                onPress={handleBackToLogin}
                fullWidth
                style={styles.loginButton}
              >
                Back to Login
              </Button>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    justifyContent: 'center',
  },
  header: {
    marginBottom: Spacing['2xl'],
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  title: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: Spacing.lg,
  },
  submitButton: {
    marginBottom: Spacing.md,
  },
  backButton: {
    alignSelf: 'center',
    padding: Spacing.md,
  },
  backText: {
    color: Colors.evergreenTeal,
    fontWeight: '600',
  },
  successContainer: {
    width: '100%',
  },
  successBox: {
    backgroundColor: Colors.dewSage,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  successText: {
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  emailHighlight: {
    fontWeight: '600',
    color: Colors.evergreenTeal,
  },
  resendButton: {
    marginBottom: Spacing.md,
  },
  loginButton: {
    marginTop: Spacing.md,
  },
  snackbar: {
    backgroundColor: Colors.error,
  },
  snackbarSuccess: {
    backgroundColor: Colors.success,
  },
});

export default ForgotPasswordScreen;
