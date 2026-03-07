/**
 * AIDailyPlanCard
 * Collapsible card that generates and displays an AI-powered daily plan.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants';

interface AIDailyPlanCardProps {
  dailyPlan: string | null;
  generatingPlan: boolean;
  isPlanExpanded: boolean;
  onToggleExpand: () => void;
  onGenerate: () => void;
}

export const AIDailyPlanCard: React.FC<AIDailyPlanCardProps> = ({
  dailyPlan,
  generatingPlan,
  isPlanExpanded,
  onToggleExpand,
  onGenerate,
}) => {
  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => dailyPlan ? onToggleExpand() : onGenerate()}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityState={{ expanded: isPlanExpanded }}
        accessibilityLabel={dailyPlan ? `Today's Plan. ${isPlanExpanded ? 'Tap to collapse' : 'Tap to expand'}` : "Generate today's plan"}
      >
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <Icon name="auto-fix" size={18} color={Colors.evergreenTeal} />
          </View>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Today's Plan</Text>
            <Text style={styles.subtitle}>Personalized for your goals and habits</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {generatingPlan ? 'Creating...' : dailyPlan ? 'Ready' : 'Generate'}
            </Text>
          </View>
          {dailyPlan && (
            <Icon
              name={isPlanExpanded ? 'chevron-up' : 'chevron-right'}
              size={16}
              color={Colors.silverSage}
              style={styles.chevron}
            />
          )}
        </View>
      </TouchableOpacity>

      {isPlanExpanded && dailyPlan && (
        <View style={styles.expandedContent}>
          <View style={styles.divider} />
          <View style={styles.contentContainer}>
            <ScrollView
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              style={styles.scroll}
            >
              <Text style={styles.planText}>{dailyPlan}</Text>
            </ScrollView>
          </View>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionTextSecondary}>Adjust plan</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onGenerate}
              disabled={generatingPlan}
            >
              <Text style={styles.actionTextPrimary}>
                {generatingPlan ? 'Regenerating...' : 'Regenerate'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: Spacing.lg,
    shadowColor: 'rgba(0,0,0,0.04)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: `${Colors.evergreenTeal}14`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.mutedSageGray || '#6F7F77',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    backgroundColor: `${Colors.dewSage}80`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.evergreenTeal,
  },
  chevron: {
    marginLeft: 4,
  },
  expandedContent: {
    marginTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: `${Colors.dewSage}80`,
    marginBottom: 16,
  },
  contentContainer: {
    backgroundColor: `${Colors.dewSage}40`,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.evergreenTeal,
    padding: 16,
  },
  scroll: {
    maxHeight: 200,
  },
  planText: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 14 * 1.5,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: Spacing.base,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  actionTextPrimary: {
    fontSize: 14,
    color: Colors.evergreenTeal,
    fontWeight: '500',
  },
  actionTextSecondary: {
    fontSize: 14,
    color: Colors.mutedSageGray || '#6F7F77',
    fontWeight: '500',
  },
});
