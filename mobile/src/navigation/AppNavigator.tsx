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
import FocusScreen from '../screens/FocusScreen';
import JournalScreen from '../screens/JournalScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ConversationsScreen from '../screens/ConversationsScreen';
import ChatScreen from '../screens/ChatScreen';
import RoutineTimerScreen from '../screens/RoutineTimerScreen';
import PaywallScreen from '../screens/PaywallScreen';
import RedeemCodeScreen from '../screens/RedeemCodeScreen';
import {
  CommunityScreen,
  GroupsScreen,
  PeopleScreen,
  MessagesScreen,
} from '../screens/community';

// Onboarding screens
import {
  OnboardingWelcomeScreen,
  OnboardingFocusScreen,
  OnboardingQuickStartScreen,
  OnboardingTourScreen,
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
 * Screens for new users who haven't completed onboarding
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
      <OnboardingStack.Screen name="OnboardingFocus" component={OnboardingFocusScreen} />
      <OnboardingStack.Screen name="OnboardingQuickStart" component={OnboardingQuickStartScreen} />
      <OnboardingStack.Screen name="OnboardingTour" component={OnboardingTourScreen} />
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
          title: 'Groups',
        }}
      />
      <CommunityStack.Screen
        name="People"
        component={PeopleScreen}
        options={{
          title: 'People',
        }}
      />
      <CommunityStack.Screen
        name="Conversations"
        component={ConversationsScreen}
        options={{
          title: 'Messages',
        }}
      />
      <CommunityStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: 'Chat',
        }}
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
          fontSize: 11,
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
        name="More"
        component={MoreMenuScreen}
        options={{
          tabBarLabel: 'More',
          tabBarIcon: ({ color, size }) => (
            <Icon name="dots-horizontal" size={size} color={color} />
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

  // Safely extract data with fallbacks
  const goals = goalsData?.goals || [];
  const habits = habitsData?.habits || [];
  const tasks = tasksData?.tasks || [];

  return (
    <>
      <AppStack.Navigator
        screenOptions={{
          headerShown: false,
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
        {/* Journal - Accessible from More menu */}
        <AppStack.Screen
          name="Journal"
          component={JournalScreen}
          options={{
            animation: 'slide_from_right',
            headerShown: true,
            headerTitle: 'Journal',
            headerStyle: {
              backgroundColor: Colors.evergreenTeal,
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: '700',
            },
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
        {/* Routine Timer - Full screen immersive experience */}
        <AppStack.Screen
          name="RoutineTimer"
          component={RoutineTimerScreen}
          options={{
            presentation: 'fullScreenModal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
      </AppStack.Navigator>

      {/* Global AI Assistant FAB - Available on all authenticated screens */}
      <AIAssistantFAB
        context={{
          screen: 'global',
          userGoals: goals.slice(0, 5),
          userHabits: habits.slice(0, 10),
          userTasks: tasks.slice(0, 10),
        }}
      />
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

        const userRef = firestoreDoc(db, 'users', user.uid);

        // Set up real-time listener for onboarding status
        unsubscribe = onSnapshot(
          userRef,
          async (docSnapshot) => {
            if (docSnapshot.exists()) {
              const userData = docSnapshot.data();
              setHasCompletedOnboarding(userData.hasCompletedOnboarding === true);
              setCheckingOnboarding(false);
              console.log('📱 Onboarding status updated:', userData.hasCompletedOnboarding);
            } else {
              // If user document doesn't exist, create it
              try {
                await setDoc(userRef, {
                  uid: user.uid,
                  email: user.email || '',
                  displayName: user.displayName || '',
                  hasCompletedOnboarding: false,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
                console.log('📱 User document created');
              } catch (createError) {
                console.error('Error creating user document:', createError);
                setHasCompletedOnboarding(false);
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
    <NavigationContainer key={navigationKey}>
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
      // ) : subscriptionStatus && !subscriptionStatus.canAccessApp ? (
      //   // User has expired subscription -> Show paywall
      //   <PaywallNavigator />
      ) : (
        // User is logged in, verified, onboarded, and has active subscription -> Show main app
        <MainNavigator />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
