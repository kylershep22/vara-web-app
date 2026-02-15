/**
 * Wellness Screen (formerly More Menu)
 * Personalized wellness hub with profile, insights, and tools
 */

import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useHabits } from '../hooks';

// ==========================================
// TYPES
// ==========================================

interface MenuItem {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconColor: string;
  gradientColors: [string, string];
  route: string;
  params?: object;
}

// ==========================================
// CONSTANTS
// ==========================================

const YOUR_TOOLS_ITEMS: MenuItem[] = [
  {
    id: 'insights',
    title: 'Insights',
    subtitle: 'Your wellness analytics',
    icon: 'chart-line',
    iconColor: '#1B5E57',
    gradientColors: ['#e4f4ed', '#d5e3d1'],
    route: 'Insights',
  },
  {
    id: 'brain-health',
    title: 'Brain Health',
    subtitle: 'Track your cognitive wellness',
    icon: 'brain',
    iconColor: '#1B5E57',
    gradientColors: ['#e4f4ed', '#d5e3d1'],
    route: 'BrainHealth',
  },
  {
    id: 'journal',
    title: 'Journal',
    subtitle: 'Reflect with AI-guided prompts',
    icon: 'book-open-page-variant',
    iconColor: '#C17F24',
    gradientColors: ['#fef3e0', '#fde8c8'],
    route: 'Journal',
  },
  {
    id: 'breathwork',
    title: 'Breathwork',
    subtitle: 'Guided breathing exercises',
    icon: 'circle-multiple-outline',
    iconColor: '#4A7BC5',
    gradientColors: ['#e8f0fe', '#d4e4fc'],
    route: 'Breathwork',
  },
  {
    id: 'sleep',
    title: 'Sleep',
    subtitle: 'Rest & recovery tools',
    icon: 'moon-waning-crescent',
    iconColor: '#7B6BA5',
    gradientColors: ['#ede8f5', '#ddd6eb'],
    route: 'Sleep',
  },
  {
    id: 'movement',
    title: 'Movement',
    subtitle: 'Exercise & mobility routines',
    icon: 'run',
    iconColor: '#3D8B6E',
    gradientColors: ['#e4f4ed', '#d1ebe0'],
    route: 'Movement',
  },
  {
    id: 'masterclass',
    title: 'Masterclass',
    subtitle: 'Expert wellness education',
    icon: 'school-outline',
    iconColor: '#B8860B',
    gradientColors: ['#fef6e4', '#fdecd0'],
    route: 'Masterclass',
  },
  {
    id: 'wearables',
    title: 'Wearables',
    subtitle: 'Coming soon — sync your devices',
    icon: 'watch',
    iconColor: Colors.mutedSageGray,
    gradientColors: ['#f0f2f0', '#e5e8e5'],
    route: 'WearableIntegration',
  },
];

const ACCOUNT_ITEMS: MenuItem[] = [
  {
    id: 'settings',
    title: 'Settings',
    subtitle: 'Preferences & notifications',
    icon: 'cog-outline',
    iconColor: Colors.mutedSageGray,
    gradientColors: ['#f0f2ee', '#e8ebe5'],
    route: 'ProfileStack',
    params: { screen: 'Settings' },
  },
  {
    id: 'help',
    title: 'Help & Support',
    subtitle: 'FAQs, feedback & contact',
    icon: 'help-circle-outline',
    iconColor: Colors.mutedSageGray,
    gradientColors: ['#f0f2ee', '#e8ebe5'],
    route: 'HelpSupport',
  },
];

// ==========================================
// HELPER FUNCTIONS
// ==========================================

const getTimeGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const getFirstName = (displayName: string | null | undefined): string => {
  if (!displayName) return 'there';
  return displayName.split(' ')[0];
};

const getInitial = (displayName: string | null | undefined): string => {
  if (!displayName) return '?';
  return displayName.charAt(0).toUpperCase();
};

// ==========================================
// COMPONENTS
// ==========================================

interface AvatarRingProps {
  initial: string;
}

const AvatarRing: React.FC<AvatarRingProps> = ({ initial }) => (
  <View style={styles.avatarContainer} accessibilityLabel={`Profile photo for ${initial}`}>
    <LinearGradient
      colors={[Colors.dewSage, Colors.silverSage]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.avatarGradient}
    >
      <View style={styles.avatarInner}>
        <Text style={styles.avatarInitial}>{initial}</Text>
      </View>
    </LinearGradient>
  </View>
);

interface InsightStripProps {
  consecutiveDays: number;
  hasActivity: boolean;
}

const InsightStrip: React.FC<InsightStripProps> = ({ consecutiveDays, hasActivity }) => {
  let boldText = '';
  let regularText = '';

  if (consecutiveDays >= 3) {
    boldText = `${consecutiveDays}-day rhythm`;
    regularText = ` — you've checked in ${consecutiveDays} days in a row. Steady pace builds lasting patterns.`;
  } else if (consecutiveDays > 0) {
    boldText = 'Building momentum';
    regularText = ` — ${consecutiveDays} day${consecutiveDays > 1 ? 's' : ''} of activity. Every check-in strengthens the habit.`;
  } else if (hasActivity) {
    boldText = 'Welcome back';
    regularText = ' — picking up where you left off is a sign of resilience, not failure.';
  } else {
    boldText = 'Did you know?';
    regularText = ' — Small, consistent actions support your brain more than occasional intense effort.';
  }

  return (
    <LinearGradient
      colors={['#D5E3D1', 'rgba(213, 227, 209, 0.4)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.insightStrip}
    >
      <View style={styles.insightIconContainer}>
        <Icon name="clock-outline" size={18} color={Colors.evergreenTeal} />
      </View>
      <Text style={styles.insightText}>
        <Text style={styles.insightTextBold}>{boldText}</Text>
        {regularText}
      </Text>
    </LinearGradient>
  );
};

interface MenuItemRowProps {
  item: MenuItem;
  onPress: () => void;
  isLast: boolean;
  animatedStyle: object;
}

const MenuItemRow: React.FC<MenuItemRowProps> = ({ item, onPress, isLast, animatedStyle }) => (
  <Animated.View style={animatedStyle}>
    <TouchableOpacity
      style={[styles.menuItem, !isLast && styles.menuItemWithDivider]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.title}: ${item.subtitle}`}
    >
      <LinearGradient
        colors={item.gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.menuIconContainer}
      >
        <Icon name={item.icon as any} size={22} color={item.iconColor} />
      </LinearGradient>
      <View style={styles.menuContent}>
        <Text style={styles.menuTitle}>{item.title}</Text>
        <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={20} color="#d0d0d0" />
    </TouchableOpacity>
    {!isLast && <View style={styles.divider} />}
  </Animated.View>
);

interface SectionProps {
  label: string;
  items: MenuItem[];
  onItemPress: (item: MenuItem) => void;
  startIndex: number;
  animations: Animated.Value[];
}

const Section: React.FC<SectionProps> = ({ label, items, onItemPress, startIndex, animations }) => (
  <View style={styles.section}>
    <Text style={styles.sectionLabel} accessibilityRole="header">
      {label}
    </Text>
    <View style={styles.cardGroup}>
      {items.map((item, index) => (
        <MenuItemRow
          key={item.id}
          item={item}
          onPress={() => onItemPress(item)}
          isLast={index === items.length - 1}
          animatedStyle={{
            opacity: animations[startIndex + index],
            transform: [
              {
                translateY: animations[startIndex + index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          }}
        />
      ))}
    </View>
  </View>
);

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function MoreMenuScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { habits } = useHabits();

  // Calculate consecutive days from habit completions
  const { consecutiveDays, hasActivity } = useMemo(() => {
    if (!habits || habits.length === 0) {
      return { consecutiveDays: 0, hasActivity: false };
    }

    // Check if user has any habits with completions
    const hasAnyActivity = habits.some(h => h.currentStreak && h.currentStreak > 0);

    // Find the maximum current streak across all habits
    const maxStreak = habits.reduce((max, habit) => {
      return Math.max(max, habit.currentStreak || 0);
    }, 0);

    return {
      consecutiveDays: maxStreak,
      hasActivity: hasAnyActivity || habits.length > 0,
    };
  }, [habits]);

  // Animation setup
  const totalItems = YOUR_TOOLS_ITEMS.length + ACCOUNT_ITEMS.length + 2; // +2 for hero and insight
  const animations = useRef(
    Array.from({ length: totalItems }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const staggeredAnimations = animations.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 250,
        delay: index * 50,
        useNativeDriver: true,
      })
    );

    Animated.stagger(50, staggeredAnimations).start();
  }, []);

  const handleItemPress = (item: MenuItem) => {
    if (item.params) {
      navigation.navigate(item.route, item.params);
    } else {
      navigation.navigate(item.route);
    }
  };

  const handleEditProfile = () => {
    navigation.navigate('ProfileStack', { screen: 'EditProfile' });
  };

  const firstName = getFirstName(user?.displayName);
  const initial = getInitial(user?.displayName);
  const greeting = getTimeGreeting();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero Section */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              opacity: animations[0],
              transform: [
                {
                  translateY: animations[0].interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <AvatarRing initial={initial} />
          <View style={styles.heroContent}>
            <Text style={styles.greeting}>
              {greeting}, {firstName}
            </Text>
            {user?.email && (
              <Text style={styles.email}>{user.email}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditProfile}
            activeOpacity={0.7}
            accessibilityLabel="Edit profile"
            accessibilityRole="button"
          >
            <Icon name="pencil-outline" size={18} color={Colors.evergreenTeal} />
          </TouchableOpacity>
        </Animated.View>

        {/* Brain-Health Insight Strip */}
        <Animated.View
          style={{
            opacity: animations[1],
            transform: [
              {
                translateY: animations[1].interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          }}
        >
          <InsightStrip
            consecutiveDays={consecutiveDays}
            hasActivity={hasActivity}
          />
        </Animated.View>

        {/* Your Tools Section */}
        <Section
          label="YOUR TOOLS"
          items={YOUR_TOOLS_ITEMS}
          onItemPress={handleItemPress}
          startIndex={2}
          animations={animations}
        />

        {/* Account Section */}
        <Section
          label="ACCOUNT"
          items={ACCOUNT_ITEMS}
          onItemPress={handleItemPress}
          startIndex={2 + YOUR_TOOLS_ITEMS.length}
          animations={animations}
        />
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },

  // Hero Section
  heroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.base,
    paddingBottom: Spacing.lg,
    gap: 16,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    padding: 3,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 25,
    backgroundColor: Colors.mistWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.evergreenTeal,
  },
  heroContent: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.softCharcoal,
  },
  email: {
    fontSize: 13,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(27, 94, 87, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Insight Strip
  insightStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    paddingHorizontal: 18,
    marginBottom: Spacing.lg,
  },
  insightIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(27, 94, 87, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  insightText: {
    flex: 1,
    fontSize: 13,
    color: Colors.evergreenTeal,
    lineHeight: 18,
  },
  insightTextBold: {
    fontWeight: '600',
  },

  // Section
  section: {
    marginTop: Spacing.base,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.mutedSageGray,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  cardGroup: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
    overflow: 'hidden',
  },

  // Menu Item
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    minHeight: 68,
  },
  menuItemWithDivider: {},
  menuIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.softCharcoal,
  },
  menuSubtitle: {
    fontSize: 12,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(27, 94, 87, 0.06)',
    marginLeft: 70,
    marginRight: 18,
  },
});
