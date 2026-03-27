/**
 * Insights Screen
 * Analytics and reporting for wellness journey
 * Enhanced with visual charts and consolidated metrics
 */

import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LoadingSpinner,
  HeroSummaryCard,
  SparklineTrendCardRow,
  RingProgressCard,
  HabitHeatmap,
  WeeklyBarChart,
  NarrativeRecap,
  EmptyStateCard,
  ConsolidatedMetricsCard,
} from '../components';
import { Colors, Spacing, Typography } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useGoals, useHabits, useTasks } from '../hooks';
import { useWeeklyCorrelations } from '../hooks/useWeeklyCorrelations';
import { apiPost } from '../services/api/client';
import { getHabitCompletions } from '../services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

// Vara brand colors
const VARA_COLORS = {
  teal: '#1B5E57',
  tealMid: '#227A71',
  apricot: '#F5B971',
  mistWhite: '#FAFAF6',
  charcoal: '#3E3E3E',
  sageGray: '#6F7F77',
};

interface FocusSession {
  id: string;
  userId: string;
  duration: number;
  type: string;
  completed: boolean;
  startedAt: any;
  endedAt: any;
  interrupted: boolean;
}

interface JournalEntry {
  id: string;
  userId: string;
  createdAt: any;
}

interface CommunityActivity {
  posts: number;
  comments: number;
  connections: number;
}

interface BrainMetrics {
  readinessScores: number[];
  avgReadinessScore: number;
  neuroplasticityCount: number;
  amccCompletions: number;
  nervousSystemToolUses: number;
  focusWindowUtilization: number;
}

type TimeFrame = 'week' | 'month' | 'quarter' | 'year' | 'all';

const InsightsScreen: React.FC<{ hideHeader?: boolean }> = ({ hideHeader = false }) => {
  const { user } = useAuth();
  const { goals, loading: goalsLoading } = useGoals();
  const { habits, loading: habitsLoading } = useHabits();
  const { tasks: allTasks, loading: tasksLoading } = useTasks();

  const { correlations } = useWeeklyCorrelations();
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);

  const [timeFrame, setTimeFrame] = useState<TimeFrame>('week');
  const [habitCompletionData, setHabitCompletionData] = useState<{ [habitId: string]: string[] }>({});
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [communityActivity, setCommunityActivity] = useState<CommunityActivity>({
    posts: 0,
    comments: 0,
    connections: 0,
  });
  const [brainMetrics, setBrainMetrics] = useState<BrainMetrics>({
    readinessScores: [],
    avgReadinessScore: 0,
    neuroplasticityCount: 0,
    amccCompletions: 0,
    nervousSystemToolUses: 0,
    focusWindowUtilization: 0,
  });
  const [loading, setLoading] = useState(true);

  // Daily activity data for charts
  const [dailyHabitCompletions, setDailyHabitCompletions] = useState<{ date: string; count: number }[]>([]);
  const [dailyCheckIns, setDailyCheckIns] = useState<number[]>([]);
  // const [dailyStreaks, setDailyStreaks] = useState<number[]>([]);
  const [weeklyActivity, setWeeklyActivity] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  // Calculate date range based on timeframe
  const getDateRange = (): { start: Date; end: Date } => {
    const end = new Date();
    const start = new Date();

    switch (timeFrame) {
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(end.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        break;
      case 'all':
        start.setFullYear(2020, 0, 1);
        break;
    }

    return { start, end };
  };

  const getDaysInRange = (): number => {
    const { start, end } = getDateRange();
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  // const calculateStreak = (completions: string[]): number => { ... }; // removed: streak language replaced with active days
  // const calculateDailyStreaks = (completionDates: string[]): number[] => { ... }; // removed: streak language replaced with active days

  // Load all analytics data
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
        const allCompletionDates: string[] = [];
        const dailyCompletions: { [date: string]: number } = {};

        for (const habit of habits) {
          const completions = await getHabitCompletions(habit.id);
          const filteredCompletions = completions
            .map((c) => c.date)
            .filter((date) => {
              const dateTimestamp = new Date(date).getTime() / 1000;
              return dateTimestamp >= startTimestamp && dateTimestamp <= endTimestamp;
            });
          habitData[habit.id] = filteredCompletions;
          allCompletionDates.push(...filteredCompletions);

          // Count daily completions
          filteredCompletions.forEach((date) => {
            dailyCompletions[date] = (dailyCompletions[date] || 0) + 1;
          });
        }
        setHabitCompletionData(habitData);

        // Calculate daily habit completion counts for heatmap
        const heatmapData = Object.entries(dailyCompletions).map(([date, count]) => ({
          date,
          count,
        }));
        setDailyHabitCompletions(heatmapData);

        // Calculate daily check-ins for sparkline (last 7 days)
        const checkInsPerDay: number[] = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          checkInsPerDay.push(dailyCompletions[dateStr] || 0);
        }
        setDailyCheckIns(checkInsPerDay);

        // Load focus sessions
        try {
          const focusQuery = query(
            collection(db, 'focusSessions'),
            where('userId', '==', user.uid),
            orderBy('startedAt', 'desc')
          );
          const focusSnapshot = await getDocs(focusQuery);
          const sessions = focusSnapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() } as FocusSession))
            .filter((session) => {
              const sessionTime = session.startedAt?.seconds || 0;
              return sessionTime >= startTimestamp && sessionTime <= endTimestamp;
            });
          setFocusSessions(sessions);
        } catch (error) {
          console.log('Focus sessions not available:', error);
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
            .map((doc) => ({ id: doc.id, ...doc.data() } as JournalEntry))
            .filter((entry) => {
              const entryTime = entry.createdAt?.seconds || 0;
              return entryTime >= startTimestamp && entryTime <= endTimestamp;
            });
          setJournalEntries(entries);
        } catch (error) {
          console.log('Journal entries not available:', error);
          setJournalEntries([]);
        }

        // Load community activity
        try {
          const [postsSnapshot, commentsSnapshot, connectionsSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'posts'), where('userId', '==', user.uid))).catch(() => ({ docs: [] })),
            getDocs(query(collection(db, 'comments'), where('userId', '==', user.uid))).catch(() => ({ docs: [] })),
            getDocs(query(collection(db, 'connections'), where('a', '==', user.uid))).catch(() => ({ size: 0 })),
          ]);

          const postsInRange = (postsSnapshot.docs || []).filter((doc) => {
            const postTime = doc.data()?.createdAt?.seconds || 0;
            return postTime >= startTimestamp && postTime <= endTimestamp;
          });

          const commentsInRange = (commentsSnapshot.docs || []).filter((doc) => {
            const commentTime = doc.data()?.createdAt?.seconds || 0;
            return commentTime >= startTimestamp && commentTime <= endTimestamp;
          });

          setCommunityActivity({
            posts: postsInRange.length,
            comments: commentsInRange.length,
            connections: connectionsSnapshot.size || 0,
          });
        } catch (error) {
          console.log('Community activity not available:', error);
          setCommunityActivity({ posts: 0, comments: 0, connections: 0 });
        }

        // Load brain health metrics
        try {
          const [brainMetricsSnapshot, neuroplasticitySnapshot, amccSnapshot, nervousSystemSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'brainMetrics'), where('userId', '==', user.uid))).catch(() => ({ docs: [] })),
            getDocs(query(collection(db, 'neuroplasticitySignals'), where('userId', '==', user.uid))).catch(() => ({ docs: [] })),
            getDocs(query(collection(db, 'amccChallenges'), where('userId', '==', user.uid))).catch(() => ({ docs: [] })),
            getDocs(query(collection(db, 'nervousSystemSessions'), where('userId', '==', user.uid))).catch(() => ({ docs: [] })),
          ]);

          const brainMetricsInRange = (brainMetricsSnapshot.docs || []).filter((doc) => {
            const metricTime = doc.data()?.createdAt?.seconds || 0;
            return metricTime >= startTimestamp && metricTime <= endTimestamp;
          });

          const readinessScores = brainMetricsInRange
            .map((doc) => doc.data().readinessScore || 0)
            .filter((score) => score > 0);

          const avgReadinessScore =
            readinessScores.length > 0
              ? readinessScores.reduce((sum, score) => sum + score, 0) / readinessScores.length
              : 0;

          const neuroplasticityInRange = (neuroplasticitySnapshot.docs || []).filter((doc) => {
            const signalDate = doc.data()?.date;
            if (!signalDate) return false;
            const signalTime = new Date(signalDate).getTime() / 1000;
            return signalTime >= startTimestamp && signalTime <= endTimestamp;
          });

          const amccInRange = (amccSnapshot.docs || []).filter((doc) => {
            const challengeDate = doc.data()?.date;
            const completed = doc.data()?.completed;
            if (!challengeDate || !completed) return false;
            const challengeTime = new Date(challengeDate).getTime() / 1000;
            return challengeTime >= startTimestamp && challengeTime <= endTimestamp;
          });

          const nervousSystemInRange = (nervousSystemSnapshot.docs || []).filter((doc) => {
            const sessionTime = doc.data()?.completedAt?.seconds || 0;
            return sessionTime >= startTimestamp && sessionTime <= endTimestamp;
          });

          setBrainMetrics({
            readinessScores,
            avgReadinessScore: Math.round(avgReadinessScore),
            neuroplasticityCount: neuroplasticityInRange.length,
            amccCompletions: amccInRange.length,
            nervousSystemToolUses: nervousSystemInRange.length,
            focusWindowUtilization: 0,
          });
        } catch (error) {
          console.log('Brain health metrics not available:', error);
          setBrainMetrics({
            readinessScores: [],
            avgReadinessScore: 0,
            neuroplasticityCount: 0,
            amccCompletions: 0,
            nervousSystemToolUses: 0,
            focusWindowUtilization: 0,
          });
        }

        // Calculate weekly activity data
        const weeklyData: number[] = [0, 0, 0, 0, 0, 0, 0];
        const todayDayOfWeek = new Date().getDay();

        // Count activities per day of week
        Object.entries(dailyCompletions).forEach(([date, count]) => {
          const dayOfWeek = new Date(date).getDay();
          // Convert Sunday=0 to Monday=0 format
          const mondayBasedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          weeklyData[mondayBasedDay] += count;
        });

        setWeeklyActivity(weeklyData);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!goalsLoading && !habitsLoading && !tasksLoading) {
      loadAnalytics();
    }
  }, [user, timeFrame, habits, goalsLoading, habitsLoading, tasksLoading]);

  // Fetch AI weekly narrative when correlations are available
  useEffect(() => {
    if (!correlations || !user) return;

    const NARRATIVE_CACHE_KEY = 'vara_weekly_narrative';
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    const fetchNarrative = async () => {
      // Check cache first
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
        // Cache miss — proceed to fetch
      }

      setNarrativeLoading(true);
      try {
        // Anonymize correlation data before sending
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

        const response = await apiPost<{ narrative: string }>('/weekly-narrative', {
          correlationData,
        }, { debug: __DEV__ });

        const narrative = response.narrative;

        // Cache the result
        try {
          await AsyncStorage.setItem(
            NARRATIVE_CACHE_KEY,
            JSON.stringify({ narrative, timestamp: Date.now() })
          );
        } catch {
          // Non-critical cache write failure
        }

        setAiNarrative(narrative);
      } catch (err) {
        // Fallback template string
        const habitPct = correlations.weekOverWeek?.habitChange != null
          ? Math.round(50 + correlations.weekOverWeek.habitChange)
          : null;
        const habitSentence = habitPct != null
          ? `This week you completed about ${habitPct}% of your habits.`
          : 'This week you stayed consistent with your habits.';
        const brightSpotSentence = correlations.brightSpot?.insight ?? '';
        const stressSentence = correlations.stressTrend === 'declining'
          ? ' Your stress levels have been trending down — keep it up.'
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

  // Calculate metrics based on timeframe
  const metrics = useMemo(() => {
    const { start, end } = getDateRange();
    const startTimestamp = start.getTime() / 1000;
    const endTimestamp = end.getTime() / 1000;

    // Goals metrics
    const completedGoals = goals.filter((g) => {
      if (g.status !== 'completed') return false;
      if (g.completedAt?.seconds) {
        return g.completedAt.seconds >= startTimestamp && g.completedAt.seconds <= endTimestamp;
      }
      return false;
    });
    const activeGoals = goals.filter((g) => g.status === 'active');
    const avgGoalProgress =
      goals.length > 0 ? goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length : 0;

    // Habits metrics
    const totalHabitCompletions = Object.values(habitCompletionData).reduce(
      (sum, dates) => sum + dates.length,
      0
    );
    const habitCompletionRate =
      habits.length > 0 && habitCompletionData
        ? (totalHabitCompletions / (habits.length * getDaysInRange())) * 100
        : 0;
    const activeDays = new Set(
      Object.values(habitCompletionData).flat()
    ).size;

    // Tasks metrics
    const completedTasks = allTasks.filter((t) => {
      if (!t.completed) return false;
      if (t.completedAt?.seconds) {
        return t.completedAt.seconds >= startTimestamp && t.completedAt.seconds <= endTimestamp;
      }
      return false;
    });
    const taskCompletionRate = allTasks.length > 0 ? (completedTasks.length / allTasks.length) * 100 : 0;

    // Focus metrics
    const totalFocusMinutes = focusSessions.filter((s) => s.completed).reduce((sum, s) => sum + s.duration, 0);
    const avgFocusSessionLength = focusSessions.length > 0 ? totalFocusMinutes / focusSessions.length : 0;

    return {
      goals: {
        completed: completedGoals.length,
        active: activeGoals.length,
        total: goals.length,
        avgProgress: avgGoalProgress,
      },
      habits: {
        completions: totalHabitCompletions,
        completionRate: habitCompletionRate,
        activeDays,
        total: habits.length,
      },
      tasks: {
        completed: completedTasks.length,
        total: allTasks.length,
        completionRate: taskCompletionRate,
      },
      focus: {
        sessions: focusSessions.length,
        totalMinutes: totalFocusMinutes,
        avgSessionLength: avgFocusSessionLength,
      },
      journal: {
        entries: journalEntries.length,
      },
      community: communityActivity,
    };
  }, [goals, habits, allTasks, habitCompletionData, focusSessions, journalEntries, communityActivity, timeFrame]);

  const getTimeFrameLabel = (): string => {
    switch (timeFrame) {
      case 'week':
        return 'This Week';
      case 'month':
        return 'This Month';
      case 'quarter':
        return 'This Quarter';
      case 'year':
        return 'This Year';
      case 'all':
        return 'All Time';
    }
  };

  // Determine trends
  const getReadinessTrend = (): 'up' | 'steady' | 'down' => {
    if (brainMetrics.readinessScores.length < 2) return 'steady';
    const recent = brainMetrics.readinessScores.slice(-3);
    const older = brainMetrics.readinessScores.slice(0, -3);
    if (older.length === 0) return 'steady';

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    if (recentAvg > olderAvg + 5) return 'up';
    if (recentAvg < olderAvg - 5) return 'down';
    return 'steady';
  };

  // getStreakTrend removed: streak language replaced with active days

  const getCheckInsTrend = (): 'up' | 'steady' | 'down' => {
    if (dailyCheckIns.length < 2) return 'steady';
    const recent = dailyCheckIns.slice(-3);
    const older = dailyCheckIns.slice(0, -3);
    if (older.length === 0) return 'steady';

    const recentSum = recent.reduce((a, b) => a + b, 0);
    const olderSum = older.reduce((a, b) => a + b, 0);

    if (recentSum > olderSum) return 'up';
    if (recentSum < olderSum) return 'down';
    return 'steady';
  };

  if (loading || goalsLoading || habitsLoading || tasksLoading) {
    return <LoadingSpinner message="Loading insights..." />;
  }

  // Check if sections have data
  const hasFocusData = metrics.focus.sessions > 0 || metrics.focus.totalMinutes > 0;
  const hasBrainData =
    brainMetrics.avgReadinessScore > 0 ||
    brainMetrics.neuroplasticityCount > 0 ||
    brainMetrics.nervousSystemToolUses > 0;
  const hasJournalOrCommunityData =
    metrics.journal.entries > 0 || metrics.community.posts > 0 || metrics.community.connections > 0;

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.screenTitle}>
            Insights
          </Text>
          <Text style={styles.subtitle}>
            Track your wellness progress
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Timeframe Selector */}
        <View style={styles.filterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipContainer}>
              {(['week', 'month', 'quarter', 'year', 'all'] as TimeFrame[]).map((tf) => (
                <TouchableOpacity
                  key={tf}
                  onPress={() => setTimeFrame(tf)}
                  style={[styles.chip, timeFrame === tf && styles.chipSelected]}
                >
                  <Text style={timeFrame === tf ? styles.chipTextSelected : styles.chipText}>
                    {tf === 'week' ? '7 Days' : tf === 'month' ? '30 Days' : tf === 'quarter' ? '90 Days' : tf === 'year' ? 'Year' : 'All Time'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Enhancement 1: Hero Summary Card */}
        <HeroSummaryCard
          readinessScore={brainMetrics.avgReadinessScore || 0}
          checkInsCount={brainMetrics.readinessScores.length}
          trend={getReadinessTrend()}
          timeframeLabel={getTimeFrameLabel()}
        />

        {/* Enhancement 2: Sparkline Trend Cards */}
        {(() => {
          const activeDaysCount = dailyCheckIns.filter(v => v > 0).length;
          return (
            <SparklineTrendCardRow
              cards={[
                {
                  label: 'Days engaged',
                  value: `${metrics.habits.completions}`,
                  data: dailyCheckIns,
                  color: VARA_COLORS.apricot,
                  trend: getCheckInsTrend(),
                  dataPointCount: activeDaysCount,
                },
                {
                  label: 'Check-ins',
                  value: metrics.habits.completions.toString(),
                  data: dailyCheckIns,
                  color: VARA_COLORS.teal,
                  trend: getCheckInsTrend(),
                  dataPointCount: activeDaysCount,
                },
              ]}
            />
          );
        })()}

        {/* Enhancement 3: Ring Progress for Goal Metrics */}
        <RingProgressCard
          goals={{ percentage: metrics.goals.avgProgress }}
          habits={{ percentage: metrics.habits.completionRate }}
          tasks={{ percentage: metrics.tasks.completionRate }}
          totalCheckIns={metrics.habits.completions}
        />

        {/* Enhancement 4: Habit Activity Heatmap */}
        <HabitHeatmap data={dailyHabitCompletions} daysToShow={30} />

        {/* Enhancement 5: Weekly Bar Chart */}
        <WeeklyBarChart data={weeklyActivity} />

        {/* Enhancement 6: Consolidated Brain Health */}
        {hasBrainData ? (
          <ConsolidatedMetricsCard
            icon="brain"
            title="Brain Health"
            metrics={[
              {
                label: 'Avg Readiness',
                value: brainMetrics.avgReadinessScore || '--',
                trend: getReadinessTrend(),
              },
              {
                label: 'Growth Signals',
                value: brainMetrics.neuroplasticityCount,
              },
              {
                label: 'Regulation Tools',
                value: brainMetrics.nervousSystemToolUses,
              },
              {
                label: 'Check-ins',
                value: brainMetrics.readinessScores.length,
              },
            ]}
            columns={2}
          />
        ) : (
          <EmptyStateCard message="No brain health data yet" actionText="Try a check-in" />
        )}

        {/* Enhancement 6: Consolidated Journal & Community */}
        {hasJournalOrCommunityData ? (
          <ConsolidatedMetricsCard
            icon="book-open-page-variant"
            title="Journal & Community"
            metrics={[
              { label: 'Entries', value: metrics.journal.entries },
              { label: 'Posts', value: metrics.community.posts },
              { label: 'Connections', value: metrics.community.connections },
            ]}
            columns={3}
          />
        ) : (
          <EmptyStateCard message="No journal or community activity yet" actionText="Start journaling" />
        )}

        {/* Focus Sessions - Empty state if no data */}
        {!hasFocusData && (
          <EmptyStateCard message="No focus sessions yet" actionText="Try starting one" />
        )}

        {/* Enhancement 7: AI-Driven Narrative Recap */}
        <NarrativeRecap
          narrative={aiNarrative}
          loading={narrativeLoading}
          timeframeLabel={getTimeFrameLabel()}
        />
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
    color: VARA_COLORS.teal,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
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
    paddingHorizontal: 12,
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
    color: VARA_COLORS.charcoal,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
});

export default InsightsScreen;
