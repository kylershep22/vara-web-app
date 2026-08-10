// Practices tab root — IA restructure step 2 (nav skeleton).
//
// A SHELL. It exists so the four-tab bar is real and walkable now; the content
// arrives in steps 3-5, when Focus / Energy / routines are re-parented here as
// cards. Deliberately carries no logic, no data, no navigation and nothing
// tappable: a shell that half-works is harder to reason about than one that
// plainly does nothing yet.
//
// Built on the EnergyHubScreen skeleton (SafeAreaView edges top -> ScrollView ->
// title row) minus the Guide pill. The pill takes a `context.screen` string that
// tells the AI Guide what surface it is on; there is no surface here to describe
// yet, so it is left off rather than pointed at an empty page.

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing, TextStyles } from '../../constants';

// [COPY GAP] marker rendered on screen, per the weekly-loop convention: nobody
// should mistake a walkthrough build for finished product.
const PLACEHOLDER = '[COPY GAP] Your practices will live here.';

export function PracticesHubScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} testID="practices-hub">
        <View style={styles.titleRow}>
          <Text style={styles.title}>Practices</Text>
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

export default PracticesHubScreen;
