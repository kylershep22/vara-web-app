// Floor commitment capture (spec 10.1). One free-text line, written while the
// user is calm, in their own words. Stored on userPrivate/{uid}, which is
// owner-only: this is the first runtime write to that store.
//
// It is never rendered back as a target, a score or a streak. It surfaces on
// Today only when capacity is slammed, which is the whole point of asking now
// rather than then.
//
// No animation anywhere on this screen, so Reduce Motion has nothing to
// suppress. Every string comes from copy.ts and renders with its placeholder
// marker visible.

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Colors, Spacing, TextStyles, Typography } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import {
  FLOOR_COMMITMENT_MAX_CHARS,
  setFloorCommitment,
} from '../../services/firebase/userPrivate.service';
import { logger } from '../../utils/logger';
import { ROUTES } from '../../navigation/routes';
import { FLOOR_COPY } from './copy';

const MIN_TOUCH_TARGET = 48;

export function FloorCommitmentScreen() {
  const navigation = useNavigation<{ replace: (route: string) => void }>();
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const canSave = text.trim().length > 0 && !saving;

  const handleSave = useCallback(async () => {
    if (!user || !canSave) return;
    setSaving(true);
    setFailed(false);
    try {
      await setFloorCommitment(user.uid, text);
      // Back through the entry guard rather than straight to the open: the
      // guard owns the routing rule, and it now has a floor to find.
      navigation.replace(ROUTES.WeeklyEntry);
    } catch (error) {
      logger.error('[FloorCommitment] save failed:', error);
      // Stay on the screen with the text intact so the user can retry without
      // retyping. Nothing is cleared on failure.
      setFailed(true);
      setSaving(false);
    }
  }, [user, canSave, text, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          testID="weekly-floor"
        >
          <Text style={styles.prompt}>{FLOOR_COPY.prompt}</Text>
          <Text style={styles.helper}>{FLOOR_COPY.helper}</Text>

          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={FLOOR_COPY.placeholder}
            placeholderTextColor={Colors.mutedSageGray}
            maxLength={FLOOR_COMMITMENT_MAX_CHARS}
            multiline={false}
            returnKeyType="done"
            onSubmitEditing={handleSave}
            accessibilityLabel={FLOOR_COPY.prompt}
            testID="weekly-floor-input"
          />

          {failed && (
            <Text style={styles.error} testID="weekly-floor-error">
              {FLOOR_COPY.saveFailed}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            accessibilityLabel={FLOOR_COPY.save}
            accessibilityHint={canSave ? undefined : FLOOR_COPY.required}
            testID="weekly-floor-save"
          >
            {saving ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <Text style={styles.saveLabel}>{FLOOR_COPY.save}</Text>
            )}
          </TouchableOpacity>

          {!canSave && !saving && (
            <Text style={styles.required}>{FLOOR_COPY.required}</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  fill: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  prompt: {
    ...TextStyles.h3,
    color: Colors.softCharcoal,
    marginBottom: Spacing.sm,
  },
  helper: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.lg,
  },
  input: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    marginBottom: Spacing.lg,
  },
  error: {
    ...TextStyles.bodySmall,
    // Soft coral, the brand's only error colour. Never red.
    color: Colors.softCoral,
    marginBottom: Spacing.md,
  },
  saveButton: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 14,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.surface,
  },
  required: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
});

export default FloorCommitmentScreen;
