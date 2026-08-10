/**
 * Step 6 of 9 — The week's start day. Seven chips, SKIPPABLE.
 *
 * What this answer buys: a stable weekly anchor. Without it every week begins
 * on whatever day the user happened to open it, which drifts a little further
 * each time they open late. With it the first cycle is a short "stub" running
 * to the day before their chosen day, and every week after that is a full seven
 * days on the same anchor.
 *
 * SKIPPING IS SAFE AND COSTS NOTHING. Null means no answer, `planWeek` falls
 * back to open-date anchoring, and that is exactly what the app did before this
 * screen existed. So the skip is a real option rather than a trap, and the copy
 * must not imply the user is giving something up.
 *
 * Nothing is persisted here. The whole arc writes once at the terminal; this
 * holds the answer in context like every other step.
 */
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { OnboardingScaffold } from '../../../components/onboarding/OnboardingScaffold';
import { WeekStartPicker } from '../../../components/shared/WeekStartPicker';
import { WEEK_START_COPY } from './copy';
import { useOnboardingV3 } from './OnboardingV3Context';
import { V3_ROUTES, V3_TOTAL_STEPS, v3StepNumber } from './routes';

export const OnboardingV3WeekStartScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { weekStartDay, setWeekStartDay } = useOnboardingV3();

  const advance = useCallback(
    (day: number | null) => {
      setWeekStartDay(day);
      navigation.navigate(V3_ROUTES.FirstWin);
    },
    [setWeekStartDay, navigation]
  );

  return (
    <OnboardingScaffold
      currentStep={v3StepNumber(V3_ROUTES.WeekStart)}
      totalSteps={V3_TOTAL_STEPS}
      title={WEEK_START_COPY.title}
      subtitle={WEEK_START_COPY.subtitle}
      primaryLabel={WEEK_START_COPY.primary}
      // Continue carries whatever is selected, including nothing. The primary is
      // never disabled: an unanswered week-start is a legitimate outcome, not an
      // incomplete form.
      onPrimary={() => advance(weekStartDay)}
      onSkip={() => advance(null)}
      onBack={() => navigation.goBack()}
    >
      <View>
        <WeekStartPicker
          value={weekStartDay}
          onChange={setWeekStartDay}
          testIDPrefix="v3-weekstart"
        />
      </View>
    </OnboardingScaffold>
  );
};

export default OnboardingV3WeekStartScreen;
