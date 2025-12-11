/**
 * Signup Screen
 * New user registration with email and password
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
import { Text, Snackbar, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '../../components';
import { Colors, Spacing } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import {
  validateEmail,
  validatePassword,
  validatePasswordMatch,
  validateDisplayName,
  getAuthErrorMessage,
} from '../../utils/validation';

interface SignupScreenProps {
  navigation: any;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const { signup, isLoading } = useAuth();

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [secureConfirmEntry, setSecureConfirmEntry] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Error state
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'error' | 'success'>('error');

  /**
   * Handle signup submission
   */
  const handleSignup = async () => {
    // Clear previous errors
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');

    // Validate display name
    const nameValidation = validateDisplayName(displayName);
    if (!nameValidation.isValid) {
      setNameError(nameValidation.error || '');
      return;
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || '');
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.error || '');
      return;
    }

    // Validate password match
    const passwordMatchValidation = validatePasswordMatch(password, confirmPassword);
    if (!passwordMatchValidation.isValid) {
      setConfirmPasswordError(passwordMatchValidation.error || '');
      return;
    }

    // Check terms agreement
    if (!agreedToTerms) {
      setSnackbarMessage('Please agree to the Terms of Service and Privacy Policy');
      setSnackbarType('error');
      setSnackbarVisible(true);
      return;
    }

    // Attempt signup
    try {
      await signup(email.trim(), password, displayName.trim());

      // Show success message
      setSnackbarMessage('Account created! Please check your email to verify your account.');
      setSnackbarType('success');
      setSnackbarVisible(true);

      // Navigate to email verification screen after delay
      setTimeout(() => {
        navigation.replace('EmailVerification');
      }, 2000);
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error.code);
      setSnackbarMessage(errorMessage);
      setSnackbarType('error');
      setSnackbarVisible(true);
    }
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
            <Text variant="displayMedium" style={styles.title}>
              Create Account
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Start your wellness journey today
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Name Input */}
            <Input
              label="Full Name"
              value={displayName}
              onChangeText={(text) => {
                setDisplayName(text);
                setNameError('');
              }}
              autoCapitalize="words"
              autoComplete="name"
              error={!!nameError}
              errorText={nameError}
              left={<Text>👤</Text>}
              style={styles.input}
            />

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

            {/* Password Input */}
            <Input
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError('');
              }}
              secureTextEntry={secureTextEntry}
              autoCapitalize="none"
              autoComplete="password-new"
              error={!!passwordError}
              errorText={passwordError}
              left={<Text>🔒</Text>}
              right={
                <TouchableOpacity onPress={() => setSecureTextEntry(!secureTextEntry)}>
                  <Text>{secureTextEntry ? '👁️' : '🙈'}</Text>
                </TouchableOpacity>
              }
              style={styles.input}
            />

            {/* Confirm Password Input */}
            <Input
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setConfirmPasswordError('');
              }}
              secureTextEntry={secureConfirmEntry}
              autoCapitalize="none"
              autoComplete="password-new"
              error={!!confirmPasswordError}
              errorText={confirmPasswordError}
              left={<Text>🔒</Text>}
              right={
                <TouchableOpacity onPress={() => setSecureConfirmEntry(!secureConfirmEntry)}>
                  <Text>{secureConfirmEntry ? '👁️' : '🙈'}</Text>
                </TouchableOpacity>
              }
              style={styles.input}
            />

            {/* Password Requirements */}
            <View style={styles.requirementsBox}>
              <Text variant="bodySmall" style={styles.requirementsTitle}>
                Password must contain:
              </Text>
              <Text variant="bodySmall" style={styles.requirementText}>
                • At least 8 characters
              </Text>
              <Text variant="bodySmall" style={styles.requirementText}>
                • One uppercase letter
              </Text>
              <Text variant="bodySmall" style={styles.requirementText}>
                • One lowercase letter
              </Text>
              <Text variant="bodySmall" style={styles.requirementText}>
                • One number
              </Text>
            </View>

            {/* Terms Agreement */}
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              activeOpacity={0.7}
            >
              <Checkbox
                status={agreedToTerms ? 'checked' : 'unchecked'}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                color={Colors.evergreenTeal}
              />
              <Text variant="bodySmall" style={styles.checkboxText}>
                I agree to the{' '}
                <Text style={styles.link}>Terms of Service</Text> and{' '}
                <Text style={styles.link}>Privacy Policy</Text>
              </Text>
            </TouchableOpacity>

            {/* Signup Button */}
            <Button
              variant="primary"
              onPress={handleSignup}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
              style={styles.signupButton}
            >
              Sign Up
            </Button>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text variant="bodyMedium" style={styles.loginText}>
                Already have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text variant="bodyMedium" style={styles.loginLink}>
                  Log In
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Snackbar */}
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={snackbarType === 'success' ? 3000 : 4000}
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
  },
  header: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  title: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  input: {
    marginBottom: Spacing.md,
  },
  requirementsBox: {
    backgroundColor: Colors.dewSage,
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  requirementsTitle: {
    color: Colors.evergreenTeal,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  requirementText: {
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  checkboxText: {
    flex: 1,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  link: {
    color: Colors.evergreenTeal,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  signupButton: {
    marginBottom: Spacing.lg,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: Colors.textSecondary,
  },
  loginLink: {
    color: Colors.evergreenTeal,
    fontWeight: '600',
  },
  snackbar: {
    backgroundColor: Colors.error,
  },
  snackbarSuccess: {
    backgroundColor: Colors.success,
  },
});

export default SignupScreen;
