// Energy hub — scaffold placeholder (Four-Pillar IA Phase B-3a).
//
// B-3b: replace with Energy hub
//
// This is a throwaway destination that exists ONLY so the Energy tab in
// FivePillarTabs mounts and routes under the FOUR_PILLAR_IA flag. It takes no
// params, fetches no data, and imports no real content. The real Energy hub —
// keyed off the protocol `browseCategory` tags (regulate / rest / fuel) added
// in Phase B-2 — lands in B-3b and replaces this file wholesale.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing, TextStyles } from '../../constants';

export function EnergyHubPlaceholder() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Energy</Text>
        <Text style={styles.note}>Hub coming in B-3b</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  title: {
    ...TextStyles.h1,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.xs,
  },
  note: {
    ...TextStyles.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
