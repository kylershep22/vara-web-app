/**
 * Narrative Recap
 * Warm, non-judgmental summary of user's progress
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';

// Vara brand colors
const VARA_COLORS = {
  teal: '#1B5E57',
  dewSage: '#D5E3D1',
  dewSageLight: '#E4EDE1',
  silverSage: '#B8CDBA',
  charcoal: '#3E3E3E',
  white: '#FFFFFF',
};

interface NarrativeRecapProps {
  habits: number;
  streak: number;
  goals: number;
  tasks: number;
  journal: number;
  focusSessions: number;
  focusMinutes: number;
  timeframeLabel: string;
}

const generateSummary = (data: NarrativeRecapProps): string => {
  const { habits, streak, goals, tasks, journal, focusSessions, focusMinutes, timeframeLabel } = data;

  let summary = '';

  // Lead with what happened (never with zeros)
  if (habits > 0 && streak > 0) {
    summary = `You checked in ${habits} time${habits > 1 ? 's' : ''} and showed up ${streak} days in a row \u2014 a solid foundation to build on.`;
  } else if (habits > 0) {
    summary = `You completed ${habits} habit check-in${habits > 1 ? 's' : ''} ${timeframeLabel.toLowerCase()} \u2014 consistency takes time, and you're showing up.`;
  } else if (journal > 0) {
    summary = `You journaled ${journal} time${journal > 1 ? 's' : ''} ${timeframeLabel.toLowerCase()} \u2014 reflection is a powerful tool for clarity.`;
  } else if (goals > 0) {
    summary = `You completed ${goals} goal${goals > 1 ? 's' : ''} ${timeframeLabel.toLowerCase()} \u2014 that's meaningful progress.`;
  } else if (tasks > 0) {
    summary = `You completed ${tasks} task${tasks > 1 ? 's' : ''} ${timeframeLabel.toLowerCase()} \u2014 every small step counts.`;
  } else if (focusSessions > 0) {
    summary = `You logged ${focusSessions} focus session${focusSessions > 1 ? 's' : ''} totaling ${focusMinutes} minutes \u2014 that dedicated time matters.`;
  } else {
    summary = "Starting fresh is always an option. Your next check-in is waiting when you're ready.";
  }

  // Add gentle encouragement if there's activity
  if (habits > 0 || journal > 0 || goals > 0 || tasks > 0 || focusSessions > 0) {
    summary += ' Keep supporting your routine at your own pace.';
  }

  return summary;
};

export const NarrativeRecap: React.FC<NarrativeRecapProps> = (props) => {
  const { streak } = props;
  const summary = generateSummary(props);

  return (
    <LinearGradient
      colors={[VARA_COLORS.dewSage, VARA_COLORS.dewSageLight]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>{'\uD83D\uDC9A'}</Text>
        <Text style={styles.headerTitle}>{props.timeframeLabel}</Text>
      </View>

      {/* Narrative text */}
      <Text style={styles.narrative}>{summary}</Text>

      {/* Achievement badge (if streak >= 3) */}
      {streak >= 3 && (
        <View style={styles.badge}>
          <Text style={styles.badgeIcon}>{'\uD83C\uDFC6'}</Text>
          <Text style={styles.badgeText}>
            Best consistency run: <Text style={styles.badgeNumber}>{streak}</Text> days
          </Text>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(184,205,186,0.4)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  headerIcon: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: VARA_COLORS.teal,
  },
  narrative: {
    fontSize: 13,
    color: VARA_COLORS.charcoal,
    lineHeight: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 10,
  },
  badgeIcon: {
    fontSize: 16,
  },
  badgeText: {
    fontSize: 12,
    color: VARA_COLORS.charcoal,
    fontWeight: '500',
  },
  badgeNumber: {
    fontWeight: '700',
  },
});

export default NarrativeRecap;
