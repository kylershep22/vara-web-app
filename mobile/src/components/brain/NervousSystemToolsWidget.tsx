/**
 * Nervous System Tools Widget
 * Quick access to nervous system regulation tools
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Card } from '../index';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useBrainHealthVocabulary } from '../../hooks';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

type ToolType = 'physiological-sigh' | 'panoramic-vision' | null;

export const NervousSystemToolsWidget: React.FC = () => {
  const { user } = useAuth();
  const { getComponentText } = useBrainHealthVocabulary();
  const [activeTool, setActiveTool] = useState<ToolType>(null);
  const [weeklyCount, setWeeklyCount] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Get translated text
  const { title: componentTitle, description: componentDescription } = getComponentText('nervousSystem');
  const { title: physiologicalSighTitle } = getComponentText('physiologicalSigh');
  const { title: panoramicVisionTitle } = getComponentText('panoramicVision');

  // Breathing animation values
  const breathScale = new Animated.Value(1);

  // Load weekly count
  useEffect(() => {
    const loadWeeklyCount = async () => {
      if (!user) return;

      try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const weekStart = Timestamp.fromDate(sevenDaysAgo);

        const sessionsQuery = query(
          collection(db, 'nervousSystemSessions'),
          where('userId', '==', user.uid),
          where('createdAt', '>=', weekStart)
        );
        const snapshot = await getDocs(sessionsQuery);
        setWeeklyCount(snapshot.size);
      } catch (error) {
        console.error('Error loading nervous system sessions:', error);
      }
    };

    loadWeeklyCount();
  }, [user]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRunning && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timer]);

  // Breathing animation for physiological sigh
  useEffect(() => {
    if (activeTool === 'physiological-sigh' && isRunning) {
      const breathingCycle = () => {
        // Inhale 1 (2 seconds)
        Animated.timing(breathScale, {
          toValue: 1.3,
          duration: 2000,
          useNativeDriver: true,
        }).start(() => {
          // Inhale 2 (1 second)
          Animated.timing(breathScale, {
            toValue: 1.5,
            duration: 1000,
            useNativeDriver: true,
          }).start(() => {
            // Long exhale (6 seconds)
            Animated.timing(breathScale, {
              toValue: 1,
              duration: 6000,
              useNativeDriver: true,
            }).start(() => {
              if (timer > 9) {
                breathingCycle();
              }
            });
          });
        });
      };

      breathingCycle();
    }

    return () => breathScale.stopAnimation();
  }, [activeTool, isRunning]);

  const startPhysiologicalSigh = () => {
    setActiveTool('physiological-sigh');
    setTimer(60); // 60 seconds
    setIsRunning(true);
  };

  const startPanoramicVision = () => {
    setActiveTool('panoramic-vision');
    setTimer(60); // 60 seconds
    setIsRunning(true);
  };

  const handleComplete = async () => {
    if (!user || !activeTool) return;

    try {
      await addDoc(collection(db, 'nervousSystemSessions'), {
        userId: user.uid,
        type: activeTool,
        duration: activeTool === 'physiological-sigh' ? 60 : 60,
        completedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      setWeeklyCount(prev => prev + 1);
    } catch (error) {
      console.error('Error logging nervous system session:', error);
    }
  };

  const handleClose = () => {
    setActiveTool(null);
    setTimer(0);
    setIsRunning(false);
    breathScale.setValue(1);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Card style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="meditation" size={24} color={Colors.evergreenTeal} />
            <View>
              <Text style={styles.title}>
                {componentTitle}
              </Text>
              <Text style={styles.subtitle}>
                {weeklyCount} sessions this week
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.description}>
          {componentDescription}
        </Text>

        {/* Tool Buttons */}
        <View style={styles.toolsRow}>
          <TouchableOpacity
            style={styles.toolButton}
            onPress={startPhysiologicalSigh}
            activeOpacity={0.7}
          >
            <View style={styles.toolIconContainer}>
              <Icon name="lung" size={32} color={Colors.evergreenTeal} />
            </View>
            <Text style={styles.toolLabel}>
              {physiologicalSighTitle.replace(' ', '\n')}
            </Text>
            <Text style={styles.toolDuration}>
              60s
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolButton}
            onPress={startPanoramicVision}
            activeOpacity={0.7}
          >
            <View style={styles.toolIconContainer}>
              <Icon name="eye-outline" size={32} color={Colors.evergreenTeal} />
            </View>
            <Text style={styles.toolLabel}>
              {panoramicVisionTitle.replace(' ', '\n')}
            </Text>
            <Text style={styles.toolDuration}>
              60s
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Physiological Sigh Modal */}
      <Modal
        visible={activeTool === 'physiological-sigh'}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Physiological Sigh
            </Text>
            <Text style={styles.modalSubtitle}>
              Double inhale + long exhale
            </Text>

            {/* Breathing Circle */}
            <View style={styles.breathingContainer}>
              <Animated.View
                style={[
                  styles.breathingCircle,
                  {
                    transform: [{ scale: breathScale }],
                  },
                ]}
              >
                <Icon name="lung" size={48} color={Colors.evergreenTeal} />
              </Animated.View>
            </View>

            <Text style={styles.timerText}>
              {formatTime(timer)}
            </Text>

            <Text style={styles.instructionText}>
              {timer > 50 ? 'Deep inhale through nose...' :
               timer > 49 ? 'Quick second inhale...' :
               timer > 43 ? 'Long exhale through mouth...' :
               'Continue the rhythm...'}
            </Text>

            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </Modal>

      {/* Panoramic Vision Modal */}
      <Modal
        visible={activeTool === 'panoramic-vision'}
        transparent
        animationType="fade"
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Panoramic Vision
            </Text>
            <Text style={styles.modalSubtitle}>
              Soften your gaze and expand awareness
            </Text>

            <View style={styles.iconContainer}>
              <Icon name="eye-outline" size={64} color={Colors.evergreenTeal} />
            </View>

            <Text style={styles.timerText}>
              {formatTime(timer)}
            </Text>

            <Text style={styles.instructionText}>
              {timer > 45 ? 'Soften your gaze and relax your eyes...' :
               timer > 30 ? 'Expand your peripheral vision...' :
               timer > 15 ? 'Notice 5 things without moving your eyes...' :
               'Feel the calming effect...'}
            </Text>

            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
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
  },
  title: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  description: {
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
    lineHeight: Typography.fontSize.sm * 1.5,
  },
  toolsRow: {
    flexDirection: 'row',
    gap: Spacing.base,
  },
  toolButton: {
    flex: 1,
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.evergreenTeal + '40',
  },
  toolIconContainer: {
    width: 64,
    height: 64,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  toolLabel: {
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  toolDuration: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  modal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.xl,
  },
  modalContent: {
    alignItems: 'center',
  },
  modalTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  breathingContainer: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.xl,
  },
  breathingCircle: {
    width: 120,
    height: 120,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.dewSage,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.evergreenTeal,
  },
  iconContainer: {
    marginVertical: Spacing.xl,
  },
  timerText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.base,
  },
  instructionText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: Typography.fontSize.base * 1.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    minWidth: 120,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
});
