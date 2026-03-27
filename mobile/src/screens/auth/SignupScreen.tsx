/**
 * Signup Screen
 * New user registration with email and password
 *
 * Enhanced with:
 * - Floating label inputs
 * - Custom styled checkbox
 * - Real-time password validation
 * - Animated mount transitions
 * - Decorative background elements
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Animated,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Button } from '../../components';
import {
  FloatingLabelInput,
  CustomCheckbox,
  PasswordRequirements,
  allRequirementsMet,
} from '../../components/auth';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import {
  validateEmail,
  validateDisplayName,
  getAuthErrorMessage,
} from '../../utils/validation';

// Import logo from assets (Vara branded icon)
const VaraLogo = require('../../../assets/iOS Icon 2 - 1024x1024.png');

interface SignupScreenProps {
  navigation: any;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ navigation }) => {
  const { signup } = useAuth();
  const reduceMotion = useReducedMotion();

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [secureConfirmEntry, setSecureConfirmEntry] = useState(true);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Local submission state - guaranteed fresh on mount
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Error state
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [termsError, setTermsError] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarType, setSnackbarType] = useState<'error' | 'success'>('error');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(12)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Mount animation
  useEffect(() => {
    const duration = reduceMotion ? 0 : 500;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: reduceMotion ? 0 : duration,
        useNativeDriver: true,
      }),
    ]).start();
  }, [reduceMotion]);

  // Check if passwords match (for mismatch message)
  const showPasswordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  // Check if form is valid for enabling button
  const isFormValid =
    displayName.trim().length > 0 &&
    email.trim().length > 0 &&
    allRequirementsMet(password) &&
    password === confirmPassword &&
    agreedToTerms;

  /**
   * Open Terms of Service
   */
  const handleOpenTerms = () => {
    Linking.openURL('https://www.varawellness.co/terms-of-service');
  };

  /**
   * Open Privacy Policy
   */
  const handleOpenPrivacy = () => {
    Linking.openURL('https://www.varawellness.co/privacy-policy');
  };

  /**
   * Button press animations
   */
  const handleButtonPressIn = () => {
    Animated.timing(buttonScale, {
      toValue: 0.98,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handleButtonPressOut = () => {
    Animated.timing(buttonScale, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  /**
   * Handle signup submission
   */
  const handleSignup = async () => {
    // Clear previous errors
    setNameError('');
    setEmailError('');
    setTermsError('');

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

    // Validate password requirements
    if (!allRequirementsMet(password)) {
      setSnackbarMessage('Please ensure your password meets all requirements');
      setSnackbarType('error');
      setSnackbarVisible(true);
      return;
    }

    // Validate password match
    if (password !== confirmPassword) {
      setSnackbarMessage('Passwords don\'t quite match yet');
      setSnackbarType('error');
      setSnackbarVisible(true);
      return;
    }

    // Check terms agreement
    if (!agreedToTerms) {
      setTermsError('You must agree to the Terms of Service and Privacy Policy');
      setSnackbarMessage('Please agree to the Terms of Service and Privacy Policy');
      setSnackbarType('error');
      setSnackbarVisible(true);
      return;
    }

    // Attempt signup
    setIsSubmitting(true);
    try {
      await signup(email.trim(), password, displayName.trim());
      setSnackbarMessage('Account created! Please check your email to verify your account.');
      setSnackbarType('success');
      setSnackbarVisible(true);
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error.code);
      setSnackbarMessage(errorMessage);
      setSnackbarType('error');
      setSnackbarVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Decorative background circles */}
      <View style={styles.bgCircleTopRight} pointerEvents="none" />
      <View style={styles.bgCircleBottomLeft} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.contentContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: translateAnim }],
              },
            ]}
          >
            {/* Header with Logo */}
            <View style={styles.header}>
              <Image
                source={VaraLogo}
                style={styles.logo}
                resizeMode="cover"
              />
              <Text style={styles.title}>Create Your Account</Text>
              <Text style={styles.subtitle}>
                A calm place to begin supporting your brain health
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Name Input */}
              <FloatingLabelInput
                label="Full Name"
                value={displayName}
                onChangeText={(text) => {
                  setDisplayName(text);
                  setNameError('');
                }}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                error={!!nameError}
                errorText={nameError}
                left={<Icon name="account-outline" size={20} color={Colors.textSecondary} />}
              />

              {/* Email Input */}
              <FloatingLabelInput
                label="Email"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setEmailError('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                error={!!emailError}
                errorText={emailError}
                left={<Icon name="email-outline" size={20} color={Colors.textSecondary} />}
              />

              {/* Password Input */}
              <FloatingLabelInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secureTextEntry}
                autoCapitalize="none"
                autoComplete="password-new"
                textContentType="newPassword"
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
              />

              {/* Confirm Password Input */}
              <FloatingLabelInput
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={secureConfirmEntry}
                autoCapitalize="none"
                autoComplete="password-new"
                textContentType="newPassword"
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
              />

              {/* Password Mismatch Message */}
              {showPasswordMismatch && (
                <Text style={styles.mismatchText}>
                  Passwords don't quite match yet
                </Text>
              )}

              {/* Password Requirements */}
              <PasswordRequirements password={password} />

              {/* Terms Agreement */}
              <View style={[
                styles.checkboxContainer,
                termsError && styles.checkboxContainerError
              ]}>
                <CustomCheckbox
                  checked={agreedToTerms}
                  onPress={() => {
                    setAgreedToTerms(!agreedToTerms);
                    setTermsError('');
                  }}
                  error={!!termsError}
                />
                <TouchableOpacity
                  style={styles.checkboxTextContainer}
                  onPress={() => {
                    setAgreedToTerms(!agreedToTerms);
                    setTermsError('');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.checkboxText}>
                    I agree to the{' '}
                    <Text style={styles.link} onPress={handleOpenTerms}>
                      Terms of Service
                    </Text>{' '}
                    and{' '}
                    <Text style={styles.link} onPress={handleOpenPrivacy}>
                      Privacy Policy
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Signup Button */}
              <TouchableOpacity
                onPress={handleSignup}
                onPressIn={handleButtonPressIn}
                onPressOut={handleButtonPressOut}
                disabled={!isFormValid || isSubmitting}
                activeOpacity={1}
                style={styles.buttonWrapper}
              >
                <Animated.View
                  style={[
                    styles.signupButton,
                    !isFormValid && styles.signupButtonDisabled,
                    { transform: [{ scale: buttonScale }] },
                  ]}
                >
                  {isSubmitting ? (
                    <Text style={styles.signupButtonText}>Creating account...</Text>
                  ) : (
                    <Text style={styles.signupButtonText}>Begin at your own pace</Text>
                  )}
                </Animated.View>
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.loginLink}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Snackbar */}
      {snackbarVisible && (
        <View style={[styles.snackbar, snackbarType === 'success' && styles.snackbarSuccess, {position: 'absolute', bottom: 24, left: 16, right: 16, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center'}]}>
          <Text style={{flex: 1, color: '#fff', fontSize: 14}}>{snackbarMessage}</Text>
          <TouchableOpacity onPress={() => setSnackbarVisible(false)}>
            <Text style={{color: '#fff', fontWeight: '600'}}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  // Decorative background circles
  bgCircleTopRight: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(213, 227, 209, 0.33)',
    zIndex: 0,
  },
  bgCircleBottomLeft: {
    position: 'absolute',
    bottom: 40,
    left: -80,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(213, 227, 209, 0.25)',
    zIndex: 0,
  },
  keyboardView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  contentContainer: {
    flex: 1,
  },
  // Header styles
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 14,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 15 * 1.5,
    paddingHorizontal: Spacing.md,
  },
  // Form styles
  form: {
    flex: 1,
  },
  mismatchText: {
    fontSize: 14,
    color: Colors.error,
    marginTop: -8,
    marginBottom: Spacing.base,
    marginLeft: 4,
  },
  // Checkbox styles
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  checkboxContainerError: {
    backgroundColor: Colors.error + '10',
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.sm,
    marginLeft: -Spacing.sm,
    marginRight: -Spacing.sm,
  },
  checkboxTextContainer: {
    flex: 1,
    marginLeft: Spacing.xs,
    marginTop: 2,
  },
  checkboxText: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 14 * 1.5,
  },
  link: {
    color: Colors.evergreenTeal,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  // Button styles
  buttonWrapper: {
    marginBottom: Spacing.lg,
  },
  signupButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(27, 94, 87, 0.19)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  signupButtonDisabled: {
    backgroundColor: 'rgba(27, 94, 87, 0.4)',
    shadowOpacity: 0,
    elevation: 0,
  },
  signupButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '500',
  },
  // Login link styles
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  loginText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loginLink: {
    fontSize: 14,
    color: Colors.evergreenTeal,
    fontWeight: '500',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(27, 94, 87, 0.25)',
  },
  // Snackbar styles
  snackbar: {
    backgroundColor: Colors.error,
  },
  snackbarSuccess: {
    backgroundColor: Colors.success,
  },
});

export default SignupScreen;
