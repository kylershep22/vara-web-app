/**
 * FirstActionCard
 * Presents pillar-specific quick actions for the "Day One Win"
 *
 * Design Philosophy: Users should complete a meaningful action before
 * finishing onboarding to deliver tangible value in their first session.
 * Each action takes under 2 minutes.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  Text,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { FocusArea } from '../../screens/onboarding/OnboardingFocusScreen';

interface FirstActionCardProps {
  selectedFocus: FocusArea[];
  onComplete: (actionType: string, actionData?: any) => void;
}

type ActionType = 'breathing' | 'gratitude' | 'micro_goal' | 'reflection' | 'intention';

interface QuickAction {
  id: ActionType;
  title: string;
  description: string;
  icon: string;
  color: string;
  duration: string;
  focusAreas: FocusArea[];
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'breathing',
    title: 'Calming Breath',
    description: 'A quick breathing exercise to center yourself',
    icon: 'weather-windy',
    color: Colors.lavenderMist,
    duration: '1 min',
    focusAreas: ['mental', 'physical'],
  },
  {
    id: 'gratitude',
    title: 'One Gratitude',
    description: 'Write one thing you\'re grateful for today',
    icon: 'heart-outline',
    color: Colors.softCoral,
    duration: '30 sec',
    focusAreas: ['mental', 'growth'],
  },
  {
    id: 'micro_goal',
    title: 'Set a Micro-Goal',
    description: 'One small thing you\'ll do in the next 24 hours',
    icon: 'target',
    color: Colors.evergreenTeal,
    duration: '1 min',
    focusAreas: ['productivity', 'growth'],
  },
  {
    id: 'reflection',
    title: 'Quick Reflection',
    description: 'How are you feeling right now?',
    icon: 'thought-bubble-outline',
    color: Colors.sunriseAmber,
    duration: '30 sec',
    focusAreas: ['mental', 'community'],
  },
  {
    id: 'intention',
    title: 'Set an Intention',
    description: 'What\'s one word to guide your wellness journey?',
    icon: 'compass-outline',
    color: Colors.secondary,
    duration: '30 sec',
    focusAreas: ['growth', 'mental', 'physical', 'productivity', 'community'],
  },
];

// Breathing exercise component
const BreathingExercise: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'ready' | 'inhale' | 'hold' | 'exhale' | 'done'>('ready');
  const [cycleCount, setCycleCount] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const totalCycles = 3;

  useEffect(() => {
    if (phase === 'ready') return;
    if (phase === 'done') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
      return;
    }

    let timer: NodeJS.Timeout;

    if (phase === 'inhale') {
      Animated.timing(scaleAnim, {
        toValue: 1.5,
        duration: 4000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
      timer = setTimeout(() => setPhase('hold'), 4000);
    } else if (phase === 'hold') {
      timer = setTimeout(() => setPhase('exhale'), 2000);
    } else if (phase === 'exhale') {
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();
      timer = setTimeout(() => {
        const newCount = cycleCount + 1;
        setCycleCount(newCount);
        if (newCount >= totalCycles) {
          setPhase('done');
        } else {
          setPhase('inhale');
        }
      }, 4000);
    }

    return () => clearTimeout(timer);
  }, [phase, cycleCount]);

  const startBreathing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase('inhale');
  };

  const getInstructionText = () => {
    switch (phase) {
      case 'ready': return 'Tap to begin';
      case 'inhale': return 'Breathe in...';
      case 'hold': return 'Hold...';
      case 'exhale': return 'Breathe out...';
      case 'done': return 'Well done!';
      default: return '';
    }
  };

  return (
    <View style={styles.exerciseContainer}>
      <TouchableOpacity
        style={styles.breathingCircleContainer}
        onPress={phase === 'ready' ? startBreathing : undefined}
        activeOpacity={phase === 'ready' ? 0.7 : 1}
      >
        <Animated.View
          style={[
            styles.breathingCircle,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Icon
            name="weather-windy"
            size={40}
            color={Colors.white}
          />
        </Animated.View>
      </TouchableOpacity>
      <Text style={styles.breathingInstruction}>{getInstructionText()}</Text>
      {phase !== 'ready' && phase !== 'done' && (
        <Text style={styles.breathingProgress}>
          Breath {cycleCount + 1} of {totalCycles}
        </Text>
      )}
    </View>
  );
};

// Text input action component
const TextInputAction: React.FC<{
  placeholder: string;
  onSubmit: (text: string) => void;
  buttonLabel: string;
}> = ({ placeholder, onSubmit, buttonLabel }) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (text.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSubmit(text.trim());
    }
  };

  return (
    <View style={styles.textInputContainer}>
      <TextInput
        style={styles.textInput}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={200}
        autoFocus
      />
      <TouchableOpacity
        style={[
          styles.submitButton,
          !text.trim() && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={!text.trim()}
      >
        <Text style={styles.submitButtonText}>{buttonLabel}</Text>
        <Icon name="arrow-right" size={18} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
};

export const FirstActionCard: React.FC<FirstActionCardProps> = ({
  selectedFocus,
  onComplete,
}) => {
  const [selectedAction, setSelectedAction] = useState<QuickAction | null>(null);
  const [actionStarted, setActionStarted] = useState(false);

  // Get recommended actions based on focus areas
  const getRecommendedActions = (): QuickAction[] => {
    if (selectedFocus.length === 0) {
      // Default: show intention setting as universal
      return [QUICK_ACTIONS.find(a => a.id === 'intention')!];
    }

    // Find actions that match user's focus areas
    const matched = QUICK_ACTIONS.filter(action =>
      action.focusAreas.some(focus => selectedFocus.includes(focus))
    );

    // Return top 3, prioritizing those with more focus area matches
    return matched
      .sort((a, b) => {
        const aMatches = a.focusAreas.filter(f => selectedFocus.includes(f)).length;
        const bMatches = b.focusAreas.filter(f => selectedFocus.includes(f)).length;
        return bMatches - aMatches;
      })
      .slice(0, 3);
  };

  const recommendedActions = getRecommendedActions();

  const handleSelectAction = (action: QuickAction) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAction(action);
    setActionStarted(true);
  };

  const handleActionComplete = (data?: any) => {
    if (selectedAction) {
      onComplete(selectedAction.id, data);
    }
  };

  // Render the active action
  const renderActiveAction = () => {
    if (!selectedAction) return null;

    switch (selectedAction.id) {
      case 'breathing':
        return <BreathingExercise onComplete={handleActionComplete} />;
      case 'gratitude':
        return (
          <TextInputAction
            placeholder="I'm grateful for..."
            onSubmit={(text) => handleActionComplete({ gratitude: text })}
            buttonLabel="Capture this"
          />
        );
      case 'micro_goal':
        return (
          <TextInputAction
            placeholder="In the next 24 hours, I will..."
            onSubmit={(text) => handleActionComplete({ goal: text })}
            buttonLabel="Set a focus"
          />
        );
      case 'reflection':
        return (
          <TextInputAction
            placeholder="Right now, I'm feeling..."
            onSubmit={(text) => handleActionComplete({ reflection: text })}
            buttonLabel="Capture this"
          />
        );
      case 'intention':
        return (
          <TextInputAction
            placeholder="My guiding word is..."
            onSubmit={(text) => handleActionComplete({ intention: text })}
            buttonLabel="Set a focus"
          />
        );
      default:
        return null;
    }
  };

  if (actionStarted && selectedAction) {
    return (
      <View style={styles.container}>
        <View style={styles.activeActionHeader}>
          <View style={[styles.actionIconSmall, { backgroundColor: selectedAction.color + '20' }]}>
            <Icon name={selectedAction.icon} size={20} color={selectedAction.color} />
          </View>
          <Text style={styles.activeActionTitle}>{selectedAction.title}</Text>
        </View>
        {renderActiveAction()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="rocket-launch" size={24} color={Colors.evergreenTeal} />
        <Text style={styles.headerTitle}>Your First Action</Text>
      </View>

      <Text style={styles.headerSubtitle}>
        Let's start your wellness journey with one small step. Choose an action that feels right:
      </Text>

      <View style={styles.actionsContainer}>
        {recommendedActions.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionOption}
            onPress={() => handleSelectAction(action)}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
              <Icon name={action.icon} size={28} color={action.color} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionDescription}>{action.description}</Text>
              <Text style={styles.actionDuration}>{action.duration}</Text>
            </View>
            <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.evergreenTeal,
  },
  headerSubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSize.base * 1.5,
    marginBottom: Spacing.lg,
  },
  actionsContainer: {
    gap: Spacing.base,
  },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  actionDuration: {
    fontSize: Typography.fontSize.xs,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  // Active action styles
  activeActionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeActionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  // Breathing exercise styles
  exerciseContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  breathingCircleContainer: {
    marginBottom: Spacing.xl,
  },
  breathingCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.lavenderMist,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathingInstruction: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  breathingProgress: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  // Text input styles
  textInputContainer: {
    flex: 1,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: Spacing.base,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.borderLight,
  },
  submitButtonText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
});

export default FirstActionCard;
