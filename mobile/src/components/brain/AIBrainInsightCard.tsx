/**
 * AI Brain Insight Card
 * Daily AI-generated brain health insights and recommendations
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Card } from '../index';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

const API_BASE_URL = 'https://us-central1-vara-4a99f.cloudfunctions.net';

export const AIBrainInsightCard: React.FC = () => {
  const { user } = useAuth();
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load brain metrics and generate insight
  const loadInsight = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

      // Fetch today's brain metrics
      const metricsQuery = query(
        collection(db, 'brainMetrics'),
        where('userId', '==', user.uid),
        where('date', '==', today),
        limit(1)
      );
      const metricsSnapshot = await getDocs(metricsQuery);
      const todayMetrics = metricsSnapshot.docs[0]?.data();

      // Fetch recent neuroplasticity signals
      const neuroplasticityQuery = query(
        collection(db, 'neuroplasticitySignals'),
        where('userId', '==', user.uid),
        where('date', '>=', sevenDaysAgo),
        orderBy('date', 'desc')
      );
      const neuroplasticitySnapshot = await getDocs(neuroplasticityQuery);
      const neuroplasticityCount = neuroplasticitySnapshot.size;

      // Fetch AMCC streak
      const amccQuery = query(
        collection(db, 'amccChallenges'),
        where('userId', '==', user.uid),
        where('completed', '==', true),
        orderBy('date', 'desc')
      );
      const amccSnapshot = await getDocs(amccQuery);
      const amccStreak = calculateStreak(
        amccSnapshot.docs.map(doc => doc.data().date).filter(Boolean)
      );

      // Fetch nervous system tool uses this week
      const nervousSystemQuery = query(
        collection(db, 'nervousSystemSessions'),
        where('userId', '==', user.uid),
        orderBy('completedAt', 'desc')
      );
      const nervousSystemSnapshot = await getDocs(nervousSystemQuery);
      const nervousSystemToolUses = nervousSystemSnapshot.docs.filter(doc => {
        const completedAt = doc.data().completedAt?.seconds || 0;
        const sevenDaysAgoTimestamp = Date.now() / 1000 - (7 * 86400);
        return completedAt >= sevenDaysAgoTimestamp;
      }).length;

      // Build brain metrics context
      const brainMetrics = {
        readinessScore: todayMetrics?.readinessScore || 0,
        neuroplasticityCount,
        amccStreak,
        nervousSystemToolUses,
        lastCheckIn: todayMetrics?.date || 'Never',
      };

      // Call AI endpoint
      const response = await fetch(`${API_BASE_URL}/api/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: 'Based on my brain health status, give me one actionable insight or recommendation for today. Be specific and concise (2-3 sentences max).',
            },
          ],
          context: {
            page: { label: 'Brain Health', path: '/brain' },
            brainMetrics,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate insight');
      }

      const data = await response.json();
      setInsight(data.reply || 'No insight available at this time.');
    } catch (error) {
      console.error('Error loading brain insight:', error);
      setError('Unable to generate insight. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate consecutive day streak
  const calculateStreak = (dates: string[]): number => {
    if (dates.length === 0) return 0;

    const sorted = dates.sort().reverse();
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

  // Load insight on mount
  useEffect(() => {
    loadInsight();
  }, [user]);

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="lightbulb-on" size={24} color={Colors.sunriseAmber} />
          <View>
            <Text variant="titleMedium" style={styles.title}>
              AI Brain Insight
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              Personalized recommendation for today
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={loadInsight}
          disabled={loading}
          style={styles.refreshButton}
        >
          <Icon
            name="refresh"
            size={20}
            color={loading ? Colors.textSecondary : Colors.evergreenTeal}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={Colors.evergreenTeal} />
          <Text variant="bodySmall" style={styles.loadingText}>
            Analyzing your brain health...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={32} color={Colors.error} />
          <Text variant="bodyMedium" style={styles.errorText}>
            {error}
          </Text>
        </View>
      ) : insight ? (
        <View style={styles.insightContainer}>
          <Text variant="bodyMedium" style={styles.insightText}>
            {insight}
          </Text>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Icon name="brain" size={32} color={Colors.textSecondary} />
          <Text variant="bodySmall" style={styles.emptyText}>
            Complete a brain health check-in to receive personalized insights
          </Text>
        </View>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
    backgroundColor: Colors.dewSage,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  title: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  refreshButton: {
    padding: Spacing.xs,
    borderRadius: Layout.borderRadius.full,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  errorContainer: {
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
  },
  errorText: {
    color: Colors.error,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  insightContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.sunriseAmber,
  },
  insightText: {
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize.base * 1.6,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
