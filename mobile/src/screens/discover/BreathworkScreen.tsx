/**
 * Breathwork Screen
 * Enhanced breathwork session browser with filtering, search, and expandable cards
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Animated,
  ScrollView,
  LayoutAnimation,
  Platform,
  UIManager,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing } from '../../constants';
import { useBreathwork, useBreathworkTracking } from '../../hooks';
import { LoadingSpinner } from '../../components';
import { BreathworkSession } from '../../services/firebase/library.service';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ==========================================
// CONSTANTS
// ==========================================

type CategoryFilter = 'All' | 'Relax' | 'Focus' | 'Sleep' | 'Energy';

const CATEGORY_FILTERS: { key: CategoryFilter; emoji?: string }[] = [
  { key: 'All' },
  { key: 'Relax', emoji: '🍃' },
  { key: 'Focus', emoji: '☀️' },
  { key: 'Sleep', emoji: '🌙' },
  { key: 'Energy', emoji: '⚡' },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; iconBg: string }> = {
  Relax: {
    bg: 'rgba(27, 94, 87, 0.10)',
    text: '#1B5E57',
    border: '#1B5E57',
    iconBg: 'rgba(27, 94, 87, 0.10)',
  },
  Focus: {
    bg: 'rgba(244, 197, 66, 0.15)',
    text: '#8B6914',
    border: '#F4C542',
    iconBg: 'rgba(244, 197, 66, 0.15)',
  },
  Sleep: {
    bg: 'rgba(74, 101, 114, 0.12)',
    text: '#4A6572',
    border: '#7A9DAD',
    iconBg: 'rgba(74, 101, 114, 0.12)',
  },
  Energy: {
    bg: 'rgba(245, 185, 113, 0.18)',
    text: '#B8652A',
    border: '#F5B971',
    iconBg: 'rgba(245, 185, 113, 0.18)',
  },
};

const ACTIVE_CHIP_COLORS: Record<CategoryFilter, { bg: string; text: string }> = {
  All: { bg: '#1B5E57', text: '#FFFFFF' },
  Relax: { bg: '#1B5E57', text: '#FFFFFF' },
  Focus: { bg: '#F4C542', text: '#FFFFFF' },
  Sleep: { bg: '#7A9DAD', text: '#FFFFFF' },
  Energy: { bg: '#F5B971', text: '#FFFFFF' },
};

const CATEGORY_ICONS: Record<string, string> = {
  Relax: 'leaf',
  Focus: 'white-balance-sunny',
  Sleep: 'moon-waning-crescent',
  Energy: 'lightning-bolt',
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
};

const getContextualGreeting = (): string => {
  const timeOfDay = getTimeOfDay();
  switch (timeOfDay) {
    case 'morning':
      return 'Good morning — try an energizing session to start your day';
    case 'afternoon':
      return 'Afternoon — a quick reset can support your focus';
    case 'evening':
      return 'Evening — a calming session can help you wind down';
    case 'night':
      return 'Late night — gentle breathing can prepare your mind for rest';
  }
};

const getRecommendedPurpose = (): 'Focus' | 'Sleep' => {
  const timeOfDay = getTimeOfDay();
  return timeOfDay === 'evening' || timeOfDay === 'night' ? 'Sleep' : 'Focus';
};

// ==========================================
// COMPONENTS
// ==========================================

// Collapsible Search Bar
interface SearchBarProps {
  visible: boolean;
  value: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ visible, value, onChangeText, onClose }) => {
  const inputRef = useRef<TextInput>(null);
  const animatedHeight = useRef(new Animated.Value(0)).current;
  const animatedOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animatedHeight, {
        toValue: visible ? 56 : 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(animatedOpacity, {
        toValue: visible ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start();

    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  return (
    <Animated.View style={[styles.searchContainer, { height: animatedHeight, opacity: animatedOpacity }]}>
      <View style={styles.searchInputWrapper}>
        <Icon name="magnify" size={20} color={Colors.mutedSageGray} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder="Search exercises..."
          placeholderTextColor={Colors.mutedSageGray}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearButton}>
            <Icon name="close-circle" size={18} color={Colors.mutedSageGray} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

// Category Filter Chips
interface FilterChipsProps {
  activeFilter: CategoryFilter;
  onFilterChange: (filter: CategoryFilter) => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({ activeFilter, onFilterChange }) => {
  const handlePress = (filter: CategoryFilter) => {
    Haptics.selectionAsync();
    onFilterChange(filter);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterChipsContainer}
    >
      {CATEGORY_FILTERS.map(({ key, emoji }) => {
        const isActive = activeFilter === key;
        const colors = ACTIVE_CHIP_COLORS[key];

        return (
          <TouchableOpacity
            key={key}
            onPress={() => handlePress(key)}
            style={[
              styles.filterChip,
              isActive && { backgroundColor: colors.bg, borderColor: colors.bg },
            ]}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, isActive && { color: colors.text }]}>
              {emoji ? `${emoji} ${key}` : key}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

// Difficulty Indicator
interface DifficultyIndicatorProps {
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

const DifficultyIndicator: React.FC<DifficultyIndicatorProps> = ({ difficulty }) => {
  const level = difficulty === 'beginner' ? 1 : difficulty === 'intermediate' ? 2 : 3;
  const label = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  return (
    <View style={styles.difficultyContainer}>
      <Text style={styles.difficultyLabel}>{label}</Text>
      <View style={styles.difficultyDots}>
        {[1, 2, 3].map((dot) => (
          <View
            key={dot}
            style={[
              styles.difficultyDot,
              dot <= level ? styles.difficultyDotFilled : styles.difficultyDotEmpty,
            ]}
          />
        ))}
      </View>
    </View>
  );
};

// Breathing Pattern Preview
interface BreathingPatternProps {
  pattern: string;
}

const BreathingPattern: React.FC<BreathingPatternProps> = ({ pattern }) => (
  <View style={styles.breathingPatternContainer}>
    <Text style={styles.breathingPatternText}>{pattern}</Text>
  </View>
);

// Completed Today Badge
const CompletedTodayBadge: React.FC = () => (
  <View style={styles.completedBadge}>
    <View style={styles.completedCheckmark}>
      <Icon name="check" size={10} color={Colors.evergreenTeal} />
    </View>
    <Text style={styles.completedText}>Completed today</Text>
  </View>
);

// Session Card
interface SessionCardProps {
  session: BreathworkSession;
  isExpanded: boolean;
  isFeatured: boolean;
  isFavorite: boolean;
  isCompletedToday: boolean;
  onPress: () => void;
  onFavoritePress: () => void;
  onBeginPress: () => void;
  animationDelay: number;
}

const SessionCard: React.FC<SessionCardProps> = ({
  session,
  isExpanded,
  isFeatured,
  isFavorite,
  isCompletedToday,
  onPress,
  onFavoritePress,
  onBeginPress,
  animationDelay,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const categoryColors = CATEGORY_COLORS[session.purpose] || CATEGORY_COLORS.Relax;
  const categoryIcon = CATEGORY_ICONS[session.purpose] || 'leaf';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        delay: animationDelay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: animationDelay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animationDelay]);

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const truncateDescription = (text: string, maxLength: number = 75) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const formatIcon = session.type === 'Guided' ? 'headphones' : 'timer-outline';

  return (
    <Animated.View
      style={[
        { opacity: fadeAnim, transform: [{ translateY }, { scale: scaleAnim }] },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[
          styles.card,
          isFeatured && styles.cardFeatured,
          { borderLeftColor: categoryColors.border },
        ]}
      >
        {isFeatured ? (
          <LinearGradient
            colors={['#FFFFFF', 'rgba(213, 227, 209, 0.27)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.cardGradient, { borderLeftColor: categoryColors.border }]}
          >
            <CardContent
              session={session}
              isExpanded={isExpanded || isFeatured}
              isFeatured={isFeatured}
              isFavorite={isFavorite}
              isCompletedToday={isCompletedToday}
              categoryColors={categoryColors}
              categoryIcon={categoryIcon}
              formatIcon={formatIcon}
              truncateDescription={truncateDescription}
              onFavoritePress={onFavoritePress}
              onBeginPress={onBeginPress}
            />
          </LinearGradient>
        ) : (
          <CardContent
            session={session}
            isExpanded={isExpanded}
            isFeatured={isFeatured}
            isFavorite={isFavorite}
            isCompletedToday={isCompletedToday}
            categoryColors={categoryColors}
            categoryIcon={categoryIcon}
            formatIcon={formatIcon}
            truncateDescription={truncateDescription}
            onFavoritePress={onFavoritePress}
            onBeginPress={onBeginPress}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

// Card Content (shared between normal and featured cards)
interface CardContentProps {
  session: BreathworkSession;
  isExpanded: boolean;
  isFeatured: boolean;
  isFavorite: boolean;
  isCompletedToday: boolean;
  categoryColors: { bg: string; text: string; border: string; iconBg: string };
  categoryIcon: string;
  formatIcon: string;
  truncateDescription: (text: string, maxLength?: number) => string;
  onFavoritePress: () => void;
  onBeginPress: () => void;
}

const CardContent: React.FC<CardContentProps> = ({
  session,
  isExpanded,
  isFeatured,
  isFavorite,
  isCompletedToday,
  categoryColors,
  categoryIcon,
  formatIcon,
  truncateDescription,
  onFavoritePress,
  onBeginPress,
}) => {
  const iconSize = isFeatured ? 44 : 38;

  return (
    <View style={styles.cardInner}>
      {/* Favorite Button */}
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onFavoritePress();
        }}
        style={styles.favoriteButton}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <Icon
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={18}
          color={isFavorite ? '#E88B8B' : Colors.silverSage}
        />
      </TouchableOpacity>

      <View style={styles.cardRow}>
        {/* Category Icon */}
        <View
          style={[
            styles.categoryIcon,
            { backgroundColor: categoryColors.iconBg, width: iconSize, height: iconSize },
          ]}
        >
          <Icon name={categoryIcon as any} size={iconSize * 0.5} color={categoryColors.text} />
        </View>

        {/* Content */}
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{session.title}</Text>
          <Text style={styles.cardDescription} numberOfLines={isExpanded ? undefined : 2}>
            {isExpanded || isFeatured ? session.description : truncateDescription(session.description)}
          </Text>

          {/* Meta Row */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icon name="clock-outline" size={13} color={Colors.mutedSageGray} />
              <Text style={styles.metaText}>{session.duration}</Text>
            </View>

            <View style={[styles.purposeTag, { backgroundColor: categoryColors.bg }]}>
              <Text style={[styles.purposeTagText, { color: categoryColors.text }]}>
                {session.purpose}
              </Text>
            </View>

            <View style={styles.formatIndicator}>
              <Icon name={formatIcon} size={12} color={Colors.mutedSageGray} />
              <Text style={styles.formatText}>{session.type}</Text>
            </View>

            <DifficultyIndicator difficulty={session.difficulty} />
          </View>

          {/* Completed Today Badge */}
          {isCompletedToday && <CompletedTodayBadge />}

          {/* Expanded Content */}
          {(isExpanded || isFeatured) && (
            <View style={styles.expandedContent}>
              <BreathingPattern pattern={session.breathingPattern} />

              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onBeginPress();
                }}
                style={styles.ctaButton}
                activeOpacity={0.85}
              >
                <Text style={styles.ctaButtonText}>Begin when you're ready</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

// Empty State
const EmptyState: React.FC = () => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={[styles.emptyState, { opacity: fadeAnim }]}>
      <Text style={styles.emptyStateTitle}>No exercises found</Text>
      <Text style={styles.emptyStateSubtitle}>Try adjusting your filters or search</Text>
    </Animated.View>
  );
};

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function BreathworkScreen() {
  const navigation = useNavigation<any>();
  const { sessions, loading } = useBreathwork();
  const { isFavorite, isCompletedToday, toggleFavorite } = useBreathworkTracking();

  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('All');
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  const greetingFadeAnim = useRef(new Animated.Value(0)).current;

  // Animate greeting on mount
  useEffect(() => {
    Animated.timing(greetingFadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  // Get recommended session based on time of day
  const recommendedSession = useMemo(() => {
    if (!sessions || sessions.length === 0) return null;

    const recommendedPurpose = getRecommendedPurpose();

    // First try to find a featured session matching the recommended purpose
    const featuredMatch = sessions.find(
      (s) => s.featured && s.purpose === recommendedPurpose
    );
    if (featuredMatch) return featuredMatch;

    // Then try any session matching the recommended purpose
    const purposeMatch = sessions.find((s) => s.purpose === recommendedPurpose);
    if (purposeMatch) return purposeMatch;

    // Fallback to any featured session
    const anyFeatured = sessions.find((s) => s.featured);
    if (anyFeatured) return anyFeatured;

    // Fallback to first session
    return sessions[0];
  }, [sessions]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    if (!sessions) return [];

    let result = sessions;

    // Apply category filter
    if (activeFilter !== 'All') {
      result = result.filter((s) => s.purpose === activeFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.purpose.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query)
      );
    }

    // Remove recommended session from the list (it's shown separately)
    if (recommendedSession && activeFilter === 'All' && !searchQuery.trim()) {
      result = result.filter((s) => s.id !== recommendedSession.id);
    }

    return result;
  }, [sessions, activeFilter, searchQuery, recommendedSession]);

  const handleCardPress = useCallback((sessionId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCardId(expandedCardId === sessionId ? null : sessionId);
  }, [expandedCardId]);

  const handleBeginSession = useCallback((session: BreathworkSession) => {
    navigation.navigate('BreathworkDetail', { sessionId: session.id });
  }, [navigation]);

  const toggleSearch = useCallback(() => {
    setSearchVisible(!searchVisible);
    if (searchVisible) {
      setSearchQuery('');
    }
  }, [searchVisible]);

  if (loading) {
    return <LoadingSpinner message="Loading breathwork sessions..." />;
  }

  const showRecommended = activeFilter === 'All' && !searchQuery.trim() && recommendedSession;
  const sectionLabel = activeFilter === 'All' ? 'All Exercises' : `${activeFilter} Exercises`;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Search Icon in Header - This would be in the header, but we'll add it here for now */}
      <View style={styles.headerActions}>
        <TouchableOpacity
          onPress={toggleSearch}
          style={styles.searchToggleButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon
            name={searchVisible ? 'close' : 'magnify'}
            size={22}
            color={Colors.mutedSageGray}
          />
        </TouchableOpacity>
      </View>

      {/* Collapsible Search Bar */}
      <SearchBar
        visible={searchVisible}
        value={searchQuery}
        onChangeText={setSearchQuery}
        onClose={toggleSearch}
      />

      {/* Contextual Greeting */}
      <Animated.View style={[styles.greetingContainer, { opacity: greetingFadeAnim }]}>
        <Text style={styles.greetingText}>{getContextualGreeting()}</Text>
      </Animated.View>

      {/* Filter Chips */}
      <FilterChips activeFilter={activeFilter} onFilterChange={setActiveFilter} />

      {/* Content */}
      {filteredSessions.length === 0 && !showRecommended ? (
        <EmptyState />
      ) : (
        <FlatList
          data={filteredSessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            showRecommended ? (
              <View>
                <Text style={styles.sectionLabel}>RECOMMENDED FOR YOU</Text>
                <SessionCard
                  session={recommendedSession}
                  isExpanded={expandedCardId === recommendedSession.id}
                  isFeatured={true}
                  isFavorite={isFavorite(recommendedSession.id)}
                  isCompletedToday={isCompletedToday(recommendedSession.id)}
                  onPress={() => handleCardPress(recommendedSession.id)}
                  onFavoritePress={() => toggleFavorite(recommendedSession.id)}
                  onBeginPress={() => handleBeginSession(recommendedSession)}
                  animationDelay={0}
                />
                <Text style={[styles.sectionLabel, styles.sectionLabelWithMargin]}>
                  {sectionLabel.toUpperCase()}
                </Text>
              </View>
            ) : (
              <Text style={styles.sectionLabel}>{sectionLabel.toUpperCase()}</Text>
            )
          }
          renderItem={({ item, index }) => (
            <SessionCard
              session={item}
              isExpanded={expandedCardId === item.id}
              isFeatured={false}
              isFavorite={isFavorite(item.id)}
              isCompletedToday={isCompletedToday(item.id)}
              onPress={() => handleCardPress(item.id)}
              onFavoritePress={() => toggleFavorite(item.id)}
              onBeginPress={() => handleBeginSession(item)}
              animationDelay={(showRecommended ? index + 1 : index) * 80}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ==========================================
// STYLES
// ==========================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },

  // Header Actions
  headerActions: {
    position: 'absolute',
    top: 8,
    right: 16,
    zIndex: 10,
  },
  searchToggleButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Search Bar
  searchContainer: {
    paddingHorizontal: 24,
    overflow: 'hidden',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.softCharcoal,
  },
  clearButton: {
    padding: 4,
  },

  // Greeting
  greetingContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingLeft: 32,
    borderLeftWidth: 3,
    borderLeftColor: Colors.dewSage,
    marginLeft: 24,
    marginTop: 12,
  },
  greetingText: {
    fontSize: 14,
    color: Colors.mutedSageGray,
    lineHeight: 14 * 1.55,
  },

  // Filter Chips
  filterChipsContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: Colors.silverSage,
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.mutedSageGray,
  },

  // Section Labels
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.mutedSageGray,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 24,
  },
  sectionLabelWithMargin: {
    marginTop: 8,
  },

  // List
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    borderLeftWidth: 3.5,
    shadowColor: 'rgba(27, 94, 87, 0.05)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  cardFeatured: {
    borderLeftWidth: 4,
    shadowColor: 'rgba(27, 94, 87, 0.06)',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
  },
  cardGradient: {
    borderRadius: 16,
    borderLeftWidth: 4,
  },
  cardInner: {
    padding: 16,
    position: 'relative',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },

  // Category Icon
  categoryIcon: {
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Card Content
  cardContent: {
    flex: 1,
    paddingRight: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.softCharcoal,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.mutedSageGray,
    lineHeight: 14 * 1.5,
    marginBottom: 12,
  },

  // Meta Row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: Colors.mutedSageGray,
  },

  // Purpose Tag
  purposeTag: {
    paddingVertical: 2.5,
    paddingHorizontal: 9,
    borderRadius: 11,
  },
  purposeTagText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Format Indicator
  formatIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  formatText: {
    fontSize: 12,
    color: Colors.mutedSageGray,
  },

  // Difficulty
  difficultyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  difficultyLabel: {
    fontSize: 12,
    color: Colors.mutedSageGray,
  },
  difficultyDots: {
    flexDirection: 'row',
    gap: 3,
  },
  difficultyDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  difficultyDotFilled: {
    backgroundColor: 'rgba(111, 127, 119, 0.8)',
  },
  difficultyDotEmpty: {
    backgroundColor: 'rgba(184, 205, 186, 0.3)',
  },

  // Favorite Button
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Completed Badge
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  completedCheckmark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.evergreenTeal,
  },

  // Expanded Content
  expandedContent: {
    marginTop: 12,
  },

  // Breathing Pattern
  breathingPatternContainer: {
    backgroundColor: 'rgba(27, 94, 87, 0.08)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  breathingPatternText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.evergreenTeal,
    letterSpacing: 0.2,
  },

  // CTA Button
  ctaButton: {
    backgroundColor: Colors.evergreenTeal,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.mutedSageGray,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: Colors.silverSage,
    marginTop: 8,
  },
});
