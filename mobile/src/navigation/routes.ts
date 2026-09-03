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

  // --- Tab roots (FivePillarTabs) ---
  // Home and Community reuse the existing bottom-tab route names above (same
  // destinations). Every other tab root gets a `Pillar`-prefixed name,
  // deliberately namespaced away from the BrainPillar content taxonomy literals
  // (growth / energy / focus / resilience / connection in src/types/models.ts)
  // — there is no bare `Focus` / `Energy` / `Time` route name, mirroring why the
  // focus session is `FocusTimer`, not `Focus`.
  //
  // IA restructure step 2: the live tab set is Home / PillarPractices /
  // PillarLearn / Community. The prefix also buys the collision-avoidance this
  // step needed twice over:
  //   - `Practices` was already taken by the check-in "Other options" AppStack
  //     screen below (params-carrying, three callers), so the TAB is
  //     `PillarPractices`.
  //   - `Learn` is already the visible TITLE of the Masterclass AppStack screen
  //     (AppNavigator.tsx), so the TAB is `PillarLearn` — the route id and the
  //     header string can never be confused for each other.
  PillarPractices: 'PillarPractices',
  PillarLearn: 'PillarLearn',

  // --- Former pillar tabs, now AppStack screens (IA restructure steps 2 + 4a) ---
  // Focus / Energy / Time stopped being tabs when the tab set collapsed to four.
  // Their SCREENS survive unchanged, registered on AppStack under these exact
  // names (pushed, not tabs):
  //   - PillarTime  → PlanScreen        (step 2)
  //   - PillarEnergy → EnergyHubScreen  (step 2)
  //     Keeping these names is what let NAV_TARGETS (navTargets.ts) go on
  //     resolving live: every dashboard / check-in / nudge CTA still lands on the
  //     real screen, it just pushes instead of switching a tab.
  //   - PillarFocus → FocusHubScreen    (step 4a) Held unregistered through step
  //     2 because it had no caller, and an unreachable route is worse than an
  //     absent one. The Practices hub's "Focus & Time" card is that caller, so it
  //     is registered now — which also un-darkened FocusRhythms behind it.
  PillarFocus: 'PillarFocus',
  PillarEnergy: 'PillarEnergy',
  PillarTime: 'PillarTime',
  // --- Net-new pillar page (IA restructure step 4b-ii-a) ---
  // Stress Recovery. Unlike the three above, this was never a tab: it is a new
  // screen (StressRecoveryScreen), so the `Pillar` prefix here is naming a
  // pillar page rather than preserving a tab-era name. Reached ONLY from the
  // Practices hub's fourth card, and registered in the same commit as that card
  // — the no-dead-ends rule, which is why this key did not exist until now.
  PillarStressRecovery: 'PillarStressRecovery',
  // Energy hub browse list (B-3b), reached from the Energy tab (PillarEnergy →
  // EnergyHubScreen). Parameterized by browseCategory (regulate/rest/fuel).
  // Registered in the flag-ON AppStack path only.
  EnergyBrowse: 'EnergyBrowse',
  // Focus hub (B-3c) secondary entry, reached from the Focus hub (PillarFocus →
  // FocusHubScreen) and from nowhere else. A quiet capture of when focus comes
  // easiest; no scores. Registered in the flag-ON AppStack path only.
  FocusRhythms: 'FocusRhythms',
  // Today's blocks (TB-1b), reached from the Focus hub's "Time blocking" card
  // and, since TB-3, from "Block it" in the Tasks edit sheet — which pushes it
  // with {seedTitle, seedDemand, seedTaskId} to open the add sheet pre-filled.
  // NOT flag-gated, on the PillarStressRecovery precedent: neither parent is
  // reachable outside the four-tab IA, so there is no flag-OFF path to it.
  FocusDayBlocks: 'FocusDayBlocks',
  // Captured tasks (TB-2b), reached from the Focus hub's "Task batching" card
  // and from nowhere else. Ungated for the same reason as FocusDayBlocks above:
  // its only parent exists solely in the four-tab IA, so a flag would be dead
  // code. NOT a home for the legacy web `tasks` collection — this screen reads
  // capturedTasks only.
  FocusTasks: 'FocusTasks',

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

  // --- Weekly loop (spec 6, 8, 9, 10.1) ---
  // LIVE IN PRODUCTION. These are the flows either side of the daily surface,
  // not the daily surface itself.
  //
  // THERE IS NO WeeklyToday ROUTE, deliberately. Today is Home (the tab above),
  // which renders the day's action, the capacity re-set, the continuity count
  // and the close entry. A standalone Today screen existed while Home was still
  // the daily Situation x State engine; it was deleted once Home took the
  // surface over, because two Todays meant the same content under two titles
  // and a back gesture between them. Do not re-add one: Home resolves the entry
  // rule inline through useWeeklyLanding precisely because a tab cannot be
  // replaced into.
  //
  // WeeklyEntry is the guard for the flows that reach it from inside this
  // stack; it routes to the floor, the open, or back out to Home.
  //
  // WeeklyClose is entered from Home and returns to it. The real trigger is an
  // elapsed week, and wiring that into the guard is a tracked follow-up.
  WeeklyEntry: 'WeeklyEntry',
  WeeklyFloor: 'WeeklyFloor',
  WeeklyOpen: 'WeeklyOpen',
  // The Remove capture flow (journey slice 3c-i). ONE AppStack entry holding a
  // nested stack, so the flow's own six route names stay inside their own
  // navigator and cannot collide with anything here.
  RemoveCapture: 'RemoveCapture',
  WeeklyClose: 'WeeklyClose',

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
