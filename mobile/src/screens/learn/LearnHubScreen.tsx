// Learn tab root — IA restructure step 2 (nav skeleton).
//
// A SHELL, on the same terms as PracticesHubScreen: it makes the four-tab bar
// real and walkable now, and carries no logic, no data, no navigation and
// nothing tappable. Content arrives in a later step.
//
// Naming note: the route id is ROUTES.PillarLearn, not `Learn`. The Masterclass
// AppStack screen already ships with the visible header title "Learn", so the
// prefix keeps a route id and a header string from ever being read as the same
// thing.

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing, TextStyles } from '../../constants';

// COPY: draft, not from guidelines doc - pending Jen
// Stands in for a tab that has no content yet, so this is a build-state message
// rather than a real empty state. It used to render an on-screen [COPY GAP]
// prefix; that convention is retired and no marker text may reach the UI.
const PLACEHOLDER = 'Things worth understanding will live here.';

export function LearnHubScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} testID="learn-hub">
        <View style={styles.titleRow}>
          <Text style={styles.title}>Learn</Text>
        </View>
        <Text style={styles.intro}>{PLACEHOLDER}</Text>
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
    paddingBottom: Spacing.xl,
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
  intro: {
    ...TextStyles.body,
    color: Colors.mutedSageGray,
  },
});

export default LearnHubScreen;
