/**
 * Forgot Password Screen
 * Send password reset email
 */

import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Button, Input, AuthHeader } from '../../components';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { validateEmail, getAuthErrorMessage } from '../../utils/validation';

interface ForgotPasswordScreenProps {
  navigation: any;
}

const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({ navigation }) => {
  const { resetPassword, isLoading } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  // Error state
  const [emailError, setEmailError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const errorOpacity = useRef(new Animated.Value(0)).current;

  // Success banner state (for resend confirmation)
  const [successMessage, setSuccessMessage] = useState('');
  const successOpacity = useRef(new Animated.Value(0)).current;

  const showError = (message: string) => {
    // Dismiss any success message first
    setSuccessMessage('');
    setErrorMessage(message);
    errorOpacity.setValue(0);
    Animated.timing(errorOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const dismissError = () => {
    Animated.timing(errorOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setErrorMessage(''));
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    successOpacity.setValue(0);
    Animated.timing(successOpacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  /**
   * Handle password reset submission
   */
  const handleResetPassword = async () => {
    // Clear previous errors
    setEmailError('');
    dismissError();

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || '');
      return;
    }

    // Send password reset email
    try {
      await resetPassword(email.trim());

      if (emailSent) {
        // Resend case - show brief confirmation at top
        showSuccess('Reset email sent again. Check your inbox.');
      } else {
        // First send - switch to success state
        setEmailSent(true);
      }
    } catch (error: any) {
      const message = getAuthErrorMessage(error.code);
      showError(message);
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
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <AuthHeader
            title={emailSent ? 'Check Your Email' : 'Forgot Password?'}
            subtitle={
              emailSent
                ? 'We sent a password reset link to your email address'
                : "Enter your email and we'll send you a link to reset your password"
            }
            icon={emailSent ? 'email-check' : 'lock-reset'}
          />

          {/* Error Banner */}
          {!!errorMessage && (
            <Animated.View style={[styles.errorBanner, { opacity: errorOpacity }]}>
              <Icon name="alert-circle-outline" size={20} color={Colors.error} style={styles.bannerIcon} />
              <Text style={styles.errorBannerText}>{errorMessage}</Text>
              <TouchableOpacity onPress={dismissError} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Success Banner (for resend confirmations) */}
          {!!successMessage && (
            <Animated.View style={[styles.successBanner, { opacity: successOpacity }]}>
              <Icon name="check-circle-outline" size={20} color={Colors.evergreenTeal} style={styles.bannerIcon} />
              <Text style={styles.successBannerText}>{successMessage}</Text>
            </Animated.View>
          )}

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
                left={<Icon name="email-outline" size={20} color={Colors.textSecondary} />}
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
                <Text style={styles.backText}>
                  Back to Login
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.successContainer}>
              {/* Success Message Card */}
              <View style={styles.successBox}>
                <Icon
                  name="email-fast-outline"
                  size={32}
                  color={Colors.evergreenTeal}
                  style={styles.successBoxIcon}
                />
                <Text style={styles.successBoxText}>
                  If an account exists with{' '}
                  <Text style={styles.emailHighlight}>{email}</Text>
                  , you'll receive an email with instructions to reset your password.
                </Text>
                <Text style={styles.successBoxHint}>
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
    justifyContent: 'center',
  },
  form: {
    width: '100%',
  },
  input: {
    marginBottom: Spacing.lg,
  },
  submitButton: {
    marginBottom: Spacing.base,
  },
  backButton: {
    alignSelf: 'center',
    padding: Spacing.base,
  },
  backText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },

  // Error banner - top of form, inline
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDF2F0',
    borderWidth: 1,
    borderColor: 'rgba(217, 122, 110, 0.3)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: Spacing.lg,
  },
  bannerIcon: {
    marginRight: 10,
  },
  errorBannerText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },

  // Success banner - top of form, for resend confirmations
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7F0',
    borderWidth: 1,
    borderColor: 'rgba(27, 94, 87, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: Spacing.lg,
  },
  successBannerText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },

  // Success state - the confirmation card
  successContainer: {
    width: '100%',
  },
  successBox: {
    backgroundColor: Colors.background.default,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  successBoxIcon: {
    marginBottom: Spacing.base,
  },
  successBoxText: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  emailHighlight: {
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  successBoxHint: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  resendButton: {
    marginBottom: Spacing.base,
  },
  loginButton: {
    marginTop: Spacing.base,
  },
});

export default ForgotPasswordScreen;
