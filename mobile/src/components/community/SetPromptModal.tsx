/**
 * SetPromptModal
 * Modal for group owners to set or edit a weekly reflection prompt.
 */

import React, { useState, useEffect, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { Colors, Spacing } from '../../constants';
import { createGroupPrompt } from '../../services/firebase/community.service';
import { logger } from '../../utils/logger';

export interface SetPromptModalProps {
  visible: boolean;
  onDismiss: () => void;
  groupId: string;
  currentPrompt: string | null;
  onSaved: () => void;
}

const SetPromptModal = memo(({ visible, onDismiss, groupId, currentPrompt, onSaved }: SetPromptModalProps) => {
  const [newPromptText, setNewPromptText] = useState('');

  // Reset text when modal opens with current prompt
  useEffect(() => {
    if (visible && currentPrompt) {
      setNewPromptText(currentPrompt);
    } else if (visible) {
      setNewPromptText('');
    }
  }, [visible, currentPrompt]);

  const handleSave = async () => {
    if (!newPromptText.trim()) return;
    try {
      await createGroupPrompt({ groupId, prompt: newPromptText.trim() });
      onDismiss();
      setNewPromptText('');
      onSaved();
    } catch (e: any) {
      logger.error('Failed to set prompt', e);
      Alert.alert('Error', e.message || 'Failed to set prompt');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}
        activeOpacity={1}
        onPress={onDismiss}
      >
        <View style={promptStyles.setPromptModal} onStartShouldSetResponder={() => true}>
          <Text style={promptStyles.setPromptTitle}>Weekly Prompt</Text>
          <Text style={promptStyles.setPromptSubtitle}>Ask your group a question each week</Text>
          <TextInput
            style={promptStyles.setPromptInput}
            placeholder="What would you like to ask your group each week?"
            placeholderTextColor={Colors.textSecondary}
            value={newPromptText}
            onChangeText={setNewPromptText}
            multiline
          />
          <View style={promptStyles.setPromptActions}>
            <TouchableOpacity
              style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: Colors.evergreenTeal }}
              onPress={onDismiss}
            >
              <Text style={{ color: Colors.evergreenTeal, fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: Colors.evergreenTeal }}
              onPress={handleSave}
            >
              <Text style={{ color: Colors.textOnPrimary, fontWeight: '600' }}>Save Prompt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
});

const promptStyles = StyleSheet.create({
  setPromptModal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: 12,
    padding: Spacing.lg,
  },
  setPromptTitle: {
    color: Colors.evergreenTeal,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  setPromptSubtitle: {
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  setPromptInput: {
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: Spacing.base,
  },
  setPromptActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
});

export default SetPromptModal;
