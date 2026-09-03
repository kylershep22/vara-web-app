/**
 * Screen B. Only reachable from "Something else", and the ONLY place in this
 * flow with a free-text field.
 *
 * THE CRISIS PRE-CHECK RUNS HERE, ON SUBMIT, BEFORE ANYTHING ELSE HAPPENS. Not
 * on the write, not on the confirmation, and not on a later screen: the whole
 * promise is that a disclosure is never stored, and the only way to keep it is
 * to check before the text enters state at all.
 *
 * On a failure this returns WITHOUT calling setText, so the answer exists
 * nowhere but in a local input that unmounts. Nothing is stored, nothing is
 * echoed, and nothing is logged beyond the bare shown-event the support screen
 * fires. The category is deliberately not passed as a route param, because a
 * route param is state and this path must leave none.
 *
 * THE TEXT IS OPTIONAL. A user can tap a clarify chip and continue without
 * typing at all, which is part of what keeps the chips path complete on its own.
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { OptionRow } from '../../../components/shared/OptionRow';
import { Colors, Layout, Spacing, Typography } from '../../../constants';
import { precheckFreeText } from '../../../safety/textPrecheck';
import { RemoveCaptureScaffold } from './RemoveCaptureScaffold';
import { REMOVE_CAPTURE_ROUTES } from './routes';
import { useRemoveCapture } from './RemoveCaptureContext';
import { CLARIFY_CHIPS, CLARIFY_COPY } from './copy';
import { familyForClarifyChip } from './routing';

/** Matches the rules-layer cap, so the input cannot compose a rejected write. */
const MAX_TEXT = 200;

export const ClarifyScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { setChip, setFamily, setText } = useRemoveCapture();
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const onPrimary = useCallback(() => {
    if (!selected) return;
    const trimmed = draft.trim();

    // THE GATE. Runs before setText, before setChip, before navigation.
    if (trimmed) {
      const result = precheckFreeText(trimmed);
      if (!result.pass) {
        navigation.navigate(REMOVE_CAPTURE_ROUTES.Support);
        return;
      }
      setText(trimmed);
    }

    const chip = CLARIFY_CHIPS.find((c) => c.id === selected);
    // 'free_text' is the stored chip id for this path: it records WHICH path
    // was taken without recording what was said. The label is kept only for
    // the confirmation echo when the user typed nothing.
    if (chip) setChip(trimmed ? 'free_text' : chip.id, chip.label);
    setFamily(familyForClarifyChip(selected));
    navigation.navigate(REMOVE_CAPTURE_ROUTES.FirstMove);
  }, [selected, draft, setChip, setFamily, setText, navigation]);

  return (
    <RemoveCaptureScaffold
      title={CLARIFY_COPY.title}
      primaryLabel={CLARIFY_COPY.primary}
      primaryDisabled={!selected}
      onPrimary={onPrimary}
      onBack={() => navigation.goBack()}
    >
      <View>
        {CLARIFY_CHIPS.map((chip) => (
          <OptionRow
            key={chip.id}
            label={chip.label}
            description=""
            selected={selected === chip.id}
            onPress={() => setSelected(chip.id)}
            testID={`remove-capture-clarify-${chip.id}`}
          />
        ))}

        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={CLARIFY_COPY.textPlaceholder}
          placeholderTextColor={Colors.mutedSageGray}
          maxLength={MAX_TEXT}
          multiline
          accessibilityLabel={CLARIFY_COPY.textPlaceholder}
          testID="remove-capture-clarify-text"
        />
      </View>
    </RemoveCaptureScaffold>
  );
};

const styles = StyleSheet.create({
  input: {
    marginTop: Spacing.base,
    minHeight: 88,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.mutedSageGray,
    padding: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    textAlignVertical: 'top',
  },
});
