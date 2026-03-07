/**
 * Edit Post Modal
 * Simple modal for editing post content
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { updatePostContent } from '../../services/firebase/moderation.service';

interface EditPostModalProps {
  visible: boolean;
  onDismiss: () => void;
  post: any;
  onSaved: () => void;
}

export const EditPostModal: React.FC<EditPostModalProps> = ({
  visible,
  onDismiss,
  post,
  onSaved,
}) => {
  const insets = useSafeAreaInsets();
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (post && visible) {
      setContent(post.content || '');
    }
  }, [post, visible]);

  const handleSave = async () => {
    if (!post || isSaving) return;
    const trimmed = content.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Post content cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      await updatePostContent(post.id, trimmed);
      onSaved();
      onDismiss();
    } catch (error) {
      Alert.alert('Error', "Something didn't connect. Try again when ready.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <View />
      </Pressable>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrapper}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          <Text style={styles.title}>Edit post</Text>

          <TextInput
            style={styles.textInput}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            autoFocus
            accessibilityLabel="Edit post content"
          />

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              <Text style={styles.primaryButtonText}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Layout.borderRadius.xl,
    borderTopRightRadius: Layout.borderRadius.xl,
    paddingHorizontal: Spacing.lg,
    maxHeight: '80%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.base,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.silverSage,
    borderRadius: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.base,
  },
  textInput: {
    minHeight: 120,
    maxHeight: 240,
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.base,
    fontSize: 16,
    color: Colors.softCharcoal,
    lineHeight: 22,
  },
  actions: {
    marginTop: Spacing.base,
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
  cancelButton: {
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.mutedSageGray,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
