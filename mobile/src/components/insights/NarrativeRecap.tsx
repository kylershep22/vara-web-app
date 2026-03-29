/**
 * Narrative Recap
 * AI-driven weekly narrative powered by correlation data
 */

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants';

interface NarrativeRecapProps {
  narrative: string | null;
  loading: boolean;
  timeframeLabel: string;
}

const NarrativeRecap: React.FC<NarrativeRecapProps> = ({
  narrative,
  loading,
  timeframeLabel,
}) => {
  if (!narrative && !loading) return null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.headerLabel}>Your {timeframeLabel} Story</Text>
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.evergreenTeal} />
          <Text style={styles.loadingText}>Putting your week together...</Text>
        </View>
      ) : (
        <Text style={styles.narrative}>{narrative}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 17,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(184,205,186,0.3)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  narrative: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginLeft: 8,
  },
});

export { NarrativeRecap };
