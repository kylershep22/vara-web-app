/**
 * EnhancedModal Component
 * A reusable modal with proper keyboard handling, safe areas, and accessibility
 *
 * Features:
 * - ScrollView with KeyboardAvoidingView for proper keyboard handling
 * - Dynamic height calculation based on screen size and safe areas
 * - InputAccessoryView support for iOS keyboard toolbar
 * - Auto-dismiss keyboard on modal close
 * - Sticky footer for action buttons
 * - Proper z-index positioning above navigation headers
 */

import React, { useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Keyboard,
  Dimensions,
} from 'react-native';
import { Modal, Portal, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { KeyboardAccessoryToolbar } from '../KeyboardAccessoryToolbar';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';

const { height: screenHeight } = Dimensions.get('window');

interface EnhancedModalProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Maximum height as percentage of screen (0-1) or 'auto' for dynamic */
  maxHeightPercent?: number | 'auto';
  /** Unique ID for InputAccessoryView (required for iOS keyboard toolbar) */
  inputAccessoryViewID?: string;
  /** Whether to show the iOS keyboard toolbar */
  showKeyboardToolbar?: boolean;
  /** Icon to show in header (optional) */
  headerIcon?: string;
  /** Whether the modal has input fields */
  hasInputs?: boolean;
  /** Test ID for testing */
  testID?: string;
}

export const EnhancedModal: React.FC<EnhancedModalProps> = ({
  visible,
  onDismiss,
  title,
  subtitle,
  children,
  footer,
  maxHeightPercent = 0.92,
  inputAccessoryViewID,
  showKeyboardToolbar = true,
  headerIcon,
  hasInputs = true,
  testID,
}) => {
  const insets = useSafeAreaInsets();

  // Calculate dynamic max height accounting for safe areas
  const modalMaxHeight = useMemo(() => {
    if (maxHeightPercent === 'auto') {
      // Dynamic: account for safe areas and some padding
      return screenHeight - insets.top - insets.bottom - 40;
    }
    return screenHeight * maxHeightPercent;
  }, [maxHeightPercent, insets.top, insets.bottom]);

  // Handle modal dismiss with keyboard cleanup
  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();
    onDismiss();
  }, [onDismiss]);

  // Generate unique input accessory ID if not provided
  const accessoryID = inputAccessoryViewID || `modal-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={handleDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          { maxHeight: modalMaxHeight, minHeight: 480 },
        ]}
        testID={testID}
      >
        {/* Wrapper for proper flex layout */}
        <View style={styles.modalInner}>
          {/* Header - Fixed at top */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              {headerIcon && (
                <View style={styles.headerIconContainer}>
                  <Icon name={headerIcon} size={24} color={Colors.evergreenTeal} />
                </View>
              )}
              <View style={styles.headerText}>
                <Text variant="headlineSmall" style={styles.title}>
                  {title}
                </Text>
                {subtitle && (
                  <Text variant="bodySmall" style={styles.subtitle}>
                    {subtitle}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Content with keyboard-aware scrolling */}
          <KeyboardAwareScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            inputAccessoryViewID={accessoryID}
            showDoneButton={hasInputs}
            enableKeyboardAvoidance={true}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            nestedScrollEnabled={true}
          >
            {children}
            {/* Extra padding at bottom for keyboard */}
            <View style={styles.bottomPadding} />
          </KeyboardAwareScrollView>

          {/* Sticky Footer */}
          {footer && (
            <View style={styles.footer}>
              {footer}
            </View>
          )}
        </View>
      </Modal>

      {/* iOS Keyboard Toolbar */}
      {Platform.OS === 'ios' && showKeyboardToolbar && hasInputs && (
        <KeyboardAccessoryToolbar
          nativeID={accessoryID}
          doneLabel="Done"
        />
      )}
    </Portal>
  );
};

/**
 * Modal Footer Actions Component
 * Provides consistent Cancel/Submit button layout
 */
interface ModalFooterActionsProps {
  onCancel: () => void;
  onSubmit: () => void;
  cancelLabel?: string;
  submitLabel?: string;
  submitLoading?: boolean;
  submitDisabled?: boolean;
}

export const ModalFooterActions: React.FC<ModalFooterActionsProps> = ({
  onCancel,
  onSubmit,
  cancelLabel = 'Cancel',
  submitLabel = 'Save',
  submitLoading = false,
  submitDisabled = false,
}) => {
  // Import Button dynamically to avoid circular dependencies
  const Button = require('../Button').default;

  return (
    <View style={styles.footerActions}>
      <Button
        variant="secondary"
        onPress={onCancel}
        style={styles.footerButton}
      >
        {cancelLabel}
      </Button>
      <Button
        variant="primary"
        onPress={onSubmit}
        loading={submitLoading}
        disabled={submitDisabled || submitLoading}
        style={styles.footerButton}
      >
        {submitLabel}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base,
    borderRadius: Layout.borderRadius.xl,
    overflow: 'hidden',
    // Teal-tinted shadow for brand consistency
    ...Platform.select({
      ios: {
        shadowColor: Colors.evergreenTeal,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalInner: {
    flex: 1,
    flexDirection: 'column',
    minHeight: 400,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.base,
    flexGrow: 1,
  },
  bottomPadding: {
    height: Spacing.xl,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.surface,
  },
  footerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
});

export default EnhancedModal;
