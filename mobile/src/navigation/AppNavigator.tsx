/**
 * App Navigator
 * Root navigation component with auth flow
 */

import React from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Colors } from '../constants';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { stackOpts, tabOpts } from './types';
import { OfflineIndicator } from '../components/shared/OfflineIndicator';
import { useSubscription } from '../hooks/useSubscription';
import { ONBOARDING_V2, FOUR_PILLAR_IA } from '../constants/dashboardConfig';
import { ROUTES } from './routes';
import { linking } from './linking';

export const navigationRef = createNavigationContainerRef();

/** Standard header styling used across all navigators */
const standardHeaderOptions = {
  headerStyle: { backgroundColor: Colors.mistWhite, elevation: 0, shadowOpacity: 0 } as any,
  headerTintColor: Colors.evergreenTeal,
  headerTitleStyle: { fontWeight: '600' as const, color: Colors.softCharcoal },
  // A1 (B-3d polish): pushed AppStack screens sit above the tab navigator, whose
  // route name is "Main" — which iOS was leaking as the back-button label
  // ("< Main"). `headerBackTitleVisible` is a no-op in React Navigation v7, so it
  // never suppressed it. Set an explicit generic fallback label instead; screens
  // with a single, unambiguous parent pillar override this with the pillar name
  // (e.g. EnergyBrowse → "Energy", FocusRhythms → "Focus").
  headerBackTitle: 'Back',
};

// Auth screens
import {
  LoginScreen,
  SignupScreen,
  ForgotPasswordScreen,
  EmailVerificationScreen,
} from '../screens/auth';

// App screens
import DashboardScreen from '../screens/DashboardScreen';
import PlanScreen from '../screens/PlanScreen';
import { FocusScreen, FocusHubScreen, FocusRhythmsScreen } from '../screens/Focus';
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
import WearableIntegrationScreen from '../screens/WearableIntegrationScreen';
// Weekly loop (spec 6, 9, 10.1). Direct file paths, not a barrel, per the
// Metro 0.83 convention for navigation imports.
import { WeeklyEntryScreen } from '../screens/weekly/WeeklyEntryScreen';
import { FloorCommitmentScreen } from '../screens/weekly/FloorCommitmentScreen';
import { WeeklyOpenScreen } from '../screens/weekly/WeeklyOpenScreen';
import { WeeklyTodayScreen } from '../screens/weekly/WeeklyTodayScreen';
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

// Onboarding screens.
// Legacy V1 flow (used only when ONBOARDING_V2 is false) + the stress-recovery
// arc (Model A, screens 1–9) that replaces the V2 trio. The OnboardingV2*
// screens stay exported from the barrel but are no longer mounted here, which
// orphans their notification-permission prompt — the anchor screen (screen 9)
// is now the only place onboarding requests permission.
import {
  OnboardingWelcomeScreen,
  OnboardingCheckInScreen,
  OnboardingInsightScreen,
  OnboardingActivityScreen,
  OnboardingValuesScreen,
  OnboardingPersonalizedEntryScreen,
  OnboardingProblemScreen,
  OnboardingStateCheckInScreen,
  OnboardingStressorScreen,
  OnboardingPeakWindowScreen,
  OnboardingReflectScreen,
  OnboardingProtocolScreen,
  OnboardingRecheckScreen,
  OnboardingBridgeScreen,
  OnboardingAnchorScreen,
} from '../screens/onboarding';
import { resolveInitialStep } from '../services/firebase/onboardingStressRecovery.service';
import type { OnboardingSrStep } from '../constants/onboardingStressRecovery';

// Discover content screens. The legacy DiscoverNavigator/DiscoverScreen hub was
// retired in B-3d.5; these content screens are now registered solely in the
// AppStack below (and reached via the Energy pillar under the four-pillar IA).
import {
  BreathworkScreen,
  BreathworkDetailScreen,
  SleepScreen,
  SleepDetailScreen,
  MovementScreen,
  MovementDetailScreen,
  MasterclassScreen,
  MasterclassDetailScreen,
} from '../screens/discover';
import PodcastEpisodeScreen from '../screens/discover/PodcastEpisodeScreen';

// Phase 1 dev test harnesses — registered only when __DEV__ is true.
// Reachable from Wellness tab > "DEV TOOLS" section. Remove the imports,
// the routes below, and the menu section before TestFlight/release.
import { BreathPacerTestScreen } from '../screens/_dev/BreathPacerTestScreen';
import { ProtocolAudioLoaderTestScreen } from '../screens/_dev/ProtocolAudioLoaderTestScreen';
import { GuidedSessionPlayerTestScreen } from '../screens/_dev/GuidedSessionPlayerTestScreen';
import { CheckInFlowTestScreen } from '../screens/_dev/CheckInFlowTestScreen';
import { VideoPlayerTestScreen } from '../screens/_dev/VideoPlayerTestScreen';

// Phase 2 sub-step 2.2 — Practices index + single-protocol runner.
import { PracticesIndexScreen } from '../screens/practices/PracticesIndexScreen';
import { PracticeRunScreen } from '../screens/practices/PracticeRunScreen';

// Four-Pillar IA Phase B-3b — Energy hub + browse list (flag-gated).
import { EnergyHubScreen } from '../screens/Energy/EnergyHubScreen';
import { EnergyBrowseListScreen } from '../screens/Energy/EnergyBrowseListScreen';

// Phase 2 sub-step 2.5 — production CheckInFlow screen wrapper.
import { CheckInFlowScreen } from '../screens/checkin/CheckInFlowScreen';

// Create navigators
const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();
const OnboardingStack = createNativeStackNavigator();
const CommunityStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const BottomTabs = createBottomTabNavigator();
const PaywallStack = createNativeStackNavigator();

/**
 * Onboarding Stack Navigator
 * Streamlined 6-screen onboarding flow for new users
 * Flow: Welcome → Check-in → Insight (aha!) → Activity → Values → Personalized Entry → Home
 */
const OnboardingNavigator = ({ initialStep }: { initialStep?: OnboardingSrStep }) => {
  return (
    <OnboardingStack.Navigator
      // Resume mid-flow (Edge Case 4): start on the persisted step. Legacy V1
      // flow keeps its default first route.
      initialRouteName={ONBOARDING_V2 ? initialStep ?? 'OnboardingProblem' : undefined}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {ONBOARDING_V2 ? (
        <>
          <OnboardingStack.Screen name="OnboardingProblem" component={OnboardingProblemScreen} />
          <OnboardingStack.Screen name="OnboardingStateCheckIn" component={OnboardingStateCheckInScreen} />
          <OnboardingStack.Screen name="OnboardingStressor" component={OnboardingStressorScreen} />
          <OnboardingStack.Screen name="OnboardingPeakWindow" component={OnboardingPeakWindowScreen} />
          <OnboardingStack.Screen name="OnboardingReflect" component={OnboardingReflectScreen} />
          <OnboardingStack.Screen name="OnboardingProtocol" component={OnboardingProtocolScreen} />
          <OnboardingStack.Screen name="OnboardingRecheck" component={OnboardingRecheckScreen} />
          <OnboardingStack.Screen name="OnboardingBridge" component={OnboardingBridgeScreen} />
          <OnboardingStack.Screen name="OnboardingAnchor" component={OnboardingAnchorScreen} />
        </>
      ) : (
        <>
          <OnboardingStack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
          <OnboardingStack.Screen name="OnboardingCheckIn" component={OnboardingCheckInScreen} />
          <OnboardingStack.Screen name="OnboardingInsight" component={OnboardingInsightScreen} />
          <OnboardingStack.Screen name="OnboardingActivity" component={OnboardingActivityScreen} />
          <OnboardingStack.Screen name="OnboardingValues" component={OnboardingValuesScreen} />
          <OnboardingStack.Screen name="OnboardingPersonalizedEntry" component={OnboardingPersonalizedEntryScreen} />
        </>
      )}
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
        ...standardHeaderOptions,
        animation: 'slide_from_right',
        headerStyle: { backgroundColor: Colors.evergreenTeal, elevation: 0, shadowOpacity: 0 } as any,
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' as const, color: '#fff' },
      }}
    >
      <CommunityStack.Screen
        name="CommunityMain"
        component={CommunityScreen}
        options={stackOpts({
          headerShown: false, // Community has custom header
        })}
      />
      <CommunityStack.Screen
        name="Groups"
        component={GroupsScreen}
        options={stackOpts({
          headerShown: false, // GroupsScreen has custom header
        })}
      />
      <CommunityStack.Screen
        name="GroupDetail"
        component={GroupDetailScreen}
        options={stackOpts({
          headerShown: false, // GroupDetailScreen has custom header
        })}
      />
      <CommunityStack.Screen
        name="Challenges"
        component={ChallengesScreen}
        options={stackOpts({
          headerShown: false, // ChallengesScreen has custom header
        })}
      />
      <CommunityStack.Screen
        name="ChallengeDetail"
        component={ChallengeDetailScreen}
        options={stackOpts({
          headerShown: false, // ChallengeDetailScreen has custom header
        })}
      />
      <CommunityStack.Screen
        name="People"
        component={PeopleScreen}
        options={stackOpts({
          headerShown: false, // PeopleScreen has custom header
        })}
      />
      <CommunityStack.Screen
        name="Conversations"
        component={ConversationsScreen}
        options={stackOpts({
          headerShown: false, // MessagesScreen has custom header
        })}
      />
      <CommunityStack.Screen
        name="Chat"
        component={ChatScreen}
        options={stackOpts({
          headerShown: true,
        })}
      />
      <CommunityStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={stackOpts({
          headerShown: false, // UserProfileScreen has custom header
        })}
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
 * Profile Stack Navigator
 * Navigation for profile and settings
 */
const ProfileNavigator = () => {
  return (
    <ProfileStack.Navigator
      screenOptions={{
        ...standardHeaderOptions,
        animation: 'slide_from_right',
      }}
    >
      <ProfileStack.Screen
        name="ProfileMain"
        component={ProfileScreen}
        options={stackOpts({
          title: 'Profile',
          ...standardHeaderOptions,
          headerStyle: { backgroundColor: Colors.evergreenTeal, elevation: 0, shadowOpacity: 0 } as any,
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' as const, color: '#fff' },
        })}
      />
      <ProfileStack.Screen
        name="Settings"
        component={SettingsScreen}
        options={stackOpts({
          title: 'Settings',
          ...standardHeaderOptions,
          headerStyle: { backgroundColor: Colors.evergreenTeal, elevation: 0, shadowOpacity: 0 } as any,
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' as const, color: '#fff' },
        })}
      />
      <ProfileStack.Screen
        name="NotificationSettings"
        component={NotificationSettingsScreen}
        options={stackOpts({
          headerShown: false, // NotificationSettingsScreen has its own header
        })}
      />
      <ProfileStack.Screen
        name="MutedAccounts"
        component={MutedAccountsScreen}
        options={stackOpts({
          headerShown: false,
        })}
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
        options={tabOpts({
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="view-dashboard" size={size} color={color} />
          ),
        })}
      />
      <BottomTabs.Screen
        name="Rhythms"
        component={PlanScreen}
        options={tabOpts({
          tabBarLabel: 'Rhythms',
          tabBarIcon: ({ color, size }) => (
            <Icon name="clipboard-check" size={size} color={color} />
          ),
        })}
      />
      <BottomTabs.Screen
        name="Community"
        component={CommunityNavigator}
        options={tabOpts({
          tabBarLabel: 'Community',
          tabBarIcon: ({ color, size }) => (
            <Icon name="account-group" size={size} color={color} />
          ),
        })}
      />
      {/* The Wellness tab (MoreMenuScreen) was dissolved in B-3d.7: its items
          re-homed (Journal/Masterclass -> Energy, Connected Apps/Help ->
          Settings, Insights -> the dashboard look-back card). This legacy
          navigator is itself replaced by FivePillarTabs when FOUR_PILLAR_IA
          flips (B-3d.8); until then it runs as a 3-tab transient. */}
    </BottomTabs.Navigator>
  );
};

/**
 * Five-Pillar Tabs Navigator — Four-Pillar IA Phase B-3a (flag-gated).
 *
 * Mounted in place of BottomTabsNavigator only when FOUR_PILLAR_IA is on.
 * This slice proves ROUTING, not hubs: each tab lands on an EXISTING screen as
 * a placeholder destination. No content is re-homed and nothing is deleted —
 * re-homing the Wellness items (Insights/Journal/Breathwork/Sleep/Masterclass/
 * Connected Apps) is B-3b/d. Under this flag those items have no tab yet; they
 * stay registered in AppStack and Settings stays reachable via the dashboard
 * gear, so flag-ON is usable. (Known, accepted B-3a gap — do not add a stopgap
 * Wellness tab here.)
 *
 * Tabs / placeholder destinations:
 *   Home      → DashboardScreen     (unchanged)
 *   Focus     → FocusHubScreen      (B-3c hub; primary card opens FocusTimer)
 *   Energy    → EnergyHubPlaceholder (scaffold stub; real hub is B-3b)
 *   Time      → PlanScreen          (existing habits + routines, for now)
 *   Community → CommunityNavigator  (unchanged)
 *
 * AI Guide: a docked pill mounted per pillar hub (components/ai/GuidePill.tsx),
 * top-right on all five pillar screens. It is no longer a global FAB threaded
 * through screen options; session surfaces hide it by not mounting it.
 *
 * Icons for Focus/Energy/Time are approximate scaffold placeholders
 * (timer-outline / lightning-bolt / clock-outline) — refine in B-3b.
 */
const FivePillarTabs = () => {
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
        name={ROUTES.Home}
        component={DashboardScreen}
        options={tabOpts({
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Icon name="view-dashboard" size={size} color={color} />
          ),
        })}
      />
      <BottomTabs.Screen
        name={ROUTES.PillarFocus}
        component={FocusHubScreen}
        options={tabOpts({
          tabBarLabel: 'Focus',
          tabBarIcon: ({ color, size }) => (
            <Icon name="timer-outline" size={size} color={color} />
          ),
        })}
      />
      <BottomTabs.Screen
        name={ROUTES.PillarEnergy}
        component={EnergyHubScreen}
        options={tabOpts({
          tabBarLabel: 'Energy',
          tabBarIcon: ({ color, size }) => (
            <Icon name="lightning-bolt" size={size} color={color} />
          ),
        })}
      />
      <BottomTabs.Screen
        name={ROUTES.PillarTime}
        component={PlanScreen}
        options={tabOpts({
          tabBarLabel: 'Time',
          tabBarIcon: ({ color, size }) => (
            <Icon name="clock-outline" size={size} color={color} />
          ),
        })}
      />
      <BottomTabs.Screen
        name={ROUTES.Community}
        component={CommunityNavigator}
        options={tabOpts({
          tabBarLabel: 'Community',
          tabBarIcon: ({ color, size }) => (
            <Icon name="account-group" size={size} color={color} />
          ),
        })}
      />
    </BottomTabs.Navigator>
  );
};

/**
 * App Stack Navigator
 * Screens for authenticated users
 */
const MainNavigator = () => {
  return (
    <>
      <OfflineIndicator />
      <AppStack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {/* Four-Pillar IA gate (B-3a): flag OFF → legacy four-tab IA, byte-for-byte. */}
        <AppStack.Screen
          name="Main"
          component={FOUR_PILLAR_IA ? FivePillarTabs : BottomTabsNavigator}
        />
        {/* Insights - Accessible from Wellness menu */}
        <AppStack.Screen
          name="Insights"
          component={InsightsScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Your week',
            headerShadowVisible: false,
          })}
        />
        {/* Focus Timer - Accessible from Wellness menu */}
        <AppStack.Screen
          name="FocusTimer"
          component={FocusScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Focus',
            headerShadowVisible: false,
          })}
        />
        {/* Journal - Accessible from Wellness menu */}
        <AppStack.Screen
          name="Journal"
          component={JournalScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Journal',
            headerShadowVisible: false,
          })}
        />
        {/* Breathwork - Accessible from Wellness menu */}
        <AppStack.Screen
          name="Breathwork"
          component={BreathworkScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Breathwork',
            headerShadowVisible: false,
          })}
        />
        <AppStack.Screen
          name="BreathworkDetail"
          component={BreathworkDetailScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Session Details',
            headerShadowVisible: false,
          })}
        />
        {/* Sleep - Accessible from Wellness menu */}
        <AppStack.Screen
          name="Sleep"
          component={SleepScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Sleep Library',
            headerShadowVisible: false,
          })}
        />
        <AppStack.Screen
          name="SleepDetail"
          component={SleepDetailScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Sleep Content',
            headerShadowVisible: false,
          })}
        />
        {/* Movement - Accessible from Wellness menu */}
        <AppStack.Screen
          name="Movement"
          component={MovementScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Movement Library',
            headerShadowVisible: false,
          })}
        />
        <AppStack.Screen
          name="MovementDetail"
          component={MovementDetailScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Workout Details',
            headerShadowVisible: false,
          })}
        />
        {/* Masterclass - Accessible from Wellness menu */}
        <AppStack.Screen
          name="Masterclass"
          component={MasterclassScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            // A2: the Energy entry point says "Learn"; entry and destination must
            // agree. (Route id stays "Masterclass"; only the visible title changes.)
            title: 'Learn',
            headerShadowVisible: false,
          })}
        />
        <AppStack.Screen
          name="MasterclassDetail"
          component={MasterclassDetailScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Class Details',
            headerShadowVisible: false,
          })}
        />
        <AppStack.Screen
          name="PodcastEpisode"
          component={PodcastEpisodeScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Episode',
            headerShadowVisible: false,
          })}
        />
        {/* Help & Support - Accessible from Wellness menu */}
        <AppStack.Screen
          name="HelpSupport"
          component={HelpSupportScreen}
          options={stackOpts({
            animation: 'slide_from_right',
            headerShown: false,
          })}
        />
        {/* Connected Apps */}
        <AppStack.Screen
          name="WearableIntegration"
          component={WearableIntegrationScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Connected Apps',
            headerShadowVisible: false,
          })}
        />
        {/* Habit Detail - Accessible from Plan/Track screen.
            Plain Mist White detail header, matching every other detail screen:
            the solid teal header with its white pill Back button was this
            screen's alone. standardHeaderOptions already gives a mist background,
            an Evergreen Teal back chevron, and a Soft Charcoal title.
            No `title` here on purpose — the habit's own name is the title, and
            the screen sets it from route params (a habit renamed in the edit
            sheet has to retitle the header too, which a static option cannot). */}
        <AppStack.Screen
          name="HabitDetail"
          component={HabitDetailScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            headerShadowVisible: false,
          })}
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
        {/* Phase 2 sub-step 2.5 — production CheckInFlow screen.
            Mounted full-screen with a slide-from-bottom presentation
            so the multi-step check-in feels like a focused modal,
            not a permanent navigation destination. */}
        <AppStack.Screen
          name="CheckInFlow"
          component={CheckInFlowScreen}
          options={{
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        {/* Phase 2 sub-step 2.2 — Practices index + single-protocol
            runner. Reachable from the recommendation screen's "See
            other options" affordance and (sub-step 2.4 onward) from
            the not-shifted response's "Try something longer". */}
        <AppStack.Screen
          name="Practices"
          component={PracticesIndexScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Other options',
            headerShadowVisible: false,
          })}
        />
        <AppStack.Screen
          name="PracticeRun"
          component={PracticeRunScreen}
          options={{
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        {/* Four-Pillar IA Phase B-3b — Energy hub browse list. Flag-gated so
            the old four-tab IA never registers it (flag OFF = byte-identical).
            The Energy tab (PillarEnergy → EnergyHubScreen) navigates here; this
            screen launches the existing player via PracticeRun. Title is set
            per-category in-screen. No Guide pill here: it lives on the Energy
            hub, not its browse lists. */}
        {FOUR_PILLAR_IA && (
          <AppStack.Screen
            name={ROUTES.EnergyBrowse}
            component={EnergyBrowseListScreen}
            options={stackOpts({
              ...standardHeaderOptions,
              // Single, unambiguous parent: only reached from the Energy hub.
              headerBackTitle: 'Energy',
              animation: 'slide_from_right',
              headerShown: true,
              headerShadowVisible: false,
            })}
          />
        )}
        {/* Four-Pillar IA Phase B-3c — Focus rhythms. Flag-gated like the Energy
            hub browse list. The Focus tab (PillarFocus → FocusHubScreen)
            navigates here; it is a quiet opt-in capture, no Guide pill. */}
        {FOUR_PILLAR_IA && (
          <AppStack.Screen
            name={ROUTES.FocusRhythms}
            component={FocusRhythmsScreen}
            options={stackOpts({
              ...standardHeaderOptions,
              // Single, unambiguous parent: only reached from the Focus hub.
              headerBackTitle: 'Focus',
              animation: 'slide_from_right',
              headerShown: true,
              title: 'Focus rhythms',
              headerShadowVisible: false,
            })}
          />
        )}
        {/* Weekly loop (spec 6, 9, 10.1) — REACHABLE BUT NOT DEFAULT.
            Gated on __DEV__ and entered only from the Developer section of
            Settings, exactly like the dev harnesses below. Nothing about the
            default landing changes: "Main" still mounts the pillar tabs, Home
            is still DashboardScreen, and the daily Situation x State engine
            still owns it. Today-as-landing is spec 22 item 4, a later slice
            that cannot happen until the progressive onboarding replaces the
            daily engine. WeeklyEntry is the only route anything should target;
            it decides which of the other three the user lands on. */}
        {__DEV__ && (
          <>
            <AppStack.Screen
              name={ROUTES.WeeklyEntry}
              component={WeeklyEntryScreen}
              options={stackOpts({
                ...standardHeaderOptions,
                animation: 'slide_from_right',
                headerShown: true,
                title: 'Weekly loop (dev)',
                headerShadowVisible: false,
              })}
            />
            <AppStack.Screen
              name={ROUTES.WeeklyFloor}
              component={FloorCommitmentScreen}
              options={stackOpts({
                ...standardHeaderOptions,
                animation: 'slide_from_right',
                headerShown: true,
                title: 'Your floor (dev)',
                headerShadowVisible: false,
              })}
            />
            <AppStack.Screen
              name={ROUTES.WeeklyOpen}
              component={WeeklyOpenScreen}
              options={stackOpts({
                ...standardHeaderOptions,
                animation: 'slide_from_right',
                headerShown: true,
                title: 'Your week (dev)',
                headerShadowVisible: false,
              })}
            />
            <AppStack.Screen
              name={ROUTES.WeeklyToday}
              component={WeeklyTodayScreen}
              options={stackOpts({
                ...standardHeaderOptions,
                animation: 'slide_from_right',
                headerShown: true,
                title: 'Today (dev)',
                headerShadowVisible: false,
              })}
            />
          </>
        )}
        {/* Phase 1 dev test harnesses — gated by __DEV__ so the routes
            (and the underlying components, via Metro tree-shaking) are
            never reachable in release builds. */}
        {__DEV__ && (
          <>
            <AppStack.Screen
              name="DevBreathPacer"
              component={BreathPacerTestScreen}
              options={{
                ...standardHeaderOptions,
                animation: 'slide_from_right',
                headerShown: true,
                title: 'Dev: BreathPacer',
                headerShadowVisible: false,
              }}
            />
            <AppStack.Screen
              name="DevAudioLoader"
              component={ProtocolAudioLoaderTestScreen}
              options={{
                ...standardHeaderOptions,
                animation: 'slide_from_right',
                headerShown: true,
                title: 'Dev: Audio Loader',
                headerShadowVisible: false,
              }}
            />
            <AppStack.Screen
              name="DevGuidedSessionPlayer"
              component={GuidedSessionPlayerTestScreen}
              options={{
                ...standardHeaderOptions,
                animation: 'slide_from_right',
                headerShown: true,
                title: 'Dev: Guided Session Player',
                headerShadowVisible: false,
              }}
            />
            <AppStack.Screen
              name="DevCheckInFlow"
              component={CheckInFlowTestScreen}
              options={{
                ...standardHeaderOptions,
                animation: 'slide_from_right',
                headerShown: true,
                title: 'Dev: Check-In Flow',
                headerShadowVisible: false,
              }}
            />
            <AppStack.Screen
              name="DevVideoPlayer"
              component={VideoPlayerTestScreen}
              options={{
                ...standardHeaderOptions,
                animation: 'slide_from_right',
                headerShown: true,
                title: 'Dev: Video Player',
                headerShadowVisible: false,
              }}
            />
          </>
        )}
      </AppStack.Navigator>
      {/* The AI Guide is now a docked pill mounted per pillar hub
          (components/ai/GuidePill.tsx), replacing the global bottom-right FAB.
          Session surfaces hide it by simply not mounting it. */}
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
  const [onboardingStep, setOnboardingStep] = React.useState<OnboardingSrStep | undefined>(undefined);
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

              // Resume mid-flow: remember which onboarding step the user is on.
              setOnboardingStep(resolveInitialStep(userData));

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

    // Safety timeout: if Firestore listener never fires, unblock after 5s
    const onboardingTimeout = setTimeout(() => {
      setCheckingOnboarding((prev) => {
        if (prev) {
          console.warn('⚠️ Onboarding check timeout - assuming completed to unblock app');
          setHasCompletedOnboarding(true);
        }
        return false;
      });
    }, 5000);

    // Cleanup listener and timeout on unmount or when dependencies change
    return () => {
      clearTimeout(onboardingTimeout);
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
    <NavigationContainer key={navigationKey} linking={linking} ref={navigationRef}>
      {!user ? (
        // User is not logged in -> Show auth screens
        <AuthNavigator />
      ) : !user.emailVerified ? (
        // User is logged in but email not verified -> Show verification screen
        <VerificationNavigator />
      ) : hasCompletedOnboarding === false ? (
        // User is verified but hasn't completed onboarding -> Show onboarding.
        // Onboarding-in-progress users are NOT subject to the paywall gate; the
        // gate (canAccessApp) only applies once onboarding is complete.
        <OnboardingNavigator initialStep={onboardingStep} />
      ) : !subscriptionStatus?.canAccessApp ? (
        // No source affirmatively grants access (expired trial / no subscription)
        // -> Show paywall as a full-screen replacement. Fail-closed: undefined or
        // false access both route here; only an affirmative grant reaches the app.
        <PaywallNavigator />
      ) : (
        // User is logged in, verified, onboarded, and has active access -> main app
        <MainNavigator />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
