/**
 * Route name registry — single source of truth for navigation target names.
 *
 * Phase B-1 of the Four-Pillar IA migration. Navigation targets were previously
 * bare string literals scattered across screens, services, and notification
 * handlers. This registry centralizes the route-name strings so later phases
 * (tab renames, pillar re-homing) become single-file edits instead of an
 * app-wide find-and-replace.
 *
 * IMPORTANT — values must equal the strings registered in AppNavigator.tsx.
 * Changing a value here changes where navigation lands. B-1 is a no-op refactor:
 * every value below matches the current registered route name exactly.
 *
 * Separation note: these are NAVIGATION route names. They are intentionally kept
 * distinct from the BrainPillar content taxonomy (growth / energy / focus /
 * resilience / connection in src/types/models.ts). No route-name value reuses a
 * BrainPillar literal — the focus session route is `FocusTimer`, not `Focus`,
 * and there is deliberately no bare `Energy` / `Focus` route name here.
 */

export const ROUTES = {
  // --- Bottom tabs (BottomTabsNavigator) ---
  // The legacy Wellness tab was dissolved in B-3d.7; its route name is retired
  // (no navigator registers it, no caller targets it).
  Home: 'Home',
  Rhythms: 'Rhythms',
  Community: 'Community',

  // --- Five-pillar tabs (FivePillarTabs, mounted when FOUR_PILLAR_IA is on) ---
  // Phase B-3a scaffold. Home and Community reuse the existing bottom-tab route
  // names above (same destinations) so routing parity holds under the flag. The
  // three new pillar tabs get `Pillar`-prefixed names, deliberately namespaced
  // away from the BrainPillar content taxonomy literals (growth / energy /
  // focus / resilience / connection in src/types/models.ts) — there is no bare
  // `Focus` / `Energy` / `Time` route name, mirroring why the focus session is
  // `FocusTimer`, not `Focus`.
  PillarFocus: 'PillarFocus',
  PillarEnergy: 'PillarEnergy',
  PillarTime: 'PillarTime',
  // Energy hub browse list (B-3b), reached from the Energy tab (PillarEnergy →
  // EnergyHubScreen). Parameterized by browseCategory (regulate/rest/fuel).
  // Registered in the flag-ON AppStack path only.
  EnergyBrowse: 'EnergyBrowse',
  // Focus hub (B-3c) secondary entry, reached from the Focus tab (PillarFocus →
  // FocusHubScreen). A quiet capture of when focus comes easiest; no scores.
  // Registered in the flag-ON AppStack path only.
  FocusRhythms: 'FocusRhythms',

  // --- Root / AppStack (MainNavigator) ---
  Main: 'Main',
  Insights: 'Insights',
  FocusTimer: 'FocusTimer',
  Journal: 'Journal',
  Breathwork: 'Breathwork',
  BreathworkDetail: 'BreathworkDetail',
  Sleep: 'Sleep',
  SleepDetail: 'SleepDetail',
  Movement: 'Movement',
  MovementDetail: 'MovementDetail',
  Masterclass: 'Masterclass',
  MasterclassDetail: 'MasterclassDetail',
  PodcastEpisode: 'PodcastEpisode',
  HelpSupport: 'HelpSupport',
  WearableIntegration: 'WearableIntegration',
  HabitDetail: 'HabitDetail',
  ProfileStack: 'ProfileStack',
  NotificationOptIn: 'NotificationOptIn',
  CheckInFlow: 'CheckInFlow',
  Practices: 'Practices',
  PracticeRun: 'PracticeRun',

  // --- Dev-only AppStack screens (__DEV__) ---
  DevBreathPacer: 'DevBreathPacer',
  DevAudioLoader: 'DevAudioLoader',
  DevGuidedSessionPlayer: 'DevGuidedSessionPlayer',
  DevCheckInFlow: 'DevCheckInFlow',
  DevVideoPlayer: 'DevVideoPlayer',

  // --- Auth (AuthNavigator) ---
  Login: 'Login',
  Signup: 'Signup',
  ForgotPassword: 'ForgotPassword',

  // --- Verification ---
  EmailVerification: 'EmailVerification',

  // --- Paywall (PaywallNavigator) ---
  Paywall: 'Paywall',
  RedeemCode: 'RedeemCode',

  // --- Onboarding (OnboardingNavigator, V2 active arc) ---
  OnboardingProblem: 'OnboardingProblem',
  OnboardingStateCheckIn: 'OnboardingStateCheckIn',
  OnboardingStressor: 'OnboardingStressor',
  OnboardingPeakWindow: 'OnboardingPeakWindow',
  OnboardingReflect: 'OnboardingReflect',
  OnboardingProtocol: 'OnboardingProtocol',
  OnboardingRecheck: 'OnboardingRecheck',
  OnboardingBridge: 'OnboardingBridge',
  OnboardingAnchor: 'OnboardingAnchor',
  // Onboarding (legacy V1 arc, mounted only when ONBOARDING_V2 is false)
  OnboardingWelcome: 'OnboardingWelcome',
  OnboardingCheckIn: 'OnboardingCheckIn',
  OnboardingInsight: 'OnboardingInsight',
  OnboardingActivity: 'OnboardingActivity',
  OnboardingValues: 'OnboardingValues',
  OnboardingPersonalizedEntry: 'OnboardingPersonalizedEntry',

  // --- Community stack (CommunityNavigator) ---
  CommunityMain: 'CommunityMain',
  Groups: 'Groups',
  GroupDetail: 'GroupDetail',
  Challenges: 'Challenges',
  ChallengeDetail: 'ChallengeDetail',
  People: 'People',
  Conversations: 'Conversations',
  Chat: 'Chat',
  UserProfile: 'UserProfile',
  ReportReason: 'ReportReason',
  ReportDetail: 'ReportDetail',
  ReportConfirmation: 'ReportConfirmation',

  // --- Profile stack (ProfileNavigator) ---
  ProfileMain: 'ProfileMain',
  Settings: 'Settings',
  NotificationSettings: 'NotificationSettings',
  MutedAccounts: 'MutedAccounts',
} as const;

/** Union of all registered route-name values. */
export type RouteName = (typeof ROUTES)[keyof typeof ROUTES];
