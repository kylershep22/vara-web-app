/**
 * Login Screen
 * Email and password authentication
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Text,
  Image,
  Alert,
  Animated,
  Keyboard,
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
  const { login } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  // Local submission state - guaranteed to be fresh on mount
  // (unlike context isLoading which could be stale from a forced sign-out)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Error state
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const errorOpacity = useRef(new Animated.Value(0)).current;

  // Check Firebase initialization on mount
  const isFirebaseReady = !!firebaseAuth;

  // Show error if Firebase failed to initialize
  useEffect(() => {
    if (!isFirebaseReady && firebaseError) {
      console.error('Firebase initialization error:', firebaseError);
      showError('Unable to connect to services. Please check your internet connection and restart the app.');
    }
  }, [isFirebaseReady]);

  const showError = (message: string) => {
    Keyboard.dismiss();
    setErrorMessage(message);
    errorOpacity.setValue(1);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 150);
  };

  const dismissError = () => {
    Animated.timing(errorOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setErrorMessage(''));
  };

  /**
   * Handle login submission
   */
  const handleLogin = async () => {
    // Clear previous errors
    setEmailError('');
    setPasswordError('');
    dismissError();

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
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      // Navigation will happen automatically via auth state change
    } catch (error: any) {
      if (__DEV__) {
        console.warn('Login screen caught error:', error?.code);
      }
      const message = getAuthErrorMessage(error?.code, error?.message);
      Alert.alert('Login Error', message);
    } finally {
      setIsSubmitting(false);
    }
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
          {/* Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../../../assets/iOS Icon 2 - 1024x1024.png')}
              style={styles.logo}
            />
          </View>

          {/* Header */}
          <AuthHeader
            title="Welcome Back"
            subtitle="Log in to continue your wellness journey"
          />

          {/* Error Banner - inline at top of form, always visible */}
          {!!errorMessage && (
            <Animated.View style={[styles.errorBanner, { opacity: errorOpacity }]}>
              <Icon name="alert-circle-outline" size={20} color={Colors.error} style={styles.errorIcon} />
              <Text style={styles.errorText}>{errorMessage}</Text>
              <TouchableOpacity onPress={dismissError} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={18} color={Colors.textSecondary} />
              </TouchableOpacity>
            </Animated.View>
          )}

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
              loading={isSubmitting}
              disabled={isSubmitting || !isFirebaseReady}
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
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  form: {
    flex: 1,
  },
  input: {
    marginBottom: Spacing.base,
  },
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
  errorIcon: {
    marginRight: 10,
  },
  errorText: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
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
});

export default LoginScreen;
