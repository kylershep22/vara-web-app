/**
 * Screen D. Reachable from the scroll and thoughts chips only.
 *
 * THE HEADING FOLLOWS THE FAMILY. A behavioral target is something you get
 * pulled into; a mental one is something you cannot switch off. One wording for
 * both would make one of them read as a category error.
 */
import React, { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { OptionRow } from '../../../components/shared/OptionRow';
import { RemoveCaptureScaffold } from './RemoveCaptureScaffold';
import { REMOVE_CAPTURE_ROUTES } from './routes';
import { useRemoveCapture } from './RemoveCaptureContext';
import { TIMING_CHIPS, TIMING_COPY } from './copy';
import { timingForChip, timingTitleFor } from './routing';

export const TimingScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { family, setTiming } = useRemoveCapture();
  const [selected, setSelected] = useState<string | null>(null);

  const onPrimary = useCallback(() => {
    if (!selected) return;
    setTiming(timingForChip(selected));
    navigation.navigate(REMOVE_CAPTURE_ROUTES.FirstMove);
  }, [selected, setTiming, navigation]);

  const title =
    timingTitleFor(family ?? undefined) === 'mental'
      ? TIMING_COPY.titleMental
      : TIMING_COPY.titleBehavioral;

  return (
    <RemoveCaptureScaffold
      title={title}
      primaryLabel={TIMING_COPY.primary}
      primaryDisabled={!selected}
      onPrimary={onPrimary}
      onBack={() => navigation.goBack()}
    >
      <View>
        {TIMING_CHIPS.map((chip) => (
          <OptionRow
            key={chip.id}
            label={chip.label}
            description=""
            selected={selected === chip.id}
            onPress={() => setSelected(chip.id)}
            testID={`remove-capture-timing-${chip.id}`}
          />
        ))}
      </View>
    </RemoveCaptureScaffold>
  );
};
