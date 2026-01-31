/**
 * Onboarding Quick Start Screen
 * Help users create their first goal or habit
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, FlatList, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { Text, SegmentedButtons, TextInput as PaperInput, Menu } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Button } from '../../components';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { createGoal, createHabit } from '../../services/firebase';
import type { FocusArea } from './OnboardingFocusScreen';
import { HABIT_CATEGORIES } from '../../constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingQuickStartScreenProps {
  navigation: any;
  route: any;
}

interface Template {
  id: string;
  title: string;
  description: string;
  type: 'goal' | 'habit';
  category: string;
  icon: string;
  defaultData: any;
}

const TEMPLATES: Record<FocusArea, Template[]> = {
  physical: [
    {
      id: 'exercise-3x',
      title: 'Exercise 3x per week',
      description: 'Build a consistent workout routine',
      type: 'habit',
      category: 'Fitness',
      icon: 'run',
      defaultData: { name: 'Exercise', frequency: 3, type: 'weekly', category: 'Fitness' },
    },
    {
      id: 'water-intake',
      title: 'Drink 8 glasses of water daily',
      description: 'Stay hydrated throughout the day',
      type: 'habit',
      category: 'Health',
      icon: 'cup-water',
      defaultData: { name: 'Drink water (8 glasses)', frequency: 1, type: 'daily', category: 'Health' },
    },
    {
      id: 'sleep-schedule',
      title: 'Sleep 7-8 hours nightly',
      description: 'Establish healthy sleep patterns',
      type: 'habit',
      category: 'Sleep',
      icon: 'sleep',
      defaultData: { name: 'Get 7-8 hours sleep', frequency: 1, type: 'daily', category: 'Sleep' },
    },
    {
      id: 'daily-walk',
      title: 'Take a 20-minute walk',
      description: 'Get moving and fresh air daily',
      type: 'habit',
      category: 'Fitness',
      icon: 'walk',
      defaultData: { name: 'Walk 20 minutes', frequency: 1, type: 'daily', category: 'Fitness' },
    },
    {
      id: 'stretch-daily',
      title: 'Stretch for 10 minutes',
      description: 'Improve flexibility and reduce tension',
      type: 'habit',
      category: 'Fitness',
      icon: 'yoga',
      defaultData: { name: 'Stretch 10 minutes', frequency: 1, type: 'daily', category: 'Fitness' },
    },
  ],
  mental: [
    {
      id: 'meditate-daily',
      title: 'Meditate 10 min daily',
      description: 'Build a mindfulness practice',
      type: 'habit',
      category: 'Mindfulness',
      icon: 'meditation',
      defaultData: { name: 'Meditate 10 minutes', frequency: 1, type: 'daily', category: 'Mindfulness' },
    },
    {
      id: 'journal-weekly',
      title: 'Journal 3x per week',
      description: 'Reflect on your thoughts and feelings',
      type: 'habit',
      category: 'Mental Health',
      icon: 'book-open-page-variant',
      defaultData: { name: 'Journal', frequency: 3, type: 'weekly', category: 'Mental Health' },
    },
    {
      id: 'gratitude-daily',
      title: 'Daily gratitude practice',
      description: 'Write 3 things you\'re grateful for',
      type: 'habit',
      category: 'Mindfulness',
      icon: 'heart',
      defaultData: { name: 'Gratitude practice', frequency: 1, type: 'daily', category: 'Mindfulness' },
    },
  ],
  productivity: [
    {
      id: 'finish-project',
      title: 'Complete current project',
      description: 'Finish your ongoing work project',
      type: 'goal',
      category: 'Work',
      icon: 'briefcase-check',
      defaultData: { title: 'Complete current project', primaryFocus: 'Work', timeframe: '30 days' },
    },
    {
      id: 'focus-session',
      title: 'Daily focus session',
      description: '25-minute deep work session',
      type: 'habit',
      category: 'Productivity',
      icon: 'timer',
      defaultData: { name: 'Focus session (25 min)', frequency: 1, type: 'daily', category: 'Productivity' },
    },
    {
      id: 'task-completion',
      title: 'Complete 3 tasks daily',
      description: 'Stay on top of your to-do list',
      type: 'habit',
      category: 'Productivity',
      icon: 'checkbox-marked',
      defaultData: { name: 'Complete 3 tasks', frequency: 1, type: 'daily', category: 'Productivity' },
    },
  ],
  growth: [
    {
      id: 'read-book',
      title: 'Read 1 book this month',
      description: 'Expand your knowledge',
      type: 'goal',
      category: 'Learning',
      icon: 'book-open',
      defaultData: { title: 'Read 1 book', primaryFocus: 'Learning', timeframe: '30 days' },
    },
    {
      id: 'learn-skill',
      title: 'Learn a new skill',
      description: 'Dedicate time to skill development',
      type: 'goal',
      category: 'Personal Development',
      icon: 'school',
      defaultData: { title: 'Learn a new skill', primaryFocus: 'Personal Development', timeframe: '90 days' },
    },
    {
      id: 'morning-routine',
      title: 'Consistent morning routine',
      description: 'Start your day with intention',
      type: 'habit',
      category: 'Lifestyle',
      icon: 'weather-sunset-up',
      defaultData: { name: 'Morning routine', frequency: 1, type: 'daily', category: 'Lifestyle' },
    },
  ],
  community: [
    {
      id: 'connect-weekly',
      title: 'Connect with others weekly',
      description: 'Build meaningful relationships',
      type: 'habit',
      category: 'Social',
      icon: 'account-multiple',
      defaultData: { name: 'Connect with community', frequency: 1, type: 'weekly', category: 'Social' },
    },
    {
      id: 'share-progress',
      title: 'Share progress in community',
      description: 'Support others on their journey',
      type: 'habit',
      category: 'Community',
      icon: 'share-variant',
      defaultData: { name: 'Share progress', frequency: 2, type: 'weekly', category: 'Community' },
    },
  ],
};

const OnboardingQuickStartScreen: React.FC<OnboardingQuickStartScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { selectedFocus = [] } = route.params || {};

  const [activeTab, setActiveTab] = useState<'templates' | 'custom'>('templates');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customType, setCustomType] = useState<'goal' | 'habit'>('habit');
  const [customHabitType, setCustomHabitType] = useState<'daily' | 'weekly' | 'custom'>('daily');
  const [customHabitFrequency, setCustomHabitFrequency] = useState(1);
  const [customHabitCategory, setCustomHabitCategory] = useState('');
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  // Get templates based on selected focus areas
  const availableTemplates = selectedFocus.length > 0
    ? selectedFocus.flatMap((focus: FocusArea) => TEMPLATES[focus] || [])
    : Object.values(TEMPLATES).flat();

  const handleCreateFromTemplate = async () => {
    if (!selectedTemplate || !user) return;

    const template = availableTemplates.find(t => t.id === selectedTemplate);
    if (!template) return;

    setLoading(true);
    try {
      console.log('🎯 Creating template:', template.type, template.title);
      console.log('📝 Template data:', template.defaultData);

      if (template.type === 'goal') {
        const goalId = await createGoal(user.uid, {
          ...template.defaultData,
          status: 'active',
          progress: 0,
        });
        console.log('✅ Goal created successfully! ID:', goalId);
      } else {
        const habitData = {
          ...template.defaultData,
          active: true,
          streak: 0,
        };
        console.log('📝 Creating habit with data:', habitData);
        const habitId = await createHabit(user.uid, habitData);
        console.log('✅ Habit created successfully! ID:', habitId);
      }

      console.log('🚀 Navigating to tour...');
      // Navigate to tour
      navigation.navigate('OnboardingTour', {
        createdType: template.type,
        createdTitle: template.title,
      });
    } catch (error) {
      console.error('❌ Error creating from template:', error);
      Alert.alert('Error', 'Failed to create your first item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustom = async () => {
    if (!customTitle.trim() || !user) return;

    setLoading(true);
    try {
      if (customType === 'goal') {
        await createGoal(user.uid, {
          title: customTitle.trim(),
          primaryFocus: selectedFocus[0] || 'General',
          timeframe: '30 days',
          status: 'active',
          progress: 0,
        });
      } else {
        await createHabit(user.uid, {
          name: customTitle.trim(),
          frequency: customHabitFrequency,
          type: customHabitType,
          category: customHabitCategory.trim() || selectedFocus[0] || 'General',
          active: true,
          streak: 0,
        });
      }

      // Navigate to tour
      navigation.navigate('OnboardingTour', {
        createdType: customType,
        createdTitle: customTitle.trim(),
      });
    } catch (error) {
      console.error('Error creating custom item:', error);
      Alert.alert('Error', 'Failed to create your item. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate('OnboardingTour', {
      skipped: true,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={styles.progressDot} />
        </View>

        {/* Header */}
        <Text variant="headlineMedium" style={styles.title}>
          Let's get you started!
        </Text>

        <Text variant="bodyLarge" style={styles.subtitle}>
          Create your first {activeTab === 'templates' ? 'goal or habit' : customType}
        </Text>

        {/* Tab Selector */}
        <SegmentedButtons
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'templates' | 'custom')}
          buttons={[
            { value: 'templates', label: 'Templates' },
            { value: 'custom', label: 'Custom' },
          ]}
          style={styles.tabs}
        />

        {/* Templates View */}
        {activeTab === 'templates' && (
          <View style={styles.templatesContainer}>
            {availableTemplates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={[
                  styles.templateCard,
                  selectedTemplate === template.id && styles.templateCardSelected,
                ]}
                onPress={() => setSelectedTemplate(template.id)}
                activeOpacity={0.7}
              >
                <View style={styles.templateIcon}>
                  <Icon name={template.icon} size={24} color={Colors.evergreenTeal} />
                </View>
                <View style={styles.templateContent}>
                  <Text variant="titleSmall" style={styles.templateTitle}>
                    {template.title}
                  </Text>
                  <Text variant="bodySmall" style={styles.templateDescription}>
                    {template.description}
                  </Text>
                  <View style={styles.templateBadge}>
                    <Text variant="labelSmall" style={styles.templateBadgeText}>
                      {template.type === 'goal' ? '🎯 Goal' : '🔄 Habit'}
                    </Text>
                  </View>
                </View>
                {selectedTemplate === template.id && (
                  <Icon name="check-circle" size={24} color={Colors.evergreenTeal} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Custom View */}
        {activeTab === 'custom' && (
          <View style={styles.customContainer}>
            <SegmentedButtons
              value={customType}
              onValueChange={(value) => {
                setCustomType(value as 'goal' | 'habit');
                // Reset habit-specific fields when switching to goal
                if (value === 'goal') {
                  setCustomHabitType('daily');
                  setCustomHabitFrequency(1);
                  setCustomHabitCategory('');
                }
              }}
              buttons={[
                { value: 'habit', label: '🔄 Habit' },
                { value: 'goal', label: '🎯 Goal' },
              ]}
              style={styles.typeSelector}
            />

            <PaperInput
              label={customType === 'goal' ? "What's your goal?" : "What habit do you want to build?"}
              value={customTitle}
              onChangeText={setCustomTitle}
              mode="outlined"
              placeholder={customType === 'goal' ? 'e.g., Run a 5K' : 'e.g., Meditate daily'}
              style={styles.customInput}
              outlineColor={Colors.border}
              activeOutlineColor={Colors.evergreenTeal}
            />

            {/* Habit-specific fields */}
            {customType === 'habit' && (
              <>
                <Text variant="labelLarge" style={styles.fieldLabel}>
                  Frequency
                </Text>
                <SegmentedButtons
                  value={customHabitType}
                  onValueChange={(value) => {
                    setCustomHabitType(value as 'daily' | 'weekly' | 'custom');
                    // Set default frequency based on type
                    if (value === 'daily') setCustomHabitFrequency(1);
                    if (value === 'weekly') setCustomHabitFrequency(3);
                  }}
                  buttons={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                  ]}
                  style={styles.frequencySelector}
                />

                {customHabitType === 'weekly' && (
                  <View style={styles.frequencyInput}>
                    <Text variant="bodyMedium" style={styles.frequencyLabel}>
                      Times per week:
                    </Text>
                    <View style={styles.frequencyControls}>
                      <TouchableOpacity
                        onPress={() => setCustomHabitFrequency(Math.max(1, customHabitFrequency - 1))}
                        style={styles.frequencyButton}
                      >
                        <Icon name="minus" size={20} color={Colors.evergreenTeal} />
                      </TouchableOpacity>
                      <Text variant="titleMedium" style={styles.frequencyValue}>
                        {customHabitFrequency}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setCustomHabitFrequency(Math.min(7, customHabitFrequency + 1))}
                        style={styles.frequencyButton}
                      >
                        <Icon name="plus" size={20} color={Colors.evergreenTeal} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={styles.categoryContainer}>
                  <Text style={styles.fieldLabel}>Category</Text>
                  <Menu
                    visible={categoryMenuVisible}
                    onDismiss={() => setCategoryMenuVisible(false)}
                    anchor={
                      <TouchableOpacity
                        style={styles.categoryDropdown}
                        onPress={() => setCategoryMenuVisible(!categoryMenuVisible)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.categoryValueContainer}>
                          <Text style={styles.categoryValue}>
                            {customHabitCategory || 'Select a category'}
                          </Text>
                        </View>
                        <Icon
                          name={categoryMenuVisible ? "chevron-up" : "chevron-down"}
                          size={20}
                          color={Colors.textSecondary}
                        />
                      </TouchableOpacity>
                    }
                    contentStyle={styles.menuContent}
                  >
                    <FlatList
                      data={HABIT_CATEGORIES}
                      keyExtractor={(item) => item}
                      renderItem={({ item }) => (
                        <Menu.Item
                          onPress={() => {
                            setCustomHabitCategory(item);
                            setCategoryMenuVisible(false);
                          }}
                          title={item}
                          titleStyle={
                            customHabitCategory === item
                              ? { color: Colors.evergreenTeal, fontWeight: 'bold' }
                              : { color: Colors.textPrimary }
                          }
                        />
                      )}
                      style={styles.menuList}
                      nestedScrollEnabled
                      showsVerticalScrollIndicator
                    />
                  </Menu>
                </View>
              </>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            variant="primary"
            onPress={activeTab === 'templates' ? handleCreateFromTemplate : handleCreateCustom}
            disabled={
              loading ||
              (activeTab === 'templates' ? !selectedTemplate : !customTitle.trim())
            }
            loading={loading}
            fullWidth
            style={styles.createButton}
          >
            {activeTab === 'templates' ? 'Create from Template' : `Create ${customType}`}
          </Button>

          <Button
            variant="text"
            onPress={handleSkip}
            disabled={loading}
            fullWidth
          >
            Skip for now
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
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
  title: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
    lineHeight: Typography.fontSize.base * 1.5,
  },
  tabs: {
    marginBottom: Spacing.lg,
  },
  templatesContainer: {
    marginBottom: Spacing.lg,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  templateCardSelected: {
    borderColor: Colors.evergreenTeal,
    backgroundColor: Colors.dewSage,
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  templateContent: {
    flex: 1,
  },
  templateTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  templateDescription: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  templateBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.evergreenTeal + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.sm,
  },
  templateBadgeText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xs,
  },
  customContainer: {
    marginBottom: Spacing.lg,
  },
  typeSelector: {
    marginBottom: Spacing.md,
  },
  customInput: {
    backgroundColor: Colors.surface,
  },
  fieldLabel: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  frequencySelector: {
    marginBottom: Spacing.md,
  },
  frequencyInput: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  frequencyLabel: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  frequencyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  frequencyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frequencyValue: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.xl,
    minWidth: 40,
    textAlign: 'center',
  },
  categoryContainer: {
    marginBottom: Spacing.md,
  },
  categoryDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    minHeight: 48,
  },
  categoryValueContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  categoryValue: {
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  menuContent: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    maxHeight: 240, // Reduced to ensure scrolling kicks in
    width: SCREEN_WIDTH - (Spacing.lg * 2), // Match parent container width
    marginTop: 4,
    ...Layout.shadow.md,
  },
  menuList: {
    maxHeight: 240,
  },
  actions: {
    marginTop: 'auto',
    paddingTop: Spacing.lg,
  },
  createButton: {
    marginBottom: Spacing.sm,
  },
});

export default OnboardingQuickStartScreen;
