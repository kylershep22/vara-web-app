/**
 * Screen C. Only reachable from the sleep chip.
 *
 * EVERY OPTION SETS TIMING TO EVENING AND SKIPS SCREEN D. The question was
 * about sleep, so the timing is already answered; asking again would read as
 * not having listened. See routing.ts for the family each option resolves to.
 */
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { OptionRow } from '../../../components/shared/OptionRow';
import { RemoveCaptureScaffold } from './RemoveCaptureScaffold';
import { REMOVE_CAPTURE_ROUTES } from './routes';
import { useRemoveCapture } from './RemoveCaptureContext';
import { SLEEP_CHIPS, SLEEP_COPY } from './copy';
import { legForSleepChip } from './routing';

export const SleepScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { setChip, setFamily, setTiming } = useRemoveCapture();
  const [selected, setSelected] = useState<string | null>(null);

  const onPrimary = useCallback(() => {
    if (!selected) return;
    const chip = SLEEP_CHIPS.find((c) => c.id === selected);
    if (!chip) return;
    // The sub-answer REPLACES the opening chip: it is the more specific thing
    // the user named, and it is what the confirmation should echo back.
    setChip(chip.id, chip.label);

    const leg = legForSleepChip(chip.id);
    if (leg.family) setFamily(leg.family);
    if (leg.timing) setTiming(leg.timing);
    navigation.navigate(REMOVE_CAPTURE_ROUTES.FirstMove);
  }, [selected, setChip, setFamily, setTiming, navigation]);

  return (
    <RemoveCaptureScaffold
      title={SLEEP_COPY.title}
      primaryLabel={SLEEP_COPY.primary}
      primaryDisabled={!selected}
      onPrimary={onPrimary}
      onBack={() => navigation.goBack()}
    >
      <View>
        {SLEEP_CHIPS.map((chip) => (
          <OptionRow
            key={chip.id}
            label={chip.label}
            description=""
            selected={selected === chip.id}
            onPress={() => setSelected(chip.id)}
            testID={`remove-capture-sleep-${chip.id}`}
          />
        ))}
      </View>
    </RemoveCaptureScaffold>
  );
};
