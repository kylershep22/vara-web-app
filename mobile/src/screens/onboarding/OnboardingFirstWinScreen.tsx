/**
 * Onboarding First Win Screen
 * Helps users achieve their first micro-win immediately
 * Creates positive momentum and demonstrates app value
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  TextInput,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Button } from '../../components';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { createJournalEntry } from '../../services/firebase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingFirstWinScreenProps {
  navigation: any;
  route: any;
}

type WinOption = 'reflection' | 'breath' | 'checkin';
type WinStep = 'selection' | 'activity' | 'celebration';

interface WinOptionData {
  id: WinOption;
  icon: string;
  title: string;
  description: string;
  duration: string;
}

const WIN_OPTIONS: WinOptionData[] = [
  {
    id: 'reflection',
    icon: 'pencil-outline',
    title: '2-Minute Reflection',
    description: 'Write one thing you\'re grateful for today',
    duration: '2 min',
  },
  {
    id: 'breath',
    icon: 'weather-windy',
    title: 'Grounding Breath',
    description: 'A quick 4-7-8 breathing exercise to center yourself',
    duration: '1 min',
  },
  {
    id: 'checkin',
    icon: 'brain',
    title: 'Quick Check-in',
    description: 'Rate how you\'re feeling right now',
    duration: '30 sec',
  },
];

const OnboardingFirstWinScreen: React.FC<OnboardingFirstWinScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { selectedFocus = [], createdType, createdTitle } = route.params || {};

  const [step, setStep] = useState<WinStep>('selection');
  const [selectedWin, setSelectedWin] = useState<WinOption | null>(null);
  const [loading, setLoading] = useState(false);

  // Reflection state
  const [gratitudeText, setGratitudeText] = useState('');

  // Breath state
  const [breathPhase, setBreathPhase] = useState<'idle' | 'inhale' | 'hold' | 'exhale'>('idle');
  const [breathCount, setBreathCount] = useState(0);
  const breathAnim = useRef(new Animated.Value(0.3)).current;
  const breathTimer = useRef<NodeJS.Timeout | null>(null);

  // Check-in state
  const [energyLevel, setEnergyLevel] = useState(5);
  const [focusLevel, setFocusLevel] = useState(5);
  const [moodLevel, setMoodLevel] = useState(5);

  // Celebration animation
  const celebrationScale = useRef(new Animated.Value(0)).current;
  const celebrationOpacity = useRef(new Animated.Value(0)).current;

  // Cleanup breath timer on unmount
  useEffect(() => {
    return () => {
      if (breathTimer.current) {
        clearTimeout(breathTimer.current);
      }
    };
  }, []);

  const handleSelectWin = (win: WinOption) => {
    setSelectedWin(win);
    setStep('activity');
  };

  const handleSkip = () => {
    navigation.navigate('OnboardingTour', {
      ...route.params,
      firstWinSkipped: true,
    });
  };

  const showCelebration = () => {
    setStep('celebration');

    // Animate celebration
    Animated.parallel([
      Animated.spring(celebrationScale, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(celebrationOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // ============================================
  // Reflection Activity
  // ============================================
  const handleSaveReflection = async () => {
    if (!gratitudeText.trim() || !user) return;

    setLoading(true);
    try {
      await createJournalEntry(user.uid, {
        content: `Gratitude: ${gratitudeText.trim()}`,
        type: 'gratitude',
        mood: 8,
        tags: ['gratitude', 'first-win', 'onboarding'],
      });
      showCelebration();
    } catch (error) {
      console.error('Error saving reflection:', error);
      showCelebration(); // Still show celebration even if save fails
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // Breathing Activity (4-7-8 technique)
  // ============================================
  const startBreathingExercise = () => {
    setBreathCount(0);
    runBreathCycle(0);
  };

  const runBreathCycle = (cycle: number) => {
    if (cycle >= 3) {
      // 3 cycles complete
      showCelebration();
      return;
    }

    // Inhale (4 seconds)
    setBreathPhase('inhale');
    Animated.timing(breathAnim, {
      toValue: 1,
      duration: 4000,
      useNativeDriver: true,
    }).start();

    breathTimer.current = setTimeout(() => {
      // Hold (7 seconds)
      setBreathPhase('hold');

      breathTimer.current = setTimeout(() => {
        // Exhale (8 seconds)
        setBreathPhase('exhale');
        Animated.timing(breathAnim, {
          toValue: 0.3,
          duration: 8000,
          useNativeDriver: true,
        }).start();

        breathTimer.current = setTimeout(() => {
          setBreathCount(cycle + 1);
          runBreathCycle(cycle + 1);
        }, 8000);
      }, 7000);
    }, 4000);
  };

  // ============================================
  // Check-in Activity
  // ============================================
  const handleSaveCheckin = () => {
    // In a real app, we'd save this to Firestore
    // For now, just show celebration
    showCelebration();
  };

  // ============================================
  // Navigate to Tour
  // ============================================
  const handleContinue = () => {
    navigation.navigate('OnboardingTour', {
      ...route.params,
      firstWinCompleted: selectedWin,
    });
  };

  // ============================================
  // Render Selection Step
  // ============================================
  const renderSelection = () => (
    <>
      <Text variant="headlineMedium" style={styles.title}>
        Your First Win
      </Text>

      <Text variant="bodyLarge" style={styles.subtitle}>
        Let's start with something small. Pick one activity to try right now:
      </Text>

      <View style={styles.optionsContainer}>
        {WIN_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.optionCard}
            onPress={() => handleSelectWin(option.id)}
            activeOpacity={0.7}
          >
            <View style={styles.optionIcon}>
              <Icon name={option.icon as any} size={28} color={Colors.evergreenTeal} />
            </View>
            <View style={styles.optionContent}>
              <Text variant="titleMedium" style={styles.optionTitle}>
                {option.title}
              </Text>
              <Text variant="bodySmall" style={styles.optionDescription}>
                {option.description}
              </Text>
            </View>
            <View style={styles.optionDuration}>
              <Text variant="labelSmall" style={styles.durationText}>
                {option.duration}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Button
        variant="text"
        onPress={handleSkip}
        style={styles.skipButton}
      >
        Skip for now
      </Button>
    </>
  );

  // ============================================
  // Render Reflection Activity
  // ============================================
  const renderReflection = () => (
    <>
      <View style={styles.activityHeader}>
        <TouchableOpacity onPress={() => setStep('selection')} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={styles.activityTitle}>
          2-Minute Reflection
        </Text>
      </View>

      <View style={styles.activityContent}>
        <View style={styles.promptCard}>
          <Icon name="lightbulb-outline" size={24} color={Colors.sunriseYellow} />
          <Text variant="bodyLarge" style={styles.promptText}>
            What's one thing you're grateful for today?
          </Text>
        </View>

        <TextInput
          style={styles.reflectionInput}
          multiline
          placeholder="Take a moment to reflect..."
          placeholderTextColor={Colors.textSecondary}
          value={gratitudeText}
          onChangeText={setGratitudeText}
          textAlignVertical="top"
        />

        <Text variant="bodySmall" style={styles.hint}>
          It can be something simple - a warm cup of coffee, a kind word, or a moment of peace.
        </Text>
      </View>

      <Button
        variant="primary"
        onPress={handleSaveReflection}
        disabled={!gratitudeText.trim() || loading}
        loading={loading}
        fullWidth
        style={styles.activityButton}
      >
        Save & Continue
      </Button>
    </>
  );

  // ============================================
  // Render Breathing Activity
  // ============================================
  const renderBreathing = () => (
    <>
      <View style={styles.activityHeader}>
        <TouchableOpacity onPress={() => setStep('selection')} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={styles.activityTitle}>
          Grounding Breath
        </Text>
      </View>

      <View style={styles.breathingContainer}>
        {breathPhase === 'idle' ? (
          <>
            <View style={styles.breathInfoCard}>
              <Text variant="titleMedium" style={styles.breathInfoTitle}>
                4-7-8 Breathing
              </Text>
              <Text variant="bodyMedium" style={styles.breathInfoText}>
                Inhale for 4 seconds{'\n'}
                Hold for 7 seconds{'\n'}
                Exhale for 8 seconds
              </Text>
              <Text variant="bodySmall" style={styles.breathInfoHint}>
                We'll do 3 cycles together
              </Text>
            </View>

            <Button
              variant="primary"
              onPress={startBreathingExercise}
              fullWidth
              style={styles.activityButton}
            >
              Start Breathing
            </Button>
          </>
        ) : (
          <>
            <View style={styles.breathCircleContainer}>
              <Animated.View
                style={[
                  styles.breathCircle,
                  {
                    transform: [{ scale: breathAnim }],
                  },
                ]}
              />
              <View style={styles.breathPhaseOverlay}>
                <Text variant="headlineMedium" style={styles.breathPhaseText}>
                  {breathPhase === 'inhale' ? 'Breathe In' :
                   breathPhase === 'hold' ? 'Hold' : 'Breathe Out'}
                </Text>
                <Text variant="titleLarge" style={styles.breathCounter}>
                  {breathCount + 1} / 3
                </Text>
              </View>
            </View>
          </>
        )}
      </View>
    </>
  );

  // ============================================
  // Render Check-in Activity
  // ============================================
  const renderCheckin = () => (
    <>
      <View style={styles.activityHeader}>
        <TouchableOpacity onPress={() => setStep('selection')} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={styles.activityTitle}>
          Quick Check-in
        </Text>
      </View>

      <View style={styles.checkinContainer}>
        <CheckinSlider
          label="Energy Level"
          emoji={energyLevel >= 7 ? '⚡' : energyLevel >= 4 ? '✨' : '💤'}
          value={energyLevel}
          onChange={setEnergyLevel}
        />

        <CheckinSlider
          label="Focus"
          emoji={focusLevel >= 7 ? '🎯' : focusLevel >= 4 ? '👀' : '💭'}
          value={focusLevel}
          onChange={setFocusLevel}
        />

        <CheckinSlider
          label="Mood"
          emoji={moodLevel >= 7 ? '😊' : moodLevel >= 4 ? '😐' : '😔'}
          value={moodLevel}
          onChange={setMoodLevel}
        />
      </View>

      <Button
        variant="primary"
        onPress={handleSaveCheckin}
        fullWidth
        style={styles.activityButton}
      >
        Save & Continue
      </Button>
    </>
  );

  // ============================================
  // Render Celebration
  // ============================================
  const renderCelebration = () => (
    <Animated.View
      style={[
        styles.celebrationContainer,
        {
          opacity: celebrationOpacity,
          transform: [{ scale: celebrationScale }],
        },
      ]}
    >
      <View style={styles.celebrationBadge}>
        <Icon name="check-circle" size={80} color={Colors.evergreenTeal} />
      </View>

      <Text variant="headlineMedium" style={styles.celebrationTitle}>
        First Win Complete!
      </Text>

      <Text variant="bodyLarge" style={styles.celebrationSubtitle}>
        You just took your first step toward better wellness.
        Small wins lead to big transformations.
      </Text>

      <View style={styles.celebrationStats}>
        <View style={styles.statItem}>
          <Icon name="star" size={24} color={Colors.sunriseYellow} />
          <Text variant="labelLarge" style={styles.statText}>Day 1</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="trending-up" size={24} color={Colors.evergreenTeal} />
          <Text variant="labelLarge" style={styles.statText}>Journey Started</Text>
        </View>
      </View>

      <Button
        variant="primary"
        onPress={handleContinue}
        fullWidth
        style={styles.continueButton}
      >
        Continue Setup
      </Button>
    </Animated.View>
  );

  // ============================================
  // Render Activity Based on Selection
  // ============================================
  const renderActivity = () => {
    switch (selectedWin) {
      case 'reflection':
        return renderReflection();
      case 'breath':
        return renderBreathing();
      case 'checkin':
        return renderCheckin();
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Progress Indicator */}
      {step !== 'celebration' && (
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, step === 'activity' && styles.progressDotActive]} />
        </View>
      )}

      <View style={styles.content}>
        {step === 'selection' && renderSelection()}
        {step === 'activity' && renderActivity()}
        {step === 'celebration' && renderCelebration()}
      </View>
    </SafeAreaView>
  );
};

// ============================================
// Check-in Slider Component
// ============================================
interface CheckinSliderProps {
  label: string;
  emoji: string;
  value: number;
  onChange: (value: number) => void;
}

const CheckinSlider: React.FC<CheckinSliderProps> = ({ label, emoji, value, onChange }) => {
  return (
    <View style={sliderStyles.container}>
      <View style={sliderStyles.header}>
        <Text variant="titleSmall" style={sliderStyles.label}>{label}</Text>
        <Text style={sliderStyles.emoji}>{emoji}</Text>
      </View>
      <View style={sliderStyles.track}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              sliderStyles.dot,
              level <= value && sliderStyles.dotActive,
            ]}
            onPress={() => onChange(level)}
          />
        ))}
      </View>
      <View style={sliderStyles.labels}>
        <Text variant="labelSmall" style={sliderStyles.labelText}>Low</Text>
        <Text variant="labelSmall" style={sliderStyles.labelText}>High</Text>
      </View>
    </View>
  );
};

const sliderStyles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold as any,
  },
  emoji: {
    fontSize: 24,
  },
  track: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.full,
    paddingHorizontal: Spacing.base,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.borderLight,
  },
  dotActive: {
    backgroundColor: Colors.evergreenTeal,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  labelText: {
    color: Colors.textSecondary,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderLight,
  },
  progressDotActive: {
    backgroundColor: Colors.evergreenTeal,
    width: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  title: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold as any,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xl,
    lineHeight: Typography.fontSize.base * 1.5,
  },
  optionsContainer: {
    gap: Spacing.base,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold as any,
    marginBottom: 4,
  },
  optionDescription: {
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  optionDuration: {
    backgroundColor: Colors.evergreenTeal + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.sm,
  },
  durationText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium as any,
  },
  skipButton: {
    marginTop: 'auto',
    marginBottom: Spacing.lg,
  },
  // Activity styles
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  backButton: {
    padding: Spacing.sm,
    marginLeft: -Spacing.sm,
    marginRight: Spacing.sm,
  },
  activityTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold as any,
  },
  activityContent: {
    flex: 1,
  },
  activityButton: {
    marginTop: 'auto',
    marginBottom: Spacing.lg,
  },
  // Reflection styles
  promptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.sunriseYellow + '20',
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  promptText: {
    flex: 1,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium as any,
  },
  reflectionInput: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.base,
    minHeight: 150,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.base,
  },
  hint: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Breathing styles
  breathingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathInfoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.xl,
    width: '100%',
  },
  breathInfoTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold as any,
    marginBottom: Spacing.base,
  },
  breathInfoText: {
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: Spacing.sm,
  },
  breathInfoHint: {
    color: Colors.textSecondary,
  },
  breathCircleContainer: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathCircle: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: SCREEN_WIDTH * 0.35,
    backgroundColor: Colors.evergreenTeal + '30',
    borderWidth: 4,
    borderColor: Colors.evergreenTeal,
  },
  breathPhaseOverlay: {
    alignItems: 'center',
  },
  breathPhaseText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold as any,
  },
  breathCounter: {
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  // Check-in styles
  checkinContainer: {
    flex: 1,
    paddingTop: Spacing.lg,
  },
  // Celebration styles
  celebrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  celebrationBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.evergreenTeal + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  celebrationTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold as any,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  celebrationSubtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  celebrationStats: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.full,
  },
  statText: {
    color: Colors.textPrimary,
  },
  continueButton: {
    marginTop: Spacing.lg,
  },
});

export default OnboardingFirstWinScreen;
