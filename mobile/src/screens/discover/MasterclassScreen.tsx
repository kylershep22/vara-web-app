/**
 * Masterclass Screen
 * Podcasts + Educational courses
 *
 * CHROME ONLY SINCE LEARN-REHOUSE. The body moved to
 * `components/library/LearnLibrary.tsx` so the Learn tab root could render the
 * same content; this screen keeps its route, its registration and its own
 * pushed-screen chrome and renders that component.
 *
 * WHY THE ROUTE STILL EXISTS. Retiring `Masterclass` and its four inert
 * references is a deliberate cleanup pass of its own and was out of this
 * slice's scope. The route stays registered and correct. It is, however, now
 * REGISTERED BUT UNREACHED - the Energy hub's "Learn" row was its only live
 * caller and that row is gone - which is the DARK shape standards 2.8 defines.
 * Anyone relighting or retiring it should read that section first.
 *
 * `edges={['bottom']}` AND THE RAW 100 ARE CORRECT HERE AND ONLY HERE. This is
 * a pushed screen with the tab bar hidden, so there is no floating capsule to
 * clear and no tab-bar inset to compose. Neither value may travel into
 * `LearnLibrary`, which is shared with a tab root where both are wrong.
 */

import React from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../constants';
import { LearnLibrary } from '../../components/library/LearnLibrary';

export default function MasterclassScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <LearnLibrary />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // THE TOKEN, NOT THE LITERAL. The body this screen used to hold writes Mist
    // White as a raw `#FAFAF6` inside `VARA_COLORS`, and that debt travelled to
    // LearnLibrary unchanged by decision. This is NEW chrome, so it reads the
    // palette: inheriting debt is not the same as minting more of it, and a
    // fresh literal here would be a lint regression rather than a carried one.
    backgroundColor: Colors.background.default,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    // STAYS A LITERAL, AND STAYS HERE. On a pushed screen with no tab bar this
    // is just bottom breathing room. It must never be lifted into the shared
    // component: on a tab root the clearance is the bar's height plus its
    // offset plus a gap, which `useTabBarInset()` composes to 110 on a 14 Plus
    // and 88 on an SE, so a literal 100 would be wrong on both.
    paddingBottom: 100,
  },
});
