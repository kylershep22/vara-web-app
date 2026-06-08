/**
 * Screen 3 — driver selection (skippable, multi-select). The stem and options
 * branch on the valence of the state picked on screen 2 (activated -> "What's
 * driving it?" stress drivers; positive -> "What's behind it?" supports), via
 * getDriverQuestion. Selections persist as ids for personalization/analytics;
 * an empty selection (skip) writes [] with no penalty copy.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  Wind,
  Briefcase,
  Moon,
  Flame,
  Gauge,
  Leaf,
  Sun,
  Users,
  Coffee,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';
import { OnboardingScaffold } from '../../components/onboarding/OnboardingScaffold';
import { SelectionRow } from '../../components/onboarding/SelectionRow';
import {
  getDriverQuestion,
  STRESSOR_OPTIONS,
  ONBOARDING_SR_TOTAL_STEPS,
  onboardingStepNumber,
} from '../../constants/onboardingStressRecovery';
import { useAuth } from '../../context/AuthContext';
import {
  saveStressors,
  saveOnboardingStep,
} from '../../services/firebase/onboardingStressRecovery.service';
import type { BrainState } from '../../types/models';

// Line icon per driver option (keyed by stable id, not label). Covers both
// valence sets; the two sets never render together, so a shared sleep icon
// (Moon) for activated "can't wind down" and positive "good night's sleep" is
// fine.
const DRIVER_ICONS: Record<string, LucideIcon> = {
  // Activated (Wired, Foggy)
  racing_mind: Wind,
  cant_switch_off: Briefcase,
  stretched_too_thin: Gauge,
  cant_wind_down: Moon,
  feeling_reactive: Flame,
  // Positive (Steady, Clear, Alive)
  good_nights_sleep: Moon,
  movement_fresh_air: Leaf,
  lighter_day: Sun,
  connection: Users,
  slow_down: Coffee,
  not_sure: Sparkles,
};

const OnboardingStressorScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const state: BrainState | undefined = route.params?.state;
  const [selected, setSelected] = useState<string[]>([]);
  // Stem + options branch on the valence of the selected state.
  const { stem, options } = useMemo(() => getDriverQuestion(state), [state]);

  useEffect(() => {
    if (user?.uid) void saveOnboardingStep(user.uid, 'OnboardingStressor');
  }, [user?.uid]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const advance = async (ids: string[]) => {
    if (user?.uid) {
      try {
        await saveStressors(user.uid, ids);
      } catch {
        // Non-blocking.
      }
    }
    const stressorLabels = STRESSOR_OPTIONS.filter((o) => ids.includes(o.id)).map((o) => o.label);
    navigation.navigate('OnboardingPeakWindow', { state, stressorLabels });
  };

  return (
    <OnboardingScaffold
      currentStep={onboardingStepNumber('OnboardingStressor')}
      totalSteps={ONBOARDING_SR_TOTAL_STEPS}
      title={stem}
      subtitle="Pick any that fit, or skip."
      primaryLabel="Continue"
      onPrimary={() => advance(selected)}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
    >
      <View>
        {options.map((opt) => (
          <SelectionRow
            key={opt.id}
            label={opt.label}
            icon={DRIVER_ICONS[opt.id]}
            selectionMode="multi"
            selected={selected.includes(opt.id)}
            onPress={() => toggle(opt.id)}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
};

export default OnboardingStressorScreen;
