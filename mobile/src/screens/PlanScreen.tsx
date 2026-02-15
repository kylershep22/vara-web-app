/**
 * Plan Screen
 * Consolidated screen for Goals, Habits, and Tasks
 *
 * UI redesigned per Vara Mobile UI Standards:
 * - Teal-based primary tabs (not amber)
 * - Unified sub-filters: All | Active | Complete
 * - Date context banner for Habits tab
 * - Inline create button (not FAB)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../constants';
import GoalsScreen from './GoalsScreen';
import HabitsScreen from './HabitsScreen';
import TasksScreen from './TasksScreen';

// Design tokens from spec
const TOKENS = {
  // Colors
  colorPrimary: '#1B5E57',        // Evergreen Teal
  colorBackground: '#FAFAF6',     // Mist White
  colorSurface: '#FFFFFF',        // White
  colorSecondary: '#B8CDBA',      // Silver Sage
  colorSectionBg: '#D5E3D1',      // Dew Sage
  colorTextPrimary: '#3E3E3E',    // Soft Charcoal
  colorTextSecondary: '#6F7F77',  // Muted Sage Gray (per spec)

  // Spacing
  spacingXs: 4,
  spacingSm: 8,
  spacingMd: 12,
  spacingBase: 16,
  spacingLg: 24,
  spacingXl: 32,

  // Radii
  radiusSm: 4,
  radiusMd: 8,
  radiusLg: 12,
  radiusXl: 16,
  radiusFull: 9999,

  // Typography
  fontSizePageTitle: 26,
  fontSizeSubtitle: 14,
  fontSizeTabLabel: 14,
  fontSizeFilterLabel: 13,
};

type TabType = 'goals' | 'habits' | 'tasks';
type FilterType = 'all' | 'active' | 'complete';

interface PrimaryTabProps {
  tabs: { value: TabType; label: string }[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

/**
 * Primary Tab Group - Teal-based segmented control
 */
const PrimaryTabGroup: React.FC<PrimaryTabProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <View style={styles.primaryTabContainer}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <TouchableOpacity
            key={tab.value}
            style={[
              styles.primaryTab,
              isActive && styles.primaryTabActive,
            ]}
            onPress={() => onTabChange(tab.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.primaryTabLabel,
                isActive && styles.primaryTabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

interface SubFilterProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

/**
 * Sub-Filter Bar - Unified across all tabs
 * Labels: All | Active | Complete
 */
const SubFilterBar: React.FC<SubFilterProps> = ({ activeFilter, onFilterChange }) => {
  const filters: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'complete', label: 'Complete' },
  ];

  return (
    <View style={styles.subFilterContainer}>
      {filters.map((filter) => {
        const isActive = activeFilter === filter.value;
        return (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.subFilterButton,
              isActive && styles.subFilterButtonActive,
            ]}
            onPress={() => onFilterChange(filter.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.subFilterLabel,
                isActive && styles.subFilterLabelActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

/**
 * Date Context Banner - Habits tab only
 */
const DateBanner: React.FC = () => {
  const today = new Date();
  const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
  const monthDay = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

  return (
    <View style={styles.dateBanner}>
      <Text style={styles.dateBannerText}>
        Today, {dayOfWeek} · {monthDay}
      </Text>
    </View>
  );
};

interface InlineCreateButtonProps {
  label: string;
  onPress: () => void;
}

/**
 * Inline Create Button - Replaces FAB
 * Dashed border, contextual label
 */
const InlineCreateButton: React.FC<InlineCreateButtonProps> = ({ label, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.inlineCreateButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Icon name="plus" size={18} color={TOKENS.colorPrimary} />
      <Text style={styles.inlineCreateLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

const PlanScreen: React.FC = () => {
  const route = useRoute();
  const params = route.params as { tab?: string } | undefined;
  const [activeTab, setActiveTab] = useState<TabType>((params?.tab as TabType) || 'goals');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Update tab when route params change
  useEffect(() => {
    if (params?.tab) {
      setActiveTab(params.tab as TabType);
    }
  }, [params?.tab]);

  // Reset filter when tab changes
  useEffect(() => {
    setActiveFilter('all');
  }, [activeTab]);

  // Get contextual create button label
  const getCreateLabel = (): string => {
    switch (activeTab) {
      case 'goals':
        return 'Add a goal';
      case 'habits':
        return 'Add a habit';
      case 'tasks':
        return 'Add a task';
      default:
        return 'Add new';
    }
  };

  // Handle create button press - this will be connected to the child screens
  const handleCreate = useCallback(() => {
    // The actual creation logic is in the child screens
    // We'll need to pass a ref or callback to trigger it
    // For now, this is a placeholder
  }, [activeTab]);

  // Map filter to screen-specific filter values
  const getScreenFilter = (): string => {
    switch (activeFilter) {
      case 'all':
        return 'all';
      case 'active':
        return activeTab === 'tasks' ? 'todo' : 'active';
      case 'complete':
        return activeTab === 'tasks' ? 'done' : 'completed';
      default:
        return 'all';
    }
  };

  const tabs = [
    { value: 'goals' as TabType, label: 'Goals' },
    { value: 'habits' as TabType, label: 'Habits' },
    { value: 'tasks' as TabType, label: 'Tasks' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Your Plan</Text>
        <Text style={styles.pageSubtitle}>Goals, habits, and tasks in one place</Text>
      </View>

      {/* Primary Tab Group */}
      <View style={styles.tabWrapper}>
        <PrimaryTabGroup
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </View>

      {/* Sub-Filters */}
      <SubFilterBar
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      {/* Date Banner - Habits tab only */}
      {activeTab === 'habits' && <DateBanner />}

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'goals' && (
          <GoalsScreen
            hideHeader
            externalFilter={getScreenFilter()}
            showInlineCreate
          />
        )}
        {activeTab === 'habits' && (
          <HabitsScreen
            hideHeader
            externalFilter={getScreenFilter()}
            showInlineCreate
          />
        )}
        {activeTab === 'tasks' && (
          <TasksScreen
            hideHeader
            externalFilter={getScreenFilter()}
            showInlineCreate
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colorBackground,
  },

  // Header
  header: {
    paddingHorizontal: TOKENS.spacingBase,
    paddingTop: TOKENS.spacingBase,
    paddingBottom: TOKENS.spacingBase,
  },
  pageTitle: {
    fontSize: TOKENS.fontSizePageTitle,
    fontWeight: '600',
    color: TOKENS.colorPrimary,
  },
  pageSubtitle: {
    fontSize: TOKENS.fontSizeSubtitle,
    fontWeight: '400',
    color: TOKENS.colorTextSecondary,
    marginTop: 2,
  },

  // Primary Tab Group
  tabWrapper: {
    paddingHorizontal: TOKENS.spacingBase,
    marginBottom: TOKENS.spacingMd,
  },
  primaryTabContainer: {
    flexDirection: 'row',
    backgroundColor: TOKENS.colorSurface,
    borderRadius: TOKENS.radiusLg,
    padding: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  primaryTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  primaryTabActive: {
    backgroundColor: TOKENS.colorPrimary,
  },
  primaryTabLabel: {
    fontSize: TOKENS.fontSizeTabLabel,
    fontWeight: '500',
    color: TOKENS.colorTextSecondary,
  },
  primaryTabLabelActive: {
    color: '#FFFFFF',
  },

  // Sub-Filter Bar
  subFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: TOKENS.spacingBase,
    marginTop: TOKENS.spacingMd,
    gap: TOKENS.spacingSm,
  },
  subFilterButton: {
    paddingVertical: 6,
    paddingHorizontal: TOKENS.spacingBase,
    borderRadius: TOKENS.radiusFull,
    backgroundColor: 'transparent',
  },
  subFilterButtonActive: {
    backgroundColor: `${TOKENS.colorSectionBg}AA`, // 67% opacity
  },
  subFilterLabel: {
    fontSize: TOKENS.fontSizeFilterLabel,
    fontWeight: '500',
    color: TOKENS.colorTextSecondary,
  },
  subFilterLabelActive: {
    color: TOKENS.colorPrimary,
  },

  // Date Banner
  dateBanner: {
    marginHorizontal: TOKENS.spacingBase,
    marginTop: TOKENS.spacingSm,
    marginBottom: TOKENS.spacingMd,
    backgroundColor: `${TOKENS.colorSectionBg}50`, // 31% opacity
    borderRadius: TOKENS.radiusMd,
    paddingVertical: TOKENS.spacingSm,
    alignItems: 'center',
  },
  dateBannerText: {
    fontSize: TOKENS.fontSizeFilterLabel,
    fontWeight: '500',
    color: TOKENS.colorPrimary,
  },

  // Inline Create Button
  inlineCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    marginHorizontal: TOKENS.spacingBase,
    marginBottom: TOKENS.spacingMd,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: TOKENS.colorSecondary,
    borderRadius: TOKENS.radiusLg,
    gap: TOKENS.spacingSm,
  },
  inlineCreateLabel: {
    fontSize: TOKENS.fontSizeTabLabel,
    fontWeight: '500',
    color: TOKENS.colorPrimary,
  },

  // Content
  content: {
    flex: 1,
  },
});

export default PlanScreen;
