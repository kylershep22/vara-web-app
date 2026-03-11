/**
 * App Navigator
 * Root navigation component with auth flow
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import { LoadingSpinner } from '../components';
import { Colors } from '../constants';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { AIAssistantFAB } from '../components/ai/AIAssistantFAB';
import { useGoals, useHabits, useTasks, useSubscription } from '../hooks';
import { linking } from './linking';

// Auth screens
import {
  LoginScreen,
  SignupScreen,
  ForgotPasswordScreen,
  EmailVerificationScreen,
} from '../screens/auth';

// App screens
import DashboardScreen from '../screens/DashboardScreen';
import BrainHealthDashboard from '../screens/BrainHealthDashboard';
import MoreMenuScreen from '../screens/MoreMenuScreen';
import PlanScreen from '../screens/PlanScreen';
import { FocusScreen } from '../screens/Focus';
import JournalScreen from '../screens/JournalScreen';
import InsightsScreen from '../screens/InsightsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import MutedAccountsScreen from '../screens/MutedAccountsScreen';
import NotificationOptInScreen from '../screens/NotificationOptInScreen';
import ConversationsScreen from '../screens/ConversationsScreen';
import ChatScreen from '../screens/ChatScreen';
import PaywallScreen from '../screens/PaywallScreen';
import RedeemCodeScreen from '../screens/RedeemCodeScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import HabitDetailScreen from '../screens/HabitDetailScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import WearableIntegrationScreen from '../screens/WearableIntegrationScreen';
import {
  CommunityScreen,
  GroupsScreen,
  GroupDetailScreen,
  ChallengesScreen,
  ChallengeDetailScreen,
  PeopleScreen,
  MessagesScreen,
  UserProfileScreen,
  ReportReasonScreen,
  ReportDetailScreen,
  ReportConfirmationScreen,
} from '../screens/community';

// Onboarding screens (new streamlined flow)
import {
  OnboardingWelcomeScreen,
  OnboardingCheckInScreen,
  OnboardingInsightScreen,
  OnboardingActivityScreen,
  OnboardingConfirmationScreen,
  OnboardingValuesScreen,
  OnboardingPersonalizedEntryScreen,
} from '../screens/onboarding';

// Discover screens
import {
  DiscoverScreen,
  BreathworkScreen,
  BreathworkDetailScreen,
  SleepScreen,
  SleepDetailScreen,
  MovementScreen,
  MovementDetailScreen,
  MasterclassScreen,
  MasterclassDetailScreen,
} from '../screens/discover';

// Create navigators
const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();
const OnboardingStack = createNativeStackNavigator();
const CommunityStack = createNativeStackNavigator();
const DiscoverStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const BottomTabs = createBottomTabNavigator();
const PaywallStack = createNativeStackNavigator();

/**
 * Onboarding Stack Navigator
 * Streamlined 6-screen onboarding flow for new users
 * Flow: Welcome → Check-in → Insight (aha!) → Activity → Values → Personalized Entry → Home
 */
const OnboardingNavigator = () => {
  return (
    <OnboardingStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <OnboardingStack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
      <OnboardingStack.Screen name="OnboardingCheckIn" component={OnboardingCheckInScreen} />
      <OnboardingStack.Screen name="OnboardingInsight" component={OnboardingInsightScreen} />
      <OnboardingStack.Screen name="OnboardingActivity" component={OnboardingActivityScreen} />
      <OnboardingStack.Screen name="OnboardingValues" component={OnboardingValuesScreen} />
      <OnboardingStack.Screen name="OnboardingPersonalizedEntry" component={OnboardingPersonalizedEntryScreen} />
    </OnboardingStack.Navigator>
  );
};

/**
 * Paywall Stack Navigator
 * Screens shown when subscription has expired
 */
const PaywallNavigator = () => {
  return (
    <PaywallStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <PaywallStack.Screen name="Paywall" component={PaywallScreen} />
      <PaywallStack.Screen name="RedeemCode" component={RedeemCodeScreen} />
    </PaywallStack.Navigator>
  );
};

/**
 * Auth Stack Navigator
 * Screens for unauthenticated users
 */
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
};

/**
 * Community Stack Navigator
 * Navigation for community features
 */
const CommunityNavigator = () => {
  return (
    <CommunityStack.Navigator
      screenOptions={{
        animation: 'slide_from_right',
        headerStyle: {
          backgroundColor: Colors.evergreenTeal,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '700',
        },
        headerBackTitleVisible: false,
      }}
    >
      <CommunityStack.Screen
        name="CommunityMain"
        component={CommunityScreen}
        options={{
          headerShown: false, // Community has custom header
        }}
      />
      <CommunityStack.Screen
        name="Groups"
        component={GroupsScreen}
        options={{
          headerShown: false, // GroupsScreen has custom header
        }}
      />
      <CommunityStack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={{
          headerShown: false, // GroupDetailScreen has custom header
        }}
      />
      <CommunityStack.Screen
        name="Challenges"
        component={ChallengesScreen}
        options={{
          headerShown: false, // ChallengesScreen has custom header
        }}
      />
      <CommunityStack.Screen
        name="ChallengeDetail"
        component={ChallengeDetailScreen}
        options={{
          headerShown: false, // ChallengeDetailScreen has custom header
        }}
      />
      <CommunityStack.Screen
        name="People"
        component={PeopleScreen}
        options={{
          headerShown: false, // PeopleScreen has custom header
        }}
      />
      <CommunityStack.Screen
        name="Conversations"
        component={ConversationsScreen}
        options={{
          headerShown: false, // MessagesScreen has custom header
        }}
      />
      <CommunityStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          headerShown: true,
          headerBackTitleVisible: false,
        }}
      />
      <CommunityStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{
          headerShown: false, // UserProfileScreen has custom header
        }}
      />
      <CommunityStack.Screen
        name="ReportReason"
        component={ReportReasonScreen}
        options={{ headerShown: false }}
      />
      <CommunityStack.Screen
        name="ReportDetail"
        component={ReportDetailScreen}
        options={{ headerShown: false }}
      />
      <CommunityStack.Screen
        name="ReportConfirmation"
        component={ReportConfirmationScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
    </CommunityStack.Navigator>
  );
};

/**
 * Discover Stack Navigator
 * Navigation for wellness library content
 */
const DiscoverNavigator = () => {
  return (
    <DiscoverStack.Navigator
      screenOptions={{
        animation: 'slide_from_right',
        headerStyle: {
          backgroundColor: Colors.evergreenTeal,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '700',
        },
      }}
    >
      <DiscoverStack.Screen
        name="DiscoverMain"
        component={DiscoverScreen}
        options={{
          headerShown: false, // Custom header in component
        }}
      />
      <DiscoverStack.Screen
        name="Breathwork"
        component={BreathworkScreen}
        options={{ title: 'Breathwork' }}
      />
      <DiscoverStack.Screen
        name="BreathworkDetail"
        component={BreathworkDetailScreen}
        options={{ title: 'Session Details' }}
      />
      <DiscoverStack.Screen
        name="Sleep"
        component={SleepScreen}
        options={{ title: 'Sleep Library' }}
      />
      <DiscoverStack.Screen
        name="SleepDetail"
        component={SleepDetailScreen}
        options={{ title: 'Sleep Content' }}
      />
      <DiscoverStack.Screen
        name="Movement"
        component={MovementScreen}
        options={{ title: 'Movement Library' }}
      />
      <DiscoverStack.Screen
        name="MovementDetail"
        component={MovementDetailScreen}
        options={{ title: 'Workout Details' }}
      />
      <DiscoverStack.Screen
        name="Masterclass"
        component={MasterclassScreen}
        options={{ title: 'Masterclasses' }}
      />
      <DiscoverStack.Screen
        name="MasterclassDetail"
        component={MasterclassDetailScreen}
        options={{ title: 'Class Details' }}
      />
    </DiscoverStack.Navigator>
  );
};

/**
 * Profile Stack Navigator
 * Navigation for profile and settings
 */
const ProfileNavigator = () => {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        animation: 'slide_from_right',
      }}
    >
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          headerStyle: {
            backgroundColor: Colors.evergreenTeal,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          headerStyle: {
            backgroundColor: Colors.evergreenTeal,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: '700',
          },
        }}
      />
      <ProfileStack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={{
          headerShown: false, // NotificationSettingsScreen has its own header
        }}
      />
      <ProfileStack.Screen
        name="MutedAccounts"
        component={MutedAccountsScreen}
        options={{
          headerShown: false,
        }}
      />
    </ProfileStack.Navigator>
  );
};

/**
 * Bottom Tabs Navigator
 * Main app navigation with 5 bottom tabs
 */
const BottomTabsNavigator = () => {
  return (
    <BottomTabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.evergreenTeal,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.borderLight,
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 62,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <BottomTabs.Screen
        name="Home"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <BottomTabs.Screen
        name="Track"
        component={PlanScreen}
        options={{
          tabBarLabel: 'Track',
          tabBarIcon: ({ color, size }) => (
            <Icon name="clipboard-check" size={size} color={color} />
          ),
        }}
      />
      <BottomTabs.Screen
        name="Focus"
        component={FocusScreen}
        options={{
          tabBarLabel: 'Focus',
          tabBarIcon: ({ color, size }) => (
            <Icon name="timer-outline" size={size} color={color} />
          ),
        }}
      />
      <BottomTabs.Screen
        name="Community"
        component={CommunityNavigator}
        options={{
          tabBarLabel: 'Community',
          tabBarIcon: ({ color, size }) => (
            <Icon name="account-group" size={size} color={color} />
          ),
        }}
      />
      <BottomTabs.Screen
        name="Wellness"
        component={MoreMenuScreen}
        options={{
          tabBarLabel: 'Wellness',
          tabBarIcon: ({ color, size }) => (
            <Icon name="leaf" size={size} color={color} />
          ),
        }}
      />
    </BottomTabs.Navigator>
  );
};

/**
 * App Stack Navigator
 * Screens for authenticated users
 */
const MainNavigator = () => {
  // Call hooks at top level (required by Rules of Hooks)
  // Provide safe defaults if data isn't available yet
  const goalsData = useGoals();
  const habitsData = useHabits();
  const tasksData = useTasks();

  // Track current active tab to conditionally show/hide AI FAB
  const [activeTab, setActiveTab] = React.useState<string>('Home');

  // Safely extract data with fallbacks
  const goals = goalsData?.goals || [];
  const habits = habitsData?.habits || [];
  const tasks = tasksData?.tasks || [];

  // Hide AI FAB on Community tab (community screens have their own action buttons)
  const showAIFab = activeTab !== 'Community';

  return (
    <>
      <AppStack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        screenListeners={{
          state: (e) => {
            // Track active bottom tab for FAB visibility
            const routes = e.data.state?.routes;
            if (routes && routes.length > 0) {
              const topRoute = routes[routes.length - 1];
              // If on Main (BottomTabs), check which tab is active
              if (topRoute.name === 'Main' && topRoute.state) {
                const tabRoutes = topRoute.state.routes;
                const tabIndex = topRoute.state.index ?? 0;
                if (tabRoutes && tabRoutes[tabIndex]) {
                  setActiveTab(tabRoutes[tabIndex].name);
                }
              }
            }
          },
        }}
      >
        <AppStack.Screen name="Main" component={BottomTabsNavigator} />
        {/* Discover Navigator - Accessible from More menu */}
        <AppStack.Screen
          name="DiscoverNavigator"
          component={DiscoverNavigator}
          options={{
            animation: 'slide_from_right',
          }}
        />
        {/* Insights - Accessible from Wellness menu */}
        <AppStack.Screen
          name="Insights"
          component={InsightsScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Insights',
            headerStyle: { backgroundColor: Colors.evergreenTeal },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        {/* Brain Health - Accessible from Wellness menu */}
        <AppStack.Screen
          name="BrainHealth"
          component={BrainHealthDashboard}
          options={{
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Brain Health',
            headerStyle: { backgroundColor: Colors.evergreenTeal },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        {/* Journal - Accessible from Wellness menu */}
        <AppStack.Screen
          name="Journal"
          component={JournalScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: false,
          }}
        />
        {/* Breathwork - Accessible from Wellness menu */}
        <AppStack.Screen
          name="Breathwork"
          component={BreathworkScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Breathwork',
            headerStyle: { backgroundColor: Colors.evergreenTeal },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <AppStack.Screen
          name="BreathworkDetail"
          component={BreathworkDetailScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Session Details',
            headerStyle: { backgroundColor: Colors.evergreenTeal },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        {/* Sleep - Accessible from Wellness menu */}
        <AppStack.Screen
          name="Sleep"
          component={SleepScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Sleep Library',
            headerStyle: { backgroundColor: Colors.evergreenTeal },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <AppStack.Screen
          name="SleepDetail"
          component={SleepDetailScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Sleep Content',
            headerStyle: { backgroundColor: Colors.evergreenTeal },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        {/* Movement - Accessible from Wellness menu */}
        <AppStack.Screen
          name="Movement"
          component={MovementScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Movement Library',
            headerStyle: { backgroundColor: Colors.evergreenTeal },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <AppStack.Screen
          name="MovementDetail"
          component={MovementDetailScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Workout Details',
            headerStyle: { backgroundColor: Colors.evergreenTeal },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        {/* Masterclass - Accessible from Wellness menu */}
        <AppStack.Screen
          name="Masterclass"
          component={MasterclassScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Masterclasses',
            headerStyle: { backgroundColor: Colors.evergreenTeal },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        <AppStack.Screen
          name="MasterclassDetail"
          component={MasterclassDetailScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Class Details',
            headerStyle: { backgroundColor: Colors.evergreenTeal },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        {/* Help & Support - Accessible from Wellness menu */}
        <AppStack.Screen
          name="HelpSupport"
          component={HelpSupportScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: false,
          }}
        />
        {/* Wearable Integration - Coming Soon */}
        <AppStack.Screen
          name="WearableIntegration"
          component={WearableIntegrationScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Wearables',
            headerStyle: { backgroundColor: Colors.evergreenTeal },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        {/* Habit Detail - Accessible from Plan/Track screen */}
        <AppStack.Screen
          name="HabitDetail"
          component={HabitDetailScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Habit Details',
            headerStyle: { backgroundColor: Colors.evergreenTeal },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        {/* Task Detail - Accessible from Plan/Track screen */}
        <AppStack.Screen
          name="TaskDetail"
          component={TaskDetailScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Task Details',
            headerStyle: { backgroundColor: Colors.evergreenTeal },
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' },
          }}
        />
        {/* Profile screens accessible from anywhere */}
        <AppStack.Screen
          name="ProfileStack"
          component={ProfileNavigator}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
        {/* Notification opt-in (shown after first meaningful action) */}
        <AppStack.Screen
          name="NotificationOptIn"
          component={NotificationOptInScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
      </AppStack.Navigator>

      {/* Global AI Assistant FAB - Hidden on screens with their own FAB */}
      {showAIFab && (
        <AIAssistantFAB
          context={{
            screen: 'global',
            userGoals: goals.slice(0, 5),
            userHabits: habits.slice(0, 10),
            userTasks: tasks.slice(0, 10),
          }}
        />
      )}
    </>
  );
};

/**
 * Email Verification Navigator
 * For users who haven't verified their email
 */
const VerificationNavigator = () => {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AppStack.Screen name="EmailVerification" component={EmailVerificationScreen} />
    </AppStack.Navigator>
  );
};

/**
 * Root App Navigator
 * Conditionally renders auth, onboarding, or main app based on state
 */
const AppNavigator: React.FC = () => {
  const { user, isAuthReady, refreshCounter } = useAuth();
  const { status: subscriptionStatus, loading: subscriptionLoading } = useSubscription();
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = React.useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = React.useState(true);

  // Check if user has completed onboarding with real-time listener
  React.useEffect(() => {
    if (!user || !user.emailVerified) {
      setCheckingOnboarding(false);
      setHasCompletedOnboarding(null);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const setupOnboardingListener = async () => {
      try {
        setCheckingOnboarding(true);
        const { doc: firestoreDoc, onSnapshot, setDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('../config/firebase');

        if (!db) {
          console.error('Firestore not initialized - cannot check onboarding status');
          // Assume onboarding is complete to avoid blocking existing users
          setHasCompletedOnboarding(true);
          setCheckingOnboarding(false);
          return;
        }

        const userRef = firestoreDoc(db, 'users', user.uid);

        // Set up real-time listener for onboarding status
        let backfillDone = false;

        unsubscribe = onSnapshot(
          userRef,
          async (docSnapshot) => {
            if (docSnapshot.exists()) {
              const userData = docSnapshot.data();
              // Use !== false so existing users whose document predates
              // the onboarding system (field is undefined) are treated
              // as having completed onboarding.
              // Only users explicitly set to false (new signups) see onboarding.
              const completed = userData.hasCompletedOnboarding !== false;

              // Only update state if value actually changed to prevent re-render loops
              setHasCompletedOnboarding((prev) => {
                if (prev === completed) return prev;
                console.log('📱 Onboarding status updated:', userData.hasCompletedOnboarding, '→ completed:', completed);
                return completed;
              });
              setCheckingOnboarding(false);

              // Backfill: if existing user has no onboarding field, persist it (once)
              if (completed && userData.hasCompletedOnboarding === undefined && !backfillDone) {
                backfillDone = true;
                try {
                  const { updateDoc } = await import('firebase/firestore');
                  await updateDoc(userRef, { hasCompletedOnboarding: true });
                  console.log('📱 Backfilled hasCompletedOnboarding for existing user');
                } catch (backfillError) {
                  // Non-critical, will be caught next time
                  console.warn('Could not backfill onboarding status:', backfillError);
                }
              }
            } else {
              // If user document doesn't exist, create it.
              // Use merge to avoid overwriting if the doc exists but was
              // missing from the local cache (offline / cache miss).
              try {
                const { getDoc: firestoreGetDoc } = await import('firebase/firestore');
                const freshSnap = await firestoreGetDoc(userRef);
                if (freshSnap.exists()) {
                  // Doc actually exists — cache was stale. Read its data.
                  const userData = freshSnap.data();
                  const completed = userData.hasCompletedOnboarding !== false;
                  setHasCompletedOnboarding(completed);
                  setCheckingOnboarding(false);
                  console.log('📱 User document found on re-check, onboarding:', completed);
                } else {
                  // Truly new — create with merge to be safe
                  await setDoc(userRef, {
                    uid: user.uid,
                    email: user.email || '',
                    displayName: user.displayName || '',
                    hasCompletedOnboarding: false,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  }, { merge: true });
                  console.log('📱 User document created');
                  // New user → needs onboarding
                  setHasCompletedOnboarding(false);
                  setCheckingOnboarding(false);
                }
              } catch (createError) {
                console.error('Error creating user document:', createError);
                // On error, assume completed to avoid blocking existing users
                setHasCompletedOnboarding(true);
                setCheckingOnboarding(false);
              }
            }
          },
          (error) => {
            console.error('Error in onboarding listener:', error);
            // On error, assume they've completed onboarding to avoid blocking
            setHasCompletedOnboarding(true);
            setCheckingOnboarding(false);
          }
        );
      } catch (error) {
        console.error('Error setting up onboarding listener:', error);
        setHasCompletedOnboarding(true);
        setCheckingOnboarding(false);
      }
    };

    setupOnboardingListener();

    // Cleanup listener on unmount or when dependencies change
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [user, user?.emailVerified, user?.uid]);

  // Debug logging to track navigation state (must be before any early returns)
  React.useEffect(() => {
    console.log('📱 AppNavigator state:', {
      hasUser: !!user,
      emailVerified: user?.emailVerified,
      hasCompletedOnboarding,
      checkingOnboarding,
      isAuthReady,
      refreshCounter,
      subscriptionType: subscriptionStatus?.type,
      canAccessApp: subscriptionStatus?.canAccessApp,
      subscriptionLoading,
    });
  }, [user, user?.emailVerified, hasCompletedOnboarding, checkingOnboarding, isAuthReady, refreshCounter, subscriptionStatus, subscriptionLoading]);

  // Show loading spinner while checking auth state, onboarding, or subscription
  if (!isAuthReady || (user?.emailVerified && checkingOnboarding)) {
    return <LoadingSpinner message="Loading..." />;
  }

  // Also wait for subscription data if user has completed onboarding
  if (user?.emailVerified && hasCompletedOnboarding && subscriptionLoading) {
    return <LoadingSpinner message="Loading..." />;
  }

  // Create a key that changes when auth state changes to force navigation re-evaluation
  const navigationKey = `nav-${user?.uid || 'anon'}-${user?.emailVerified ? 'verified' : 'unverified'}-${hasCompletedOnboarding}-${refreshCounter}`;

  return (
    <NavigationContainer key={navigationKey} linking={linking}>
      {!user ? (
        // User is not logged in -> Show auth screens
        <AuthNavigator />
      ) : !user.emailVerified ? (
        // User is logged in but email not verified -> Show verification screen
        <VerificationNavigator />
      ) : hasCompletedOnboarding === false ? (
        // User is verified but hasn't completed onboarding -> Show onboarding
        <OnboardingNavigator />
      // BETA: Paywall disabled during TestFlight testing
      // TODO: Re-enable when ready to launch
      // ) : subscriptionStatus?.canAccessApp === false ? (
      //   // User cannot access app (expired trial or subscription) -> Show paywall
      //   <PaywallNavigator />
      ) : (
        // User is logged in, verified, onboarded, and has active subscription -> Show main app
        <MainNavigator />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
