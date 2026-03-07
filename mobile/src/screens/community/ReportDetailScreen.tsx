/**
 * Report Detail Screen (Stage 3)
 * Optional text detail for the report
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { REPORT_REASONS, PostReportReason } from '../../types/moderation';
import { submitReport } from '../../services/firebase/moderation.service';
import { useAuth } from '../../context/AuthContext';

const MAX_CHARS = 500;
const SHOW_COUNT_THRESHOLD = 400;

const ReportDetailScreen = ({ navigation, route }: any) => {
  const { postId, reportedUserId, reason } = route.params as {
    postId: string;
    reportedUserId: string;
    reason: PostReportReason;
  };
  const { user } = useAuth();
  const [detail, setDetail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reasonOption = REPORT_REASONS.find((r) => r.id === reason);

  const handleSubmit = async (includeDetail: boolean) => {
    if (!user) return;
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await submitReport(
        user.uid,
        postId,
        reportedUserId,
        reason,
        includeDetail && detail.trim() ? detail.trim() : undefined
      );
      navigation.navigate('ReportConfirmation');
    } catch (err: any) {
      if (err.message === 'DUPLICATE_REPORT') {
        setError("You've already reported this post.");
      } else {
        setError("Something didn't connect. Try again when ready.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="chevron-left" size={24} color={Colors.evergreenTeal} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Report this post</Text>
        <View style={styles.navSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={styles.content}>
          {/* Selected reason badge */}
          {reasonOption && (
            <View style={styles.reasonBadge}>
              <View style={styles.reasonDot} />
              <Text style={styles.reasonBadgeText}>{reasonOption.label}</Text>
            </View>
          )}

          {/* Heading */}
          <Text style={styles.heading} accessibilityRole="header">
            Want to add anything?
          </Text>
          <Text style={styles.subheading}>
            This is optional. Any detail helps us review thoughtfully.
          </Text>

          {/* Text input */}
          <TextInput
            style={styles.textInput}
            placeholder="Anything you'd like to share — no pressure..."
            placeholderTextColor={Colors.silverSage}
            multiline
            maxLength={MAX_CHARS}
            value={detail}
            onChangeText={setDetail}
            textAlignVertical="top"
            accessibilityLabel="Additional details for your report"
          />

          {/* Character count + helper */}
          <View style={styles.inputFooter}>
            <Text style={styles.helperText}>Your report is confidential</Text>
            {detail.length > SHOW_COUNT_THRESHOLD && (
              <Text style={styles.charCount}>
                {detail.length} / {MAX_CHARS}
              </Text>
            )}
          </View>

          {/* Error message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        {/* Bottom sticky actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={() => handleSubmit(true)}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit report'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.textButton, isSubmitting && styles.buttonDisabled]}
            onPress={() => handleSubmit(false)}
            disabled={isSubmitting}
            activeOpacity={0.7}
          >
            <Text style={styles.textButtonText}>Skip and submit</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ReportDetailScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  flex: {
    flex: 1,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: Layout.headerHeight,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    padding: Spacing.xs,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
  navSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(213, 227, 209, 0.6)',
    borderRadius: Layout.borderRadius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: Spacing.lg,
  },
  reasonDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.evergreenTeal,
    marginRight: 6,
  },
  reasonBadgeText: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  heading: {
    fontSize: 22,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
  },
  subheading: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.mutedSageGray,
    lineHeight: 21,
    marginBottom: Spacing.lg,
  },
  textInput: {
    minHeight: 140,
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.base,
    fontSize: 16,
    color: Colors.softCharcoal,
    lineHeight: 22,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  helperText: {
    fontSize: 12,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.mutedSageGray,
  },
  charCount: {
    fontSize: 12,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.mutedSageGray,
  },
  errorContainer: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    backgroundColor: 'rgba(217, 122, 110, 0.08)',
    borderRadius: Layout.borderRadius.md,
  },
  errorText: {
    fontSize: 14,
    color: Colors.softCoral,
  },
  bottomActions: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 34,
    gap: Spacing.sm,
  },
  primaryButton: {
    height: Layout.buttonHeight.md,
    backgroundColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  textButton: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textButtonText: {
    fontSize: 16,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
