// Learn tab root — IA restructure step 5, "re-house podcasts" (LEARN-REHOUSE).
//
// NO LONGER A SHELL. It was one from IA step 2 until this slice: a title and a
// single placeholder line, no data, nothing tappable. It now renders the
// podcast library that used to sit two taps deep behind the Energy hub's
// "Learn" row, via the shared `LearnLibrary` component.
//
// THE CHROME IS UNCHANGED AND THAT IS DELIBERATE. `edges={['top']}`, the
// `useTabBarInset()` call, the title row with its H1 and the `learn-hub`
// testID all predate this slice and were already correct for a tab root. The
// work here was putting content UNDER the existing title, not rebuilding the
// frame around it.
//
// NO HERO BAND. Standards 2.8 assigns this route ATMOSPHERIC and both 2.8 and
// template 11F bar a band on a tab root ("Tab-root hubs (Journey, Learn) are
// atmospheric with no band"), so `ScreenHeader` must not appear here.
//
// Naming note: the route id is ROUTES.PillarLearn, not `Learn`. The Masterclass
// AppStack screen already ships with the visible header title "Learn", so the
// prefix keeps a route id and a header string from ever being read as the same
// thing. That screen is now chrome around the same shared component.

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Text from '../../components/shared/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTabBarInset } from '../../hooks/useTabBarInset';

import { Colors, Spacing, TextStyles } from '../../constants';
import { LearnLibrary } from '../../components/library/LearnLibrary';

export function LearnHubScreen() {
  // Bottom clearance for the floating tab bar (12.2).
  const tabBarInset = useTabBarInset();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarInset }]}
        testID="learn-hub"
      >
        <View style={styles.titleRow}>
          <Text style={styles.title}>Learn</Text>
        </View>
        <LearnLibrary />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    // NO BOTTOM PADDING HERE SINCE R2. The floating tab bar (12.2) no longer
    // reserves its own space, so the clearance is not a constant - it is the
    // bar's height plus its offset plus a gap, composed by `useTabBarInset()`
    // at the call site. This screen carried Spacing.xl (32), which was BELOW
    // even 6.2's retired 48 and is what the R2 row named as the trap.
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  title: {
    ...TextStyles.h1,
    color: Colors.evergreenTeal,
  },
  // `intro` went with the placeholder it styled. The body's own copy now comes
  // from LearnLibrary, which carries its own type scale.
});

export default LearnHubScreen;
