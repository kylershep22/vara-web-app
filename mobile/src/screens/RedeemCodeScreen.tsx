/**
 * Redeem Code Screen
 * Allows users to redeem invite codes for coaching access
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Colors, Spacing, Typography, Layout } from '../constants';

type RedeemState = 'idle' | 'validating' | 'success' | 'error';

const RedeemCodeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [code, setCode] = useState('');
  const [state, setState] = useState<RedeemState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const formatCode = (input: string): string => {
    // Remove non-alphanumeric characters and convert to uppercase
    return input.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  };

  const handleCodeChange = (text: string) => {
    const formatted = formatCode(text);
    // Limit to 12 characters (COACH-XXXXXX format without dash)
    setCode(formatted.slice(0, 12));
    // Reset error state when user types
    if (state === 'error') {
      setState('idle');
      setErrorMessage('');
    }
  };

  const handleRedeem = async () => {
    if (!code || code.length < 6) {
      setState('error');
      setErrorMessage('Please enter a valid invite code');
      return;
    }

    setState('validating');
    setErrorMessage('');

    try {
      const functions = getFunctions(undefined, 'us-central1');

      // First validate the code
      const validateFn = httpsCallable(functions, 'validateInviteCode');
      const validateResult = await validateFn({ code }) as { data: { valid: boolean; error?: string } };

      if (!validateResult.data.valid) {
        setState('error');
        setErrorMessage(validateResult.data.error || 'Invalid code');
        return;
      }

      // If valid, redeem it
      const redeemFn = httpsCallable(functions, 'redeemInviteCode');
      const redeemResult = await redeemFn({ code }) as { data: { success: boolean; error?: string } };

      if (redeemResult.data.success) {
        setState('success');
        // Wait a moment to show success, then navigate back
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      } else {
        setState('error');
        setErrorMessage(redeemResult.data.error || 'Failed to redeem code');
      }
    } catch (error: any) {
      console.error('Redeem code error:', error);
      setState('error');
      setErrorMessage(
        error.message === 'internal'
          ? 'Unable to connect. Please check your internet connection.'
          : 'Something went wrong. Please try again.'
      );
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  // Success state
  if (state === 'success') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.successContainer}>
          <View style={styles.successIconContainer}>
            <Ionicons name="checkmark-circle" size={80} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>Welcome to Vara!</Text>
          <Text style={styles.successSubtitle}>
            Your coaching access has been activated.{'\n'}
            Enjoy lifetime access to all features.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Redeem Invite Code</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="gift-outline" size={48} color={Colors.evergreenTeal} />
          </View>

          <Text style={styles.title}>Enter Your Code</Text>
          <Text style={styles.subtitle}>
            If you're part of a coaching program, enter your invite code below to unlock lifetime access.
          </Text>

          {/* Code Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.input,
                state === 'error' && styles.inputError,
              ]}
              value={code}
              onChangeText={handleCodeChange}
              placeholder="COACH-XXXXXX"
              placeholderTextColor={Colors.textDisabled}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={12}
              editable={state !== 'validating'}
            />
            {code.length > 0 && state === 'idle' && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => setCode('')}
              >
                <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Error Message */}
          {state === 'error' && errorMessage && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color={Colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Redeem Button */}
          <TouchableOpacity
            style={[
              styles.redeemButton,
              (state === 'validating' || code.length < 6) && styles.redeemButtonDisabled,
            ]}
            onPress={handleRedeem}
            disabled={state === 'validating' || code.length < 6}
            activeOpacity={0.8}
          >
            {state === 'validating' ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.redeemButtonText}>Redeem Code</Text>
            )}
          </TouchableOpacity>

          {/* Help Text */}
          <Text style={styles.helpText}>
            Don't have a code? Codes are provided exclusively to members of our coaching programs.
          </Text>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  headerSpacer: {
    width: 32, // Same as back button for centering
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.dewSage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  inputContainer: {
    width: '100%',
    position: 'relative',
    marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
    letterSpacing: 2,
    color: Colors.textPrimary,
  },
  inputError: {
    borderColor: Colors.error,
  },
  clearButton: {
    position: 'absolute',
    right: Spacing.md,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
    marginLeft: Spacing.xs,
  },
  redeemButton: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  redeemButtonDisabled: {
    opacity: 0.6,
  },
  redeemButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  helpText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.lg,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  successIconContainer: {
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  successSubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default RedeemCodeScreen;
