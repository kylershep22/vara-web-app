/**
 * Email Verification Screen
 * Branded "Check Your Email" screen following Vara Mobile UI Standards
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useAuth } from '../../context/AuthContext';

type ResendState = 'idle' | 'sending' | 'sent' | 'cooldown';

interface EmailVerificationScreenProps {
  navigation?: any;
}

const EmailVerificationScreen: React.FC<EmailVerificationScreenProps> = ({ navigation }) => {
  const { user, sendVerificationEmail, refreshUser, logout, isLoading } = useAuth();

  const [resendState, setResendState] = useState<ResendState>('idle');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  // Handle cooldown timer
  useEffect(() => {
    if (cooldownSeconds > 0) {
      const timer = setTimeout(() => setCooldownSeconds((s) => s - 1), 1000);
      return () => clearTimeout(timer);
    } else if (resendState === 'cooldown') {
      setResendState('idle');
    }
  }, [cooldownSeconds, resendState]);

  // Check for email verification status periodically and on app focus
  useEffect(() => {
    const checkVerification = async () => {
      try {
        await refreshUser();
      } catch (error) {
        // Silent check - no error display needed
      }
    };

    // Check every 2 seconds for faster detection
    const interval = setInterval(checkVerification, 2000);

    // Also check immediately when user returns to the app (e.g. from email app)
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkVerification();
      }
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [refreshUser]);

  /**
   * Open the device's email app
   */
  const handleOpenEmailApp = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('message://').catch(() => {
        // Fallback if Mail app not available
        Linking.openURL('mailto:');
      });
    } else {
      // Android - opens email app chooser
      Linking.openURL('mailto:');
    }
  }, []);

  /**
   * Resend verification email with cooldown
   */
  const handleResendEmail = useCallback(async () => {
    if (resendState !== 'idle') return;

    setResendState('sending');
    setFeedbackMessage('');

    try {
      await sendVerificationEmail();
      setResendState('sent');
      setFeedbackMessage('Email sent');

      // After 2 seconds, start cooldown
      setTimeout(() => {
        setResendState('cooldown');
        setCooldownSeconds(30);
      }, 2000);
    } catch (error: any) {
      setResendState('idle');
      if (error.code === 'auth/too-many-requests') {
        setFeedbackMessage('Too many attempts. Please wait a few minutes.');
      } else {
        setFeedbackMessage('Something went wrong. Try again when ready.');
      }
    }
  }, [resendState, sendVerificationEmail]);

  /**
   * Try a different email - logs out and returns to signup
   */
  const handleTryDifferentEmail = useCallback(async () => {
    try {
      await logout();
      // Navigation will be handled by auth state change
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [logout]);

  /**
   * Go back to previous screen
   */
  const handleGoBack = useCallback(() => {
    if (navigation?.canGoBack()) {
      navigation.goBack();
    } else {
      handleTryDifferentEmail();
    }
  }, [navigation, handleTryDifferentEmail]);

  /**
   * Get resend button text based on state
   */
  const getResendText = () => {
    switch (resendState) {
      case 'sending':
        return 'Sending...';
      case 'sent':
        return 'Email sent';
      case 'cooldown':
        return `Resend available in ${cooldownSeconds}s`;
      default:
        return 'Resend email';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Navigation */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleGoBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="chevron-left" size={24} color={Colors.evergreenTeal} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Envelope Icon */}
        <View style={styles.iconCircle}>
          <Icon name="email-outline" size={48} color={Colors.evergreenTeal} />
        </View>

        {/* Heading */}
        <Text style={styles.heading}>Check your email</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>We've sent a verification link to</Text>

        {/* Email Display */}
        <Text style={styles.emailText}>{user?.email || ''}</Text>

        {/* Instruction Card */}
        <View style={styles.instructionCard}>
          <Text style={styles.instructionText}>
            Tap the link in the email to verify your account. It may take a moment to arrive.
          </Text>
        </View>

        {/* Primary CTA - Open Email App */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleOpenEmailApp}
          activeOpacity={0.85}
          accessibilityLabel="Open email app"
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Open email app</Text>
        </TouchableOpacity>

        {/* Resend Email */}
        <View style={styles.resendArea}>
          {resendState === 'idle' ? (
            <TouchableOpacity
              onPress={handleResendEmail}
              disabled={isLoading}
              accessibilityLabel="Resend verification email"
              accessibilityRole="button"
            >
              <Text style={styles.resendText}>Resend email</Text>
            </TouchableOpacity>
          ) : resendState === 'sent' ? (
            <View style={styles.sentContainer}>
              <Icon name="check" size={16} color={Colors.evergreenTeal} />
              <Text style={styles.sentText}>Email sent</Text>
            </View>
          ) : (
            <Text style={styles.resendHelper}>{getResendText()}</Text>
          )}
        </View>

        {/* Feedback Message */}
        {feedbackMessage && resendState === 'idle' && (
          <Text style={styles.feedbackMessage}>{feedbackMessage}</Text>
        )}
      </View>

      {/* Bottom Help Text */}
      <View style={styles.bottomHelp}>
        <Text style={styles.bottomHelpText}>
          Didn't receive anything? Check your spam folder or{' '}
          <Text style={styles.linkText} onPress={handleTryDifferentEmail}>
            try a different email
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  topNav: {
    height: 44,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    alignSelf: 'flex-start',
    marginLeft: -Spacing.sm,
  },
  backText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
    marginLeft: Spacing.xs,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    marginTop: -Spacing.xl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(213, 227, 209, 0.35)', // Dew Sage at 35%
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  heading: {
    fontSize: 26,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    textAlign: 'center',
    lineHeight: 34,
    letterSpacing: -0.3,
    marginBottom: Spacing.base,
  },
  subtitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.sm,
  },
  emailText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  instructionCard: {
    backgroundColor: 'rgba(213, 227, 209, 0.3)', // Dew Sage at 30%
    borderRadius: Layout.borderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    width: '100%',
    maxWidth: 340,
    marginBottom: Spacing.xl,
  },
  instructionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.softCharcoal,
    lineHeight: 22,
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    maxWidth: 340,
    height: 48,
    backgroundColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
  },
  resendArea: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
    padding: Spacing.sm,
  },
  sentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sentText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  resendHelper: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
  feedbackMessage: {
    fontSize: Typography.fontSize.sm,
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  bottomHelp: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl * 2,
    paddingTop: Spacing.lg,
  },
  bottomHelpText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    lineHeight: 21,
  },
  linkText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default EmailVerificationScreen;
