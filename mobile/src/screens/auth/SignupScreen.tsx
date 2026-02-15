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
  Alert,
  Linking,
} from 'react-native';
import { Text, Snackbar, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Button, Input, AuthHeader } from '../../components';
import { Colors, Spacing, Typography, Layout } from '../../constants';
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
  const [termsError, setTermsError] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'error' | 'success'>('error');

  /**
   * Open Terms of Service
   */
  const handleOpenTerms = () => {
    Alert.alert(
      'Terms of Service',
      'The Terms of Service document will be displayed here. For now, this feature is coming soon.',
      [{ text: 'OK' }]
    );
    // TODO: Navigate to a screen that displays TERMS_OF_SERVICE.md
    // or open in a web browser: Linking.openURL('https://vara.app/terms')
  };

  /**
   * Open Privacy Policy
   */
  const handleOpenPrivacy = () => {
    Alert.alert(
      'Privacy Policy',
      'The Privacy Policy document will be displayed here. For now, this feature is coming soon.',
      [{ text: 'OK' }]
    );
    // TODO: Navigate to a screen that displays PRIVACY_POLICY.md
    // or open in a web browser: Linking.openURL('https://vara.app/privacy')
  };

  /**
   * Handle signup submission
   */
  const handleSignup = async () => {
    console.log('🔍 handleSignup called');
    console.log('Form values:', { displayName, email, password: '***', confirmPassword: '***', agreedToTerms });

    // Clear previous errors
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setTermsError('');

    // Validate display name
    const nameValidation = validateDisplayName(displayName);
    console.log('Name validation:', nameValidation);
    if (!nameValidation.isValid) {
      setNameError(nameValidation.error || '');
      console.log('❌ Name validation failed');
      return;
    }

    // Validate email
    const emailValidation = validateEmail(email);
    console.log('Email validation:', emailValidation);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || '');
      console.log('❌ Email validation failed');
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    console.log('Password validation:', passwordValidation);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.error || '');
      console.log('❌ Password validation failed');
      return;
    }

    // Validate password match
    const passwordMatchValidation = validatePasswordMatch(password, confirmPassword);
    console.log('Password match validation:', passwordMatchValidation);
    if (!passwordMatchValidation.isValid) {
      setConfirmPasswordError(passwordMatchValidation.error || '');
      console.log('❌ Password match validation failed');
      return;
    }

    // Check terms agreement
    console.log('Terms agreed:', agreedToTerms);
    if (!agreedToTerms) {
      console.log('❌ Terms not agreed');
      setTermsError('You must agree to the Terms of Service and Privacy Policy to continue');
      setSnackbarMessage('Please agree to the Terms of Service and Privacy Policy');
      setSnackbarType('error');
      setSnackbarVisible(true);
      return;
    }

    // Attempt signup
    console.log('✅ All validations passed, attempting signup...');
    try {
      await signup(email.trim(), password, displayName.trim());

      console.log('✅ Signup successful!');
      // Show success message
      setSnackbarMessage('Account created! Please check your email to verify your account.');
      setSnackbarType('success');
      setSnackbarVisible(true);

      // No manual navigation needed - AppNavigator will automatically detect
      // that the user is signed in but email is not verified, and show
      // the EmailVerificationScreen via VerificationNavigator
    } catch (error: any) {
      console.error('❌ Signup error caught:', error);
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
          <AuthHeader
            title="Create Account"
            subtitle="Start your wellness journey today"
          />

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
              left={<Icon name="account-outline" size={20} color={Colors.textSecondary} />}
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
              left={<Icon name="email-outline" size={20} color={Colors.textSecondary} />}
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
              left={<Icon name="lock-outline" size={20} color={Colors.textSecondary} />}
              right={
                <TouchableOpacity onPress={() => setSecureTextEntry(!secureTextEntry)}>
                  <Icon
                    name={secureTextEntry ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={Colors.textSecondary}
                  />
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
              left={<Icon name="lock-outline" size={20} color={Colors.textSecondary} />}
              right={
                <TouchableOpacity onPress={() => setSecureConfirmEntry(!secureConfirmEntry)}>
                  <Icon
                    name={secureConfirmEntry ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={Colors.textSecondary}
                  />
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
            <View style={[
              styles.checkboxContainer,
              termsError && styles.checkboxContainerError
            ]}>
              <Checkbox
                status={agreedToTerms ? 'checked' : 'unchecked'}
                onPress={() => {
                  setAgreedToTerms(!agreedToTerms);
                  setTermsError('');
                }}
                color={Colors.evergreenTeal}
                uncheckedColor={termsError ? Colors.error : Colors.textSecondary}
              />
              <TouchableOpacity
                style={styles.checkboxTextContainer}
                onPress={() => {
                  setAgreedToTerms(!agreedToTerms);
                  setTermsError('');
                }}
                activeOpacity={0.7}
              >
                <Text variant="bodySmall" style={styles.checkboxText}>
                  I agree to the{' '}
                  <Text
                    style={styles.link}
                    onPress={handleOpenTerms}
                  >
                    Terms of Service
                  </Text>{' '}
                  and{' '}
                  <Text
                    style={styles.link}
                    onPress={handleOpenPrivacy}
                  >
                    Privacy Policy
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
            {termsError ? (
              <Text variant="bodySmall" style={styles.errorText}>
                {termsError}
              </Text>
            ) : null}

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
    backgroundColor: Colors.background.default,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  form: {
    flex: 1,
  },
  input: {
    marginBottom: Spacing.base,
  },
  requirementsBox: {
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
  },
  requirementsTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  requirementText: {
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: 'transparent',
  },
  checkboxContainerError: {
    backgroundColor: Colors.error + '10', // 10% opacity red background
    borderWidth: 1,
    borderColor: Colors.error + '30', // 30% opacity red border
  },
  checkboxTextContainer: {
    flex: 1,
    marginLeft: Spacing.xs,
    marginTop: 8, // Align text with checkbox center
  },
  checkboxText: {
    color: Colors.textSecondary,
    lineHeight: Typography.fontSize.sm * 1.5,
  },
  errorText: {
    color: Colors.error,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.base,
    marginLeft: Spacing.base + 24, // Align with checkbox text
  },
  link: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
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
    fontWeight: Typography.fontWeight.semibold,
  },
  snackbar: {
    backgroundColor: Colors.error,
  },
  snackbarSuccess: {
    backgroundColor: Colors.success,
  },
});

export default SignupScreen;
