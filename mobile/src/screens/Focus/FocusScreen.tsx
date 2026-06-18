/**
 * FocusScreen
 * Pomodoro focus screen.
 *
 * Closes the focus-session loop (Vara_Engine_Contract.md §12.1): when this
 * screen is reached FROM the check-in loop (route param `fromCheckIn`), tapping
 * "Done for now" on the Pomodoro returns to the Focus reflection (the §9 focus
 * chip set) before exiting home — the same exit a catalog-practice reflection
 * uses. A directly-started Pomodoro (no `fromCheckIn`) pops no reflection. The
 * return is guarded on the explicit launch param, never any global state.
 *
 * Routines have been relocated to the Track page.
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

import { ColorTokens, SpacingTokens } from '../../constants/designTokens';
import { FocusCopy } from '../../constants/focusContent';
import { db } from '../../config/firebase';
import { logger } from '../../utils/logger';
import { ReflectionStepView } from '../../components/checkin/flow/ReflectionStepView';
import { PomodoroTab } from './PomodoroTab';

type FocusRoute = RouteProp<
  { FocusTimer: { fromCheckIn?: boolean; durationMinutes?: number } | undefined },
  'FocusTimer'
>;

export const FocusScreen: React.FC = () => {
  const route = useRoute<FocusRoute>();
  const navigation = useNavigation();
  const fromCheckIn = route.params?.fromCheckIn === true;
  // Budget-derived prefill length from the check-in's focus-session pointer.
  const initialDuration = route.params?.durationMinutes;

  // Loop-launched reflection state. `reflecting` flips on the Pomodoro's
  // "Done for now" terminal; `focusSessionId` is the block to attach the
  // reflection to (may be null if no block completed / no db).
  const [reflecting, setReflecting] = useState(false);
  const [focusSessionId, setFocusSessionId] = useState<string | null>(null);

  const handleLoopDone = useCallback((id: string | null) => {
    setFocusSessionId(id);
    setReflecting(true);
  }, []);

  const handleFocusReflection = useCallback(
    (reflectionId: string) => {
      // Light interim write: store the reflection on the focusSessions doc in
      // the SAME vocabulary as catalog reflections (the §9 focus chip ids), so
      // both collections can be read uniformly later. Unification not built now.
      if (focusSessionId && db) {
        updateDoc(doc(db, 'focusSessions', focusSessionId), {
          reflection: reflectionId, // INTERIM field
          reflectionAt: serverTimestamp(),
        }).catch((error) => {
          logger.error('[FocusScreen] focus reflection write failed:', error);
        });
      }
      // Exit home — the same exit a catalog-practice reflection uses.
      navigation.goBack();
    },
    [focusSessionId, navigation]
  );

  if (fromCheckIn && reflecting) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ReflectionStepView
          completedLabel="Focus session"
          pillar="focus"
          direction="neutral"
          onSelect={handleFocusReflection}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <View style={styles.header}>
        <Text style={styles.subtitle}>{FocusCopy.pomodoroSubtitle}</Text>
      </View>

      <View style={styles.content}>
        <PomodoroTab
          showAdvancedDuration
          initialDuration={initialDuration}
          onLoopDone={fromCheckIn ? handleLoopDone : undefined}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ColorTokens.backgroundPrimary,
  },
  header: {
    paddingHorizontal: SpacingTokens.lg,
    paddingVertical: SpacingTokens.base,
  },
  subtitle: {
    fontSize: 14,
    color: ColorTokens.textSecondary,
    marginTop: SpacingTokens.xs,
  },
  content: {
    flex: 1,
  },
});

export default FocusScreen;
