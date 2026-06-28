/**
 * FocusScreen
 * Pomodoro focus screen.
 *
 * Focus-session loop (Vara_Engine_Contract.md §12.1). The per-block focus
 * reflection (the §9 focus chip set) is shown INLINE on the completion surface
 * for EVERY completed focus block (B-3c.1), skippable, regardless of launch
 * source. Selecting a chip writes it onto that block's focusSessions doc
 * (handleBlockReflect). "Done for now" then simply exits the screen when the
 * timer was launched from the hub / check-in (route params `fromHub` /
 * `fromCheckIn`); a directly-started one just resets. There is no separate
 * reflection screen, so no double-reflect.
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
  // Hub / check-in launched sessions EXIT the screen on "Done for now" (the
  // parent navigates away); a directly-started one just resets. The per-block
  // focus reflection is now INLINE on the completion surface (B-3c.1), so it is
  // independent of this exit signal.
  const fromHub = route.params?.fromHub === true;
  const shouldExitOnDone = fromCheckIn || fromHub;
  // Budget-derived prefill length from the check-in's focus-session pointer.
  const initialDuration = route.params?.durationMinutes;

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

  // "Done for now" on a hub / check-in launched session exits the screen.
  const handleExit = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Inline per-block reflection: write the chosen chip onto the just-completed
  // block's focusSessions doc (same vocabulary / field as before). Fires per
  // focus block, skippable; no synthesized state, no protocol on this doc.
  const handleBlockReflect = useCallback(
    (reflectionId: string, blockId: string | null) => {
      if (blockId && db) {
        updateDoc(doc(db, 'focusSessions', blockId), {
          reflection: reflectionId, // INTERIM field
          reflectionAt: serverTimestamp(),
        }).catch((error) => {
          logger.error('[FocusScreen] focus reflection write failed:', error);
        });
      }
    },
    []
  );

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
          onExit={shouldExitOnDone ? handleExit : undefined}
          onBlockReflect={handleBlockReflect}
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
