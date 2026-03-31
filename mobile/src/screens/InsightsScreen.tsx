/**
 * Insights Screen — "Your week"
 * Simplified to 3 high-value widgets:
 * 1. AI weekly narrative
 * 2. 30-day habit heatmap
 * 3. At a glance sparklines
 */

import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LoadingSpinner,
  NarrativeRecap,
  HabitHeatmap,
} from '../components';
import { AtAGlanceCard } from '../components/insights/SparklineTrendCard';
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
  const { correlations } = useWeeklyCorrelations();
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('week');
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

        const response = await apiPost<{ narrative: string }>('/weekly-narrative', {
          correlationData,
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

        {/* Widget 1: AI Narrative */}
        <NarrativeRecap
          narrative={aiNarrative}
          loading={narrativeLoading}
          timeframeLabel={timeFrame === 'week' ? 'This Week' : 'This Month'}
          hasInsufficientData={hasInsufficientData}
        />

        {/* Widget 2: 30-day Habit Heatmap */}
        <HabitHeatmap
          data={heatmapData}
          totalHabits={habits.length}
          daysToShow={30}
        />

        {/* Widget 3: At a Glance */}
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
});

export default InsightsScreen;
