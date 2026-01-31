/**
 * Insights Screen
 * Analytics and reporting for wellness journey
 */

import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { Text, SegmentedButtons, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, LoadingSpinner, StatCard } from '../components';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useGoals, useHabits, useTasks } from '../hooks';
import { getHabitCompletions } from '../services/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';

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
type Category = 'all' | 'brain' | 'goals' | 'habits' | 'tasks' | 'focus' | 'journal' | 'community';

const InsightsScreen: React.FC<{ hideHeader?: boolean }> = ({ hideHeader = false }) => {
  const { user } = useAuth();
  const { goals, loading: goalsLoading } = useGoals();
  const { habits, loading: habitsLoading } = useHabits();
  const { tasks: allTasks, loading: tasksLoading } = useTasks();

  const [timeFrame, setTimeFrame] = useState<TimeFrame>('month');
  const [category, setCategory] = useState<Category>('all');
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
        start.setFullYear(2020, 0, 1); // Far back date
        break;
    }

    return { start, end };
  };

  const getDaysInRange = (): number => {
    const { start, end } = getDateRange();
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const calculateStreak = (completions: string[]): number => {
    if (completions.length === 0) return 0;

    const sorted = completions.sort().reverse();
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

    let streak = 0;
    let expectedDate = new Date(sorted[0]);

    for (const date of sorted) {
      if (date === expectedDate.toISOString().split('T')[0]) {
        streak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  // Load all analytics data
  useEffect(() => {
    const loadAnalytics = async () => {
      if (!user) return;

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
            .map(c => c.date)
            .filter(date => {
              const dateTimestamp = new Date(date).getTime() / 1000;
              return dateTimestamp >= startTimestamp && dateTimestamp <= endTimestamp;
            });
          habitData[habit.id] = filteredCompletions;
        }
        setHabitCompletionData(habitData);

        // Load focus sessions (with error handling)
        try {
          const focusQuery = query(
            collection(db, 'focusSessions'),
            where('userId', '==', user.uid),
            orderBy('startedAt', 'desc')
          );
          const focusSnapshot = await getDocs(focusQuery);
          const sessions = focusSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as FocusSession))
            .filter(session => {
              const sessionTime = session.startedAt?.seconds || 0;
              return sessionTime >= startTimestamp && sessionTime <= endTimestamp;
            });
          setFocusSessions(sessions);
        } catch (error) {
          console.log('Focus sessions not available:', error);
          setFocusSessions([]);
        }

        // Load journal entries (with error handling)
        try {
          const journalQuery = query(
            collection(db, 'journalEntries'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc')
          );
          const journalSnapshot = await getDocs(journalQuery);
          const entries = journalSnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as JournalEntry))
            .filter(entry => {
              const entryTime = entry.createdAt?.seconds || 0;
              return entryTime >= startTimestamp && entryTime <= endTimestamp;
            });
          setJournalEntries(entries);
        } catch (error) {
          console.log('Journal entries not available:', error);
          setJournalEntries([]);
        }

        // Load community activity (with error handling)
        try {
          const [postsSnapshot, commentsSnapshot, connectionsSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'posts'), where('userId', '==', user.uid))).catch(() => ({ docs: [] })),
            getDocs(query(collection(db, 'comments'), where('userId', '==', user.uid))).catch(() => ({ docs: [] })),
            getDocs(query(collection(db, 'connections'), where('a', '==', user.uid))).catch(() => ({ size: 0 })),
          ]);

          const postsInRange = (postsSnapshot.docs || []).filter(doc => {
            const postTime = doc.data()?.createdAt?.seconds || 0;
            return postTime >= startTimestamp && postTime <= endTimestamp;
          });

          const commentsInRange = (commentsSnapshot.docs || []).filter(doc => {
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

        // Load brain health metrics (with error handling)
        try {
          const [brainMetricsSnapshot, neuroplasticitySnapshot, amccSnapshot, nervousSystemSnapshot] = await Promise.all([
            getDocs(query(collection(db, 'brainMetrics'), where('userId', '==', user.uid))).catch(() => ({ docs: [] })),
            getDocs(query(collection(db, 'neuroplasticitySignals'), where('userId', '==', user.uid))).catch(() => ({ docs: [] })),
            getDocs(query(collection(db, 'amccChallenges'), where('userId', '==', user.uid))).catch(() => ({ docs: [] })),
            getDocs(query(collection(db, 'nervousSystemSessions'), where('userId', '==', user.uid))).catch(() => ({ docs: [] })),
          ]);

          const brainMetricsInRange = (brainMetricsSnapshot.docs || []).filter(doc => {
            const metricTime = doc.data()?.createdAt?.seconds || 0;
            return metricTime >= startTimestamp && metricTime <= endTimestamp;
          });

          const readinessScores = brainMetricsInRange
            .map(doc => doc.data().readinessScore || 0)
            .filter(score => score > 0);

          const avgReadinessScore = readinessScores.length > 0
            ? readinessScores.reduce((sum, score) => sum + score, 0) / readinessScores.length
            : 0;

          const neuroplasticityInRange = (neuroplasticitySnapshot.docs || []).filter(doc => {
            const signalDate = doc.data()?.date;
            if (!signalDate) return false;
            const signalTime = new Date(signalDate).getTime() / 1000;
            return signalTime >= startTimestamp && signalTime <= endTimestamp;
          });

          const amccInRange = (amccSnapshot.docs || []).filter(doc => {
            const challengeDate = doc.data()?.date;
            const completed = doc.data()?.completed;
            if (!challengeDate || !completed) return false;
            const challengeTime = new Date(challengeDate).getTime() / 1000;
            return challengeTime >= startTimestamp && challengeTime <= endTimestamp;
          });

          const nervousSystemInRange = (nervousSystemSnapshot.docs || []).filter(doc => {
            const sessionTime = doc.data()?.completedAt?.seconds || 0;
            return sessionTime >= startTimestamp && sessionTime <= endTimestamp;
          });

          setBrainMetrics({
            readinessScores,
            avgReadinessScore: Math.round(avgReadinessScore),
            neuroplasticityCount: neuroplasticityInRange.length,
            amccCompletions: amccInRange.length,
            nervousSystemToolUses: nervousSystemInRange.length,
            focusWindowUtilization: 0, // TODO: Calculate based on focus session timing
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

  // Calculate metrics based on category and timeframe
  const metrics = useMemo(() => {
    const { start, end } = getDateRange();
    const startTimestamp = start.getTime() / 1000;
    const endTimestamp = end.getTime() / 1000;

    // Goals metrics
    const completedGoals = goals.filter(g => {
      if (g.status !== 'completed') return false;
      if (g.completedAt?.seconds) {
        return g.completedAt.seconds >= startTimestamp && g.completedAt.seconds <= endTimestamp;
      }
      return false;
    });
    const activeGoals = goals.filter(g => g.status === 'active');
    const avgGoalProgress = goals.length > 0
      ? goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length
      : 0;

    // Habits metrics
    const totalHabitCompletions = Object.values(habitCompletionData).reduce(
      (sum, dates) => sum + dates.length,
      0
    );
    const habitCompletionRate = habits.length > 0 && habitCompletionData
      ? (totalHabitCompletions / (habits.length * getDaysInRange())) * 100
      : 0;
    const currentStreaks = habits.map(h => calculateStreak(habitCompletionData[h.id] || []));
    const longestStreak = currentStreaks.length > 0 ? Math.max(...currentStreaks) : 0;

    // Tasks metrics
    const completedTasks = allTasks.filter(t => {
      if (!t.completed) return false;
      if (t.completedAt?.seconds) {
        return t.completedAt.seconds >= startTimestamp && t.completedAt.seconds <= endTimestamp;
      }
      return false;
    });
    const taskCompletionRate = allTasks.length > 0
      ? (completedTasks.length / allTasks.length) * 100
      : 0;

    // Focus metrics
    const totalFocusMinutes = focusSessions
      .filter(s => s.completed)
      .reduce((sum, s) => sum + s.duration, 0);
    const avgFocusSessionLength = focusSessions.length > 0
      ? totalFocusMinutes / focusSessions.length
      : 0;

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
        longestStreak,
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
      case 'week': return 'Past 7 Days';
      case 'month': return 'Past 30 Days';
      case 'quarter': return 'Past 90 Days';
      case 'year': return 'Past Year';
      case 'all': return 'All Time';
    }
  };

  if (loading || goalsLoading || habitsLoading || tasksLoading) {
    return <LoadingSpinner message="Loading insights..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.screenTitle}>
            Insights
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Track your wellness progress
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Timeframe Selector */}
        <View style={styles.filterSection}>
          <Text variant="titleSmall" style={styles.filterLabel}>
            Timeframe
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipContainer}>
              {(['week', 'month', 'quarter', 'year', 'all'] as TimeFrame[]).map((tf) => (
                <Chip
                  key={tf}
                  selected={timeFrame === tf}
                  onPress={() => setTimeFrame(tf)}
                  style={[
                    styles.chip,
                    timeFrame === tf && styles.chipSelected,
                  ]}
                  textStyle={timeFrame === tf ? styles.chipTextSelected : styles.chipText}
                >
                  {tf === 'week' && '7 Days'}
                  {tf === 'month' && '30 Days'}
                  {tf === 'quarter' && '90 Days'}
                  {tf === 'year' && 'Year'}
                  {tf === 'all' && 'All Time'}
                </Chip>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Category Filter */}
        <View style={styles.filterSection}>
          <Text variant="titleSmall" style={styles.filterLabel}>
            Category
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chipContainer}>
              {(['all', 'brain', 'goals', 'habits', 'tasks', 'focus', 'journal', 'community'] as Category[]).map((cat) => (
                <Chip
                  key={cat}
                  selected={category === cat}
                  onPress={() => setCategory(cat)}
                  style={[
                    styles.chip,
                    category === cat && styles.chipSelected,
                  ]}
                  textStyle={category === cat ? styles.chipTextSelected : styles.chipText}
                >
                  {cat === 'brain' ? 'Brain Health' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </Chip>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Overview Stats */}
        {(category === 'all' || category === 'brain') && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Icon name="brain" size={24} color={Colors.evergreenTeal} />
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Brain Health ({getTimeFrameLabel()})
              </Text>
            </View>
            <View style={styles.statsGrid}>
              <StatCard
                value={brainMetrics.avgReadinessScore > 0 ? brainMetrics.avgReadinessScore : '--'}
                label="Avg Readiness"
                icon="gauge"
                color={
                  brainMetrics.avgReadinessScore >= 75
                    ? Colors.evergreenTeal
                    : brainMetrics.avgReadinessScore >= 50
                    ? Colors.sunriseAmber
                    : Colors.error
                }
              />
              <StatCard
                value={brainMetrics.neuroplasticityCount}
                label="Growth Signals"
                icon="trending-up"
                color={Colors.evergreenTeal}
              />
              <StatCard
                value={brainMetrics.amccCompletions}
                label="Challenges"
                icon="fire"
                color={Colors.sunriseAmber}
              />
            </View>
            <View style={styles.statsGrid}>
              <StatCard
                value={brainMetrics.nervousSystemToolUses}
                label="Regulation Tools"
                icon="meditation"
              />
              <StatCard
                value={brainMetrics.readinessScores.length}
                label="Check-ins"
                icon="checkbox-marked-circle"
              />
            </View>
          </Card>
        )}

        {(category === 'all' || category === 'goals') && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Icon name="target" size={24} color={Colors.evergreenTeal} />
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Goals ({getTimeFrameLabel()})
              </Text>
            </View>
            <View style={styles.statsGrid}>
              <StatCard
                value={metrics.goals.completed}
                label="Completed"
                icon="check-circle"
                color={Colors.success}
              />
              <StatCard
                value={metrics.goals.active}
                label="Active"
                icon="trending-up"
              />
              <StatCard
                value={`${metrics.goals.avgProgress.toFixed(0)}%`}
                label="Avg Progress"
                icon="chart-line"
              />
            </View>
          </Card>
        )}

        {(category === 'all' || category === 'habits') && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Icon name="repeat" size={24} color={Colors.evergreenTeal} />
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Habits ({getTimeFrameLabel()})
              </Text>
            </View>
            <View style={styles.statsGrid}>
              <StatCard
                value={metrics.habits.completions}
                label="Completions"
                icon="checkbox-marked"
              />
              <StatCard
                value={`${metrics.habits.completionRate.toFixed(0)}%`}
                label="Success Rate"
                icon="percent"
                color={metrics.habits.completionRate >= 80 ? Colors.success : Colors.warning}
              />
              <StatCard
                value={`🔥 ${metrics.habits.longestStreak}`}
                label="Best Streak"
                icon="fire"
                color={Colors.sunriseAmber}
              />
            </View>
          </Card>
        )}

        {(category === 'all' || category === 'tasks') && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Icon name="clipboard-check" size={24} color={Colors.evergreenTeal} />
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Tasks ({getTimeFrameLabel()})
              </Text>
            </View>
            <View style={styles.statsGrid}>
              <StatCard
                value={metrics.tasks.completed}
                label="Completed"
                icon="check-all"
                color={Colors.success}
              />
              <StatCard
                value={metrics.tasks.total - metrics.tasks.completed}
                label="Pending"
                icon="clipboard-list"
              />
              <StatCard
                value={`${metrics.tasks.completionRate.toFixed(0)}%`}
                label="Completion"
                icon="percent"
                color={metrics.tasks.completionRate >= 70 ? Colors.success : Colors.warning}
              />
            </View>
          </Card>
        )}

        {(category === 'all' || category === 'focus') && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Icon name="timer" size={24} color={Colors.evergreenTeal} />
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Focus Sessions ({getTimeFrameLabel()})
              </Text>
            </View>
            <View style={styles.statsGrid}>
              <StatCard
                value={metrics.focus.sessions}
                label="Sessions"
                icon="calendar-check"
              />
              <StatCard
                value={`${metrics.focus.totalMinutes} min`}
                label="Total Time"
                icon="clock"
              />
              <StatCard
                value={`${metrics.focus.avgSessionLength.toFixed(0)} min`}
                label="Avg Length"
                icon="timer-sand"
              />
            </View>
          </Card>
        )}

        {(category === 'all' || category === 'journal') && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Icon name="book-open-page-variant" size={24} color={Colors.evergreenTeal} />
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Journal ({getTimeFrameLabel()})
              </Text>
            </View>
            <View style={styles.statsGrid}>
              <StatCard
                value={metrics.journal.entries}
                label="Entries"
                icon="note-text"
              />
              <StatCard
                value={`${(metrics.journal.entries / getDaysInRange()).toFixed(1)}/day`}
                label="Avg per Day"
                icon="calendar-today"
              />
            </View>
          </Card>
        )}

        {(category === 'all' || category === 'community') && (
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Icon name="account-group" size={24} color={Colors.evergreenTeal} />
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Community ({getTimeFrameLabel()})
              </Text>
            </View>
            <View style={styles.statsGrid}>
              <StatCard
                value={metrics.community.posts}
                label="Posts"
                icon="message"
              />
              <StatCard
                value={metrics.community.comments}
                label="Comments"
                icon="comment"
              />
              <StatCard
                value={metrics.community.connections}
                label="Connections"
                icon="account-multiple"
              />
            </View>
          </Card>
        )}

        {/* Summary Section */}
        <Card style={styles.summaryCard}>
          <Text variant="titleMedium" style={styles.summaryTitle}>
            Your Progress Summary
          </Text>
          <Text variant="bodyMedium" style={styles.summaryText}>
            In the {getTimeFrameLabel().toLowerCase()}, you've completed{' '}
            <Text style={styles.highlightText}>{metrics.goals.completed} goals</Text>,{' '}
            <Text style={styles.highlightText}>{metrics.habits.completions} habit check-ins</Text>,{' '}
            and <Text style={styles.highlightText}>{metrics.tasks.completed} tasks</Text>.
            {metrics.focus.sessions > 0 && (
              <Text>
                {' '}You've also logged{' '}
                <Text style={styles.highlightText}>{metrics.focus.sessions} focus sessions</Text>{' '}
                totaling <Text style={styles.highlightText}>{metrics.focus.totalMinutes} minutes</Text>.
              </Text>
            )}
            {metrics.journal.entries > 0 && (
              <Text>
                {' '}You journaled{' '}
                <Text style={styles.highlightText}>{metrics.journal.entries} times</Text>.
              </Text>
            )}
          </Text>
          {metrics.habits.longestStreak > 0 && (
            <View style={styles.achievementBadge}>
              <Icon name="trophy" size={20} color={Colors.sunriseAmber} />
              <Text style={styles.achievementText}>
                Best habit streak: {metrics.habits.longestStreak} days! 🔥
              </Text>
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  filterSection: {
    marginBottom: Spacing.md,
  },
  filterLabel: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.evergreenTeal,
  },
  chipText: {
    color: Colors.textPrimary,
  },
  chipTextSelected: {
    color: Colors.textOnPrimary,
  },
  sectionCard: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  summaryCard: {
    backgroundColor: Colors.dewSage,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  summaryTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
  },
  summaryText: {
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize.base * 1.6,
  },
  highlightText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
  },
  achievementText: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default InsightsScreen;
