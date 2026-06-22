/**
 * Track Screen
 * Consolidated screen for Habits and Tasks
 *
 * UI redesigned per Vara Mobile UI Standards:
 * - Teal-based primary tabs (not amber)
 * - Unified sub-filters: All | Active | Complete
 * - Date context banner for Habits tab
 * - Inline create button (not FAB)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { FocusCopy } from '../constants/focusContent';
import { useNotificationOptIn } from '../hooks/useNotificationOptIn';
import HabitsScreen from './HabitsScreen';
import { RoutinesTab } from './Time/RoutinesTab';
import { ActiveRoutinePlayer } from './Time/ActiveRoutinePlayer';
import { Routine } from '../services/firebase/routines.service';


type TabType = 'habits' | 'routines';
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
      <Icon name="plus" size={18} color={Colors.evergreenTeal} />
      <Text style={styles.inlineCreateLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

const PlanScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const params = route.params as { tab?: string } | undefined;
  const [activeTab, setActiveTab] = useState<TabType>((params?.tab as TabType) || 'habits');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const notifOptInChecked = useRef(false);
  const { shouldShowPrompt, markPromptShown } = useNotificationOptIn();

  // Routine player state
  const [playerVisible, setPlayerVisible] = useState(false);
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);

  const handleStartRoutine = useCallback((routine: Routine) => {
    setActiveRoutine(routine);
    setPlayerVisible(true);
  }, []);

  const handleClosePlayer = useCallback(() => {
    setPlayerVisible(false);
    setActiveRoutine(null);
  }, []);

  const handleEditRoutine = useCallback(() => {
    setPlayerVisible(false);
    // Routine editing is handled within RoutinesTab
  }, []);

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

  // Notification opt-in: trigger on first routine tab interaction
  useEffect(() => {
    if (activeTab === 'routines' && !notifOptInChecked.current) {
      notifOptInChecked.current = true;
      if (shouldShowPrompt) {
        markPromptShown();
        navigation.navigate('NotificationOptIn');
      }
    }
  }, [activeTab, shouldShowPrompt]);

  // Get contextual create button label
  const getCreateLabel = (): string => {
    switch (activeTab) {
      case 'habits':
        return 'Add a habit';
      case 'routines':
        return 'Create a routine';
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
        return 'active';
      case 'complete':
        return 'completed';
      default:
        return 'all';
    }
  };

  // Dynamic subtitle based on active tab
  const getSubtitle = (): string => {
    switch (activeTab) {
      case 'habits':
        return 'Build consistency, one day at a time';
      case 'routines':
        return FocusCopy.routinesSubtitle;
      default:
        return '';
    }
  };

  const tabs = [
    { value: 'habits' as TabType, label: 'Habits' },
    { value: 'routines' as TabType, label: 'Routines' },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Rhythms</Text>
        <Text style={styles.pageSubtitle}>Your habits and routines</Text>
      </View>

      {/* Primary Tab Group */}
      <View style={styles.tabWrapper}>
        <PrimaryTabGroup
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </View>

      {/* Sub-Filters - hidden for Routines (has its own TimeOfDaySelector) */}
      {activeTab !== 'routines' && (
        <SubFilterBar
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      )}

      {/* Date Banner - Habits and Tasks tabs */}
      {activeTab === 'habits' && <DateBanner />}

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'habits' && (
          <HabitsScreen
            hideHeader
            externalFilter={getScreenFilter()}
            showInlineCreate
          />
        )}
        {activeTab === 'routines' && (
          <RoutinesTab onStartRoutine={handleStartRoutine} />
        )}
      </View>

      {/* Active Routine Player Modal */}
      {activeRoutine && (
        <ActiveRoutinePlayer
          visible={playerVisible}
          routine={activeRoutine}
          onClose={handleClosePlayer}
          onEditRoutine={handleEditRoutine}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },

  // Header
  header: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.base,
  },
  pageTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: '600',
    color: Colors.evergreenTeal,
  },
  pageSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '400',
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Primary Tab Group
  tabWrapper: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  primaryTabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
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
    backgroundColor: Colors.evergreenTeal,
  },
  primaryTabLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  primaryTabLabelActive: {
    color: '#FFFFFF',
  },

  // Sub-Filter Bar
  subFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  subFilterButton: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.base,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: 'transparent',
  },
  subFilterButtonActive: {
    backgroundColor: `${Colors.dewSage}AA`, // 67% opacity
  },
  subFilterLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  subFilterLabelActive: {
    color: Colors.evergreenTeal,
  },

  // Date Banner
  dateBanner: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    backgroundColor: `${Colors.dewSage}50`, // 31% opacity
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  dateBannerText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500',
    color: Colors.evergreenTeal,
  },

  // Inline Create Button
  inlineCreateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.silverSage,
    borderRadius: Layout.borderRadius.lg,
    gap: Spacing.sm,
  },
  inlineCreateLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500',
    color: Colors.evergreenTeal,
  },

  // Content
  content: {
    flex: 1,
  },
});

export default PlanScreen;
