/**
 * Insights Screen — "Your week"
 * Progressive widget hierarchy:
 * 1. Hero — Wellness Score
 * 2. AI Narrative
 * 3. Correlation Insight
 * 4. Daily Activity Bar Chart
 * 5. 30-day Habit Heatmap
 * 6. At a Glance
 */

import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LoadingSpinner,
  NarrativeRecap,
  HabitHeatmap,
  HeroSummaryCard,
  WeeklyBarChart,
} from '../components';
import { AtAGlanceCard } from '../components/insights/SparklineTrendCard';
import { CorrelationInsightCard } from '../components/insights/CorrelationInsightCard';
import { Colors, Spacing, Typography } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useHabits } from '../hooks';
import { useWeeklyCorrelations } from '../hooks/useWeeklyCorrelations';
import { apiPost } from '../services/api/client';
import { getHabitCompletions } from '../services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

const VARA_COLORS = {
  teal: '#1B5E57',
  tealMid: '#227A71',
  apricot: '#F5B971',
  mistWhite: '#FAFAF6',
  charcoal: '#3E3E3E',
  sageGray: '#6F7F77',
};

type TimeFrame = 'week' | 'month';

const InsightsScreen: React.FC<{ hideHeader?: boolean }> = ({ hideHeader = false }) => {
  const { user } = useAuth();
  const { habits, loading: habitsLoading } = useHabits();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('week');
  const days = timeFrame === 'week' ? 7 : 30;
  const { correlations, compositeScore, dailyActivityCounts } = useWeeklyCorrelations(days);
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [habitCompletionData, setHabitCompletionData] = useState<{ [habitId: string]: string[] }>({});
  const [focusSessions, setFocusSessions] = useState<{ id: string; duration: number; completed: boolean; startedAt: any }[]>([]);
  const [journalEntries, setJournalEntries] = useState<{ id: string; createdAt: any }[]>([]);
  const [loading, setLoading] = useState(true);

  const getDateRange = (): { start: Date; end: Date } => {
    const end = new Date();
    const start = new Date();
    if (timeFrame === 'week') {
      start.setDate(end.getDate() - 7);
    } else {
      start.setMonth(end.getMonth() - 1);
    }
    return { start, end };
  };

  const getDateRangeLabel = (): string => {
    const { start, end } = getDateRange();
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    return `${fmt(start)} \u2013 ${fmt(end)}`;
  };

  // Load analytics data
  useEffect(() => {
    const loadAnalytics = async () => {
      if (!user || !db) return;
      setLoading(true);
      try {
        const { start, end } = getDateRange();
        const startTimestamp = start.getTime() / 1000;
        const endTimestamp = end.getTime() / 1000;

        // Load habit completions
        const habitData: { [habitId: string]: string[] } = {};

        for (const habit of habits) {
          const completions = await getHabitCompletions(habit.id);
          const filteredCompletions = completions
            .map((c: any) => c.date)
            .filter((date: string) => {
              const dateTimestamp = new Date(date).getTime() / 1000;
              return dateTimestamp >= startTimestamp && dateTimestamp <= endTimestamp;
            });
          habitData[habit.id] = filteredCompletions;
        }
        setHabitCompletionData(habitData);

        // Load focus sessions
        try {
          const focusQuery = query(
            collection(db, 'focusSessions'),
            where('userId', '==', user.uid),
            orderBy('startedAt', 'desc')
          );
          const focusSnapshot = await getDocs(focusQuery);
          const sessions = focusSnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as any))
            .filter((session: any) => {
              const sessionTime = session.startedAt?.seconds || 0;
              return sessionTime >= startTimestamp && sessionTime <= endTimestamp;
            });
          setFocusSessions(sessions);
        } catch {
          setFocusSessions([]);
        }

        // Load journal entries
        try {
          const journalQuery = query(
            collection(db, 'journalEntries'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const journalSnapshot = await getDocs(journalQuery);
          const entries = journalSnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as any))
            .filter((entry: any) => {
              const entryTime = entry.createdAt?.seconds || 0;
              return entryTime >= startTimestamp && entryTime <= endTimestamp;
            });
          setJournalEntries(entries);
        } catch {
          setJournalEntries([]);
        }
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!habitsLoading) {
      loadAnalytics();
    }
  }, [user, timeFrame, habits, habitsLoading]);

  // Fetch AI weekly narrative
  useEffect(() => {
    if (!correlations || !user) return;

    const NARRATIVE_CACHE_KEY = 'vara_weekly_narrative';
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    const fetchNarrative = async () => {
      try {
        const cached = await AsyncStorage.getItem(NARRATIVE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.timestamp && Date.now() - parsed.timestamp < SEVEN_DAYS_MS && parsed.narrative) {
            setAiNarrative(parsed.narrative);
            return;
          }
        }
      } catch {
        // Cache miss
      }

      setNarrativeLoading(true);
      try {
        const correlationData = {
          sleepHabitCorrelation: correlations.sleepHabitCorrelation,
          energyHabitCorrelation: correlations.energyHabitCorrelation,
          journalMoodCorrelation: correlations.journalMoodCorrelation,
          topDriver: correlations.topDriver,
          brightSpot: correlations.brightSpot,
          stressTrend: correlations.stressTrend,
          weekOverWeek: correlations.weekOverWeek,
          dataCompleteness: correlations.dataCompleteness,
        };

        // Format best/worst day names for the narrative
        const formatDayName = (dateStr: string) => {
          const date = new Date(dateStr + 'T12:00:00');
          return date.toLocaleDateString('en-US', { weekday: 'long' });
        };

        const bestDay = {
          day: formatDayName(correlations.bestDay.day),
          factors: correlations.bestDay.factors,
        };
        const hardestDay = {
          day: formatDayName(correlations.hardestDay.day),
          factors: correlations.hardestDay.factors,
        };

        // Top significant correlations for the narrative
        const topCorrelations = [
          correlations.sleepHabitCorrelation.significant && {
            factor: 'sleep-habits',
            direction: 'positive',
            impact: Math.round(Math.abs(
              correlations.sleepHabitCorrelation.highSleepCompletion -
              correlations.sleepHabitCorrelation.lowSleepCompletion
            )),
          },
          correlations.energyHabitCorrelation.significant && {
            factor: 'energy-habits',
            direction: 'positive',
            impact: Math.round(Math.abs(
              correlations.energyHabitCorrelation.highEnergyCompletion -
              correlations.energyHabitCorrelation.lowEnergyCompletion
            )),
          },
          correlations.journalMoodCorrelation.significant && {
            factor: 'journaling-mood',
            direction: 'positive',
            impact: Math.round(Math.abs(
              correlations.journalMoodCorrelation.journalDayMood -
              correlations.journalMoodCorrelation.nonJournalDayMood
            ) * 20),
          },
        ].filter(Boolean);

        const response = await apiPost<{ narrative: string }>('/weekly-narrative', {
          correlationData,
          bestDay,
          hardestDay,
          topCorrelations,
        }, { debug: __DEV__ });

        try {
          await AsyncStorage.setItem(
            NARRATIVE_CACHE_KEY,
            JSON.stringify({ narrative: response.narrative, timestamp: Date.now() })
          );
        } catch {
          // Non-critical
        }

        setAiNarrative(response.narrative);
      } catch {
        const habitPct = correlations.weekOverWeek?.habitChange != null
          ? Math.round(50 + correlations.weekOverWeek.habitChange)
          : null;
        const habitSentence = habitPct != null
          ? `This week you completed about ${habitPct}% of your habits.`
          : 'This week you stayed consistent with your habits.';
        const brightSpotSentence = correlations.brightSpot?.insight ?? '';
        const stressSentence = correlations.stressTrend === 'declining'
          ? ' Your stress levels have been trending down.'
          : '';
        setAiNarrative(
          `${habitSentence}${brightSpotSentence ? ' ' + brightSpotSentence : ''}${stressSentence}`
        );
      } finally {
        setNarrativeLoading(false);
      }
    };

    fetchNarrative();
  }, [correlations, user]);

  // Compute metrics for At a Glance
  const metrics = useMemo(() => {
    const activeDays = new Set(Object.values(habitCompletionData).flat()).size;
    const protocolsCompleted = focusSessions.filter((s) => s.completed).length;
    const reflections = journalEntries.length;
    return { activeDays, protocolsCompleted, reflections };
  }, [habitCompletionData, focusSessions, journalEntries]);

  const heroProps = useMemo(() => {
    if (!correlations) {
      return { readinessScore: 0, trend: 'steady' as const, deltaPercentage: 0, checkInsCount: 0 };
    }
    const delta = correlations.weekOverWeek.scoreChange;
    let trend: 'up' | 'steady' | 'down' = 'steady';
    if (delta > 2) trend = 'up';
    else if (delta < -2) trend = 'down';

    // Count check-ins: days with at least one activity
    const checkInsCount = Object.values(habitCompletionData).flat().length > 0
      ? new Set(Object.values(habitCompletionData).flat()).size
      : 0;

    return {
      readinessScore: compositeScore,
      trend,
      deltaPercentage: delta,
      checkInsCount,
    };
  }, [correlations, compositeScore, habitCompletionData]);

  const barChartProps = useMemo(() => {
    if (timeFrame === 'week') {
      return { data: dailyActivityCounts, labels: undefined, title: undefined };
    }
    // Month view: aggregate into weeks
    const weeks: number[] = [];
    const labels: string[] = [];
    for (let i = 0; i < dailyActivityCounts.length; i += 7) {
      const weekSlice = dailyActivityCounts.slice(i, i + 7);
      weeks.push(weekSlice.reduce((a, b) => a + b, 0));
      labels.push(`W${weeks.length}`);
    }
    return { data: weeks, labels, title: 'Weekly activity' };
  }, [dailyActivityCounts, timeFrame]);

  // Heatmap data
  const heatmapData = useMemo(() => {
    const dailyCompletions: { [date: string]: number } = {};
    Object.values(habitCompletionData).forEach((dates) => {
      dates.forEach((date) => {
        dailyCompletions[date] = (dailyCompletions[date] || 0) + 1;
      });
    });
    return Object.entries(dailyCompletions).map(([date, count]) => ({ date, count }));
  }, [habitCompletionData]);

  const hasInsufficientData = useMemo(() => {
    const totalCompletions = Object.values(habitCompletionData).reduce(
      (sum, dates) => sum + dates.length, 0
    );
    return totalCompletions < 3 && journalEntries.length < 2;
  }, [habitCompletionData, journalEntries]);

  const isEmpty = useMemo(() => {
    const totalCompletions = Object.values(habitCompletionData).reduce(
      (sum, dates) => sum + dates.length, 0
    );
    return habits.length === 0 && journalEntries.length === 0 && totalCompletions === 0;
  }, [habits, habitCompletionData, journalEntries]);

  if (loading || habitsLoading) {
    return <LoadingSpinner message="Loading insights..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Your week</Text>
          <Text style={styles.subtitle}>{getDateRangeLabel()}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Timeframe Selector */}
        <View style={styles.filterSection}>
          <View style={styles.chipContainer}>
            {(['week', 'month'] as TimeFrame[]).map((tf) => (
              <TouchableOpacity
                key={tf}
                onPress={() => setTimeFrame(tf)}
                style={[styles.chip, timeFrame === tf && styles.chipSelected]}
              >
                <Text style={timeFrame === tf ? styles.chipTextSelected : styles.chipText}>
                  {tf === 'week' ? 'Week' : 'Month'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {isEmpty ? (
          <View style={styles.emptyState}>
            <Icon name="chart-line" size={56} color={VARA_COLORS.sageGray} />
            <Text style={styles.emptyStateTitle}>No insights yet</Text>
            <Text style={styles.emptyStateBody}>
              Start tracking habits and journaling to see your insights here.
            </Text>
          </View>
        ) : (
          <>
            {/* Widget 1: Hero — Wellness Score */}
            <HeroSummaryCard
              readinessScore={heroProps.readinessScore}
              checkInsCount={heroProps.checkInsCount}
              trend={heroProps.trend}
              timeframeLabel={timeFrame === 'week' ? 'This week' : 'This month'}
              deltaPercentage={heroProps.deltaPercentage}
              periodLabel={timeFrame === 'week' ? 'week' : 'month'}
            />

            {/* Widget 2: AI Narrative */}
            <NarrativeRecap
              narrative={aiNarrative}
              loading={narrativeLoading}
              timeframeLabel={timeFrame === 'week' ? 'This Week' : 'This Month'}
              hasInsufficientData={hasInsufficientData}
            />

            {/* Widget 3: Correlation Insight (only if significant) */}
            {correlations && !hasInsufficientData && (
              <CorrelationInsightCard correlations={correlations} />
            )}

            {/* Widget 4: Daily Activity Bar Chart */}
            {!hasInsufficientData && dailyActivityCounts.length > 0 && (
              <WeeklyBarChart
                data={barChartProps.data}
                labels={barChartProps.labels}
                title={barChartProps.title}
              />
            )}

            {/* Widget 5: 30-day Habit Heatmap */}
            <HabitHeatmap
              data={heatmapData}
              totalHabits={habits.length}
              daysToShow={30}
            />

            {/* Widget 6: At a Glance */}
            <AtAGlanceCard
              metrics={[
                {
                  label: 'Days active',
                  value: metrics.activeDays,
                  data: [],
                  color: VARA_COLORS.teal,
                },
                {
                  label: 'Protocols completed',
                  value: metrics.protocolsCompleted,
                  data: [],
                  color: VARA_COLORS.tealMid,
                },
                {
                  label: 'Reflections',
                  value: metrics.reflections,
                  data: [],
                  color: VARA_COLORS.apricot,
                },
              ]}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VARA_COLORS.mistWhite,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: Typography.fontWeight.bold,
    color: VARA_COLORS.teal,
  },
  subtitle: {
    fontSize: 14,
    color: VARA_COLORS.sageGray,
    marginTop: Spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  filterSection: {
    marginBottom: Spacing.base,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(27,94,87,0.12)',
  },
  chipSelected: {
    backgroundColor: VARA_COLORS.teal,
  },
  chipText: {
    fontSize: 14,
    color: VARA_COLORS.charcoal,
  },
  chipTextSelected: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.lg,
  },
  emptyStateTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: VARA_COLORS.charcoal,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  emptyStateBody: {
    fontSize: Typography.fontSize.base,
    color: VARA_COLORS.sageGray,
    textAlign: 'center',
    lineHeight: 22,
  },
});

export default InsightsScreen;
