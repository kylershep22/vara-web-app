/**
 * App Navigator
 * Root navigation component with auth flow
 */

import React from 'react';
import {
  NavigationContainer,
  createNavigationContainerRef,
  getFocusedRouteNameFromRoute,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { BlurTokens, Colors, Layout } from '../constants';
import Text from '../components/shared/Text';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useReduceTransparency } from '../hooks/useReduceTransparency';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { stackOpts, tabOpts } from './types';
import { screenBoundaryLayout } from './screenBoundary';
import { OfflineIndicator } from '../components/shared/OfflineIndicator';
import { useSubscription } from '../hooks/useSubscription';
import { ONBOARDING_V2, ONBOARDING_V3, FOUR_PILLAR_IA } from '../constants/dashboardConfig';
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
// FocusHubScreen is back. Step 2 left it unimported because nothing navigated
// to ROUTES.PillarFocus, so registering it would have created an unreachable
// screen; step 4a gives it the caller it was waiting for (the Practices hub's
// "Focus & Time" card) and registers it below. The screen file itself never
// changed.
import {
  FocusScreen,
  FocusHubScreen,
  FocusRhythmsScreen,
  DayBlocksScreen,
  CapturedTasksScreen,
} from '../screens/Focus';
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
import { RemoveCaptureNavigator } from '../screens/journey/removeCapture/RemoveCaptureNavigator';
import { WeeklyCloseScreen } from '../screens/weekly/WeeklyCloseScreen';
import { CLOSE_COPY } from '../screens/weekly/copy';
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

// Progressive onboarding arc (V3) — the mounted default. Direct file paths, not
// a barrel, per the navigation import convention.
import { OnboardingV3Provider } from '../screens/onboarding/v3/OnboardingV3Context';
import { V3_ROUTES } from '../screens/onboarding/v3/routes';
import { OnboardingV3ColdOpenScreen } from '../screens/onboarding/v3/OnboardingV3ColdOpenScreen';
import { OnboardingV3DestinationScreen } from '../screens/onboarding/v3/OnboardingV3DestinationScreen';
import { OnboardingV3RouteScreen } from '../screens/onboarding/v3/OnboardingV3RouteScreen';
import { OnboardingV3WhyScreen } from '../screens/onboarding/v3/OnboardingV3WhyScreen';
import { OnboardingV3CapacityScreen } from '../screens/onboarding/v3/OnboardingV3CapacityScreen';
import { OnboardingV3FloorScreen } from '../screens/onboarding/v3/OnboardingV3FloorScreen';
import { OnboardingV3WeekStartScreen } from '../screens/onboarding/v3/OnboardingV3WeekStartScreen';
import { OnboardingV3FirstWinScreen } from '../screens/onboarding/v3/OnboardingV3FirstWinScreen';
import { OnboardingV3ReminderScreen } from '../screens/onboarding/v3/OnboardingV3ReminderScreen';
import { OnboardingV3DoneScreen } from '../screens/onboarding/v3/OnboardingV3DoneScreen';

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
import TypographyDiagnosticScreen from '../screens/_dev/TypographyDiagnosticScreen';

// Phase 2 sub-step 2.2 — Practices index + single-protocol runner.
import { PracticesIndexScreen } from '../screens/practices/PracticesIndexScreen';
import { PracticeRunScreen } from '../screens/practices/PracticeRunScreen';

// Four-Pillar IA Phase B-3b — Energy hub + browse list. The hub was the Energy
// TAB; step 2 re-registered it as a pushed AppStack screen (the browse list is
// still flag-gated).
import { EnergyHubScreen } from '../screens/Energy/EnergyHubScreen';
import { EnergyBrowseListScreen } from '../screens/Energy/EnergyBrowseListScreen';
import { StressRecoveryScreen } from '../screens/StressRecovery/StressRecoveryScreen';

// Phase 2 sub-step 2.5 — production CheckInFlow screen wrapper.
import { CheckInFlowScreen } from '../screens/checkin/CheckInFlowScreen';

// IA restructure step 2 — the two new tab roots. Learn is still a shell.
// Practices stopped being one in step 4a (a pillar launcher) and stopped being
// a launcher in journey slice 5a: it is the journey map, and it reads
// journeyStates. PracticesHubScreen is deleted, not orphaned.
import { JourneyMapScreen } from '../screens/journey/JourneyMapScreen';
import { JourneyPhaseScreen } from '../screens/journey/JourneyPhaseScreen';
import { LearnHubScreen } from '../screens/learn/LearnHubScreen';

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
  // V3 — the mounted default. Returned early rather than folded into the ternary
  // below so the V1/V2 expression stays byte-for-byte what it was: flipping
  // ONBOARDING_V3 to false restores the previous behavior exactly, which is the
  // whole point of keeping V2 for one transition cycle.
  //
  // Its own Navigator because the two arcs share nothing. V3 has no persisted
  // step, so it takes no `initialStep`: resume mid-flow is a V2 affordance
  // (Edge Case 4) built on a stored onboardingStep, and V3 writes nothing until
  // its terminal. A part-way user starts over, which is correct while there is
  // nothing saved to return to.
  if (ONBOARDING_V3) {
    return (
      <OnboardingV3Provider>
        <OnboardingStack.Navigator
          initialRouteName={V3_ROUTES.ColdOpen}
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
          }}
        >
          <OnboardingStack.Screen name={V3_ROUTES.ColdOpen} component={OnboardingV3ColdOpenScreen} />
          <OnboardingStack.Screen name={V3_ROUTES.Destination} component={OnboardingV3DestinationScreen} />
          <OnboardingStack.Screen name={V3_ROUTES.Route} component={OnboardingV3RouteScreen} />
          <OnboardingStack.Screen name={V3_ROUTES.Why} component={OnboardingV3WhyScreen} />
          <OnboardingStack.Screen name={V3_ROUTES.Capacity} component={OnboardingV3CapacityScreen} />
          <OnboardingStack.Screen name={V3_ROUTES.Floor} component={OnboardingV3FloorScreen} />
          <OnboardingStack.Screen name={V3_ROUTES.WeekStart} component={OnboardingV3WeekStartScreen} />
          <OnboardingStack.Screen name={V3_ROUTES.FirstWin} component={OnboardingV3FirstWinScreen} />
          <OnboardingStack.Screen name={V3_ROUTES.Reminder} component={OnboardingV3ReminderScreen} />
          <OnboardingStack.Screen name={V3_ROUTES.Done} component={OnboardingV3DoneScreen} />
        </OnboardingStack.Navigator>
      </OnboardingV3Provider>
    );
  }

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
          flips (B-3d.8); until then it runs as a 3-tab transient.

          NO screenLayout BOUNDARY HERE (slice 7g), DELIBERATELY. FOUR_PILLAR_IA
          has been ON since 2026-07-02, so this navigator does not mount, and
          the retired IA is legacy pending removal rather than something to
          extend. Its screens still sit under the App.tsx:114 backstop. If the
          flag is ever flipped back, wire screenBoundaryLayout here too. */}
    </BottomTabs.Navigator>
  );
};

/* ============================================================================
   THE FLOATING TAB BAR (R2). UI Standards 12.2, 7 and 6.2.
   ========================================================================= */

/**
 * Zero-duration show/hide, used only when Reduce Motion is on.
 *
 * WHY IT IS HERE AT ALL. `BottomTabBar` animates its own visibility with an
 * `Animated.timing` on a translateY - 250ms in, 200ms out - and that animation
 * lives inside the library, where `useReducedMotion` cannot reach it. 18(e)
 * covers every animation on a touched surface, not only the ones a slice wrote,
 * so a bar that slides under Reduce Motion is a failed assertion and not a
 * caveat. `tabBarVisibilityAnimationConfig` is the one seam the library gives
 * us, and setting both durations to 0 turns the slide into a cut.
 *
 * IT HAS NO TRIGGER TODAY, AND SAYING SO IS MORE USEFUL THAN IMPLYING ONE.
 * The only route that hides the bar is `Chat`, and it hides it with
 * `display: 'none'`, which is instant and runs no animation;
 * `tabBarHideOnKeyboard` - the one thing that drives this code path - is
 * deliberately unset. This stands as a guard so that the day something DOES
 * drive it, the slide is already suppressed under Reduce Motion rather than
 * discovered at a walk.
 */
const REDUCED_MOTION_VISIBILITY = {
  show: { animation: 'timing', config: { duration: 0 } },
  hide: { animation: 'timing', config: { duration: 0 } },
} as const;

/**
 * The frosted ground behind the capsule. iOS only, and only with Reduce
 * Transparency off; every other case returns `null` and takes the opaque
 * fallback instead.
 *
 * THE RADIUS AND `overflow` LIVE ON THIS WRAPPER, NOT ON THE BAR. Putting
 * `overflow: 'hidden'` on `tabBarStyle` would clip the blur to the capsule AND
 * clip the bar's own shadow away with it. Clipping here keeps both.
 *
 * THREE LAYERS, AND THE THIRD IS THERE BECAUSE OF WHERE A BORDER DRAWS.
 * `BlurView` alone is neutral; 12.2 asks for warm translucency, and
 * `tabBarTranslucent` is what supplies the warmth. It is also what will keep a
 * 12pt label legible once R3 puts environmental artwork of unknown luminance
 * underneath - which R2 cannot measure, because that asset does not exist yet.
 *
 * THE HAIRLINE IS A LAYER RATHER THAN A `borderWidth` ON THE BAR, and the
 * reason is mechanical. `tabBarBackground` is rendered by the library inside a
 * `StyleSheet.absoluteFill` wrapper, which covers the bar's whole frame -
 * including the strip where the bar's own border would draw, since a View's
 * border belongs to its own layer and subviews paint on top of it. A
 * `borderWidth` on `tabBarStyle` would therefore be dead style in this branch:
 * present, correct-looking, and invisible. Drawing it as the topmost child is
 * the version that actually renders.
 *
 * The OPAQUE branch keeps its border on the bar, where it renders fine because
 * that branch supplies no `tabBarBackground` and so has no child covering it.
 * Same token, same width, same radius, both states - only the attachment point
 * differs, and only because of the above.
 */
const renderTabBarGlass = () => (
  <View style={[StyleSheet.absoluteFill, tabBarStyles.glassClip]}>
    <BlurView
      style={StyleSheet.absoluteFill}
      tint={BlurTokens.tabBarTint}
      intensity={BlurTokens.tabBarIntensity}
    />
    <View style={[StyleSheet.absoluteFill, tabBarStyles.glassOverlay]} />
    <View style={[StyleSheet.absoluteFill, tabBarStyles.glassHairline]} />
  </View>
);

/**
 * A tab label rendered through the SHARED TEXT PRIMITIVE, which is the whole
 * reason the tab options carry a render function instead of `tabBarLabelStyle`.
 *
 * React Navigation renders a STRING label through `@react-navigation/elements`'
 * `Label`, which is a bare React Native `Text`. It takes the navigator theme's
 * `fonts.medium` - a system face - plus whatever `tabBarLabelStyle` supplies.
 * The bar therefore shipped `fontWeight: '600'` with NO `fontFamily`, and React
 * Native does not synthesise a weight from a named custom family: the four tab
 * labels have been rendering in the system font ever since Inter landed. R1a's
 * lint, which bars `import { Text } from 'react-native'`, could not see it -
 * the offending import is inside `node_modules`.
 *
 * Going through the primitive fixes three things at once and hand-rolls none of
 * them. It resolves the weight to a registered Inter face. It applies
 * `Typography.maxFontScale` (1.3), which `tabBarLabelStyle` CANNOT, because
 * `maxFontSizeMultiplier` is a prop and not a style key. And it strips the
 * weight on Android, where the text engine would otherwise synthesise a second
 * bold on top of an already-bold face.
 *
 * `numberOfLines={1}` is what `Label` did, kept. The failure mode at 1.3x is
 * therefore truncation rather than wrap, and "Community" at 375pt is the
 * binding case - walk step A12.
 *
 * DEFINED AT MODULE LEVEL, not built per render. A component created inside the
 * options object would be a new type on every render of `FivePillarTabs` and
 * would remount the label each time.
 */
const TabBarLabel = ({ label, color }: { label: string; color: string }) => (
  <Text numberOfLines={1} style={[tabBarStyles.label, { color }]}>
    {label}
  </Text>
);

/**
 * The one route inside the Community tab that hides the bar, and why it is
 * decided HERE rather than on the screen itself.
 *
 * `Chat` is registered on `CommunityStack`, a NATIVE STACK. `tabBarStyle` is a
 * bottom-tab option and a native-stack screen does not read it, so setting it
 * on the `Chat` registration would be inert - it would look like the rule was
 * applied and change nothing. The tab that OWNS the nested stack is the only
 * place that can hide the bar, which is what this reads.
 *
 * WHY CHAT AT ALL (12.2, amended at R2). A keyboard-driven composer under a
 * floating translucent bar is a composition problem, not an inset: the bar
 * would sit over the input, and the input would have to be lifted past it for
 * no gain. With the bar gone the composer IS the screen's bottom edge, which is
 * the simpler thing to make right - and `ChatScreen` takes `insets.bottom`
 * directly rather than `useTabBarInset()`, because a hidden bar still reports
 * its height (see hooks/useTabBarInset.ts on the phantom-inset trap).
 *
 * `getFocusedRouteNameFromRoute` returns undefined until the nested navigator
 * has state, which reads as the initial route - `CommunityMain` - so the bar
 * shows by default and hides only once Chat is actually focused.
 */
const hidesTabBar = (route: Parameters<typeof getFocusedRouteNameFromRoute>[0]) =>
  getFocusedRouteNameFromRoute(route) === 'Chat';

const tabBarStyles = StyleSheet.create({
  glassClip: {
    borderRadius: Layout.tabBar.radius,
    overflow: 'hidden',
  },
  glassOverlay: {
    backgroundColor: Colors.tabBarTranslucent,
  },
  // Drawn ABOVE the blur and the tint. See renderTabBarGlass for why this is a
  // layer and not a `borderWidth` on the bar.
  glassHairline: {
    borderRadius: Layout.tabBar.radius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.divider,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

/**
 * The bottom tab navigator — IA restructure step 2 (nav skeleton).
 *
 * FOUR tabs, in this order (order is load-bearing: the navigator sets no
 * `initialRouteName`, so the FIRST child is the surface the app opens on, and
 * that must stay Home):
 *
 *   Home      → DashboardScreen     (Today; unchanged)
 *   Practices → JourneyMapScreen    (the journey map, as of journey slice 5a)
 *   Learn     → LearnHubScreen      (SHELL; content in a later step)
 *   Community → CommunityNavigator  (unchanged)
 *
 * WHAT CHANGED. This was five tabs (Home / Focus / Energy / Time / Community).
 * Focus, Energy and Time are no longer TABS. All three screens survive as pushed
 * AppStack screens below, under their original ROUTES.Pillar* names:
 *   - PlanScreen (Time) and EnergyHubScreen (Energy) were re-registered in step
 *     2, so every existing CTA still resolves to the real screen. They push now
 *     instead of switching a tab. That is why navTargets.ts needed no edit.
 *   - FocusHubScreen had no caller in step 2 and so was registered nowhere.
 *     Step 4a gave it one (the Practices hub's "Focus & Time" card) and
 *     registered it, which also restored FocusRhythmsScreen behind it.
 *
 * NAME RETAINED ON PURPOSE. `FivePillarTabs` now renders four tabs, which reads
 * wrong. It is left alone because navTargets.ts:6 and useWeeklyLanding.ts:6 both
 * name this navigator in prose explaining WHY they are shaped the way they are,
 * and navTargets.ts is required to stay byte-unchanged in this slice. Rename it
 * and those two comments in one later cleanup, not here.
 *
 * AI Guide: a docked pill mounted per hub (components/ai/GuidePill.tsx). The two
 * shells do not mount it — there is no surface for it to describe yet.
 *
 * Icons for the two new tabs are first-pass choices, not final.
 *
 * R2 RESTYLED THIS BLOCK AND DELIBERATELY DID NOT RESTYLE THE DEAD ONE. The
 * legacy `BottomTabsNavigator` above still carries the pre-R2 literals - White
 * fill, a 1pt `borderLight` hairline, paddingBottom/Top 5, height 62 - because
 * FOUR_PILLAR_IA has been on since 2026-07-02 and that navigator is legacy
 * pending removal, not something to extend. The two blocks have diverged and
 * that is correct; the note is here rather than there so it sits with the code
 * a reader is actually editing.
 */
const FivePillarTabs = () => {
  const insets = useSafeAreaInsets();
  const reduceTransparency = useReduceTransparency();
  const reduceMotion = useReducedMotion();

  // GLASS IS iOS-ONLY AND OPT-OUT-ABLE (12.2). Android takes the opaque
  // fallback unconditionally - expo-blur on Android is a dim-and-tint
  // approximation, not a backdrop blur - and so does anyone with Reduce
  // Transparency on. The fallback is DESIGNED, not degraded: White, with a
  // hairline in `divider` all the way around the capsule.
  const useGlass = Platform.OS === 'ios' && !reduceTransparency;

  // THE SAME EXPRESSION `useTabBarInset` USES, AND IT MUST STAY THAT WAY.
  // The bar sits this far off the bottom; the sixteen routes clear the bar's
  // height PLUS this offset PLUS a gap. Both read `minBottomOffset`, so the
  // floor moves in one place - but a change to the SHAPE of this expression
  // has to be made in both. On the SE, where insets.bottom is 0, the floor is
  // the only thing holding the capsule off the screen edge.
  const bottomOffset = Math.max(insets.bottom, Layout.tabBar.minBottomOffset);

  return (
    <BottomTabs.Navigator
      // PER-TAB ERROR BOUNDARY (slice 7g). Wraps all four tab scenes; the tab
      // bar is rendered by BottomTabView outside them, so it survives a throw
      // and the user can leave a broken tab. See navigation/screenBoundary.tsx.
      //
      // TABS ARE LAZY (BottomTabView defaults `lazy` to true), so a tab's
      // boundary does not exist until that tab is first focused, and once
      // mounted a tab STAYS mounted - which is why a tab left in its error
      // state stays in it across a tab switch away and back. That is pinned in
      // __tests__/screenBoundary.test.tsx rather than left as an artefact.
      screenLayout={screenBoundaryLayout}
      screenOptions={{
        headerShown: false,
        // TINTS ARE UNCHANGED. R1b-i settled both; this row adds the glyph
        // switch beside them rather than moving either value.
        tabBarActiveTintColor: Colors.evergreenTeal,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarBackground: useGlass ? renderTabBarGlass : undefined,
        tabBarVisibilityAnimationConfig: reduceMotion
          ? REDUCED_MOTION_VISIBILITY
          : undefined,
        tabBarStyle: {
          // THE CAPSULE (12.2: "Absolutely positioned, capsule, clear of the
          // bottom safe area"). Geometry is walk-tuned; see Layout.tabBar.
          //
          // `position: 'absolute'` is what makes the bar float, and it is also
          // what stops BottomTabView reserving space for it - which is why
          // every tab-bar-visible route now takes its own inset from
          // `useTabBarInset()`. The library's own base style already supplies
          // start/end/bottom 0, so only `position` and the overrides below are
          // ours.
          position: 'absolute',
          height: Layout.tabBar.height,
          bottom: bottomOffset,
          // marginHorizontal, NOT left/right: the base style sets `start`/`end`
          // and mixing those with left/right is direction-dependent.
          marginHorizontal: Layout.tabBar.marginHorizontal,
          borderRadius: Layout.tabBar.radius,
          // Cancel the library's edge-to-edge hairline and BOTH of the paddings
          // the old bar set. `paddingBottom: 5` is what used to override the
          // library's `paddingBottom: insets.bottom` and leave the labels 5pt
          // from the screen edge, inside the home-indicator region; with the
          // capsule lifted by `bottom` there is nothing left for it to do.
          borderTopWidth: 0,
          paddingTop: 0,
          paddingBottom: 0,
          ...Layout.shadow.lg,
          ...(useGlass
            ? // Glass: NO backgroundColor. Supplying `tabBarBackground` makes
              // the library set the bar transparent for us, and setting a
              // colour here would paint over the blur. NO borderWidth either -
              // the library's absoluteFill wrapper would cover it, so the glass
              // branch draws its hairline as the topmost layer inside
              // `renderTabBarGlass` instead. Both states carry the same
              // `divider` hairline (walk A0b); only where it is attached
              // differs.
              { borderWidth: 0 }
            : {
                backgroundColor: Colors.white,
                borderWidth: StyleSheet.hairlineWidth,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderColor: Colors.divider,
              }),
        },
        // NO tabBarLabelStyle. Labels go through the shared Text primitive via
        // `TabBarLabel`; see its comment for why a style key cannot do the job.
        // NO tabBarBadge anywhere: the bar is chrome and never carries state a
        // user has to clear (12.2, FourPillar IA spec).
        // NO tabBarHideOnKeyboard: its show/hide animation is library-internal
        // and the keyboard case exists only on Community routes, which are out
        // of redesign scope until R6+.
      }}
    >
      <BottomTabs.Screen
        name={ROUTES.Home}
        component={DashboardScreen}
        options={tabOpts({
          tabBarLabel: ({ color }) => <TabBarLabel label="Home" color={color} />,
          tabBarIcon: ({ focused, color, size }) => (
            <Icon
              name={focused ? 'view-dashboard' : 'view-dashboard-outline'}
              size={size}
              color={color}
            />
          ),
        })}
      />
      <BottomTabs.Screen
        name={ROUTES.PillarPractices}
        component={JourneyMapScreen}
        options={tabOpts({
          // LABEL ANSWERED, AND THE ANSWER CHANGED IT (roadmap row 7n).
          // Jen, 2026-09-12: the tab does NOT keep the word "Practices". It
          // reads "Journey", and the map screen behind it reads "Your
          // journey". "Practices" survives as the name of the runnable content
          // library wherever that library itself appears, never as this tab;
          // the hierarchy is Journey -> destination -> today's protocol ->
          // supporting practice. The route NAME stays
          // PillarPractices regardless: renaming a registered route breaks
          // every deep link that names it, for a cosmetic gain.
          tabBarLabel: ({ color }) => <TabBarLabel label="Journey" color={color} />,
          // GLYPH CHANGED AT R2, AND IT HAD TO. 12.2 requires an outline
          // variant for the inactive state and MCI ships no `leaf-outline` -
          // `leaf`'s only relatives are the circled and maple forms, and
          // `leaf-circle-outline` would pop a ring in and out between states.
          // `sprout`/`sprout-outline` is a true MCI pair, is nature-derived per
          // 7, and reads as growth over time, which is what a journey is.
          // The ROUTE name is untouched: ROUTES.PillarPractices does not move.
          //
          // Icon `name` is typed to MCI's own glyph union, so a glyph that is
          // not in the installed set is a tsc error rather than a blank square
          // on a device. That is what catches `leaf-outline`, which does not
          // exist - verified by mutation at the build.
          tabBarIcon: ({ focused, color, size }) => (
            <Icon name={focused ? 'sprout' : 'sprout-outline'} size={size} color={color} />
          ),
        })}
      />
      <BottomTabs.Screen
        name={ROUTES.PillarLearn}
        component={LearnHubScreen}
        options={tabOpts({
          tabBarLabel: ({ color }) => <TabBarLabel label="Learn" color={color} />,
          tabBarIcon: ({ focused, color, size }) => (
            <Icon
              name={focused ? 'book-open-variant' : 'book-open-variant-outline'}
              size={size}
              color={color}
            />
          ),
        })}
      />
      <BottomTabs.Screen
        name={ROUTES.Community}
        component={CommunityNavigator}
        options={({ route }) =>
          tabOpts({
            tabBarLabel: ({ color }) => <TabBarLabel label="Community" color={color} />,
            tabBarIcon: ({ focused, color, size }) => (
              <Icon
                name={focused ? 'account-group' : 'account-group-outline'}
                size={size}
                color={color}
              />
            ),
            // SPREAD, NOT SET TO undefined. A key present in a screen's options
            // wins over `screenOptions` even when its value is undefined, so
            // writing `tabBarStyle: isChat ? hidden : undefined` would blank the
            // capsule's whole style on every other Community route. Absent when
            // it does not apply is the only safe shape.
            ...(hidesTabBar(route)
              ? { tabBarStyle: { display: 'none' as const } }
              : {}),
          })
        }
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
        // PER-SCREEN ERROR BOUNDARY (slice 7g). Wraps all 40 screens registered
        // below, including `Main`, and any screen added later. The native-stack
        // header and its back button render outside the boundary, so a screen
        // that throws keeps its way back. See navigation/screenBoundary.tsx.
        //
        // OfflineIndicator above is OUTSIDE the navigator and so is not covered
        // here; it, the providers and NavigationContainer itself fall through to
        // the App.tsx:114 backstop, which is why that boundary stays.
        screenLayout={screenBoundaryLayout}
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
        {/* IA restructure step 2 — the two hubs that lost their tab but kept
            their callers.

            PlanScreen and EnergyHubScreen were tab roots. They are re-registered
            here under the SAME route names they had as tabs, so navTargets.ts
            needs no edit and every CTA that names NAV_TARGETS.plan /
            NAV_TARGETS.browseContent still resolves to the real screen. The only
            behavioural difference is that they now PUSH over the tab bar instead
            of switching a tab.

            headerShown is true precisely because these were tabs: a tab root has
            no back affordance of its own, so pushed with a hidden header they
            would be one-way screens. The native header supplies the back gesture
            and chevron.

            title is deliberately EMPTY. Both screens render their own h1 ("Time",
            "Energy") as the first thing in their layout, so setting a header title
            would print the page name twice, one above the other. Leaving `title`
            off entirely is not the same thing: React Navigation would then fall
            back to the route name and print "PillarTime" / "PillarEnergy" in the
            header.

            Neither carries a headerBackTitle override: unlike EnergyBrowse and
            FocusRhythms below, these have several parents (dashboard CTAs, the
            check-in hand-off, a reminder tap), so the generic 'Back' from
            standardHeaderOptions is the honest label. */}
        <AppStack.Screen
          name={ROUTES.PillarTime}
          component={PlanScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            title: '',
            headerShadowVisible: false,
          })}
        />
        <AppStack.Screen
          name={ROUTES.PillarEnergy}
          component={EnergyHubScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            title: '',
            headerShadowVisible: false,
          })}
        />
        {/* IA restructure step 4a — the third hub that lost its tab, registered
            on the same terms as the two above (empty title because the screen
            renders its own "Focus" h1; headerShown for the back path a former
            tab root does not carry).

            This is what un-darks Focus. From step 2 until now FocusHubScreen was
            registered nowhere and FocusRhythmsScreen — reachable only from
            inside it — was dark with it. The registration was held back on
            purpose rather than left in place: an unreachable route is worse than
            an absent one, because the suite goes green either way.

            headerBackTitle IS overridden here, unlike PillarTime / PillarEnergy.
            Those two have several parents (dashboard CTAs, the check-in
            hand-off, a reminder tap), so the generic 'Back' is the honest label.
            This one has exactly one parent — the Practices hub — which is the
            same condition under which EnergyBrowse and FocusRhythms name theirs. */}
        <AppStack.Screen
          name={ROUTES.PillarFocus}
          component={FocusHubScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            headerBackTitle: 'Journey',
            animation: 'slide_from_right',
            headerShown: true,
            title: '',
            headerShadowVisible: false,
          })}
        />
        {/* TB-1b — Today's blocks, reached from the Focus hub's "Time blocking"
            card, which stopped being a coming-soon placeholder in this slice.

            NOT flag-gated, on exactly the PillarStressRecovery terms below:
            its only entry point is the Focus hub, which is reachable only
            through the Practices hub, which exists only in the four-tab IA. No
            flag-OFF path can reach it, so a gate would be dead code.

            headerBackTitle names the single parent, the same condition under
            which FocusRhythms names its own.

            NAMED COST, TB-3: that parent is no longer single. "Block it" on the
            Tasks screen now pushes this route from FocusTasks, so the back
            chevron reads "Focus" while back actually returns to Tasks. The
            label is wrong, the destination is right, and nothing is stranded.

            Accepted rather than fixed, deliberately. headerBackTitle is a static
            string evaluated once at registration, so the fix is to make options
            a function of the route and derive the label from where the user came
            from — which means either threading a param purely for a header
            string or reading navigation state at render. Both are more machinery
            than a one-word label is worth on a screen with two entry points.
            Revisit if a third arrives, or if the walk finds it disorienting. */}
        <AppStack.Screen
          name={ROUTES.FocusDayBlocks}
          component={DayBlocksScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            headerBackTitle: 'Focus',
            animation: 'slide_from_right',
            headerShown: true,
            title: '',
            headerShadowVisible: false,
          })}
        />
        {/* TB-2b — Tasks, reached from the Focus hub's "Task batching" card,
            which stopped being a coming-soon placeholder in this slice. That
            card was the LAST ComingSoonCard call site in the app; the component
            stays, deliberately, for the next planned tool.

            Ungated and headerBackTitle'd on exactly the same terms as the day
            view above: one parent, and that parent exists only in the four-tab
            IA. */}
        <AppStack.Screen
          name={ROUTES.FocusTasks}
          component={CapturedTasksScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            headerBackTitle: 'Focus',
            animation: 'slide_from_right',
            headerShown: true,
            title: '',
            headerShadowVisible: false,
          })}
        />
        {/* IA restructure step 4b-ii-a — the Stress Recovery pillar page, the
            fourth and last card on the Practices hub.

            Registered on the same terms as PillarFocus above, and for the same
            reason: exactly one parent (the Practices hub), so headerBackTitle
            names it rather than falling back to the generic 'Back'. title is
            empty because the screen renders its own heading as the list's
            header, the way the Focus and Energy hubs render theirs.

            NOT flag-gated, unlike EnergyBrowse / FocusRhythms below. Those two
            predate the four-tab IA and had to stay invisible under the legacy
            flag; this screen's only entry point is the Practices hub, which
            exists only in the four-tab IA, so there is no flag-OFF path that
            could reach it. */}
        <AppStack.Screen
          name={ROUTES.PillarStressRecovery}
          component={StressRecoveryScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            headerBackTitle: 'Journey',
            animation: 'slide_from_right',
            headerShown: true,
            title: '',
            headerShadowVisible: false,
          })}
        />
        {/* Four-Pillar IA Phase B-3b — Energy hub browse list. Flag-gated so
            the old four-tab IA never registers it (flag OFF = byte-identical).
            Reached from EnergyHubScreen, which is registered just above (it was
            the Energy TAB until step 2; it is a pushed AppStack screen now, so
            this list still has its parent). This screen launches the existing
            player via PracticeRun. Title is set per-category in-screen. No Guide
            pill here: it lives on the Energy hub, not its browse lists. */}
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
            hub browse list. A quiet opt-in capture, no Guide pill.

            REACHABLE AGAIN as of step 4a. Its only entry point is FocusHubScreen
            (the "when focus comes easiest" row), which went dark in step 2 when
            the Focus tab was dropped and took this screen with it. Registering
            the hub above restored both in one move, exactly as step 2 intended
            when it left this registration in place. */}
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
        {/* Weekly loop (spec 6, 8, 9, 10.1) — LIVE IN PRODUCTION.
            Home (DashboardScreen) resolves resolveWeeklyEntry inline and pushes
            WeeklyFloor over the tab when the user has no floor. A user whose
            week has expired is no longer pushed anywhere: the landing rolls the
            next cycle over in place and serves 'today' (journey slice 3b).

            THERE IS NO WeeklyToday SCREEN. Every flow below that used to land on
            one now returns to Home, which is the Today surface. Registering a
            second one would put the same content under a second title with a
            back gesture between them, which is the bug this collapse removed.

            The screens no longer render [Jen] / [COPY GAP] prefixes: that
            convention is retired and no marker text reaches the UI. Most of
            their copy is still draft, tracked by `COPY: draft` comments at each
            string rather than by anything visible on screen. */}
        <AppStack.Screen
          name={ROUTES.WeeklyEntry}
          component={WeeklyEntryScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            // Suffix stripped only. "Weekly loop" is internal vocabulary and is
            // a copy gap for Jen, not a rename to make here.
            title: 'Weekly loop',
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
            title: 'Your floor',
            headerShadowVisible: false,
          })}
        />
        {/* The Remove capture (journey slice 3c-i). Modal-style presentation:
            it is a one-time flow entered from a Today card, and it returns to
            Today rather than continuing deeper into the app. Its own header is
            off; each screen carries its own scaffold. */}
        <AppStack.Screen
          name={ROUTES.RemoveCapture}
          component={RemoveCaptureNavigator}
          options={stackOpts({
            headerShown: false,
            animation: 'slide_from_right',
          })}
        />
        {/* One phase, explained (journey slice 5b-i). Registered on the same
            terms as the pillar pages above: exactly one parent, the journey
            map, so headerBackTitle names it rather than falling back to the
            generic 'Back'. title is empty because the page renders its own
            heading, which is the destination's title for this phase and is
            longer than a header bar should carry.

            'Journey' is the back label because that is what the tab says.
            That rename was the slice this comment was waiting for: row 7n
            landed it on 2026-09-14, and this string moved with it. */}
        <AppStack.Screen
          name={ROUTES.JourneyPhase}
          component={JourneyPhaseScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            headerBackTitle: 'Journey',
            animation: 'slide_from_right',
            headerShown: true,
            title: '',
            headerShadowVisible: false,
          })}
        />
        {/* The weekly reset (spec 8, repurposed by journey slice 6). Entered
            from Home rather than from the guard: the real trigger is an
            elapsed week, and faking a week boundary to reach it would be
            worse than not having one. Returns to Home, which gates the entry
            on closeCompletedAt so the reset reads as finished rather than
            repeatable.

            THE TITLE IS READ FROM copy.ts, NOT SPELLED HERE. It was a
            hardcoded literal until 2026-09-10, which put a user-facing string
            outside the copy sentinel's reach for the whole life of the screen.
            Route names and header options are navigation config; the words a
            user reads are not. */}
        <AppStack.Screen
          name={ROUTES.WeeklyClose}
          component={WeeklyCloseScreen}
          options={stackOpts({
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            title: CLOSE_COPY.screenTitle,
            headerShadowVisible: false,
          })}
        />
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
              name="DevTypography"
              component={TypographyDiagnosticScreen}
              options={{
                ...standardHeaderOptions,
                animation: 'slide_from_right',
                headerShown: true,
                title: 'Dev: Typography',
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
        const { doc: firestoreDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('../config/firebase');
        const { subscribeMergedUserData } = await import(
          '../services/firebase/userMigrationRead'
        );

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

        // MIGRATION_FALLBACK — the routing gate reads BOTH documents.
        //
        // hasCompletedOnboarding and onboardingStep are written to userPrivate
        // from slice 2 on, but a user who has not written since updating still
        // has them only on users/{uid}. subscribeMergedUserData layers the two
        // with userPrivate winning, and holds its first emit until BOTH have
        // delivered — without that wait this listener would publish the stale
        // public value for a beat and bounce a migrated user into onboarding
        // and straight back out. Slice 4 replaces this with a plain
        // userPrivate listener.
        //
        // `null` here means NEITHER document exists, which is exactly the
        // condition the single-document listener branched on before.
        unsubscribe = subscribeMergedUserData(
          user.uid,
          async (mergedData) => {
            if (mergedData) {
              const userData = mergedData as Record<string, any>;
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
                  const { writeBatch } = await import('firebase/firestore');
                  const { stageUserPrivate } = await import(
                    '../services/firebase/userPrivate.service'
                  );
                  const batch = writeBatch(db);
                  // MIGRATION_FALLBACK — gate-field dual-write. See the note in
                  // AuthContext.signup; slice 4 drops the users/{uid} half.
                  batch.update(userRef, { hasCompletedOnboarding: true });
                  await stageUserPrivate(batch, user.uid, { hasCompletedOnboarding: true });
                  await batch.commit();
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
                  // Truly new — create with merge to be safe. Same two-document
                  // batch as AuthContext.signup: `email` is private, the
                  // profile card is public, and the pair has to land together
                  // or not at all.
                  const { writeBatch } = await import('firebase/firestore');
                  const { stageUserPrivate } = await import(
                    '../services/firebase/userPrivate.service'
                  );
                  const batch = writeBatch(db);
                  batch.set(userRef, {
                    uid: user.uid,
                    displayName: user.displayName || '',
                    // MIGRATION_FALLBACK — gate-field dual-write, as above.
                    hasCompletedOnboarding: false,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  }, { merge: true });
                  await stageUserPrivate(batch, user.uid, {
                    email: user.email || '',
                    hasCompletedOnboarding: false,
                  });
                  await batch.commit();
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
