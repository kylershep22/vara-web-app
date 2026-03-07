/**
 * Login Screen
 * Email and password authentication
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Button, Input, AuthHeader } from '../../components';
import { Colors, Spacing, Typography } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { validateEmail, getAuthErrorMessage } from '../../utils/validation';
import { auth as firebaseAuth, firebaseError } from '../../config/firebase';

interface LoginScreenProps {
  navigation: any;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ navigation }) => {
  const { login, isLoading } = useAuth();

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  // Error state
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Check Firebase initialization on mount
  const isFirebaseReady = !!firebaseAuth;

  // Show error if Firebase failed to initialize
  useEffect(() => {
    if (!isFirebaseReady && firebaseError) {
      console.error('Firebase initialization error:', firebaseError);
      setSnackbarMessage('Unable to connect to services. Please check your internet connection and restart the app.');
      setSnackbarVisible(true);
    }
  }, [isFirebaseReady]);

  /**
   * Handle login submission
   */
  const handleLogin = async () => {
    // Clear previous errors
    setEmailError('');
    setPasswordError('');

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || '');
      return;
    }

    // Validate password
    if (!password) {
      setPasswordError('Password is required');
      return;
    }

    // Attempt login
    try {
      await login(email.trim(), password);
      // Navigation will happen automatically via auth state change
    } catch (error: any) {
      // Log the full error for debugging
      console.error('Login error details:', {
        code: error?.code,
        message: error?.message,
        fullError: error,
      });
      const errorMessage = getAuthErrorMessage(error?.code, error?.message);
      setSnackbarMessage(errorMessage);
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
            title="Welcome Back"
            subtitle="Log in to continue your wellness journey"
          />

          {/* Form */}
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
              textContentType="emailAddress"
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
              autoComplete="password"
              textContentType="password"
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

            {/* Forgot Password Link */}
            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.forgotPasswordButton}
            >
              <Text style={styles.forgotPasswordText}>
                Forgot password?
              </Text>
            </TouchableOpacity>

            {/* Login Button */}
            <Button
              variant="primary"
              onPress={handleLogin}
              loading={isLoading}
              disabled={isLoading || !isFirebaseReady}
              fullWidth
              style={styles.loginButton}
            >
              Log In
            </Button>

            {/* Sign Up Link */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.signupLink}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Error Snackbar */}
      {snackbarVisible && (
        <View style={[styles.snackbar, {position: 'absolute', bottom: 24, left: 16, right: 16, borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center'}]}>
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
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
  },
  forgotPasswordText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  loginButton: {
    marginBottom: Spacing.lg,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signupText: {
    color: Colors.textSecondary,
  },
  signupLink: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  snackbar: {
    backgroundColor: Colors.error,
  },
});

export default LoginScreen;
