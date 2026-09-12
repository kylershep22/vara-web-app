/**
 * Dev: Typography — the R1a walk's step 1.
 *
 * WHY IT EXISTS. The walk has to establish that Inter is actually rendering,
 * and the obvious way to do that is to name a glyph that differs from San
 * Francisco. Step 0 first proposed the foot serif on the digit 1. That was
 * rejected: it asks a walker to be a typographer, and a step that can be
 * answered wrong with confidence is worse than no step at all.
 *
 * So this screen renders THE SAME STRING twice, once through the shared
 * primitive and once with `fontFamily: 'System'` forced, at two sizes. The pass
 * condition becomes a comparison rather than a recognition: the two blocks
 * differ, or the primitive is not applying a family.
 *
 * `__DEV__` only, registered in the gated block of AppNavigator and reached
 * from the Developer section of Settings, exactly as DevVideoPlayer is. Its
 * strings are developer chrome, not product copy, and carry no sentinel.
 */

import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Text from '../../components/shared/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing, Typography } from '../../constants';

// Ascenders, descenders and digits: where Inter and San Francisco diverge most.
const SPECIMEN = 'Handgloves 0123456789';

const WEIGHTS = [
  ['Regular 400', Typography.fontWeight.regular],
  ['Medium 500', Typography.fontWeight.medium],
  ['SemiBold 600', Typography.fontWeight.semibold],
  ['Bold 700', Typography.fontWeight.bold],
] as const;

const FONT_KEYS = [
  Typography.fontFamily.regular,
  Typography.fontFamily.medium,
  Typography.fontFamily.semibold,
  Typography.fontFamily.bold,
];

interface Props {
  /** Injected by the walk only; the screen reads the real values by default. */
  fontsLoaded?: boolean;
  fontError?: Error | null;
  timedOut?: boolean;
}

export default function TypographyDiagnosticScreen({
  fontsLoaded,
  fontError,
  timedOut,
}: Props) {
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.caption}>
          Rows 1 and 3 go through the shared primitive. Rows 2 and 4 force the
          system font. If a pair looks identical, the primitive is not applying
          a family.
        </Text>

        <Text style={styles.rowLabel}>1. Primitive, 16pt</Text>
        <View style={styles.block} testID="dev-type-primitive-16">
          {WEIGHTS.map(([label, weight]) => (
            <Text key={label} style={[styles.body, { fontWeight: weight }]}>
              {label}  {SPECIMEN}
            </Text>
          ))}
        </View>

        <Text style={styles.rowLabel}>2. System, 16pt</Text>
        <View style={styles.block} testID="dev-type-system-16">
          {WEIGHTS.map(([label, weight]) => (
            <Text
              key={label}
              style={[styles.body, { fontWeight: weight, fontFamily: 'System' }]}
            >
              {label}  {SPECIMEN}
            </Text>
          ))}
        </View>

        <Text style={styles.rowLabel}>3. Primitive, 48pt</Text>
        <View style={styles.block} testID="dev-type-primitive-48">
          <Text style={[styles.large, { fontWeight: Typography.fontWeight.regular }]}>
            Hg 0123
          </Text>
          <Text style={[styles.large, { fontWeight: Typography.fontWeight.semibold }]}>
            Hg 0123
          </Text>
        </View>

        <Text style={styles.rowLabel}>4. System, 48pt</Text>
        <View style={styles.block} testID="dev-type-system-48">
          <Text
            style={[
              styles.large,
              { fontWeight: Typography.fontWeight.regular, fontFamily: 'System' },
            ]}
          >
            Hg 0123
          </Text>
          <Text
            style={[
              styles.large,
              { fontWeight: Typography.fontWeight.semibold, fontFamily: 'System' },
            ]}
          >
            Hg 0123
          </Text>
        </View>

        <Text style={styles.rowLabel}>Font status</Text>
        <View style={styles.block} testID="dev-type-status">
          {FONT_KEYS.map((key) => (
            <Text key={key} style={styles.mono}>
              {key}
            </Text>
          ))}
          <Text style={styles.mono}>fontsLoaded: {String(fontsLoaded ?? 'n/a')}</Text>
          <Text style={styles.mono}>
            fontError: {fontError ? String(fontError.message) : 'null'}
          </Text>
          <Text style={styles.mono}>timeout fired: {String(timedOut ?? 'n/a')}</Text>
          <Text style={styles.mono}>maxFontScale: {Typography.maxFontScale}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.background.default },
  content: { padding: Spacing.base, paddingBottom: Spacing['2xl'] },
  caption: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.lg,
  },
  rowLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  block: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: Spacing.md,
  },
  body: { fontSize: Typography.fontSize.base, color: Colors.softCharcoal },
  large: { fontSize: Typography.fontSize.timer, color: Colors.softCharcoal },
  mono: {
    fontFamily: 'monospace',
    fontSize: Typography.fontSize.xs,
    color: Colors.softCharcoal,
  },
});
