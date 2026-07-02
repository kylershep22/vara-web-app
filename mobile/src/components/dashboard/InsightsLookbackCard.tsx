import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';

/**
 * InsightsLookbackCard — Insights' quiet launch home on the dashboard (B-3d.6).
 *
 * Under the four-pillar IA, Insights leaves the tab structure; this row is its
 * reachability point. It is deliberately QUIET, honoring dashboard restraint and
 * the anti-surveillance rule:
 *   - a de-emphasized list-item at the BOTTOM of the dashboard (below the
 *     routine card), NOT a hero / teal-primary panel and with no accent fill;
 *   - outcomes-led, reflective copy ("Look back" / "patterns over time"), never
 *     "your analytics" / "see your stats";
 *   - no streaks, scores, charts, or numbers on the card itself;
 *   - static — no entrance animation — so Reduce Motion is a non-issue.
 *
 * Tapping opens the existing Insights screen (registered in AppStack under both
 * flags). Copy here is guarded by brandCopyGuard (em-dash / optim*).
 */
export function InsightsLookbackCard() {
  const navigation = useNavigation<any>();

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => navigation.navigate('Insights')}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="Look back. A gentle look at your patterns over time."
      testID="insights-lookback-card"
    >
      <Icon name="history" size={20} color={Colors.mutedSageGray} />
      <View style={styles.text}>
        <Text style={styles.title}>Look back</Text>
        <Text style={styles.subtitle}>A gentle look at your patterns over time.</Text>
      </View>
      <Icon name="chevron-right" size={20} color={Colors.silverSage} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.sm,
  },
  text: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
});

export default InsightsLookbackCard;
