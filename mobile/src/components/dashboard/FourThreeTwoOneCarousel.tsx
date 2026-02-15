/**
 * 4-3-2-1 Daily Practice Carousel
 * Horizontal swipeable carousel for daily wellness practice
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  Animated,
  Keyboard,
} from 'react-native';
import { Text, Modal, Portal, TextInput, Chip, Button } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { FourThreeTwoOneEntry, BodyFuelOption } from '../../types';
import {
  getTodayEntry,
  toggleFourMinutes,
  updateThreeWins,
  updateTwoFuel,
  toggleOneConnection,
  getCurrentStreak,
} from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';

// Body fuel options with labels and icons
const BODY_FUEL_OPTIONS: { value: BodyFuelOption; label: string; icon: string }[] = [
  { value: 'healthy_meal', label: 'Healthy Meal', icon: 'food-apple' },
  { value: 'hydration', label: 'Hydration', icon: 'water' },
  { value: 'vitamins', label: 'Vitamins', icon: 'pill' },
  { value: 'fruits_veggies', label: 'Fruits & Veggies', icon: 'carrot' },
  { value: 'protein', label: 'Protein', icon: 'food-steak' },
  { value: 'exercise', label: 'Exercise', icon: 'run' },
  { value: 'rest', label: 'Rest', icon: 'sleep' },
  { value: 'stretch', label: 'Stretch', icon: 'yoga' },
  { value: 'other', label: 'Other', icon: 'dots-horizontal' },
];

// Practice items configuration
const PRACTICE_ITEMS = [
  {
    key: 'fourMinutes',
    number: '4',
    title: 'minutes to yourself',
    description: 'Uninterrupted alone time',
    hasModal: false,
  },
  {
    key: 'threeWins',
    number: '3',
    title: 'wins from the day',
    description: 'Celebrate your accomplishments',
    hasModal: true,
  },
  {
    key: 'twoFuel',
    number: '2',
    title: 'ways you fueled your body',
    description: 'Nutrition, movement, or rest',
    hasModal: true,
  },
  {
    key: 'oneConnection',
    number: '1',
    title: 'connection with another person',
    description: 'Friend, family, or colleague',
    hasModal: false,
  },
];

interface FourThreeTwoOneCarouselProps {
  onEntryChange?: (entry: FourThreeTwoOneEntry | null) => void;
}

export const FourThreeTwoOneCarousel: React.FC<FourThreeTwoOneCarouselProps> = ({
  onEntryChange,
}) => {
  const { user } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const scrollViewRef = useRef<ScrollView>(null);

  const [entry, setEntry] = useState<FourThreeTwoOneEntry | null>(null);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Modal states
  const [winsModalVisible, setWinsModalVisible] = useState(false);
  const [fuelModalVisible, setFuelModalVisible] = useState(false);

  // Form states
  const [win1, setWin1] = useState('');
  const [win2, setWin2] = useState('');
  const [win3, setWin3] = useState('');
  const [selectedFuelOptions, setSelectedFuelOptions] = useState<BodyFuelOption[]>([]);

  // Calculate card dimensions
  const cardMargin = 20;
  const cardWidth = screenWidth - cardMargin * 2;

  // Animation values for indicators
  const indicatorAnimations = useRef(
    PRACTICE_ITEMS.map(() => new Animated.Value(0))
  ).current;

  // Load today's entry and streak
  useEffect(() => {
    loadData();
  }, [user]);

  // Notify parent of entry changes
  useEffect(() => {
    onEntryChange?.(entry);
  }, [entry, onEntryChange]);

  // Animate indicators when index changes
  useEffect(() => {
    indicatorAnimations.forEach((anim, idx) => {
      Animated.timing(anim, {
        toValue: idx === currentIndex ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
  }, [currentIndex]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const todayEntry = await getTodayEntry(user.uid);
      const currentStreak = await getCurrentStreak(user.uid);

      setEntry(todayEntry);
      setStreak(currentStreak);

      // Populate form states from entry
      if (todayEntry) {
        setWin1(todayEntry.threeWins.wins?.[0] || '');
        setWin2(todayEntry.threeWins.wins?.[1] || '');
        setWin3(todayEntry.threeWins.wins?.[2] || '');
        setSelectedFuelOptions(todayEntry.twoFuel.options || []);
      }
    } catch (error) {
      console.error('Error loading 4-3-2-1 data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / cardWidth);
      if (index !== currentIndex && index >= 0 && index < PRACTICE_ITEMS.length) {
        setCurrentIndex(index);
      }
    },
    [cardWidth, currentIndex]
  );

  const scrollToIndex = useCallback(
    (index: number) => {
      scrollViewRef.current?.scrollTo({
        x: index * cardWidth,
        animated: true,
      });
      setCurrentIndex(index);
    },
    [cardWidth]
  );

  const handleFourMinutesToggle = async () => {
    if (!user || !entry) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await toggleFourMinutes(user.uid);
      await loadData();
    } catch (error) {
      console.error('Error toggling 4 minutes:', error);
    }
  };

  const handleSaveWins = async () => {
    if (!user) return;

    try {
      const wins = [win1, win2, win3].filter((w) => w.trim().length > 0);
      await updateThreeWins(user.uid, true, wins.length > 0 ? wins : undefined);
      setWinsModalVisible(false);
      await loadData();
    } catch (error) {
      console.error('Error saving wins:', error);
    }
  };

  const handleMarkWinsWithoutWriting = async () => {
    if (!user) return;

    try {
      await updateThreeWins(user.uid, true);
      setWinsModalVisible(false);
      await loadData();
    } catch (error) {
      console.error('Error marking wins:', error);
    }
  };

  const handleSaveFuel = async () => {
    if (!user || selectedFuelOptions.length < 2) return;

    try {
      await updateTwoFuel(user.uid, true, selectedFuelOptions);
      setFuelModalVisible(false);
      await loadData();
    } catch (error) {
      console.error('Error saving fuel:', error);
    }
  };

  const handleToggleFuelOption = (option: BodyFuelOption) => {
    setSelectedFuelOptions((prev) => {
      if (prev.includes(option)) {
        return prev.filter((o) => o !== option);
      } else {
        return [...prev, option];
      }
    });
  };

  const handleOneConnectionToggle = async () => {
    if (!user || !entry) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await toggleOneConnection(user.uid);
      await loadData();
    } catch (error) {
      console.error('Error toggling connection:', error);
    }
  };

  const handleCardAction = (key: string) => {
    switch (key) {
      case 'fourMinutes':
        handleFourMinutesToggle();
        break;
      case 'threeWins':
        setWinsModalVisible(true);
        break;
      case 'twoFuel':
        setFuelModalVisible(true);
        break;
      case 'oneConnection':
        handleOneConnectionToggle();
        break;
    }
  };

  const isItemCompleted = (key: string): boolean => {
    if (!entry) return false;
    switch (key) {
      case 'fourMinutes':
        return entry.fourMinutes;
      case 'threeWins':
        return entry.threeWins.completed;
      case 'twoFuel':
        return entry.twoFuel.completed;
      case 'oneConnection':
        return entry.oneConnection;
      default:
        return false;
    }
  };

  if (loading || !entry) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>4-3-2-1 Daily Practice</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>0/4</Text>
            </View>
          </View>
        </View>
        <View style={[styles.loadingCard, { width: cardWidth }]}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const completionCount = [
    entry.fourMinutes,
    entry.threeWins.completed,
    entry.twoFuel.completed,
    entry.oneConnection,
  ].filter(Boolean).length;

  return (
    <>
      <View style={styles.container}>
        {/* Section Header */}
        <View style={styles.headerContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.titleRow}>
              <Text style={styles.sectionTitle}>4-3-2-1 Daily Practice</Text>
              {streak > 0 && (
                <View style={styles.streakBadge}>
                  <Icon name="fire" size={12} color={Colors.sunriseAmber} />
                  <Text style={styles.streakText}>{streak}</Text>
                </View>
              )}
            </View>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>{completionCount}/4</Text>
            </View>
          </View>
        </View>

        {/* Completion Banner */}
        {entry.completed && (
          <View style={styles.completionBanner}>
            <Icon name="check-circle" size={18} color={Colors.success} />
            <Text style={styles.completionText}>
              Amazing! You completed today's practice
            </Text>
          </View>
        )}

        {/* Carousel */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={cardWidth}
          snapToAlignment="center"
          contentContainerStyle={styles.carouselContent}
        >
          {PRACTICE_ITEMS.map((item, index) => {
            const isCompleted = isItemCompleted(item.key);

            return (
              <View
                key={item.key}
                style={[styles.carouselCard, { width: cardWidth - 8 }]}
              >
                <View style={styles.cardContent}>
                  <Text
                    style={[
                      styles.practiceNumber,
                      isCompleted && styles.practiceNumberCompleted,
                    ]}
                  >
                    {item.number}
                  </Text>
                  <Text style={styles.practiceTitle}>{item.title}</Text>
                  <Text style={styles.practiceDescription}>
                    {item.description}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.completeButton,
                      isCompleted && styles.completeButtonDone,
                    ]}
                    onPress={() => handleCardAction(item.key)}
                    activeOpacity={0.7}
                  >
                    {isCompleted ? (
                      <View style={styles.completedButtonContent}>
                        <Icon
                          name="check-circle"
                          size={18}
                          color={Colors.evergreenTeal}
                        />
                        <Text style={styles.completeButtonTextDone}>
                          Completed
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.completeButtonText}>
                        Mark Complete
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Carousel Indicators */}
        <View style={styles.indicatorContainer}>
          {PRACTICE_ITEMS.map((_, index) => {
            const widthInterpolation = indicatorAnimations[index].interpolate({
              inputRange: [0, 1],
              outputRange: [8, 24],
            });

            return (
              <TouchableOpacity
                key={index}
                onPress={() => scrollToIndex(index)}
                activeOpacity={0.7}
              >
                <Animated.View
                  style={[
                    styles.indicator,
                    {
                      width: widthInterpolation,
                      backgroundColor:
                        index === currentIndex
                          ? Colors.evergreenTeal
                          : Colors.silverSage,
                    },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3 Wins Modal */}
      <Portal>
        <Modal
          visible={winsModalVisible}
          onDismiss={() => {
            Keyboard.dismiss();
            setWinsModalVisible(false);
          }}
          contentContainerStyle={styles.winsModal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            3 Wins from Today
          </Text>
          <Text variant="bodyMedium" style={styles.modalDescription}>
            Celebrate small accomplishments! (Optional - or just mark complete)
          </Text>

          <ScrollView
            style={styles.winsScrollView}
            contentContainerStyle={styles.winsScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TextInput
              label="Win #1"
              value={win1}
              onChangeText={setWin1}
              mode="outlined"
              style={styles.input}
              placeholder="Made my bed, did the dishes, etc."
              outlineColor={Colors.border}
              activeOutlineColor={Colors.evergreenTeal}
              returnKeyType="next"
            />
            <TextInput
              label="Win #2"
              value={win2}
              onChangeText={setWin2}
              mode="outlined"
              style={styles.input}
              placeholder="Small wins count!"
              outlineColor={Colors.border}
              activeOutlineColor={Colors.evergreenTeal}
              returnKeyType="next"
            />
            <TextInput
              label="Win #3"
              value={win3}
              onChangeText={setWin3}
              mode="outlined"
              style={styles.input}
              placeholder="Any progress is progress"
              outlineColor={Colors.border}
              activeOutlineColor={Colors.evergreenTeal}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
          </ScrollView>

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={handleMarkWinsWithoutWriting}
              style={styles.modalButton}
              textColor={Colors.evergreenTeal}
            >
              Mark Complete
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveWins}
              style={styles.modalButton}
              buttonColor={Colors.evergreenTeal}
            >
              Save Wins
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* 2 Fuel Modal */}
      <Portal>
        <Modal
          visible={fuelModalVisible}
          onDismiss={() => setFuelModalVisible(false)}
          contentContainerStyle={styles.fuelModal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            How Did You Fuel Your Body?
          </Text>
          <Text variant="bodyMedium" style={styles.modalDescription}>
            Select at least 2 ways you nourished yourself today
          </Text>

          <View style={styles.optionsGrid}>
            {BODY_FUEL_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                icon={option.icon}
                selected={selectedFuelOptions.includes(option.value)}
                onPress={() => handleToggleFuelOption(option.value)}
                style={[
                  styles.optionChip,
                  selectedFuelOptions.includes(option.value) &&
                    styles.optionChipSelected,
                ]}
                selectedColor={Colors.evergreenTeal}
                textStyle={styles.optionChipText}
              >
                {option.label}
              </Chip>
            ))}
          </View>

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setFuelModalVisible(false)}
              style={styles.modalButton}
              textColor={Colors.textSecondary}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSaveFuel}
              style={styles.modalButton}
              buttonColor={Colors.evergreenTeal}
              disabled={selectedFuelOptions.length < 2}
            >
              Save ({selectedFuelOptions.length}/2)
            </Button>
          </View>
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 32,
  },
  headerContainer: {
    paddingHorizontal: 20,
    marginBottom: Spacing.base,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  sectionBadge: {
    backgroundColor: Colors.dewSage,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.lg,
  },
  sectionBadgeText: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.sunriseAmber + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.sm,
    gap: 3,
  },
  streakText: {
    color: Colors.sunriseAmber,
    fontSize: 12,
    fontWeight: Typography.fontWeight.semibold,
  },
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '15',
    padding: Spacing.sm,
    marginHorizontal: 20,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Spacing.base,
    gap: Spacing.xs,
  },
  completionText: {
    color: Colors.success,
    fontWeight: Typography.fontWeight.medium,
    fontSize: 14,
    flex: 1,
  },
  carouselContent: {
    paddingHorizontal: 20,
  },
  carouselCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginRight: 8,
    ...Platform.select({
      ios: {
        shadowColor: Colors.evergreenTeal,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardContent: {
    padding: 24,
    alignItems: 'center',
  },
  practiceNumber: {
    fontSize: 48,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.evergreenTeal,
    marginBottom: 4,
  },
  practiceNumberCompleted: {
    opacity: 0.5,
  },
  practiceTitle: {
    fontSize: 18,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    textAlign: 'center',
    marginBottom: 4,
  },
  practiceDescription: {
    fontSize: 14,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  completeButton: {
    backgroundColor: Colors.dewSage,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  completeButtonDone: {
    backgroundColor: Colors.evergreenTeal + '15',
  },
  completeButtonText: {
    color: Colors.evergreenTeal,
    fontSize: 14,
    fontWeight: Typography.fontWeight.medium,
  },
  completeButtonTextDone: {
    color: Colors.evergreenTeal,
    fontSize: 14,
    fontWeight: Typography.fontWeight.medium,
  },
  completedButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.base,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  loadingCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  loadingText: {
    color: Colors.textSecondary,
  },
  // Modal styles
  winsModal: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
  },
  winsScrollView: {
    maxHeight: 250,
    marginVertical: Spacing.base,
  },
  winsScrollContent: {
    paddingBottom: Spacing.sm,
  },
  fuelModal: {
    backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
    color: Colors.textPrimary,
  },
  modalDescription: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  input: {
    marginBottom: Spacing.base,
    backgroundColor: Colors.white,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.base,
  },
  modalButton: {
    flex: 1,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginVertical: Spacing.base,
  },
  optionChip: {
    marginBottom: Spacing.xs,
  },
  optionChipSelected: {
    backgroundColor: Colors.evergreenTeal + '20',
  },
  optionChipText: {
    fontSize: Typography.fontSize.sm,
  },
});

export default FourThreeTwoOneCarousel;
