// Focus rhythms (Four-Pillar IA Phase B-3c). Reached from the Focus hub. A
// calm, opt-in, MULTI-select capture of when focus tends to come most easily.
// Selections persist as plain time-of-day keys on the user doc; nothing here is
// tracked or scored. Downstream use (nudge / anchor timing) is out of scope.

import React, { useCallback, useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

import { Colors, Spacing, TextStyles, Typography } from '../../constants';
import { FOCUS_RHYTHM_OPTIONS } from '../../constants/focusRhythms';
import { useAuth } from '../../context/AuthContext';
import {
  getFocusRhythms,
  saveFocusRhythms,
} from '../../services/firebase/focusRhythms.service';
import { logger } from '../../utils/logger';

const MIN_TOUCH_TARGET = 48;

export function FocusRhythmsScreen() {
  const navigation = useNavigation<{ goBack: () => void }>();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Pre-select the user's previously saved windows so re-entry shows prior
  // choices. Best-effort: a read failure just leaves the form empty.
  useEffect(() => {
    let active = true;
    if (!user) return;
    getFocusRhythms(user.uid)
      .then((windows) => {
        if (active) setSelected(windows);
      })
      .catch((error) => logger.error('[FocusRhythms] load failed:', error));
    return () => {
      active = false;
    };
  }, [user]);

  const toggle = useCallback((key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const handleSave = useCallback(async () => {
    if (!user || saving) {
      if (!user) navigation.goBack();
      return;
    }
    setSaving(true);
    try {
      await saveFocusRhythms(user.uid, selected);
    } catch (error) {
      logger.error('[FocusRhythms] save failed:', error);
    } finally {
      navigation.goBack();
    }
  }, [user, saving, selected, navigation]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} testID="focus-rhythms">
        <Text style={styles.intro}>
          When does focus tend to come most easily? Noticing your natural rhythms
          can help you plan around them.
        </Text>
        <Text style={styles.cue}>Pick any that fit.</Text>

        <View style={styles.options}>
          {FOCUS_RHYTHM_OPTIONS.map((opt) => {
            const checked = selected.includes(opt.key);
            return (
              <TouchableOpacity
                key={opt.key}
                style={styles.option}
                onPress={() => toggle(opt.key)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={opt.label}
                testID={`focus-rhythm-option-${opt.key}`}
              >
                <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                  {checked && (
                    <Icon name="check" size={16} color={Colors.surface} />
                  )}
                </View>
                <Text style={styles.optionLabel}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.note}>
          Just for you. Nothing here is tracked or scored.
        </Text>

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="Save"
          testID="focus-rhythms-save"
        >
          <Text style={styles.saveLabel}>Save</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  intro: {
    ...TextStyles.body,
    color: Colors.softCharcoal,
    marginBottom: Spacing.sm,
  },
  cue: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.lg,
  },
  options: {
    gap: Spacing.sm,
  },
  option: {
    minHeight: MIN_TOUCH_TARGET,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: Colors.mutedSageGray,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  checkboxChecked: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  optionLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
  note: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
    marginTop: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  saveButton: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 14,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  saveLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.surface,
  },
});

export default FocusRhythmsScreen;
