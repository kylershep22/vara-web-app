/**
 * Screen A of the Remove capture. The question that opens the flow.
 *
 * ONE QUESTION, FIVE OPTIONS, NO FORM. The chips are the whole vocabulary; the
 * free-text field lives two screens away behind "Something else", deliberately,
 * so that typing is a choice rather than the default.
 *
 * THE TERTIARY IS AN ANSWER, NOT AN ESCAPE. "I'll name it later" retires the
 * entry card for a week rather than dismissing a step, and the flow never
 * auto-re-fires after it.
 */
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { OptionRow } from '../../../components/shared/OptionRow';
import { RemoveCaptureScaffold } from './RemoveCaptureScaffold';
import { REMOVE_CAPTURE_ROUTES } from './routes';
import { useRemoveCapture } from './RemoveCaptureContext';
import { logEvent } from '../../../services/firebase/analyticsEvents.service';
import { useAuth } from '../../../context/AuthContext';
import { IDENTIFY_CHIPS, IDENTIFY_COPY } from './copy';
import { legForIdentifyChip } from './routing';

export const IdentifyScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { setChip, setFamily, setTiming } = useRemoveCapture();
  const [selected, setSelected] = useState<string | null>(null);

  const onPrimary = useCallback(() => {
    if (!selected) return;
    const chip = IDENTIFY_CHIPS.find((c) => c.id === selected);
    if (!chip) return;
    setChip(chip.id, chip.label);

    const leg = legForIdentifyChip(chip.id);
    if (leg.family) setFamily(leg.family);
    if (leg.timing) setTiming(leg.timing);

    navigation.navigate(
      leg.next === 'sleep'
        ? REMOVE_CAPTURE_ROUTES.Sleep
        : leg.next === 'clarify'
          ? REMOVE_CAPTURE_ROUTES.Clarify
          : leg.next === 'timing'
            ? REMOVE_CAPTURE_ROUTES.Timing
            : REMOVE_CAPTURE_ROUTES.FirstMove
    );
  }, [selected, setChip, setFamily, setTiming, navigation]);

  const onTertiary = useCallback(() => {
    if (user?.uid) logEvent(user.uid, 'journey_remove_capture_dismissed', {});
    navigation.goBack();
  }, [user?.uid, navigation]);

  return (
    <RemoveCaptureScaffold
      title={IDENTIFY_COPY.title}
      subtitle={IDENTIFY_COPY.helper}
      primaryLabel={IDENTIFY_COPY.primary}
      primaryDisabled={!selected}
      onPrimary={onPrimary}
      tertiaryLabel={IDENTIFY_COPY.tertiary}
      onTertiary={onTertiary}
    >
      <View>
        {IDENTIFY_CHIPS.map((chip) => (
          <OptionRow
            key={chip.id}
            label={chip.label}
            description=""
            selected={selected === chip.id}
            onPress={() => setSelected(chip.id)}
            testID={`remove-capture-identify-${chip.id}`}
          />
        ))}
      </View>
    </RemoveCaptureScaffold>
  );
};
