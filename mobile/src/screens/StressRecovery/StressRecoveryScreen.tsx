// Stress Recovery pillar page — IA restructure step 4b-ii-a.
//
// The fourth pillar, and the one with no content of its own. Every practice it
// lists ALSO appears under Energy. That is deliberate: a CROSS-LIST, not a move.
// Nothing was taken out of Energy, and Energy is unchanged by this screen.
//
// WHY A SECOND DOORWAY TO THE SAME PRACTICES. Energy's browse lists are sorted
// by what a practice does to your system (Regulate / Rest / Fuel) and are bare
// lists — you arrive already knowing what you want. This page is sorted by the
// moment you are in: activated, and looking for relief now. The practices
// overlap completely; the framing is the whole value. Someone who would never
// think to open "Energy" while their heart is going mid-afternoon will open
// this. If the framing below ever gets flattened into a neutral list title,
// this page stops earning its place and should be deleted rather than kept.
//
// This is why it is a SEPARATE SCREEN and not another EnergyBrowseListScreen
// category: that screen is a clean single-purpose list with no framing surface
// at all, and widening it to carry an intro plus a second kind of filter would
// make it two-mode for the benefit of one caller.
//
// The list row itself is SHARED (components/protocol/ProtocolListItem), so the
// practices look identical on both surfaces. Only the context differs, which is
// exactly the intent: same practice, different door.

import React, { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Colors, Spacing, TextStyles } from '../../constants';
import { getAllProtocols } from '../../constants/brainStateProtocols';
import { ROUTES } from '../../navigation/routes';
import { ProtocolListItem } from '../../components/protocol/ProtocolListItem';
import type { Protocol } from '../../types/models';

// BOTH STRINGS BELOW ARE DRAFT, the title included. "Stress Recovery" is the
// roadmap's working pillar name, and the roadmap itself flags it as a
// feature-set label that must not read as a return to
// stress-recovery-as-a-category, which is precisely a copy call.
//
// Guidelines section 7 has no Stress Recovery slot and is under a HOLD besides,
// so neither line can be rewritten from it yet. They used to render an
// on-screen [COPY GAP] prefix; that convention is retired.

// COPY: draft, not from guidelines doc - pending Jen
// The framing. Kept as named constants rather than inline JSX so changing the
// page's voice is a string edit and never a structural one — Jen replaces these
// two values and nothing else on the page moves.
const PAGE_TITLE = 'Stress Recovery';
// COPY: draft, not from guidelines doc - pending Jen
const PAGE_INTRO = 'In-the-moment relief when you are activated.';

const TEST_ID_PREFIX = 'stress-recovery-card';

type NavigationProp = NativeStackNavigationProp<{
  PracticeRun: { protocolId: string; stateBefore: null };
}>;

export function StressRecoveryScreen() {
  const navigation = useNavigation<NavigationProp>();

  // STRICT `=== 'settle'`. This is a decision, not a shorthand.
  //
  // DO NOT switch this to engine/slotFilter's `directionMatches('settle', …)`.
  // That helper implements the ENGINE's rule — a settle slot accepts `settle`
  // OR `both` (slotFilter.ts:48-50) — which is correct for filling a plan slot
  // and wrong for this page. `both` today means exactly one practice, Cold
  // Water Reset, and deliberately immersing someone in cold water is a poor
  // answer for a person who is already activated. It stays on Energy → Fuel,
  // where somebody choosing a jolt goes looking for it.
  //
  // The consequence is intended: this filter yields the 7 settle practices,
  // which is exactly Energy's Regulate (5) + Rest (2) and nothing else. Zero
  // unique content is the cross-list working as designed, not a gap to fill.
  // brainStateProtocols.test.ts pins that set so the drift is visible if the
  // catalog is retagged.
  //
  // Same shortest-first, then stable-by-id ordering as the Energy browse lists
  // (EnergyBrowseListScreen.tsx), so a practice does not sit in a different
  // relative position depending on which door was used.
  const protocols = useMemo<Protocol[]>(
    () =>
      getAllProtocols()
        .filter((p) => p.regulationDirection === 'settle')
        .sort((a, b) => a.timeWindow - b.timeWindow || a.id.localeCompare(b.id)),
    []
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={protocols}
        keyExtractor={(p) => p.id}
        // The framing scrolls WITH the list rather than pinning above it: the
        // list is short (7 items), and a fixed header would push the shortest
        // practices — the ones an activated person can actually start — below
        // the fold on a small phone.
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>{PAGE_TITLE}</Text>
            <Text style={styles.intro}>{PAGE_INTRO}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ProtocolListItem
            protocol={item}
            testIDPrefix={TEST_ID_PREFIX}
            onPress={() =>
              // True browse pick, same as the Energy lists: no pre-protocol
              // state was captured, so nothing is inferred about how the user
              // felt before. stateBefore null is what makes PracticeRun treat
              // this as a browse launch and return here on exit.
              navigation.navigate(ROUTES.PracticeRun, {
                protocolId: item.id,
                stateBefore: null,
              })
            }
          />
        )}
        contentContainerStyle={styles.listContent}
        testID="stress-recovery-list"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background.default,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    paddingTop: Spacing.md,
    marginBottom: Spacing.base,
  },
  title: {
    ...TextStyles.h1,
    color: Colors.evergreenTeal,
  },
  intro: {
    ...TextStyles.body,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
});

export default StressRecoveryScreen;
