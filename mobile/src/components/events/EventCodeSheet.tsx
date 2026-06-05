/**
 * EventCodeSheet
 * Bottom sheet for entering event codes.
 * Used by both home screen card and Settings row.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Colors, Spacing } from '../../constants';

interface EventCodeSheetProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess: (eventName: string) => void;
}

export const EventCodeSheet: React.FC<EventCodeSheetProps> = ({
  visible,
  onDismiss,
  onSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions();
      const validate = httpsCallable(functions, 'validateEventCode');
      const result = await validate({ code: trimmed });
      const data = result.data as { success: boolean; eventName: string; freeAccessDays: number };

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSuccess(data.eventName);
      onSuccess(data.eventName);

      setTimeout(() => {
        setSuccess(null);
        setCode('');
        onDismiss();
      }, 2000);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const code = typeof err?.code === 'string' ? err.code.replace(/^functions\//, '') : '';
      const message = code === 'already-subscribed'
        ? (err?.message || 'You already have an active Vara subscription. Event access isn\'t needed.')
        : (err?.message || 'Something went wrong. Try again.');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCode('');
    setError(null);
    setSuccess(null);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrapper}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {success ? (
            <View style={styles.successContainer}>
              <Icon name="check-circle" size={48} color={Colors.evergreenTeal} />
              <Text style={styles.successText}>
                You're in! Welcome from {success}.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.headline}>Join an event</Text>
              <Text style={styles.body}>
                Enter the code from your workshop or event.
              </Text>

              <TextInput
                style={[styles.input, error && styles.inputError]}
                value={code}
                onChangeText={(text) => {
                  setCode(text.toUpperCase());
                  setError(null);
                }}
                placeholder="e.g. BRAIN426"
                placeholderTextColor={Colors.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />

              {error && (
                <Text style={styles.errorText}>{error}</Text>
              )}

              <TouchableOpacity
                style={[styles.submitButton, (!code.trim() || loading) && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!code.trim() || loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>Join</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheetWrapper: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handleContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.silverSage,
  },
  headline: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.evergreenTeal,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: Colors.silverSage,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  inputError: {
    borderColor: '#D97A6E',
  },
  errorText: {
    fontSize: 14,
    color: '#D97A6E',
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  successText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.evergreenTeal,
    textAlign: 'center',
  },
});

export default EventCodeSheet;
