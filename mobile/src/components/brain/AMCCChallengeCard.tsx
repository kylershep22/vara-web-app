/**
 * AMCC Challenge Card
 * Daily "Do One Hard Thing" challenge to build willpower and resilience
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Checkbox, Portal, Modal, Button as PaperButton } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Card, Input } from '../index';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

type ChallengeType = 'cold' | 'movement' | 'conversation' | 'skill';

interface Challenge {
  type: ChallengeType;
  title: string;
  description: string;
  icon: string;
  examples: string[];
}

const CHALLENGES: Challenge[] = [
  {
    type: 'cold',
    title: 'Cold Exposure',
    description: 'Brief exposure to cold water or environment',
    icon: 'snowflake',
    examples: ['Cold shower for 30s', 'Ice bath', 'Cold water face splash', 'Walk outside in cold weather'],
  },
  {
    type: 'movement',
    title: 'Difficult Movement',
    description: 'Physical challenge that pushes your limits',
    icon: 'dumbbell',
    examples: ['Extra reps at the gym', 'Hold a plank longer', 'Try a new yoga pose', 'Sprint interval'],
  },
  {
    type: 'conversation',
    title: 'Uncomfortable Conversation',
    description: 'Have a difficult but necessary conversation',
    icon: 'message-alert',
    examples: ['Ask for what you need', 'Set a boundary', 'Give honest feedback', 'Apologize sincerely'],
  },
  {
    type: 'skill',
    title: 'Skill Practice',
    description: 'Practice something you find difficult',
    icon: 'school',
    examples: ['Learn something new', 'Practice weak skill', 'Study challenging topic', 'Try unfamiliar task'],
  },
];

export const AMCCChallengeCard: React.FC = () => {
  const { user } = useAuth();
  const [todayChallenge, setTodayChallenge] = useState<Challenge>(CHALLENGES[0]);
  const [completedToday, setCompletedToday] = useState(false);
  const [reflection, setReflection] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);

  const today = new Date().toISOString().split('T')[0];

  // Load today's challenge
  useEffect(() => {
    const loadTodayChallenge = async () => {
      if (!user) return;

      try {
        // Check if completed today
        const todayQuery = query(
          collection(db, 'amccChallenges'),
          where('userId', '==', user.uid),
          where('date', '==', today)
        );
        const snapshot = await getDocs(todayQuery);

        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setCompletedToday(data.completed || false);
          setReflection(data.reflection || '');

          // Find the challenge type
          const challenge = CHALLENGES.find(c => c.type === data.type);
          if (challenge) {
            setTodayChallenge(challenge);
          }
        } else {
          // Generate today's challenge (rotate based on day of year)
          const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
          const challengeIndex = dayOfYear % CHALLENGES.length;
          setTodayChallenge(CHALLENGES[challengeIndex]);
        }

        // Calculate streak
        const allChallengesQuery = query(
          collection(db, 'amccChallenges'),
          where('userId', '==', user.uid),
          where('completed', '==', true),
          orderBy('date', 'desc')
        );
        const allSnapshot = await getDocs(allChallengesQuery);
        const dates = allSnapshot.docs.map(doc => doc.data().date).sort().reverse();
        const streak = calculateCurrentStreak(dates);
        setCurrentStreak(streak);

      } catch (error) {
        console.error('Error loading AMCC challenge:', error);
      }
    };

    loadTodayChallenge();
  }, [user, today]);

  // Calculate current streak
  const calculateCurrentStreak = (dates: string[]): number => {
    if (dates.length === 0) return 0;

    let streak = 0;
    for (let i = 0; i < dates.length; i++) {
      const expectedDate = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
      if (dates.includes(expectedDate)) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  // Handle completion
  const handleComplete = async () => {
    if (!user) return;

    try {
      // Check if challenge exists for today
      const todayQuery = query(
        collection(db, 'amccChallenges'),
        where('userId', '==', user.uid),
        where('date', '==', today)
      );
      const snapshot = await getDocs(todayQuery);

      if (snapshot.empty) {
        // Create new challenge
        await addDoc(collection(db, 'amccChallenges'), {
          userId: user.uid,
          date: today,
          type: todayChallenge.type,
          completed: true,
          reflection: reflection,
          completedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        });
      } else {
        // Update existing challenge
        const docRef = doc(db, 'amccChallenges', snapshot.docs[0].id);
        await updateDoc(docRef, {
          completed: true,
          reflection: reflection,
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      setCompletedToday(true);
      setCurrentStreak(prev => prev + 1);
      setModalVisible(false);
    } catch (error) {
      console.error('Error completing AMCC challenge:', error);
    }
  };

  return (
    <>
      <Card style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="lightning-bolt" size={24} color={Colors.goldenApricot} />
            <View>
              <Text variant="titleMedium" style={styles.title}>
                AMCC Challenge
              </Text>
              <Text variant="bodySmall" style={styles.subtitle}>
                Do One Hard Thing Today
              </Text>
            </View>
          </View>
          <View style={styles.streakBadge}>
            <Icon name="fire" size={16} color={Colors.sunriseAmber} />
            <Text variant="labelMedium" style={styles.streakText}>
              {currentStreak}
            </Text>
          </View>
        </View>

        <Text variant="bodySmall" style={styles.description}>
          Build your willpower center (AMCC) by doing something difficult every day.
        </Text>

        {/* Today's Challenge */}
        <TouchableOpacity
          style={[styles.challengeCard, completedToday && styles.challengeCardCompleted]}
          onPress={() => !completedToday && setModalVisible(true)}
          activeOpacity={0.7}
        >
          <View style={styles.challengeHeader}>
            <View style={[styles.challengeIconContainer, { backgroundColor: Colors.goldenApricot + '20' }]}>
              <Icon name={todayChallenge.icon} size={32} color={Colors.goldenApricot} />
            </View>
            <View style={styles.challengeInfo}>
              <Text variant="titleSmall" style={styles.challengeTitle}>
                {todayChallenge.title}
              </Text>
              <Text variant="bodySmall" style={styles.challengeDescription}>
                {todayChallenge.description}
              </Text>
            </View>
            <Checkbox
              status={completedToday ? 'checked' : 'unchecked'}
              color={Colors.goldenApricot}
            />
          </View>

          {!completedToday && (
            <View style={styles.examplesSection}>
              <Text variant="labelSmall" style={styles.examplesLabel}>
                Examples:
              </Text>
              {todayChallenge.examples.slice(0, 2).map((example, index) => (
                <Text key={index} variant="bodySmall" style={styles.exampleText}>
                  • {example}
                </Text>
              ))}
            </View>
          )}

          {completedToday && reflection && (
            <View style={styles.reflectionSection}>
              <Text variant="labelSmall" style={styles.reflectionLabel}>
                Your reflection:
              </Text>
              <Text variant="bodySmall" style={styles.reflectionText}>
                {reflection}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </Card>

      {/* Completion Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            {todayChallenge.title}
          </Text>
          <Text variant="bodyMedium" style={styles.modalSubtitle}>
            {todayChallenge.description}
          </Text>

          <View style={styles.examplesList}>
            <Text variant="labelMedium" style={styles.examplesListLabel}>
              Examples:
            </Text>
            {todayChallenge.examples.map((example, index) => (
              <Text key={index} variant="bodySmall" style={styles.exampleListItem}>
                • {example}
              </Text>
            ))}
          </View>

          <Input
            label="What did you do? (Optional)"
            value={reflection}
            onChangeText={setReflection}
            placeholder="Describe your challenge..."
            multiline
            numberOfLines={3}
            style={styles.reflectionInput}
          />

          <View style={styles.modalActions}>
            <PaperButton
              mode="outlined"
              onPress={() => setModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </PaperButton>
            <PaperButton
              mode="contained"
              onPress={handleComplete}
              style={styles.modalButton}
              buttonColor={Colors.goldenApricot}
            >
              Complete
            </PaperButton>
          </View>
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
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
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    backgroundColor: Colors.sunriseAmber + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: Layout.borderRadius.full,
  },
  streakText: {
    color: Colors.sunriseAmber,
    fontWeight: Typography.fontWeight.bold,
  },
  description: {
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    lineHeight: Typography.fontSize.sm * 1.5,
  },
  challengeCard: {
    backgroundColor: Colors.borderLight,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    borderWidth: Layout.borderWidth.medium,
    borderColor: Colors.goldenApricot + '40',
  },
  challengeCardCompleted: {
    backgroundColor: Colors.goldenApricot + '10',
    borderColor: Colors.goldenApricot,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  challengeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs / 2,
  },
  challengeDescription: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  examplesSection: {
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  examplesLabel: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  exampleText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    marginBottom: Spacing.xs / 2,
  },
  reflectionSection: {
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
  },
  reflectionLabel: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  reflectionText: {
    color: Colors.textPrimary,
    fontStyle: 'italic',
    fontSize: Typography.fontSize.sm,
  },
  modal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    color: Colors.goldenApricot,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  examplesList: {
    backgroundColor: Colors.borderLight,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  examplesListLabel: {
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  exampleListItem: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    marginBottom: Spacing.xs / 2,
  },
  reflectionInput: {
    marginBottom: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
