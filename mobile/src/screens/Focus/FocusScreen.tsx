/**
 * FocusScreen
 * Pomodoro focus screen.
 *
 * Closes the focus-session loop (Vara_Engine_Contract.md §12.1): when this
 * screen is reached FROM the check-in loop (route param `fromCheckIn`) OR from
 * the Focus hub (route param `fromHub`, B-3c), tapping "Done for now" on the
 * Pomodoro returns to the Focus reflection (the §9 focus chip set) before
 * exiting home — the same exit a catalog-practice reflection uses. A
 * directly-started Pomodoro (neither param) pops no reflection. The return is
 * guarded on the explicit launch params, never any global state.
 *
 * The focus reflection carries no protocol and no BrainState: it is the focus
 * pillar's state-less, neutral-direction set, and stateBefore/stateAfter are
 * never synthesized for a bare timer session.
 *
 * Center first (B-3c commit 5): an opt-in, remembered row on the timer setup
 * runs a FIXED pre-focus practice (box breathing, 2 min) before the timer. It
 * is launched HUB-LOCALLY here via GuidedSessionPlayer — a real protocol with a
 * normal protocolSession row — NOT through the check-in plan resolver, the
 * quadrant ranker, or the shared PracticeRunScreen completion path. On the
 * practice's completion we hand off straight into the (auto-started) timer; the
 * single end-of-loop reflection stays the FOCUS reflection. No BrainState is
 * synthesized: the box breathing run captures stateBefore=null, and the timer
 * session in focusSessions stays state-less and protocol-less, unchanged.
 *
 * Routines have been relocated to the Track page.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

import { ColorTokens, SpacingTokens } from '../../constants/designTokens';
import { FocusCopy } from '../../constants/focusContent';
import { getProtocolById } from '../../constants/brainStateProtocols';
import { db } from '../../config/firebase';
import { logger } from '../../utils/logger';
import { useAuth } from '../../context/AuthContext';
import { ReflectionStepView } from '../../components/checkin/flow/ReflectionStepView';
import { GuidedSessionPlayer } from '../../components/protocol/GuidedSessionPlayer';
import {
  getFocusPreferences,
  saveFocusPreferences,
} from '../../services/firebase/focusPreferences.service';
import { writeProtocolSession } from '../../services/firebase/protocolSession.service';
import type { ProtocolSessionSummary } from '../../types/models';
import { PomodoroTab } from './PomodoroTab';

// The fixed pre-focus practice. A real regulate protocol (2-min box breathing);
// launched as a known, hardcoded id — never resolved from state.
const CENTER_FIRST_PROTOCOL_ID = 'box-breathing-2';

type FocusRoute = RouteProp<
  {
    FocusTimer:
      | { fromCheckIn?: boolean; fromHub?: boolean; durationMinutes?: number }
      | undefined;
  },
  'FocusTimer'
>;

export const FocusScreen: React.FC = () => {
  const route = useRoute<FocusRoute>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const fromCheckIn = route.params?.fromCheckIn === true;
  // Hub-launched sessions (B-3c) chain into the focus reflection too, via an
  // explicit param so check-in's behavior is never overloaded.
  const fromHub = route.params?.fromHub === true;
  const chainReflection = fromCheckIn || fromHub;
  // Budget-derived prefill length from the check-in's focus-session pointer.
  const initialDuration = route.params?.durationMinutes;

  // Loop-launched reflection state. `reflecting` flips on the Pomodoro's
  // "Done for now" terminal; `focusSessionId` is the block to attach the
  // reflection to (may be null if no block completed / no db).
  const [reflecting, setReflecting] = useState(false);
  const [focusSessionId, setFocusSessionId] = useState<string | null>(null);

  // Center-first state. `centerFirst` controls the setup row (initialized from
  // the persisted preference). `centering` flips while the box breathing
  // practice runs. `centeredDone` makes centering a once-per-session affordance.
  // `centeredDuration`/`autoStartTimer` carry the user's picked length and the
  // auto-start signal across the centering handoff.
  const [centerFirst, setCenterFirst] = useState(false);
  const [centering, setCentering] = useState(false);
  const [centeredDone, setCenteredDone] = useState(false);
  const [centeredDuration, setCenteredDuration] = useState<number | undefined>(
    undefined
  );
  const [autoStartTimer, setAutoStartTimer] = useState(false);
  // Once the user toggles the row, an in-flight preference load must not clobber
  // their choice.
  const userToggledRef = useRef(false);

  const centerProtocol = getProtocolById(CENTER_FIRST_PROTOCOL_ID);
  const canCenter = !!centerProtocol && !centeredDone;

  // Load the remembered Center-first choice.
  useEffect(() => {
    if (!user?.uid) return;
    let active = true;
    getFocusPreferences(user.uid)
      .then((prefs) => {
        if (active && !userToggledRef.current) setCenterFirst(prefs.centerFirst);
      })
      .catch((error) => logger.error('[FocusScreen] prefs load failed:', error));
    return () => {
      active = false;
    };
  }, [user]);

  const handleToggleCenterFirst = useCallback(
    (next: boolean) => {
      userToggledRef.current = true;
      setCenterFirst(next);
      if (user?.uid) {
        saveFocusPreferences(user.uid, { centerFirst: next }).catch((error) =>
          logger.error('[FocusScreen] prefs save failed:', error)
        );
      }
    },
    [user]
  );

  // Begin tapped with Center-first ON → run the fixed pre-focus practice. The
  // picked length is held so the post-centering timer opens at the same budget.
  const handleCenterFirstBegin = useCallback((durationMinutes: number) => {
    setCenteredDuration(durationMinutes);
    setCentering(true);
  }, []);

  // Box breathing finished (natural completion or mid-practice exit). Persist a
  // NORMAL, state-less protocolSession row for the practice (its own record,
  // separate from the focusSessions timer doc), then hand off to the timer.
  // Auto-start it only on a real completion; an early exit returns to the setup.
  const handleCenterExit = useCallback(
    (summary: ProtocolSessionSummary) => {
      if (user?.uid && centerProtocol) {
        writeProtocolSession(user.uid, {
          protocolId: summary.protocolId,
          stateBefore: null,
          stateAfter: null,
          timeWindowSelected: centerProtocol.timeWindow,
          durationActualSeconds: summary.durationActualSeconds,
          outcome: summary.completed ? 'browse_launched' : 'abandoned',
          userChosenNextStep: null,
          intentPath: 'default',
          sessionStartedAt: summary.startedAt,
        }).catch((error) =>
          logger.error('[FocusScreen] center session write failed:', error)
        );
      }
      setCentering(false);
      setCenteredDone(true);
      setAutoStartTimer(summary.completed);
    },
    [user, centerProtocol]
  );

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

  if (chainReflection && reflecting) {
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

  // Centering phase: run the fixed pre-focus practice. Hub-local — its own
  // GuidedSessionPlayer with no terminal reflection and no route-home; on exit
  // handleCenterExit hands off to the timer below.
  if (centering && centerProtocol) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <GuidedSessionPlayer
          protocol={centerProtocol}
          stateBefore={null}
          onExit={handleCenterExit}
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
          initialDuration={centeredDuration ?? initialDuration}
          autoStart={autoStartTimer}
          centerFirst={centerFirst}
          onToggleCenterFirst={handleToggleCenterFirst}
          onCenterFirstBegin={canCenter ? handleCenterFirstBegin : undefined}
          onLoopDone={chainReflection ? handleLoopDone : undefined}
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
