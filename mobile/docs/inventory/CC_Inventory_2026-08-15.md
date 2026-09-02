# Vara Mobile — Diagnostic Inventory

**Date:** 2026-08-15
**HEAD:** `15ae35e` "Merge TB-3: task-to-block bridge" (branch `main`)
**Scope:** `mobile/` subdirectory. Read-only pass. No code changed.
**Method:** static reading of the tree plus `npx tsc --noEmit` and `npx jest --forceExit`, both run from `mobile/`. No device run, no Firestore console access, no network calls to Firebase Storage.

Three states are used throughout and never collapsed:

- **BUILT AND REACHABLE** — a signed-in, onboarded, subscribed user can arrive at it today by tapping through the app.
- **BUILT BUT DARK** — the file exists and compiles, and either no navigator registers it or every code path that would navigate to it is itself unreachable.
- **NOT PRESENT** — no such file.

---

## SECTION 1 — Navigation and reachability

All navigation lives in one file: `mobile/src/navigation/AppNavigator.tsx`. Route-name strings are centralized in `mobile/src/navigation/routes.ts` (`ROUTES`), with two flag-dependent aliases in `mobile/src/navigation/navTargets.ts` (`NAV_TARGETS.plan`, `NAV_TARGETS.browseContent`).

Compile-time flags in `mobile/src/constants/dashboardConfig.ts` govern which navigator mounts:

| Flag | Value | Effect |
|---|---|---|
| `FOUR_PILLAR_IA` | `true` | `MainNavigator` mounts `FivePillarTabs` (four tabs), not `BottomTabsNavigator` |
| `ONBOARDING_V3` | `true` | `OnboardingNavigator` returns the V3 stack and returns early, never reaching the V1/V2 branch |
| `ONBOARDING_V2` | `true` | Dead while `ONBOARDING_V3` is true |
| `DASHBOARD_V2` | `true` | Gates render/data logic inside `useDashboard`, not routing |
| `JOURNEY_IA` | `true` | Home resolves its landing through `useJourneyLanding` and sources the day from a `PhaseContext` instead of a `WeeklyCycle` (journey slice 2). Gates render/data logic, not routing, but it does suppress the `open` target: while on, Home neither pushes to `WeeklyOpen` nor renders `OpenYourWeekCard`. |

### 1a / 1b. Registered routes, by navigator

#### Root gate — `AppNavigator` (`AppNavigator.tsx:1218`)

The root renders exactly one of five branches, in this order: `AuthNavigator` (no user) → `VerificationNavigator` (unverified email) → `OnboardingNavigator` (`hasCompletedOnboarding === false`) → `PaywallNavigator` (`!subscriptionStatus?.canAccessApp`, fail-closed) → `MainNavigator`.

#### `AuthNavigator`

| Route | File | State |
|---|---|---|
| `Login` | `src/screens/auth/LoginScreen.tsx` | REACHABLE (unauthenticated) |
| `Signup` | `src/screens/auth/SignupScreen.tsx` | REACHABLE |
| `ForgotPassword` | `src/screens/auth/ForgotPasswordScreen.tsx` | REACHABLE |

#### `VerificationNavigator`

| Route | File | State |
|---|---|---|
| `EmailVerification` | `src/screens/auth/EmailVerificationScreen.tsx` | CONDITIONAL — only while `user && !user.emailVerified` |

#### `PaywallNavigator`

| Route | File | State |
|---|---|---|
| `Paywall` | `src/screens/PaywallScreen.tsx` | CONDITIONAL — onboarded user with no affirmative access grant |
| `RedeemCode` | `src/screens/RedeemCodeScreen.tsx` | CONDITIONAL — pushed from `PaywallScreen` |

#### `OnboardingNavigator` — V3 branch (the mounted default)

All nine are CONDITIONAL on `hasCompletedOnboarding === false`. Route names come from `src/screens/onboarding/v3/routes.ts` (`V3_ROUTES`), which is local to the arc and deliberately not in `ROUTES`.

| Route id | File | State |
|---|---|---|
| `OnboardingV3ColdOpen` | `v3/OnboardingV3ColdOpenScreen.tsx` | REACHABLE (first-run) |
| `OnboardingV3Outcome` | `v3/OnboardingV3OutcomeScreen.tsx` | REACHABLE |
| `OnboardingV3Why` | `v3/OnboardingV3WhyScreen.tsx` | REACHABLE |
| `OnboardingV3Capacity` | `v3/OnboardingV3CapacityScreen.tsx` | REACHABLE |
| `OnboardingV3Floor` | `v3/OnboardingV3FloorScreen.tsx` | REACHABLE |
| `OnboardingV3WeekStart` | `v3/OnboardingV3WeekStartScreen.tsx` | REACHABLE |
| `OnboardingV3FirstWin` | `v3/OnboardingV3FirstWinScreen.tsx` | REACHABLE |
| `OnboardingV3Reminder` | `v3/OnboardingV3ReminderScreen.tsx` | REACHABLE |
| `OnboardingV3Done` | `v3/OnboardingV3DoneScreen.tsx` | REACHABLE |

#### `OnboardingNavigator` — V2 and V1 branches

`AppNavigator.tsx:202` returns the V3 navigator before the ternary at line 236 is evaluated. Every screen below is **BUILT BUT DARK** while `ONBOARDING_V3 === true`.

V2 arc (`ONBOARDING_V2` branch): `OnboardingProblem`, `OnboardingStateCheckIn`, `OnboardingStressor`, `OnboardingPeakWindow`, `OnboardingReflect`, `OnboardingProtocol`, `OnboardingRecheck`, `OnboardingBridge`, `OnboardingAnchor` — files `src/screens/onboarding/Onboarding*Screen.tsx`.

V1 arc (`!ONBOARDING_V2` branch, doubly dark): `OnboardingWelcome`, `OnboardingCheckIn`, `OnboardingInsight`, `OnboardingActivity`, `OnboardingValues`, `OnboardingPersonalizedEntry`.

#### `FivePillarTabs` — the live tab bar (four tabs)

Order is load-bearing: no `initialRouteName` is set, so the first child is the launch surface.

| Tab route | Component | File | State |
|---|---|---|---|
| `Home` | `DashboardScreen` | `src/screens/DashboardScreen.tsx` | REACHABLE (launch surface) |
| `PillarPractices` | `PracticesHubScreen` | `src/screens/practices/PracticesHubScreen.tsx` | REACHABLE |
| `PillarLearn` | `LearnHubScreen` | `src/screens/learn/LearnHubScreen.tsx` | REACHABLE — renders a single placeholder line, nothing tappable |
| `Community` | `CommunityNavigator` | `src/screens/community/CommunityScreen.tsx` | REACHABLE |

`BottomTabsNavigator` (the legacy three-tab `Home` / `Rhythms` / `Community` navigator, `AppNavigator.tsx:452`) is **BUILT BUT DARK**: it is only selected when `FOUR_PILLAR_IA` is false. Its `Rhythms` route name is likewise unregistered today; `NAV_TARGETS.plan` resolves to `PillarTime` instead.

#### `CommunityNavigator` (nested under the Community tab)

| Route | File | State |
|---|---|---|
| `CommunityMain` | `src/screens/community/CommunityScreen.tsx` | REACHABLE |
| `Groups` | `src/screens/community/GroupsScreen.tsx` | REACHABLE — `CommunityFeedHeader` quick-nav, and the orientation card |
| `GroupDetail` | `src/screens/community/GroupDetailScreen.tsx` | REACHABLE — post card group chip, `GroupsScreen` |
| `Challenges` | `src/screens/community/ChallengesScreen.tsx` | REACHABLE — quick-nav |
| `ChallengeDetail` | `src/screens/community/ChallengeDetailScreen.tsx` | REACHABLE — from `ChallengesScreen` |
| `People` | `src/screens/community/PeopleScreen.tsx` | REACHABLE — quick-nav |
| `Conversations` | `src/screens/ConversationsScreen.tsx` | REACHABLE — quick-nav labelled "Messages" |
| `Chat` | `src/screens/ChatScreen.tsx` | REACHABLE — `PeopleScreen`, `UserProfileScreen`, `MessagesScreen`, notification tap |
| `UserProfile` | `src/screens/community/UserProfileScreen.tsx` | REACHABLE — post author tap |
| `ReportReason` | `src/screens/community/ReportReasonScreen.tsx` | REACHABLE — post overflow menu |
| `ReportDetail` | `src/screens/community/ReportDetailScreen.tsx` | REACHABLE |
| `ReportConfirmation` | `src/screens/community/ReportConfirmationScreen.tsx` | REACHABLE |

Note the naming trap: the route `Conversations` mounts `src/screens/ConversationsScreen.tsx`. `src/screens/community/MessagesScreen.tsx` is **imported** into `AppNavigator.tsx:87` and registered nowhere — see 1d.

#### `ProfileNavigator` (modal, pushed as `ProfileStack`)

| Route | File | State |
|---|---|---|
| `ProfileMain` | `src/screens/ProfileScreen.tsx` | REACHABLE — Home header avatar/cog, Community header avatar |
| `Settings` | `src/screens/SettingsScreen.tsx` | REACHABLE — Home cog navigates directly to `{ screen: 'Settings' }` |
| `NotificationSettings` | `src/screens/NotificationSettingsScreen.tsx` | REACHABLE — from Settings |
| `MutedAccounts` | `src/screens/MutedAccountsScreen.tsx` | REACHABLE — `SettingsScreen.tsx:517` |

#### `MainNavigator` / `AppStack` (pushed over the tab bar)

| Route | File | State | Live entry point |
|---|---|---|---|
| `Main` | `FivePillarTabs` | REACHABLE | root |
| `Insights` | `src/screens/InsightsScreen.tsx` | REACHABLE | `InsightsLookbackCard` at the foot of Home; `HabitDetailScreen.tsx:493`; `useNotifications.ts:83` |
| `FocusTimer` | `src/screens/Focus/FocusScreen.tsx` | REACHABLE | Focus hub primary card; focus-session notification |
| `Journal` | `src/screens/JournalScreen.tsx` | REACHABLE | Energy hub secondary row "Journal" |
| `Breathwork` | `src/screens/discover/BreathworkScreen.tsx` | **DARK** | none |
| `BreathworkDetail` | `src/screens/discover/BreathworkDetailScreen.tsx` | **DARK** | only from `BreathworkScreen`, itself dark |
| `Sleep` | `src/screens/discover/SleepScreen.tsx` | **DARK** | none |
| `SleepDetail` | `src/screens/discover/SleepDetailScreen.tsx` | **DARK** | only from `SleepScreen` / itself |
| `Movement` | `src/screens/discover/MovementScreen.tsx` | **DARK** | none |
| `MovementDetail` | `src/screens/discover/MovementDetailScreen.tsx` | **DARK** | only from `MovementScreen` |
| `Masterclass` (title "Learn") | `src/screens/discover/MasterclassScreen.tsx` | REACHABLE | Energy hub secondary row "Learn" |
| `MasterclassDetail` | `src/screens/discover/MasterclassDetailScreen.tsx` | REACHABLE | from `MasterclassScreen` |
| `PodcastEpisode` | `src/screens/discover/PodcastEpisodeScreen.tsx` | REACHABLE | `MasterclassScreen.tsx:109` |
| `HelpSupport` | `src/screens/HelpSupportScreen.tsx` | REACHABLE | `SettingsScreen.tsx:758` |
| `WearableIntegration` | `src/screens/WearableIntegrationScreen.tsx` | REACHABLE | `SettingsScreen.tsx:741` |
| `HabitDetail` | `src/screens/HabitDetailScreen.tsx` | REACHABLE | Home `WeeklyHabitGrid.onOpenHabit`; `HabitsScreen.tsx:64` inside PlanScreen |
| `ProfileStack` | `ProfileNavigator` | REACHABLE | Home / Community headers |
| `NotificationOptIn` | `src/screens/NotificationOptInScreen.tsx` | REACHABLE | `useHabitsScreen.ts:368`, `JournalScreen.tsx:484`, `PlanScreen.tsx:205` |
| `CheckInFlow` | `src/screens/checkin/CheckInFlowScreen.tsx` | **DARK** | all three callers are unmounted components — see below |
| `Practices` (title "Other options") | `src/screens/practices/PracticesIndexScreen.tsx` | **DARK** | only caller is `CheckInFlowScreen.tsx:175`, itself dark |
| `PracticeRun` | `src/screens/practices/PracticeRunScreen.tsx` | REACHABLE | `EnergyBrowseListScreen.tsx:79`, `StressRecoveryScreen.tsx:114` |
| `PillarTime` | `src/screens/PlanScreen.tsx` | REACHABLE | Practices hub "Routines" card, Home routine/habit CTAs, routine reminder tap |
| `PillarEnergy` | `src/screens/Energy/EnergyHubScreen.tsx` | REACHABLE | Practices hub "Energy" card |
| `PillarFocus` | `src/screens/Focus/FocusHubScreen.tsx` | REACHABLE | Practices hub "Focus & Time" card |
| `FocusDayBlocks` | `src/screens/Focus/DayBlocksScreen.tsx` | REACHABLE | Focus hub "Time blocking"; "Block it" in the Tasks edit sheet (TB-3) |
| `FocusTasks` | `src/screens/Focus/CapturedTasksScreen.tsx` | REACHABLE | Focus hub "Task batching" |
| `PillarStressRecovery` | `src/screens/StressRecovery/StressRecoveryScreen.tsx` | REACHABLE | Practices hub "Stress Recovery" card |
| `EnergyBrowse` | `src/screens/Energy/EnergyBrowseListScreen.tsx` | CONDITIONAL on `FOUR_PILLAR_IA` (true) → REACHABLE | Energy hub category cards |
| `FocusRhythms` | `src/screens/Focus/FocusRhythmsScreen.tsx` | CONDITIONAL on `FOUR_PILLAR_IA` (true) → REACHABLE | Focus hub "Focus rhythms" row |
| `WeeklyEntry` | `src/screens/weekly/WeeklyEntryScreen.tsx` | REACHABLE | `FloorCommitmentScreen.tsx:72` and `WeeklyCloseScreen.tsx:140` `replace` into it. Nothing pushes it fresh — Home resolves the same rule inline via `useWeeklyLanding` |
| `WeeklyFloor` | `src/screens/weekly/FloorCommitmentScreen.tsx` | REACHABLE | pushed by Home when `weeklyLanding.target === 'floor'` |
| `WeeklyOpen` | `src/screens/weekly/WeeklyOpenScreen.tsx` | REACHABLE | pushed by Home on `'open'`; standing `OpenYourWeekCard` |
| `WeeklyClose` | `src/screens/weekly/WeeklyCloseScreen.tsx` | REACHABLE | `CloseWeekEntry` on Home |
| `DevBreathPacer` | `src/screens/_dev/BreathPacerTestScreen.tsx` | CONDITIONAL `__DEV__` | Settings DEV TOOLS |
| `DevAudioLoader` | `src/screens/_dev/ProtocolAudioLoaderTestScreen.tsx` | CONDITIONAL `__DEV__` | Settings DEV TOOLS |
| `DevGuidedSessionPlayer` | `src/screens/_dev/GuidedSessionPlayerTestScreen.tsx` | CONDITIONAL `__DEV__` | Settings DEV TOOLS |
| `DevCheckInFlow` | `src/screens/_dev/CheckInFlowTestScreen.tsx` | CONDITIONAL `__DEV__` | Settings DEV TOOLS |
| `DevVideoPlayer` | `src/screens/_dev/VideoPlayerTestScreen.tsx` | CONDITIONAL `__DEV__` | `SettingsScreen.tsx:706` |

`PlanScreen` mounts `src/screens/HabitsScreen.tsx` and `src/screens/Time/RoutinesTab.tsx` as **child components**, not as routes (`PlanScreen.tsx:295`, `:301`). Both are reachable content; neither is a registered screen. Same for `src/screens/Focus/PomodoroTab.tsx` inside `FocusScreen` and `src/screens/Time/ActiveRoutinePlayer.tsx`, which Home and PlanScreen render as a modal.

### 1c. What went dark, and when

| Dark thing | Last live entry point | Commit that darkened it |
|---|---|---|
| `CheckInFlow` route + `CheckInFlowScreen` | `BrainStateCheckin` card and `OverwhelmSafetyCard`/`SlimResetAffordance` row on Home | `2af65a9` "feat(landing): de-engine the dashboard, Home collapses to Today" (2026-08-06) removed the check-in cards; `5ec3fc7` "feat(landing): stop rendering the slim reset row on Home" (2026-08-07) removed the last one. Both components still compile and still `navigate('CheckInFlow', …)`; neither is rendered by any screen. |
| `Practices` route (`PracticesIndexScreen`) | `CheckInFlowScreen.tsx:175` "See other options" / "Try something longer" | Same two commits, transitively — its only caller is now unreachable. |
| `Breathwork` / `Sleep` / `Movement` hubs and their detail screens | The legacy `DiscoverNavigator` / `DiscoverScreen` hub | `2c40de1` "refactor(nav): retire DiscoverNavigator + single-register content routes (B-3d.5)". The routes were kept registered on `AppStack`; the hub that linked them was not replaced. `QuickActionCarousel.tsx` still names `Breathwork` and `Movement` as targets but that component has zero render sites. |
| `BottomTabsNavigator` + `ROUTES.Rhythms` | The three-tab IA | `3c1f33f` "feat(nav)!: four-tab IA skeleton" (2026-08-10), gated behind `FOUR_PILLAR_IA` which is now `true`. |
| V1 + V2 onboarding arcs | `OnboardingNavigator` ternary | `494e296` "feat(onboarding): the V3 progressive arc" plus `ONBOARDING_V3 = true`. |
| `MoreMenuScreen` / Wellness tab | Bottom tab bar | `c6522c0` "refactor(nav): dissolve the Wellness tab + MoreMenuScreen (B-3d.7)". The file is no longer in the tree. |

`FocusHubScreen` and `FocusRhythmsScreen` went dark at `3c1f33f` and were brought back at `941b5b4` "feat(practices): pillar launcher, and Focus comes back from the dark" (2026-08-12). They are live now.

### 1d. Screen files present in the tree, registered in no navigator

| File | Notes |
|---|---|
| `src/screens/HomeScreen.tsx` | Only reference outside itself is `src/__tests__/brandCompliance.test.ts`. |
| `src/screens/WelcomeScreen.tsx` | Same — only the brand-compliance regex test. |
| `src/screens/GoalsScreen.tsx` | Same. |
| `src/screens/BrainHealthDashboard.tsx` | Referenced only as a dead `navigationTarget: 'BrainHealthDashboard'` string in `src/constants/featureDiscovery.ts:309`. |
| `src/screens/HabitsScreen.tsx` | Not a route; rendered as a child of `PlanScreen`. Reachable content. |
| `src/screens/community/MessagesScreen.tsx` | **Imported** into `AppNavigator.tsx:87` and never used. The `Conversations` route mounts `src/screens/ConversationsScreen.tsx` instead. `MessagesScreen` still contains `navigate('Chat', …)` calls that nothing can trigger. |
| `src/screens/onboarding/OnboardingConfirmationScreen.tsx` | Exported from `onboarding/index.ts`, registered nowhere. |
| `src/screens/onboarding/OnboardingFirstWinScreen.tsx` | Same. Distinct from the live `v3/OnboardingV3FirstWinScreen.tsx`. |
| `src/screens/onboarding/OnboardingFocusScreen.tsx` | Same. |
| `src/screens/onboarding/OnboardingQuickStartScreen.tsx` | Same. |
| `src/screens/onboarding/OnboardingTourScreen.tsx` | Same. |
| `src/screens/onboarding/OnboardingV2CheckInScreen.tsx` | Same. |
| `src/screens/onboarding/OnboardingV2ProtocolScreen.tsx` | Same. Sole render site of `TodaysProtocolCard`. |
| `src/screens/onboarding/OnboardingV2WelcomeScreen.tsx` | Same. |

Deep linking (`src/navigation/linking.ts`) maps only three paths — `login`, `main`, `verify` — under prefixes `vara://`, `https://<project>.web.app`, `https://varawellness.co`. No pillar, practice, or weekly-loop deep link exists.

---

## SECTION 2 — The Today / Home surface

`src/screens/DashboardScreen.tsx`, 555 lines. It is a thin shell over four hooks: `useDashboard`, `useWeeklyLanding`, `useTodayCard`, `useWeeklyCloseEntry`.

### 2a. Everything Home renders, in visual order

| # | Element | Component / file | Condition |
|---|---|---|---|
| 0 | Full-screen spinner | `LoadingSpinner` | `dataLoading` from `useDashboard` — replaces the whole screen |
| 1 | Greeting + date | inline `Text` | always |
| 2 | Guide pill | `components/ai/GuidePill.tsx`, `context={{screen:'home'}}` | always (unconditional since the check-in invite was removed) |
| 3 | Settings cog | inline `TouchableOpacity` → `ProfileStack` / `Settings` | always |
| 4 | Watercolor hero band | `ScreenHeader` + `BAND_STRONG_SCRIM`, `assets/images/homeHeader.webp` | always |
| 5 | Error banner | inline | `dataErrors.length > 0` |
| 6 | **Today hero** | `TodayHeroCard` | `weeklyLanding.target === 'today' && weeklyLanding.cycle && todayCard.picked && todayCard.protocol` |
| 6′ | **Set-today prompt** (the alternative to 6) | `SetTodayCard` | same gate, but `!todayCard.picked \|\| !todayCard.protocol` |
| 7 | Continuity count | `ContinuityCard` | `target === 'today' && cycle`; self-hides at 0 and on a failed read |
| 8 | Close-week entry, or the "This week is closed." acknowledgment | `CloseWeekEntry` | `target === 'today' && cycle`; swaps on `!!cycle.closeCompletedAt` |
| 9 | Daily picker sheet (modal) | `DailyPickerSheet` | `pickerOpen` local state, set by tapping `SetTodayCard` |
| 10 | Standing "open your week" card | `OpenYourWeekCard` | `weeklyLanding.target === 'open'` |
| 11 | First-shift footer | `FirstShiftFooter` | `!DASHBOARD_SUPPRESS.firstShiftFooter` → **never** (flag is `true`) |
| 12 | Insight card | `InsightCard` (wraps `WeekInsightCard`) | always |
| 13 | Weekly habit grid | `WeeklyHabitGrid` | always; self-hides when there are no habits |
| 14 | Routine card | `RoutineCard` | always |
| 15 | Notification opt-in prompt | `NotificationOptInCard` | `!DASHBOARD_SUPPRESS.notifOptIn` → **never** |
| 16 | Event-code prompt | `EventCodeCard` | `!DASHBOARD_SUPPRESS.eventCode` → **never** |
| 17 | "Look back" row | `InsightsLookbackCard` → `Insights` | always |
| — | Event code sheet (modal) | `EventCodeSheet` | `eventCodeSheetVisible` — only settable by 16, which never renders |
| — | Routine player (modal) | `ActiveRoutinePlayer` | `activePlayerRoutine` set by tapping a routine in 14 |
| — | Habit note sheet (modal) | `HabitNoteSheet` | `noteTarget` set after a flagged habit completion |

Two navigation side effects also fire from Home:

- `DashboardScreen.tsx:167` — a `useEffect` on `weeklyLanding.target` pushes `WeeklyFloor` or `WeeklyOpen`, latched at **one push per distinct target** per mount (`pushedForRef`).
- `useFocusEffect` re-runs `weeklyLanding.refresh()` on every focus.

### 2b. Present but suppressed, disabled, or hardcoded hidden

Mechanism: the `DASHBOARD_SUPPRESS` object in `src/constants/dashboardConfig.ts:47`.

| Key | Value | Element suppressed |
|---|---|---|
| `firstShiftFooter` | `true` | `FirstShiftFooter` (`DashboardScreen.tsx:380`) |
| `eventCode` | `true` | `EventCodeCard` (`DashboardScreen.tsx:205`) |
| `notifOptIn` | `true` | `NotificationOptInCard` (`DashboardScreen.tsx:194`) |
| `dailyReflection` | `true` | **Orphaned.** `DashboardScreen.tsx` never reads this key. `DailyReflectionCard.tsx` has zero render sites anywhere in the tree, so the flag suppresses nothing. |

Suppressed by deletion of the render site rather than a flag — the components still compile, still export, and are still tested:

| Component | Render sites |
|---|---|
| `components/dashboard/BrainStateCheckin.tsx` | 0 |
| `components/dashboard/OverwhelmSafetyCard.tsx` | 0 |
| `components/dashboard/SlimResetAffordance.tsx` | 0 |
| `components/dashboard/QuickActionCarousel.tsx` | 0 |
| `components/dashboard/QuickActionsRow.tsx` | 0 |
| `components/dashboard/MorningCheckIn.tsx` | 0 |
| `components/dashboard/AIDailyPlanCard.tsx` | 0 |
| `components/dashboard/WellnessScoreCard.tsx` | 0 |
| `components/dashboard/FourThreeTwoOneCard.tsx` | 0 |
| `components/dashboard/DailyReflectionCard.tsx` | 0 |
| `components/dashboard/WelcomeBackCard.tsx` | 0 |
| `components/dashboard/ProgressNudgeCard.tsx` | 0 |
| `components/dashboard/RoutinesCard.tsx` | 0 |
| `components/dashboard/BrainHealthInsightStrip.tsx` | 0 |
| `components/dashboard/LockedDivider.tsx` | 0 |
| `components/discovery/ComingUpSection.tsx` | 0 (exported from two barrels) |

`useDashboard` still **computes** state for several of these. `useDashboard.ts:579` calls `getNudgeSuggestion(...)` and `setNudgeSuggestion(...)` on every dashboard load; `useDashboard.ts:538` calls `getDashboardCardOrder(...)`. Neither result appears in `DashboardScreen`'s destructure at `DashboardScreen.tsx:54-85`. That is live Firestore reads and computation on the app's launch surface feeding nothing.

### 2c. Any affordance for browsing or launching a practice outside the daily protocol flow

**No. There is none on Home today.**

Home offers exactly one action: `todayCard.markDone` inside `TodayHeroCard`. There is no reset affordance, no catalog shortcut, and no "need something now" entry.

What exists and is dark:

| Thing | Path | State | Where it routes |
|---|---|---|---|
| Slim 2-minute reset row | `src/components/dashboard/SlimResetAffordance.tsx` | **BUILT BUT DARK** — zero call sites | `navigate('CheckInFlow', { entrySource: 'overwhelm_safety_card', protocolId: OVERWHELM_DEFAULT_PROTOCOL_ID })` |
| Full overwhelm card (its predecessor) | `src/components/dashboard/OverwhelmSafetyCard.tsx` | **BUILT BUT DARK** | same target |
| Brain-state check-in card | `src/components/dashboard/BrainStateCheckin.tsx` | **BUILT BUT DARK** | `navigate('CheckInFlow', { entrySource: 'standard' })` |

`DashboardScreen.tsx:387` states the intent explicitly: the component and its test are "deliberately RETAINED as the seam the need-something-now fast-follow re-points at a live target."

The only live way to reach a practice at all is: Practices tab → Energy → a category → `PracticeRun`, or Practices tab → Stress Recovery → `PracticeRun`. Three taps minimum from Home, and nothing on Home points at it.

---

## SECTION 3 — Protocol engine

### 3a. Full call graph — the deletion surface

There are **two unrelated things named "protocol"** in this tree, and they must not be confused. See SURPRISES.

**Engine A — the outcome × capacity × time matrix** (`src/protocolEngine/`). This is the one the refactor targets.

Core module (5 source files + 1 barrel):

| File | Role |
|---|---|
| `src/protocolEngine/types.ts` | `OutcomeKey`, `CapacityTier`, `TimeClass`, `ProtocolVariant`, `ResolvedProtocolVariant`, `WeeklyRecord` |
| `src/protocolEngine/protocolMatrix.ts` | `PROTOCOL_MATRIX`, `OUTCOME_KEYS`, `CAPACITY_TIERS`, `TIME_CLASSES`, `TIME_CLASS_MAX_MINUTES`, `DEFAULT_TIME_CLASS`, `DEFAULT_QUICK_WIN_PRACTICE_ID`, `timeClassForMinutes`, `allProtocols`, `unauthoredVariants`, `ProtocolVariantMatrix`, `UnauthoredVariant` |
| `src/protocolEngine/selectProtocol.ts` | `pickVariant`, `selectProtocol`, `representativeProtocol` |
| `src/protocolEngine/quickWin.ts` | `applyQuickWin`, `QUICK_WIN_WEEK` |
| `src/protocolEngine/continuity.ts` | `computeContinuity` |
| `src/protocolEngine/index.ts` | barrel; explicit named re-exports only (Metro 0.83) |

Tests: `__tests__/selectProtocol.test.ts`, `pickVariant.test.ts`, `quickWin.test.ts`, `continuity.test.ts`, `reshapeParity.test.ts`.

Direct importers (production code):

| File | What it imports | What it does with it |
|---|---|---|
| `src/hooks/useTodayCard.ts:43-50` | `applyQuickWin`, `selectProtocol`, `DEFAULT_TIME_CLASS`, `CapacityTier`, `ResolvedProtocolVariant`, `TimeClass` | The only production caller of `selectProtocol`. Resolves the day's protocol |
| `src/components/dashboard/TodayHeroCard.tsx:28` | type `ResolvedProtocolVariant` | renders `name`, `dailyAction`, `whyItWorks`, quick win |
| `src/components/dashboard/DailyPickerSheet.tsx:31-36` | `CAPACITY_TIERS`, `TIME_CLASSES`, types | drives the two option lists |
| `src/screens/weekly/WeeklyOpenScreen.tsx:32-37` | `CAPACITY_TIERS`, `OUTCOME_KEYS`, `representativeProtocol`, types | the open wizard + `protocolId` write |
| `src/screens/weekly/weeklyContinuity.ts:31` | `computeContinuity`, `WeeklyRecord` | storage→engine seam |
| `src/screens/onboarding/v3/OnboardingV3OutcomeScreen.tsx:17` | `OUTCOME_KEYS`, `OutcomeKey` | outcome question |
| `src/screens/onboarding/v3/OnboardingV3CapacityScreen.tsx:16` | `CAPACITY_TIERS`, `CapacityTier` | capacity question |
| `src/screens/onboarding/v3/OnboardingV3Context.tsx:20` | types `CapacityTier`, `OutcomeKey` | in-memory arc state |
| `src/screens/onboarding/v3/OnboardingV3DoneScreen.tsx:43` | `representativeProtocol` | first cycle's `protocolId` |
| `src/services/firebase/weeklyCycle.service.ts:55` | **type-only** `CapacityTier`, `OutcomeKey`, `TimeClass` | erased at compile time |
| `src/types/models.ts:11` | types `OutcomeKey`, `CapacityTier`, `TimeClass` | `WeeklyCycle`, `DailyLog`, `UserPrivate` field types |
| `src/types/analyticsEvents.ts:34` | types `CapacityTier`, `OutcomeKey` | derives `ProtocolId` template union |

Indirect / vocabulary-coupled (no import of the engine, but keyed by its unions — these break silently if the unions change):

| File | Coupling |
|---|---|
| `src/screens/weekly/copy.ts` | `OUTCOME_LABELS`, `CAPACITY_LABELS`, `CAPACITY_GLOSSES`, `TIME_LABELS`, `TIME_GLOSSES` are objects keyed by the union members |
| `src/screens/onboarding/v3/copy.ts:23-27` | re-exports the three label maps above |
| `src/hooks/useWeeklyLanding.ts` | reads/returns `WeeklyCycle` |
| `src/screens/weekly/weeklyEntry.ts` | `resolveWeeklyEntry` |
| `src/utils/weekStart.ts` | `planWeek`, `resolveWeekEnd`, `isWithinWeek`, `toIsoDate`, `addDaysIso` |
| `src/hooks/useWeeklyCloseEntry.ts` | close gating + `weekly_close_entry` event |
| `src/screens/weekly/WeeklyCloseScreen.tsx`, `FloorCommitmentScreen.tsx`, `WeeklyEntryScreen.tsx` | the loop's other three screens |
| `src/components/dashboard/ContinuityCard.tsx`, `CloseWeekEntry.tsx`, `SetTodayCard.tsx`, `OpenYourWeekCard.tsx` | Home's weekly-loop UI |
| `src/services/firebase/userPrivate.service.ts` | `activeOutcome`, `whyNote`, `floorCommitment`, `weekStartDay` |
| `src/services/firebase/analyticsEvents.service.ts` | writes `weekly_open` / `weekly_close` payloads carrying `outcome`, `capacityInitial`, `protocolId` |

Test files touching the matrix outside `protocolEngine/`: `components/dashboard/__tests__/TodayHeroCard.test.tsx`, `hooks/__tests__/useTodayCard.dailyCapacity.test.ts`, `useTodayCard.dailyPick.test.ts`, `useTodayCard.weekNumber.test.ts`, `screens/__tests__/DashboardScreen.closeEntry.test.tsx`, `DashboardScreen.dailyPick.test.tsx`, `screens/weekly/__tests__/WeeklyOpenScreen.test.tsx`, `weeklyContinuity.test.ts`, `types/__tests__/analyticsEvents.test.ts`, `src/__tests__/copyDraftSentinel.test.ts` (which names `protocolMatrix.ts` and `types.ts` in its `OUT_OF_SCOPE` list at line 55).

**Engine B — the practice/brain-state engine**, untouched by the above and named identically in places:

- `src/constants/brainStateProtocols.ts` — 14 practices with ids like `cyclic-sighing-2`, `nsdr-20`
- `src/engine/` — `resolve.ts`, `ranker.ts`, `slotFilter.ts`, `quadrant.ts`, `lengthClass.ts`, `clock.ts`, `planMap.ts`, `practicePreference.ts`, `stateBridge.ts`, `types.ts`
- `src/services/protocolSelector.service.ts` — exports its **own** function called `selectProtocol({ state, timeWindow })`, unrelated to `protocolEngine/selectProtocol.ts`
- `src/services/firebase/protocolSession.service.ts`, `brainStateCheckIn.service.ts`

The only crossing point is a plain string: `DEFAULT_QUICK_WIN_PRACTICE_ID = 'extended-exhale-2'` in `protocolMatrix.ts:44` names a real catalog id in Engine B, deliberately without an import.

### 3b. Exact TypeScript shape as it exists today

From `src/protocolEngine/types.ts`:

```ts
export type OutcomeKey   = 'focus' | 'stress' | 'routines' | 'energy';
export type CapacityTier = 'normal' | 'limited' | 'slammed';
export type TimeClass    = 'short' | 'medium' | 'long';

export interface ProtocolVariant {
  id: string;                     // `${outcome}-${capacity}` — NOT unique per variant
  variantKey: string;             // `${outcome}-${capacity}-${timeClass}` — never persisted
  outcome: OutcomeKey;
  capacity: CapacityTier;
  timeClass: TimeClass;
  name: string;                   // PLACEHOLDER [Jen]
  dailyAction: string;            // PLACEHOLDER [Jen]
  estMinutes: number;             // PLACEHOLDER [Jen]
  whyItWorks: string;             // PLACEHOLDER [Jen]
  quickWinPracticeId: string;
  supportingPracticeIds: string[];
}

export interface ResolvedProtocolVariant extends ProtocolVariant {
  quickWinActive: boolean;
}

export interface WeeklyRecord {
  weekStart: string;
  floorMet: boolean;              // deliberately carries NO capacity tier
}
```

From `src/protocolEngine/protocolMatrix.ts`:

```ts
export type ProtocolVariantMatrix =
  Record<OutcomeKey, Record<CapacityTier, ProtocolVariant[]>>;

export interface UnauthoredVariant {
  outcome: OutcomeKey;
  capacity: CapacityTier;
  timeClass: TimeClass;
}

export const TIME_CLASS_MAX_MINUTES: Record<TimeClass, number> =
  { short: 5, medium: 15, long: Number.POSITIVE_INFINITY };
export const TIME_CLASSES: readonly TimeClass[]  = ['short','medium','long'];
export const OUTCOME_KEYS: readonly OutcomeKey[] = ['focus','stress','routines','energy'];
export const CAPACITY_TIERS: readonly CapacityTier[] = ['normal','limited','slammed'];
export const DEFAULT_TIME_CLASS: TimeClass = 'medium';
export const DEFAULT_QUICK_WIN_PRACTICE_ID = 'extended-exhale-2';
```

A cell is an **array**, so the matrix is not total by construction. Totality lives as a rule inside `selectProtocol`:

```ts
export function pickVariant(variants: ProtocolVariant[], time: TimeClass): ProtocolVariant
export function selectProtocol(outcome, capacity, time): ProtocolVariant
export function representativeProtocol(outcome, capacity): ProtocolVariant  // no time param
```

The fallback ladder in `pickVariant` (`selectProtocol.ts:40`): asked class → nearest **shorter** class → `variants[0]`. It walks down, never up.

### 3c. How `protocolId` is constructed and where it is persisted or compared

**Construction — two places, deliberately kept in agreement by a test.**

1. `protocolMatrix.ts:102` — the `protocol()` factory sets `id: \`${outcome}-${capacity}\``.
2. `types/analyticsEvents.ts:52` — `protocolIdFor(outcome, capacity)` returns the same template, typed as `ProtocolId = \`${OutcomeKey}-${CapacityTier}\`` (a closed 12-member union). `types/__tests__/analyticsEvents.test.ts` pins the two together across all 12 cells.

The id identifies the **cell**, not the variant. Every variant in a cell carries the same `id`. `variantKey` disambiguates variants and is never persisted.

**Persistence and comparison:**

| Site | Operation |
|---|---|
| `WeeklyCycle.protocolId: string` (`src/types/models.ts:298`) | Firestore field on `weeklyCycles` |
| `weeklyCycle.service.ts:88` (`CreateWeeklyCycleInput.protocolId`), `:194` | the only write |
| `WeeklyOpenScreen.tsx:218` | `protocolId: selected.id` where `selected = representativeProtocol(outcome, capacity)` |
| `OnboardingV3DoneScreen.tsx:118` | `protocolId: selected.id`, same source |
| `WeeklyOpenScreen.tsx:241` | `protocolId: protocolIdFor(outcome, capacity)` into the `weekly_open` analytics event — the **typed** derivation, not `selected.id` |
| `closeWeeklyCycle` (`weeklyCycle.service.ts:380`) | fields listed one by one precisely so a close cannot rewrite `protocolId` |

**Nothing reads `weeklyCycles.protocolId` back.** `useTodayCard` re-derives the day's protocol from `(outcome, capacity, time)` and never compares against the stored id. There is no equality check on `protocolId` anywhere in the tree.

`DailyLog` deliberately has **no** `protocolId`. `useTodayCard.ts:29` states the consequence: completion is not qualified by which protocol was served, so changing capacity cannot invalidate a completed day.

Separately: `protocolId` also appears as a route param and a Firestore field for **Engine B** (`PracticeRun`, `brainStateCheckIns.protocolId`, `protocolSessions.protocolId`, `flowSessionMarker`, `sessionMarker`, `utils/protocolIdNormalizer.ts`). Those values are catalog slugs (`cyclic-sighing-2`), never `${outcome}-${capacity}`.

### 3d. Which cells are authored vs stubbed, and what a missing cell does

The grid is 4 outcomes × 3 capacities × 3 time classes = **36 slots**. **12 are authored, 24 are not.** `src/protocolEngine/__tests__/selectProtocol.test.ts:199` pins `unauthoredVariants()` at exactly 24, and `:188` pins every cell at exactly one variant.

The authored 12 sit on a diagonal, because they were written when capacity *was* the time proxy. Derived `timeClass` per authored cell (from `estMinutes` via `timeClassForMinutes`):

| Outcome | normal | limited | slammed |
|---|---|---|---|
| focus | 30 min → **long** | 15 min → **medium** | 5 min → **short** |
| stress | 15 min → **medium** | 10 min → **medium** | 5 min → **short** |
| routines | 10 min → **medium** | 6 min → **medium** | 2 min → **short** |
| energy | 20 min → **long** | 10 min → **medium** | 5 min → **short** |

Whole columns are empty: `stress` has no `long` variant at any tier; `routines` has no `long` variant at any tier (pinned by its own test at `selectProtocol.test.ts:207`).

**Behavior of a missing cell:** `pickVariant` walks from the asked class downward through shorter classes; if nothing matches, it returns `variants[0]`. Since every cell holds exactly one variant, `selectProtocol` **always returns that one variant regardless of the time argument**. `protocolMatrix.ts:136` and `useTodayCard.ts:272` both state this plainly: the time question is asked, stored, and passed honestly, and it currently changes nothing the user sees.

`unauthoredVariants()` returns the 24 missing triples as the content brief. `protocolMatrix.ts:291` notes it is deliberately rendered nowhere.

### 3e. Where the daily capacity and time answers are captured, and what is written

**Capture UI:** `src/components/dashboard/DailyPickerSheet.tsx`, mounted only while open from `DashboardScreen.tsx:353`. Two questions, one confirm, one skip.

- Capacity options from `CAPACITY_TIERS` with `CAPACITY_LABELS` / `CAPACITY_GLOSSES`
- Time options from `TIME_CLASSES` with `TIME_LABELS` / `TIME_GLOSSES`
- Copy in `src/screens/weekly/copy.ts` → `PICKER_COPY`. Confirm = "Confirm". Skip = **"Not now"**, which writes nothing.

Opening the sheet writes nothing (`DashboardScreen.tsx:130`). The single write is `useTodayCard.confirmPick` (`useTodayCard.ts:376`) → `upsertDailyLog(uid, todayIso, { dailyCapacity, dailyTimeBudget })`.

**Firestore target:**

- Collection: **`dailyLogs`**
- Document ID: **`${userId}_${date}`**, built in exactly one place — `dailyLogDocId()` at `weeklyCycle.service.ts:68`. `date` is local-time ISO `YYYY-MM-DD` from `toIsoDate()`.
- Write: `setDoc(..., { merge: true })`, with `createdAt` stamped only when the doc does not already exist (`weeklyCycle.service.ts:412`).

Document shape (`src/types/models.ts`, `DailyLog`):

| Field | Type | Written by |
|---|---|---|
| `id` | `string` | mirrors doc id, supplied by the reader |
| `userId` | `string` | `upsertDailyLog` |
| `date` | `string` (ISO) | `upsertDailyLog` |
| `protocolCompleted` | `boolean` | `useTodayCard.markDone` |
| `practiceIds` | `string[]` | `markDone` writes `[]` |
| `dailyCapacity` | `CapacityTier?` | `confirmPick` only |
| `dailyTimeBudget` | `TimeClass?` | `confirmPick` only |
| `createdAt`, `updatedAt` | `Timestamp` | service |

**"Has the user picked today" is keyed on `dailyTimeBudget` alone** — `hasPickedToday(log)` at `weeklyCycle.service.ts:143` is `!!log?.dailyTimeBudget`. The comment there names the coupling: this is correct only while the time question stays mandatory in the picker. Making it skippable would silently make the morning prompt permanent.

The read path (`useTodayCard.ts:264-302`): today's `dailyLogs` row → `dailyCapacity ?? cycle.capacityInitial` (never written back), `dailyTimeBudget ?? DEFAULT_TIME_CLASS`, then `applyQuickWin(selectProtocol(outcome, capacity, time), weekNumber)`. Yesterday's row is read for pre-fill, and only when today is unpicked. The floor commitment is read only when the **day's** tier is `slammed`.

`weeklyCycles.capacityCurrent` is written once at create (`= capacityInitial`) and read by nothing — the in-week re-set that moved it was retired (roadmap 3b-i). `downshiftEvents` is likewise orphaned: create/read helpers survive, nothing writes.

---

## SECTION 4 — Onboarding

### 4a. The V3 question set, verbatim, in order

Nine screens. `V3_ORDER` in `src/screens/onboarding/v3/routes.ts` is the single source of both the stack order and the step numbers (`V3_TOTAL_STEPS = 9`). All strings below are from `src/screens/onboarding/v3/copy.ts` and every one carries a `COPY: draft` sentinel except the outcome/capacity labels, which are locked taxonomy re-exported from `src/screens/weekly/copy.ts`.

**Nothing is persisted until screen 9.** `OnboardingV3Context.tsx` is an in-memory scratchpad that dies with the navigator.

| # | Screen | User-visible text | Answer type | Persisted where |
|---|---|---|---|---|
| 1 | ColdOpen | **"Welcome to Vara"** / "A few questions to set up your first week. Nothing here is a test, and you can change any of it later." / CTA "Get started" | none | — |
| 2 | Outcome | **"What do you want more of?"** / "Pick one to start. You can switch outcomes any week." / CTA "Continue"<br>Options (`OUTCOME_LABELS` + `OUTCOME_BLURBS`): Focus — "Attention that holds for the work that matters." · Stress — "A nervous system that settles when the day does not." · Routines — "Days with a shape you can rely on." · Energy — "Enough in the tank to get to the evening." | single-select `OutcomeKey`, **required** | `userPrivate/{uid}.activeOutcome`; also `weeklyCycles.outcome` on the first cycle |
| 3 | Why | **"Why this one?"** / "In your own words. We show this back to you on the weeks it gets hard, and nobody else ever sees it." / placeholder "Because I want to be present with my kids at dinner" / CTA "Continue" | free text, **skippable** | `userPrivate/{uid}.whyNote` |
| 4 | Capacity | **"How much room does this week have?"** / "Be honest rather than ambitious. This sets the size of the daily action, and you can change it mid-week." / CTA "Continue"<br>Options (`CAPACITY_LABELS` + `CAPACITY_GLOSSES`): Normal — "Ready to make some progress." · Limited — "Some room, so be selective." · Slammed — "Very little room. Keep the bar realistic." | single-select `CapacityTier`, **required** | `weeklyCycles.capacityInitial` (and `capacityCurrent`, set equal by the service). **Not** written to `userPrivate` |
| 5 | Floor | **"What is your floor?"** / "The smallest version you would still do on your worst week. This is never scored and never shown as a target." / stem "Even on my worst week, I will" / placeholder "step outside for ten minutes" / CTA "Continue" | free text, **skippable** | `userPrivate/{uid}.floorCommitment` |
| 6 | WeekStart | **"When does your week start?"** / "Your week runs seven days from this day. Pick the one that already feels like a fresh start." / CTA "Continue" | day-of-week 0–6 via `components/shared/WeekStartPicker`, **skippable** | `userPrivate/{uid}.weekStartDay` |
| 7 | FirstWin | **"Try one now"** / "Two minutes, fully guided. Nothing to figure out, and you can stop whenever you want." / CTA "Start" · fallback "That practice is not available right now." | runs `GuidedSessionPlayer` on the pinned practice `cyclic-sighing-2` (`DEFAULT_ONBOARDING_PROTOCOL_ID`), **skippable** | **nothing.** `OnboardingV3FirstWinScreen.tsx:18` states no session is persisted in this slice |
| 8 | Reminder | **"When should we check in?"** / "One nudge a day at a time you pick. It is an invitation, not an obligation, and you can turn it off anytime." / floor echo label "We will nudge you toward:" / CTA "Continue" / on refusal "Your time is saved. You can turn reminders on anytime in Settings." | `DateTimePicker` time-only, seeded to `DEFAULT_ANCHOR_HOUR` | `notificationPreferences.dailyRhythm = { enabled: true, reminderTime: { hour, minute } }` plus `allNotificationsEnabled: true`, written **immediately on this screen** (not at the terminal), and `scheduleDailyRhythm(uid)` only if permission was granted |
| 9 | Done | **"Your first week is set"** / "That is everything we needed. You can change any of it from Settings whenever you want." / CTA "Go to Vara" / on failure "That did not save. Check your connection and try again." | terminal | see below |

**Terminal write order** (`OnboardingV3DoneScreen.tsx:57`), load-bearing because `completeOnboarding` re-renders the navigator away:

1. One merged `setUserPrivate(uid, patch)` carrying `activeOutcome`, `whyNote`, `floorCommitment`, `weekStartDay` — each key present only if answered.
2. `getUserPrivate` → `planWeek({ todayIso, weekStartDay, priorWeekEnd: null })`. `priorWeekEnd: null` is passed **literally**, always, so a retry cannot flip the plan and duplicate a cycle.
3. `getWeeklyCycleForWeek(uid, weekStart)` dedup guard, then `createWeeklyCycle` with `{ weekStart, weekEnd, outcome, capacityInitial, protocolId: representativeProtocol(outcome, capacity).id }`.
4. `completeOnboarding(uid)` — flips `users/{uid}.hasCompletedOnboarding` to `true`, which is what routes the user into the app.

### 4b. Skippable questions and what a skip writes

The skip affordance is `OnboardingScaffold`'s `onSkip` prop, rendered as the text link **"Skip for now"** (`OnboardingScaffold.tsx:143`).

| Screen | Skippable | Context value on skip | What is written |
|---|---|---|---|
| Outcome | **No** — required to leave | — | — |
| Capacity | **No** — required to leave | — | — |
| Why | Yes (`onSkip={() => advance(null)}`) | `whyNote = null`. An all-whitespace answer is also treated as a skip (`OnboardingV3WhyScreen.tsx:39`) | **nothing** — the key is omitted from the patch |
| Floor | Yes | `floorCommitment = null` | **nothing** — key omitted |
| WeekStart | Yes | `weekStartDay = null` | **nothing** — key omitted. `planWeek` then falls back to anchoring on the open date, which is the pre-question behavior |
| FirstWin | Yes (`onSkip={advance}`) | no state at all | **nothing** — this screen never persists |
| Reminder | No explicit skip link, but declining the OS permission sheet is a non-penalising path | `reminderTime` still set from the picker | the prefs **are still written** on both branches; only `scheduleDailyRhythm` is conditional on `granted` |

The rule is stated at `OnboardingV3DoneScreen.tsx:18`: skipped fields are **omitted, not nulled**, because "they answered nothing" is a different fact from "they never answered." `weekStartDay` uses `!== null` rather than truthiness precisely because Sunday is `0`.

### 4c. The V2 revert lever

The lever is the single line `export const ONBOARDING_V3 = true;` at `src/constants/dashboardConfig.ts:22`.

`OnboardingNavigator` (`AppNavigator.tsx:202`) returns the V3 navigator early rather than folding it into the existing ternary, specifically so that flipping the flag to `false` restores the V1/V2 expression byte-for-byte.

**Does it still work?** Statically, yes — all nine V2 screens are still imported at `AppNavigator.tsx:100-116` and still registered inside the `ONBOARDING_V2` branch, `ONBOARDING_V2` is still `true`, and `resolveInitialStep` is still wired for mid-flow resume. tsc passes at the current baseline and the suite is green with the branch present.

Two caveats, both unverified without a run:

1. The comment at `AppNavigator.tsx:97` records that the V2 arc's notification-permission prompt was orphaned when the `OnboardingV2*` trio was unmounted; the anchor screen (screen 9) is the only permission request left on that path.
2. Nothing in the suite exercises the flag in the `false` position. `src/screens/onboarding/__tests__/` tests the V2 screens as units, not the navigator branch. Flipping it is a device walk, not a static claim.

---

## SECTION 5 — Weekly loop

### 5a. Where open and close live, and what each asks

**Weekly open** — `src/screens/weekly/WeeklyOpenScreen.tsx`, route `WeeklyOpen`, title "Your week".

A four-step wizard driven by a string union `Step = 'outcome' | 'capacity' | 'weekStart' | 'confirm'`.

| Step | Asks | Notes |
|---|---|---|
| `outcome` | "What's your focus this week?" — four options from `OUTCOME_KEYS` / `OUTCOME_LABELS` | spec 6.1 step 1 |
| `capacity` | "What's your capacity this week?" — three options from `CAPACITY_TIERS` with `CAPACITY_GLOSSES` | spec 6.1 step 2 |
| `weekStart` | "When does your week start?" / "From now on your week will run seven days from this day. This first one may be shorter." / "Not now" | **Conditional.** Shown only when the mount-time read of `userPrivate.weekStartDay` landed AND returned null. A failed read never asks |
| `confirm` | "Your week" heading, the resolved `representativeProtocol(outcome, capacity)` — its `name`, "About {minutes} min a day", "Why this works" + `whyItWorks` — and CTA "Start this week" | |

Spec 6.1 step 3 (the one-tap calendar forecast) is **DEFERRED with no placeholder control**, stated at `WeeklyOpenScreen.tsx:3`.

On confirm it writes exactly one `weeklyCycles` document via `createWeeklyCycle`, optionally `setUserPrivate({ weekStartDay })` first, and fires `logEvent(uid, 'weekly_open', { outcome, capacityInitial, protocolId: protocolIdFor(outcome, capacity) })`. It then `navigate`s (not `replace`s) to Home, because Home is a tab.

**Weekly close** — `src/screens/weekly/WeeklyCloseScreen.tsx`, route `WeeklyClose`, title "Close your week". Entered only from `CloseWeekEntry` on Home; the real trigger (an elapsed week) is not wired into the entry guard, which is a tracked follow-up recorded at `routes.ts:132`.

Everything it asks (`CLOSE_COPY` in `src/screens/weekly/copy.ts`):

| Block | Content |
|---|---|
| Heading | "Your week" |
| Ratings | "How did the week feel?" / "One tap each. There is no right answer." — three 1–5 scales labelled **Focus**, **Recovery**, **Energy**, with endpoint labels "Low" / "High" |
| Floor | "Your floor" / "Did you do the one thing you named, even on this week's hardest days?" — "Yes, I did that" / "No, not this week", with "Either answer is fine. A hard week doesn't undo the ones before it." under the no |
| Note | "What was the load like on the days it did not happen?" / placeholder "A line, if you want to" / "You can leave this blank." — **skippable** |
| Adjustment | "One change for next week" / "Pick one." — exactly one of `smaller-daily-action`, `same-again`, `different-time`, `different-outcome` |
| Save | "Save and close the week"; disabled hint "Answer the three ratings, the floor question and pick one change."; failure "That did not save. Your week is unchanged. Try again." |

Spec 8.1's day-completion debrief is deliberately **not** on this screen (`copy.ts:316`).

The write is a single `updateDoc` via `closeWeeklyCycle` (`weeklyCycle.service.ts:380`): `ratingFocus`, `ratingRecovery`, `ratingEnergy`, `closeNote` (only when non-blank — a skip omits the field rather than storing `''`), `adjustmentSelected` (the stable ID, never the label), `floorMet`, `closeCompletedAt: serverTimestamp()`, `updatedAt`. Fields are listed one by one so a close can never rewrite `outcome`, `protocolId`, `capacityInitial` or `capacityCurrent`. Then `logEvent('weekly_close', {...})`, or `weekly_close_failed` on rejection, and `navigationRef.current.replace(ROUTES.WeeklyEntry)`.

### 5b. The continuity engine

**What it counts:** the run of consecutive most-recent weeks in which `WeeklyCycle.floorMet === true`. A missed floor breaks the run; nothing else does.

**How:** `computeContinuity(records: WeeklyRecord[])` at `src/protocolEngine/continuity.ts:24` walks the array from the end and stops at the first `!floorMet`. Precondition: chronological, oldest first.

**Where stored:** nowhere. It is derived every time. The only stored input is the boolean `weeklyCycles.floorMet`, written by `closeWeeklyCycle` and by nothing else — self-reported at the close, never derived from daily completion (`models.ts:322`).

`WeeklyRecord` deliberately carries **no** capacity tier (`types.ts:137`), which is the storage-layer enforcement of the load-bearing invariant: continuity is measured against the floor and never against capacity.

**The seam:** `src/screens/weekly/weeklyContinuity.ts`.
- `toWeeklyRecords(cycles)` — copies, sorts ascending by `weekStart` (ISO strings sort chronologically), maps `floorMet ?? false`. The sort is silent when wrong; a test fails if it is removed.
- `loadWeeklyContinuity(userId)` — `getWeeklyCyclesForUser(userId)` (equality-only query, no composite index) → `computeContinuity`.

An absent `floorMet` counts as not met, so continuity counts from the first closed week. That includes every cycle written before the close slice existed.

**Every surface that reads it:**

| Reader | Path |
|---|---|
| `src/hooks/useTodayCard.ts:241` | calls `loadWeeklyContinuity` on every load; exposes `continuity: number \| null` |
| `src/components/dashboard/ContinuityCard.tsx` | the only render. Self-hides at 0 and on `null`. Copy: `TODAY_COPY.continuityHeading` "What you've kept going", `continuityCount` "{count} weeks holding your floor. That's real progress.", `continuityCountOne` "1 week holding your floor. Nice work." |
| `src/hooks/useWeeklyCloseEntry.ts` | reads it to populate `continuityBeforeClose` |
| `src/screens/weekly/WeeklyCloseScreen.tsx:240` | ships it as the `continuityBeforeClose` field on the `weekly_close` analytics event |

`null` and `0` are kept distinct throughout: `null` means the read failed, `0` is a claim about the user. Both render as nothing; the code has to tell them apart anyway.

### 5c. Week boundary computation, and stale-cycle handling

All arithmetic in `src/utils/weekStart.ts`. Every function takes the current date as a parameter; nothing reads the clock.

- `toIsoDate(date)` — local-time `YYYY-MM-DD`, deliberately not `toISOString().slice(0,10)`.
- `daysBetweenIso` / `addDaysIso` / `isoWeekday` — all compute in the **UTC-midnight frame** so DST cannot shift a date.
- `resolveWeekEnd(weekStart, storedWeekEnd?)` — returns `storedWeekEnd ?? addDaysIso(weekStart, 6)`. The fallback **is** the migration for cycles written before `weekEnd` existed; there is no backfill. Callers must use this rather than reading `cycle.weekEnd`.
- `isWithinWeek(weekEnd, todayIso)` — `todayIso <= weekEnd`, inclusive, lexicographic.
- `planWeek({ todayIso, weekStartDay, priorWeekEnd })` — three cases in order: (1) no chosen start day → anchor on today, full week; (2) `priorWeekEnd === null` → setup **stub**, starting today and ending the day before `nextWeekStartAfter(todayIso, weekStartDay)`; (3) recurring → `mostRecentWeekStartOnOrBefore`, bumped to `nextWeekStartAfter(priorWeekEnd, …)` if that anchor would overlap the outgoing cycle.

`WEEK_LENGTH_DAYS = 7` is used only to **compute** a boundary and as the legacy fallback. It no longer appears in any liveness test — the old `age < WEEK_LENGTH_DAYS` predicate kept a four-day stub current three days into the following week.

**`resolveWeeklyEntry` on a stale cycle** (`src/screens/weekly/weeklyEntry.ts:53`):

```ts
if (!floorCommitment) return 'floor';
if (!latestCycle)     return 'open';
return isWithinWeek(resolveWeekEnd(latestCycle.weekStart, latestCycle.weekEnd), todayIso)
  ? 'today' : 'open';
```

So a stale (expired) cycle resolves to **`'open'`**. `closed` is carried on the input type and **deliberately never consulted** — expiry is the only thing that routes a user out of their week. Closing early briefly did route to `'open'`, which made the "This week is closed." acknowledgment unreachable (Home renders it only under `'today'`) and tripped Home's focus latch into pushing the weekly open the instant the close finished. Paired tests assert the answer is identical closed or not.

Home consumes the same pure function through `useWeeklyLanding` rather than reimplementing it, because a tab cannot be `replace`d into. `useWeeklyLanding` short-circuits the cycle read entirely when there is no floor commitment. On a read failure it returns `target: null` and Home renders its ordinary content rather than guessing — routing on an unknown state could open a second cycle for a week the user already has.

---

## SECTION 6 — Practices tab

### 6a / 6b. Card structure and destinations

`src/screens/practices/PracticesHubScreen.tsx` — a pure launcher. No state, no data reads, no Guide pill, no hero band. Title "Practices", intro "Pick a place to start."

Four cards, in the fixed `PILLARS` array order (the array is appended to, never resorted):

| # | Label | Descriptor | Icon | Destination | Destination built? | What the destination renders |
|---|---|---|---|---|---|---|
| 1 | **Focus & Time** | "Protected time for one thing at a time." | `target` | `ROUTES.PillarFocus` → `FocusHubScreen` | Yes, fully | H1 "Focus" + Guide pill, intro, `focusHeader.webp` band, primary card "Set a focus / Deep work" → `FocusTimer`; secondary row "Focus rhythms" (body reflects the user's own stored rhythms once set) → `FocusRhythms`; a two-card tool group "Time blocking" → `FocusDayBlocks` and "Task batching" → `FocusTasks`. No placeholders remain — `ComingSoonCard` has zero call sites |
| 2 | **Energy** | "Ways to shift how you feel." | `white-balance-sunny` | `ROUTES.PillarEnergy` → `EnergyHubScreen` | Yes, fully | H1 "Energy" + Guide pill, `energyHeader.webp` band, three category cards — Regulate "Calm a busy mind and steady your system." (5 practices), Rest "Deep rest to recover when you feel depleted." (2), Fuel "A gentle lift for energy and focus." (7) — each → `EnergyBrowse` with `{ category }`; plus two quieter secondary rows: Journal "Wind down with an evening reflection." → `Journal`, and Learn "Short lessons on why these practices work." → `Masterclass` |
| 3 | **Routines** | "The sequences your days run on." | `clipboard-check-outline` | `NAV_TARGETS.plan` (= `ROUTES.PillarTime`) with `{ tab: 'routines' }` → `PlanScreen` | Yes — wiring, not a new page | `PlanScreen` with its `routines` sub-tab selected, hosting `RoutinesTab` → `RoutineEditor`. The `tab` param is load-bearing: `PlanScreen` defaults to `habits` |
| 4 | **Stress Recovery** | "Something to reach for when stress spikes." | `lifebuoy` | `ROUTES.PillarStressRecovery` → `StressRecoveryScreen` | Yes | Title "Stress Recovery", intro "In-the-moment relief when you are activated.", then a `FlatList` of the **7** catalog protocols with `regulationDirection === 'settle'`, sorted shortest-first then by id, rendered with the shared `components/protocol/ProtocolListItem`. Each row → `PracticeRun` with `{ protocolId, stateBefore: null }` |

Card 4 is an intentional **cross-list**: its 7 practices are exactly Energy's Regulate (5) + Rest (2). Zero unique content, by design. The filter is strict `=== 'settle'` and must not be switched to `engine/slotFilter`'s `directionMatches`, which would admit `both` — today that is only Cold Water Reset, a poor answer for someone already activated.

`EnergyBrowse` and `FocusRhythms` are registered only inside the `FOUR_PILLAR_IA` branch. The flag is `true`, so both are live; if it flipped, cards 1 and 2 would land on hubs whose children were unregistered.

Every string on the Practices hub — including all four labels — carries `COPY: draft`. `PracticesHubScreen.tsx:88` records that section 7 of the brand guidelines is under a HOLD and has no Stress Recovery slot, so none of it may be rewritten from the doc yet.

### 6c. Media assets referenced from Firebase Storage

**I cannot confirm any of these exist.** No network access was used in this pass. Everything below is a *reference found in code*.

Storage bucket (default from `src/config/env.ts:100`): `vara-4a99f.firebasestorage.app`.

**Prefix `protocolAudio/`** — resolved by `src/services/audio/protocolAudioLoader.ts` (`STORAGE_ROOT = 'protocolAudio'`) via the shared `src/services/storage/resolveStorageUrl.ts`.

| Path | Referenced from | Requesting surface |
|---|---|---|
| `protocolAudio/nsdr/nsdr_10min_v1.mp3` | `src/constants/brainStateProtocols.ts:395` (`audioPath` on protocol `nsdr-10`) | `components/protocol/AudioStepView.tsx` via `loadProtocolAudio`; prefetched by `components/protocol/GuidedSessionPlayer.tsx:57`. Reached in production through `EnergyBrowse` (Rest) → `PracticeRun`, or `StressRecoveryScreen` → `PracticeRun` |
| `protocolAudio/nsdr/nsdr_20min_v1.mp3` | `src/constants/brainStateProtocols.ts:439` (protocol `nsdr-20`) | same |

Those two are the **only** `audioPath` values in the entire catalog. The other 12 protocols are timer/pacer-driven with no audio.

`src/screens/_dev/ProtocolAudioLoaderTestScreen.tsx` (a `__DEV__` route) lists the same two paths as its fixtures and its header comment notes the harness assumes `protocolAudio/nsdr/nsdr_10min_v1.mp3` exists as a short test clip.

**Prefix `focus-video/`** — resolved by `src/hooks/useVideoSource.ts` → `resolveStorageUrl`.

| Path | Referenced from | Requesting surface |
|---|---|---|
| `focus-video/video-player-test-1.mp4` (~125 MB) | `src/screens/_dev/VideoPlayerTestScreen.tsx:33` | `DevVideoPlayer`, `__DEV__` only |
| `focus-video/video-player-test-2.mp4` (~242 MB) | `src/screens/_dev/VideoPlayerTestScreen.tsx:38` | same |
| `focus-video/does-not-exist.mp4` | `src/screens/_dev/VideoPlayerTestScreen.tsx:43` | same — deliberate negative fixture |
| `focus-video/focus_explainer_v1.mp4` | named only in a doc comment at `src/components/video/VideoPlayerModal.tsx:67` | **no code passes it.** `VideoPlayerModal` has exactly one call site, the dev harness |

`VideoPlayerModal` is therefore **BUILT BUT DARK** in production. The whole `focus-video/` prefix is dev-only today.

**Other Storage prefixes in use:**

| Prefix | Path pattern | Site |
|---|---|---|
| `users/` | `users/${filename}` | `src/screens/ProfileScreen.tsx:315` — avatar upload, `uploadBytes` + `getDownloadURL`. The only Storage **write** in the app |

**Not Firebase Storage but worth listing as media:**

- Bundled local assets, `mobile/assets/images/`: `homeHeader.webp`, `focusHeader.webp`, `energyHeader.webp`, `resilient-brain-cover.webp`. Four files, all present in the tree, all rendered (`resilient-brain-cover.webp` by `MasterclassScreen` and `PodcastEpisodeScreen`).
- Podcast audio comes from an external RSS feed, not Storage: `FEED_URL = 'https://feeds.captivate.fm/the-resilient-brain/'` in `src/hooks/usePodcastFeed.ts:11`; episode `audioUrl` values come from the feed enclosures.

No Storage references exist for Breathwork, Sleep, or Movement library content.

---

## SECTION 7 — Habits and notifications

### 7a. The habits data model and every surface that touches it

**Collection:** `habits`. **Sub-collection:** `habits/{habitId}/completions/{date}`.

`Habit` (`src/types/models.ts:507`) — the reminder-relevant and taxonomy fields:

| Field | Type | Notes |
|---|---|---|
| `id`, `userId`, `name` | `string` | |
| `type` | `'daily' \| 'weekly' \| 'custom'` | |
| `frequency` | `number` | times per week |
| `frequencyType` | `'daily' \| 'specific_days' \| 'flexible'?` | **absent** on habits from the retired wizard |
| `specificDays` | `number[]?` | 0 = Sunday |
| `timeOfDay` | `HabitTimeOfDay?` | |
| `reminderEnabled` | `boolean?` | opt-in; absent means off |
| `reminderTime` | `ReminderTime \| null?` | canonical `{hour, minute}`, deliberately **not** a `"7:00 AM"` string and **not** the legacy `cue` |
| `streak`, `longestStreak` | `number` | |
| `active` | `boolean` | |
| `category` | `string?` | **legacy free text.** Uncontrolled, rendered raw, and written by the **web app** against this same collection. Three live readers depend on exact values |
| `habitCategory` | `HabitCategoryKey \| null?` | the new controlled taxonomy (9 keys in `constants/habitTaxonomy.ts`). Pillar and focus-demand are derived at read time via `HABIT_CATEGORY_MAPPING`, never denormalized |
| `neurochemicalTags`, `identity`, `identityStatement`, `outcomeGoal` | | identity-based habit fields |

The reminder's **days are not stored**. They are derived at schedule time from `frequencyType`/`specificDays`, so a habit's schedule and its reminder cannot disagree.

**Surfaces that read or write `habits`:**

| File | Operation |
|---|---|
| `src/services/firebase/habits.service.ts` | the CRUD authority: `listHabits`, `getHabit`, `createHabit`, `updateHabit`, `deleteHabit`, `markHabitComplete`, `unmarkHabitComplete`, `setCompletionNote`, `getCompletionNote`, `getHabitCompletions`, `isHabitCompletedToday` |
| `src/hooks/useHabits.ts:44,52` | real-time `onSnapshot` subscription |
| `src/hooks/useHabitsScreen.ts` | the habits screen's state machine, incl. reminder toggling |
| `src/hooks/useDashboard.ts` | Home's habit list + completions |
| `src/screens/HabitsScreen.tsx` | list UI (rendered inside `PlanScreen`) |
| `src/screens/HabitDetailScreen.tsx` | detail + edit + reminder control |
| `src/components/habits/*` (create sheet, `HabitNoteSheet`) | create / note capture |
| `src/components/dashboard/WeeklyHabitGrid.tsx` + `habitWeekState.ts` + `habitCellMarks.tsx` | Home's 7-day grid; only today is interactive |
| `src/services/reminderScheduler.service.ts:363` | **direct collection query**, bypassing the service layer, inside `syncAllReminders` |
| `src/services/firebase/wellnessScore.service.ts` | scoring input |
| `src/hooks/useWeeklyCorrelations.ts:298` | Insights correlations |
| `src/services/correlationEngine.service.ts` | correlation factor `'habits'` |
| `src/components/dashboard/QuickActionCarousel.tsx:259` | `addDoc(collection(db,'habits'), …)` — a **write path in a component with zero render sites** |
| The **web app** (repo root, outside `mobile/`) | writes `category` against the same collection |

### 7b. The per-habit notification system

**Scheduling mechanism:** `expo-notifications` local scheduled triggers. No push, no server, no Cloud Function.

**Where:** `src/services/reminderScheduler.service.ts`, with the trigger-shape decision factored into `src/utils/habitReminderPlan.ts`.

**Storage:** the *intent* lives on the habit document (`reminderEnabled`, `reminderTime`). The *schedule* lives in the OS notification store, keyed by identifier. Nothing about the schedule is persisted in Firestore.

**Identifier scheme** (`habitReminderPlan.ts`):

```
habitReminderPrefix(habitId)          = `habit-reminder-${habitId}`
habitReminderIdentifier(habitId)      = the bare prefix              // daily
habitReminderIdentifier(habitId, wd)  = `${prefix}-${wd}`            // weekly, one per day
isIdentifierForHabit(id, habitId)     = id === prefix || id.startsWith(`${prefix}-`)
```

**Trigger derivation** — `habitReminderPlan(habit)` reads `frequencyType`/`specificDays` only:

| `frequencyType` | Plan | Triggers |
|---|---|---|
| `'daily'` | `{ kind: 'daily' }` | one `DAILY` trigger |
| `'flexible'` | `{ kind: 'daily' }` | one `DAILY` trigger |
| `'specific_days'` with ≥1 valid day | `{ kind: 'weekly', weekdays }` | one `WEEKLY` trigger per day, up to 7 |
| `'specific_days'` with no days | `null` | none — control hidden |
| absent / anything else | `null` | none — control hidden |

`toExpoWeekday(d) = d + 1` converts Habit's 0=Sunday to expo's 1=Sunday. It gets its own name and test because getting it wrong fails **silently**.

**`scheduleHabitReminder(habit)`** (`reminderScheduler.service.ts:90`): early-returns unless `reminderEnabled && reminderTime`; early-returns on a null plan; early-returns without permission; then **cancels the habit's whole existing set first** (`cancelHabitReminder`), because an exact-identifier cancel would strand triggers when a day set shrinks. Content is `{ title: \`Time for ${habit.name}\`, body: 'A moment for this, if now works.', sound: true, data: { type: 'habit-reminder', habitId } }`.

Quiet hours are deliberately **not** consulted for scheduled habit triggers — an explicit per-habit time beats a default window. `isWithinQuietHours` governs only immediate app-initiated sends via `sendThrottledNotification`.

**`cancelHabitReminder(habitId)`** enumerates all scheduled notifications and filters by `isIdentifierForHabit`, rather than cancelling one exact id.

**`syncAllReminders(userId)`** (`:325`): cancels every reminder-prefixed notification, queries `habits` directly, filters to those with reminders, applies `applyReminderCap` (`MAX_HABIT_REMINDER_TRIGGERS = 40`, dropping whole habits once the cap is hit and logging what was dropped), then schedules each survivor.

**Coupling to habit records — exactly four points:**

1. `habitId` is the identifier namespace.
2. `habit.name` is the notification title.
3. `habit.reminderEnabled` + `habit.reminderTime` are the on/off switch and the time.
4. `habit.frequencyType` + `habit.specificDays` are the *only* source of the repeat cadence.

### 7c. Assessment — what breaks if habit records were deleted, and is the infrastructure reusable

**If habit records were deleted:**

- `scheduleHabitReminder` and `cancelHabitReminder` would still function; they are pure functions of a `Habit`-shaped object plus the OS store.
- `syncAllReminders` would schedule nothing — its `habits` query returns empty — and, importantly, its first action is to cancel every reminder-prefixed notification. So the next sync after a deletion silently **clears every habit reminder**, which is the correct outcome.
- What actually breaks: **orphaned OS triggers between deletions and the next sync.** Deleting a habit document does not itself cancel its notifications unless the delete path calls `cancelHabitReminder`. `deleteHabit` in `habits.service.ts:148` is a plain Firestore delete. Any reminder scheduled for a deleted habit keeps firing with the deleted habit's name until `syncAllReminders` runs. Tapping such a notification dispatches `{ type: 'habit-reminder', habitId }` at a habit that no longer exists — I did not trace the tap handler's null-handling, so **the failure mode of that tap requires device verification.**
- Nothing else in the notification system depends on habits. `scheduleDailyRhythm`, `scheduleInsightsNotification`, `scheduleRoutineReminder`, and the six `send*Notification` helpers are independent.

**Is the scheduling infrastructure reusable for a one-off "remind me later today" on a served protocol, without a rewrite?**

**Yes, with one genuine gap and two small additions. It does not need rewriting.**

What is already reusable as-is:
- `hasNotificationPermission()` and the permission plumbing.
- The cancel-by-prefix pattern in `cancelHabitReminder` — generic over any identifier namespace.
- `parseTimeString` and the `ReminderTime` shape.
- The whole `expo-notifications` wiring, the notification categories/channels, and the tap-routing seam (`data: { type, … }` handled in `NotificationContext` / `useNotifications`).

The genuine gap: **every scheduler in this file writes a repeating trigger.** `scheduleHabitReminder` uses `SchedulableTriggerInputTypes.DAILY` / `.WEEKLY`; `scheduleRoutineReminder` is the same shape. There is no one-shot `DATE`-trigger helper anywhere in `reminderScheduler.service.ts` or `notificationScheduler.service.ts`. A "remind me at 3pm today" needs `SchedulableTriggerInputTypes.DATE`, which is a new function, not a modification of an existing one — perhaps fifteen lines mirroring `scheduleHabitReminder`'s guard-cancel-schedule structure.

The two additions:
1. An identifier namespace of its own (e.g. `protocol-reminder-${date}`) so `syncAllReminders`'s blanket "cancel every reminder-prefixed notification" does not eat it. **This is the sharp edge**: `syncAllReminders:342` cancels by a reminder prefix filter, and a naively-named one-shot would be silently destroyed the next time a habit changed.
2. A tap-routing case for the new `data.type`.

`habitReminderPlan` itself is **not** reusable — it exists to derive a *repeat cadence from a habit's schedule*, which a one-off has by definition none of. That is a reason not to touch it, not a reason to rewrite anything.

---

## SECTION 8 — Insights

### 8a. Does an Insights surface exist?

**Yes. BUILT AND REACHABLE.**

- Route: `Insights`, registered on `AppStack` at `AppNavigator.tsx:629` under both flag positions, header title **"Your week"**.
- File: `src/screens/InsightsScreen.tsx`.
- Live entry points: `InsightsLookbackCard` at the very bottom of Home (a deliberately quiet list row, "Look back / A gentle look at your patterns over time."); `HabitDetailScreen.tsx:493`; a notification tap at `useNotifications.ts:83`. `getNudgeSuggestion` also names it, but that path is dead (see 2b).

What it renders, per its own header comment and imports:

1. Hero — Wellness Score (`HeroSummaryCard`)
2. AI narrative (`NarrativeRecap`), fetched via `apiPost` to the backend
3. Correlation insight (`components/insights/CorrelationInsightCard`), from `useWeeklyCorrelations`
4. Daily activity bar chart (`WeeklyBarChart`)
5. 30-day habit heatmap (`HabitHeatmap`)
6. "At a glance" sparklines (`components/insights/SparklineTrendCard` → `AtAGlanceCard`)

Timeframe toggle: `'week' | 'month'` (7 or 30 days). Data sources it reads directly: the `habits` collection via `useHabits`, `getHabitCompletions`, plus in-screen queries for `focusSessions` and `journalEntries`.

Notable: **`InsightsScreen` reads nothing from the weekly loop.** It does not touch `weeklyCycles`, `dailyLogs`, `floorMet`, or continuity. It is built entirely on the older habit/focus/journal data model. It also hardcodes its own colour constants (`VARA_COLORS` at `InsightsScreen.tsx:35`) rather than using `src/constants/colors`.

### 8b. Analytics / event-capture pipelines already writing data

**One pipeline, and it is live.**

`src/services/firebase/analyticsEvents.service.ts` → Firestore collection **`analyticsEvents`**. Write-only from the client (rules grant `create` to the owner and nothing else); aggregation is expected to happen via the Admin SDK. `logEvent` returns `void` synchronously and cannot throw.

Row shape: the event `name`, the scrubbed `params`, `userId`, a per-app-run `__sessionId` (regenerated each launch, never persisted, never derived from the uid), the app version from `expo-constants`, and a server timestamp. `scrubParams` drops non-primitives and strings over `MAX_PARAM_STRING = 64`.

The schema is a type-enforced content firewall (`src/types/analyticsEvents.ts`): no open `string` value, no index signature, no generic `value`/`label`/`name` field, and `ExactParams` maps unknown keys to `never` so a payload built as a variable cannot smuggle extra fields.

**Every declared event and its exact shape** (`ANALYTICS_EVENT_NAMES`, 8 total):

| Event | Payload | Fired from |
|---|---|---|
| `weekly_open` | `{ outcome: OutcomeKey; capacityInitial: CapacityTier; protocolId: \`${OutcomeKey}-${CapacityTier}\` }` | `WeeklyOpenScreen.tsx:238` |
| `weekly_close` | `{ ratingFocus: 1..5; ratingRecovery: 1..5; ratingEnergy: 1..5; adjustmentSelected: AdjustmentKey; floorMet: boolean; continuityBeforeClose: number }` | `WeeklyCloseScreen.tsx:240` |
| `weekly_close_failed` | `{ reason: 'permission-denied' \| 'unavailable' \| 'unknown' }` | `WeeklyCloseScreen.tsx:279` |
| `floor_set` | `Record<string, never>` — empty on purpose | `FloorCommitmentScreen.tsx:65` |
| `weekly_entry` | `{ route: 'floor' \| 'open' \| 'today' }` | `WeeklyEntryScreen.tsx:130` |
| `weekly_close_entry` | `Record<string, never>` — fires on tap, not on success | `useWeeklyCloseEntry.ts:29` |
| `sign_up` | `{ method: 'email' \| 'apple' \| 'google' }` | `AuthContext.tsx:213` |
| `login` | `{ method: 'email' \| 'apple' \| 'google' }` | `AuthContext.tsx:263` |

Deliberately absent, each with a stated reason in the file: any capacity-re-set event (retired with the control), a continuity event (derivable from stored `floorMet`; rides as a field on `weekly_close` instead), and `screen_view` (volume + open-string route names).

**None of these are `__DEV__`-gated.** I checked `useWeeklyLanding.ts`, all four `screens/weekly/*.tsx`, `useWeeklyCloseEntry.ts` and `analyticsEvents.service.ts`: the only `__DEV__` mention in the weekly path is a comment at `WeeklyCloseScreen.tsx:272` noting that `logger.error` is dev-gated. The weekly-loop screens are registered unconditionally and Home pushes into them, so **all eight events fire on a production path today.** See SURPRISES.

Other data an Insights surface could read but nothing currently aggregates: `dailyLogs` (`protocolCompleted`, `dailyCapacity`, `dailyTimeBudget`), `weeklyCycles` (three 1–5 ratings, `floorMet`, `closeNote`, `adjustmentSelected`), `protocolSessions`, `focusSessions`, `brainStateCheckIns`, `dailyReflections`, `brainMetrics`, `fourThreeTwoOne`.

`analyticsEvents` is unreadable from the client by rule, so no in-app Insights surface can ever read it back. That is deliberate.

### 8c. Is anything capturing a post-practice or post-protocol response?

**Two different things, and only one of them is reachable.**

**Reachable — the practice-level re-check.** Launching a practice from `EnergyBrowse` or `StressRecoveryScreen` goes to `PracticeRun` → `BrowseRunFlow`, which after the session dispatches `state_after_selected` and captures a post-protocol response. `browseRunReducer.ts` classifies the outcome via `classifyOutcome(ctx.state, stateAfter)`. Because both live entry points pass `stateBefore: null`, the flow takes the **browse** path: no five-state `stateAfter` is synthesized, a **felt-reflection id** is persisted instead, `stateAfter` stays `null`, and `outcome` is `'browse_launched'` (`browseRunReducer.ts:118, 217, 228`).

The write lands in `protocolSessions` via `src/services/firebase/protocolSession.service.ts`. Doc id `${userId}_${sessionStartedAt}` (ms integer). Payload fields: `protocolId`, `stateBefore`, `stateAfter`, `timeWindowSelected`, `durationActualSeconds`, `outcome`, `userChosenNextStep`, `intentPath`, `sessionStartedAt`, optional `selectedModality`, `completed`, `abandonReason`.

**Not reachable — the full check-in re-check.** The richer path that captures a concrete `stateAfter` requires a `stateBefore`, which only `CheckInFlow` supplies — and `CheckInFlow` is dark (see 1c). So today the app captures a reflection chip, not a before/after state shift.

**The daily protocol captures nothing.** `useTodayCard.markDone` writes `{ protocolCompleted: true, practiceIds: [] }` and nothing else. There is no post-protocol question, no rating, no note, no felt-shift capture on the Today hero. The only place the weekly loop asks the user how anything felt is the weekly close, seven days later.

---

## SECTION 9 — The Guide (AI)

### 9a. Implementation and reachability

| Piece | File |
|---|---|
| Entry affordance | `src/components/ai/GuidePill.tsx` — a docked pill, mounted per surface |
| Conversation UI | `src/components/ai/AIChatModal.tsx` |
| Consent gate | `src/components/ai/AIConsentModal.tsx` |
| API client | `src/services/api/ai.service.ts` → `chatWithAI(messages, context)` |
| Transport | `src/services/api/client.ts` `apiPost('/ai-chat', …, { timeout: 60000 })` |
| Server | `backend/server.js:205`, `POST /api/ai-chat`, model `gpt-4o-mini`, `temperature: 0.7`, `max_tokens: 600` |

**Reachability: BUILT AND REACHABLE on five surfaces**, all as a top-right pill:

| Surface | Call site | `context.screen` |
|---|---|---|
| Home | `DashboardScreen.tsx:248` | `'home'` |
| Focus hub | `FocusHubScreen.tsx:124` | `'focus'` |
| Energy hub | `EnergyHubScreen.tsx:110` | `'energy'` |
| Time / Plan | `PlanScreen.tsx:269` | `'time'` |
| Community | `CommunityScreen.tsx:190` | `'community'` |

The Practices hub and the Learn hub deliberately do **not** mount it. The global bottom-right FAB and the `FABHost`/`showFAB` mechanism were retired at `f39bdee`.

Server-side the route sits behind `app.use('/api', requireAuth)` (`backend/server.js:122`), plus `globalLimiter`, `aiLimiter`, `aiDailyLimiter`, and `validateAIChat`.

### 9b. Corpus, system prompt, and context given to the model

There is **no corpus and no retrieval**. No embeddings, no vector store, no document set. The entire knowledge the Guide has is its system prompt, which is a template literal built inline at `backend/server.js:222`. Reproduced verbatim, with the two interpolated context lines shown as they appear in source:

```
You are Vara Coach — a calm, knowledgeable brain-health guide. You help users build sustainable habits, routines, and focus through 5 pillars:

1. Neuroplasticity (growth through challenge and novelty)
2. Neuroenergy (sleep, movement, nutrition as brain fuel)
3. Neurofocus (attention, concentration, reducing cognitive load)
4. Neuroresilience (stress tolerance, recovery, regulation)
5. Neurosocial (connection, belonging, social brain health)

VOICE: Calm, intelligent, supportive, clear. Use conditional language ("can help," "may support," "many people find"). Never use urgency, shame, guilt, streak pressure, or hype. Frame missed days as normal. Keep responses to 2-3 short paragraphs, 1-3 options max. Ask one clarifying question if needed.

AMCC challenges and neuroplasticity activities: frame as invitations, never prescriptions. Do not specify durations, temperatures, or protocols for physical challenges.

=== TOPIC ROUTING ===

TIER 1 — HARD DECLINE (say these are outside your scope, warmly):
Financial advice (stocks, crypto, investing, tax, insurance), medical advice (diagnoses, medications, dosages, supplements with dosing), legal advice, clinical mental health (CBT, trauma processing, diagnostic screening, medication management), political opinions, advice about other people's mental health.

Do not reframe these through brain health — no "well, financial stress affects your brain..." bridges. Acknowledge warmly, state it's outside your lane, optionally suggest the right resource.

Example: "Should I buy ETFs?" → "That's outside what I'm built for — I'm focused on your brain health and routines. A financial advisor would be the right person for that one."

TIER 2 — GENUINE BRIDGE (engage through brain-health lens, stay in your lane):
Sleep, exercise/movement, general nutrition patterns, screen time, work-life balance, decision fatigue, stress from work/life, social connection, mindfulness/breathwork, caffeine/alcohol effects on cognition.

Engage with the brain-health connection. Don't become a nutritionist, trainer, or life coach. If the question goes deeper than your domain, acknowledge the limit.

Example: "I'm stressed about money" → Engage with the stress and its cognitive effects. Do not give financial advice.

TIER 3 — CONVERSATIONAL PASS (brief, human, no brain-health bridge):
Cars, movies, sports, weather, trivia, jokes, anything casual with no liability and no real brain-health connection.

Be briefly warm (1-2 sentences), don't force a brain-health angle, offer to help with brain-health topics. If user stays off-topic for 3+ exchanges, gently redirect.

=== CRISIS RESPONSE ===

If a user expresses self-harm, suicidal thoughts, or acute crisis: respond warmly without judgment, do not coach or diagnose, and say:
"I hear you, and I'm glad you shared that. This is beyond what I can support — but you can reach the 988 Suicide & Crisis Lifeline anytime by calling or texting 988."

Remain available afterward without processing the crisis.

=== NEVER ===

Make medical claims or diagnoses. Prescribe medications or supplement dosages. Provide therapy. Use urgency or shame language. Promise specific outcomes. Say "rewire your brain," "unlock your potential," "no excuses," or "push through."

=== CONTEXT ===

- Current page: ${page?.label || 'Unknown'} (path: ${page?.path || '/'})
- User summary:
  - Goals: ${goalsText}
  - Habits: ${habitsText}

Use the user's actual data (goals, habits, brain state) to personalize responses. Tailor to readiness score when available (low readiness = lighter suggestions). Suggest neuroplasticity activities when user hasn't tried anything new recently. Recommend regulation tools when user seems stressed. If user asks for a plan, give time-boxed steps (e.g., "10 minutes today").
```

The prompt is built on the **five-pillar Neuro\* vocabulary**, which is a different taxonomy from the four `OutcomeKey`s the protocol engine and the weekly loop use. It knows nothing about outcomes, capacity tiers, time classes, the floor commitment, continuity, or the weekly cycle. It also references "readiness score" and "AMCC challenges," neither of which exists in the mobile tree.

### 9c. What user context is injected per conversation

The client builds a substantial context object and **the server discards essentially all of it.**

`buildCoachContext()` (`AIChatModal.tsx:293`) fires six parallel reads — `brainStateCheckIns/{uid}_{today}`, `dailyReflections/{uid}_{today}`, `brainMetrics/{uid}_{today}`, the 5 most recent `journalEntries`, the 20 most recent `focusSessions`, and an AsyncStorage `LAST_COACH_SESSION_KEY` — and returns a **flat** object:

```
{ currentTime, page, brainState, todayCheckIn, dailyReflection,
  sleepQuality, stressLevel, weekSummary, moodTrend,
  recentJournalTags, daysSinceLastCoachSession, habits }
```

`page` here is a **string** (`initialContext?.screen || 'unknown'` — e.g. `'home'`). `habits` is a string array of up to 5 entries shaped `"Name | phase: … | identity: …"`.

The server (`backend/server.js:207`) destructures `const { page, userSummary } = context` and reads `page?.label`, `page?.path`, `userSummary?.goals`, `userSummary?.habits`. **None of those paths exist on what the client sends.** `page` is a string, so `page?.label` is `undefined`; `userSummary` is entirely absent.

Consequently the `=== CONTEXT ===` block that actually reaches the model is always:

```
- Current page: Unknown (path: /)
- User summary:
  - Goals: None on file
  - Habits: None on file
```

The middleware has the same mismatch: `validate.js:50-52` does `context.page.label = sanitizeString(...)` on what is a string primitive. `backend/middleware/validate.js` is a CommonJS module with no `"use strict"` directive, so that assignment is a **silent no-op** rather than a `TypeError` — it does not throw and does not cause a 500. It also does not sanitize anything.

So: the per-conversation context is six Firestore reads on every message, and it reaches the model only as raw JSON on `req.body` that the prompt builder never reads. The only user context the model actually sees is whatever the user types.

Consent: `AIConsentModal.tsx` exists; I did not trace whether it gates the pill or the send, so its enforcement point **requires device verification**.

### 9d. The coach 500

**I cannot reproduce the cause statically.** Here is what the code establishes.

`/api/ai-chat` has exactly **one** path that returns HTTP 500: the `catch` at `backend/server.js:291`, `return res.status(500).json({ error: 'AI chat failed' })`. Everything inside the `try` that can throw is:

1. `openai.chat.completions.create({ model: 'gpt-4o-mini', temperature: 0.7, messages: history, max_tokens: 600 })` — the overwhelmingly likely source.
2. `stripMarkdown(raw)` on the response.

The system-prompt construction above it is string interpolation over optional-chained values and cannot throw. `validateAIChat` returns 400s, not 500s, and its one suspicious line is a no-op as established in 9c. `requireAuth` failures are 401/403. The rate limiters return 429.

What I ruled out statically:
- **Not** the `context.page` shape mismatch — sloppy-mode CommonJS makes it inert.
- **Not** a validation rejection — those are 400s.
- **Not** auth — that is 401.

Remaining candidates, all requiring a live check:
- `OPENAI_API_KEY` missing, invalid, or revoked in `backend/.env` (the backend loads it from `./backend/.env` relative to cwd, `server.js:3` — an unusual path that is wrong if the server is started from inside `backend/`).
- Quota exhausted or billing lapsed on the OpenAI account.
- No account access to the `gpt-4o-mini` model id.
- An outbound TLS failure. The environment is known to run Norton TLS interception; the backend has no `NODE_EXTRA_CA_CERTS` handling in `server.js`.
- A request-size or token overflow — unlikely at `max_tokens: 600` with `MAX_MESSAGES_COUNT = 50` × `MAX_MESSAGE_LENGTH = 5000`, but a 50-message history at full length would be roughly 60k tokens and would be rejected by the API, which would surface as exactly this 500.

The last candidate is the only one I can name a concrete trigger for. `validateAIChat` truncates to the **last 50** messages and 5000 chars each without any token budget, so a long conversation is capped by count, not by size. That is a real, reachable path to an API rejection surfaced as a 500 — but whether it is *the* 500 being seen is undeterminable without the server log line `console.error('ai-chat error:', err)`, which is where the actual cause is printed.

---

## SECTION 10 — Community

### 10a. What Community actually is today

A **combination**: a global feed with post composition and comments, plus groups, plus challenges, plus 1:1 DMs, plus a people directory. It is the largest and most conventional part of the app, and it is untouched by the four-tab restructure.

`CommunityScreen` (the tab root) renders:

- Header: title "Community", a Guide pill, and a profile avatar → `ProfileStack`.
- An orientation card for new users (`CommunityOrientationCard`, dismissible, with "Find a group" / "Skip"), followed by a "RECENT ACTIVITY" label.
- `CommunityFeedHeader`, which carries a four-button quick-nav row: **Groups** ("Your spaces"), **People** ("Connect"), **Challenges** ("Together"), **Messages** ("Inbox" → the `Conversations` route).
- A feed `FlatList` of `PostCard`s with like, comment, group chip → `GroupDetail`, author tap → `UserProfile`, and an overflow menu.
- Post composition via a type selector — `'update' | 'win' | 'reflection' | 'ask'` — into `CreatePostModal`; comments via `CommentModal`.
- A feed filter (`feedFilter`) and a rotating prompt (`currentPrompt`).
- Empty state: "Welcome to the community / Connect with others and join groups to build your wellness network".

**Threads:** comments on posts, one level. There is no separate threaded-discussion surface.

**DMs:** `Conversations` (inbox) → `Chat`, backed by `conversations` and `directMessages`. Reachable from the quick-nav, from `PeopleScreen`, from `UserProfileScreen`, and from a message notification tap.

### 10b. Group and cohort concepts in the data model, and size caps

`Group` (`src/types/models.ts:901`):

```ts
export interface Group {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  visibility: 'public' | 'private';
  members: string[];              // array of user IDs
  memberCount?: number;
  category?: GroupCategory;
  coverImage?: string;
  invitePermission: 'owner_only' | 'all_members';
  lastActivityAt?: Timestamp;
  postCount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

Adjacent: `GroupPrompt` (a weekly prompt per group, with `dayOfWeek` and `currentPostId`) and `Challenge` (`status: 'upcoming'|'active'|'completed'`, `frequency: 'daily'|'weekly'|'total'`).

**Size cap: NOT PRESENT.** I searched for `maxMembers`, `memberLimit`, `MAX_GROUP`, and every "group" + "cap" combination across `mobile/src`. There is no member cap in the type, no constant, and no client-side guard. `members` is an unbounded `string[]` on a single document, which is itself the practical ceiling (Firestore's 1 MiB document limit — roughly 30k uids at 32 bytes each, but membership checks in security rules over a large array are the real constraint). Whether `firestore.rules` imposes one was not checked in this pass.

**Cohort concept:** none in the mobile data model. There is an org/coach concept referenced in the weekly-loop privacy comments (`weeklyCycle.service.ts:11`, `models.ts:234`) — "coach or employer rollup," "org membership grants zero read here" — and `firestore.rules` has org blocks around lines 745–775. That is a separate access-control concept, not a community grouping, and it is deliberately walled off from behavioral data.

### 10c. Report and block implementation status

**Reporting: BUILT AND REACHABLE, three-screen flow.**

`ReportReason` → `ReportDetail` → `ReportConfirmation` (all registered on `CommunityNavigator`, all `headerShown: false`, with `gestureEnabled: false` on the confirmation so it cannot be swiped away). Entered from a post's overflow menu (`handleMorePress` in `CommunityScreen`).

Backed by `src/services/firebase/moderation.service.ts`, collection **`postReports`**, with reasons typed as `PostReportReason` (`src/types/moderation.ts`). `checkDuplicateReport(reporterId, postId)` prevents double-reporting the same post. `firestore.rules:379` restricts reads to the reporter's own reports.

**Blocking: implemented as MUTING, not blocking.**

There is no `blockedUsers` collection and no `blockUser` function anywhere in the tree. What exists:

| Collection | Doc ID | Service functions |
|---|---|---|
| `mutedUsers` | `${muterId}_${mutedUserId}` | `muteUser`, `unmuteUser`, `fetchMutedUserIds` |
| `hiddenPosts` | — | `hidePost`, `unhidePost`, `fetchHiddenPostIds` |

Rules: `firestore.rules:420`, `match /mutedUsers/{muteId}`.

Management UI: `MutedAccountsScreen` (`src/screens/MutedAccountsScreen.tsx`), reachable from `SettingsScreen.tsx:517`. Registered inside `ProfileNavigator`.

The semantic difference matters and is not documented anywhere in the tree: a mute is **one-directional and client-filtered** — it removes the muted user's posts from the muter's feed. It does not prevent the muted user from seeing the muter's content, from sending them a DM, or from joining their groups. There is no reciprocal-block enforcement in the messaging path.

Also present: `softDeletePost` and `updatePostContent` in the same service, used by the post owner rather than by moderation.

---

## SECTION 11 — Health of the tree

### 11a. tsc and test status

**TypeScript: 158 errors.** `npx tsc --noEmit` run from `mobile/`. This matches the pinned baseline recorded across the recent slices, so it is the standing debt level, not a regression.

Two dominant families:

1. `Firestore | null is not assignable` — the raw `db` import from `src/config/firebase` is not narrowed. The fix pattern already exists (`requireDb()` from `src/services/firebase/ensureDb`), and newer services use it; older ones do not.
2. `src/utils/secureStorePersistence.ts(14,10): error TS2305: Module '"firebase/auth"' has no exported member 'getReactNativePersistence'.` — a firebase-js-sdk API surface change.

**Jest: green.**

```
Test Suites: 192 passed, 192 total
Tests:       2960 passed, 2960 total
Snapshots:   0 total
Time:        15.007 s
```

Run as `npx jest --forceExit --silent` from `mobile/`. `--forceExit` is required — the run emits "A worker process has failed to exit gracefully," which is the known reanimated/timer-handle leak, not a test failure.

Both numbers match the TB-3 pins exactly (tsc 158, jest 192 suites / 2960 tests).

### 11b. `gap()` and `[COPY GAP]` placeholders

**Both are NOT PRESENT as live placeholders. Reporting this explicitly rather than omitting the section.**

- **`gap()`**: zero occurrences anywhere in `mobile/src`. There is no `gap()` helper function in this codebase. (`gap:` appears as a React Native flexbox style property in many `StyleSheet.create` blocks; that is unrelated.)
- **`[COPY GAP]`**: 9 occurrences, **all of them inside comments explaining that the convention was retired**. Zero reach the UI. The retirement commit is `f7189d0` "copy: strip every on-screen marker, move tracking to comments." The files carrying the explanatory comment are `AppNavigator.tsx:1073`, `Focus/blocksCopy.ts:16`, `learn/LearnHubScreen.tsx:20`, `onboarding/v3/copy.ts:5`, `practices/PracticesHubScreen.tsx:95`, `StressRecovery/StressRecoveryScreen.tsx:44`, `weekly/copy.ts:5`.

**The live convention is two grep-able comment sentinels.** Counts by file:

`COPY: draft` — 198 total (196 in source, 2 in the tests that police it):

| File | Count |
|---|---|
| `src/screens/weekly/copy.ts` | 62 |
| `src/screens/Focus/blocksCopy.ts` | 50 |
| `src/screens/onboarding/v3/copy.ts` | 39 |
| `src/screens/Focus/tasksCopy.ts` | 23 |
| `src/screens/practices/PracticesHubScreen.tsx` | 10 |
| `src/components/dashboard/OpenYourWeekCard.tsx` | 3 |
| `src/screens/StressRecovery/StressRecoveryScreen.tsx` | 2 |
| `src/screens/Focus/FocusHubScreen.tsx` | 2 |
| `src/components/dashboard/TodayHeroCard.tsx` | 2 |
| `src/screens/learn/LearnHubScreen.tsx` | 1 |
| `src/navigation/AppNavigator.tsx` | 1 (explanatory) |
| `src/screens/practices/__tests__/PracticesHubScreen.test.tsx` | 1 |
| `src/__tests__/copyDraftSentinel.test.ts` | 1 |
| `src/__tests__/brandCopyGuard.test.ts` | 1 |

`PLACEHOLDER [Jen]` — 55 total:

| File | Count |
|---|---|
| `src/protocolEngine/protocolMatrix.ts` | 49 |
| `src/protocolEngine/types.ts` | 5 |
| `src/__tests__/copyDraftSentinel.test.ts` | 1 |

`src/__tests__/copyDraftSentinel.test.ts:55` lists `protocolMatrix.ts` and `types.ts` in `OUT_OF_SCOPE`, so the two sentinel systems are policed separately and the 49 matrix placeholders are not counted against the release gate.

Grouped by user-facing screen, drafted-copy load:

| Screen / surface | Sentinel count |
|---|---|
| Weekly loop (open, close, floor, entry, plus Home's `TODAY_COPY` and `PICKER_COPY`) | 62 |
| Time blocking (`DayBlocksScreen`, `AddBlockSheet`) | 50 |
| Onboarding V3 (all 9 screens) | 39 |
| Tasks (`CapturedTasksScreen`, `CaptureTaskSheet`) | 23 |
| Practices hub | 10 |
| Protocol matrix content (12 protocols × 4 strings) | 49 |
| Stress Recovery | 2 |
| Focus hub | 2 |
| Learn hub | 1 |

### 11c. TODO / FIXME naming a known architectural problem

Only **three** literal `TODO`/`FIXME` comments exist in non-test source. That low count is because this tree records architecture problems in prose headers instead, so the list below covers both.

Literal markers:

| Location | Problem named |
|---|---|
| `src/services/firebase/community.service.ts:797` | "TODO: Replace with server-side full-text search (Algolia or Firebase Extension)" — people/group search is client-side |
| `src/utils/brainStateNormalizer.ts:21` | "TODO(tech-debt): The `as unknown as BrainState` casts inside this function…" — the five-state ↔ circumplex bridge is not type-safe |
| `src/utils/accessibility.ts:33` | "TODO: Add ToastAndroid fallback for Android when TalkBack is not active" — an accessibility gap, not architectural |

Architectural problems recorded as prose (the real list a planner needs):

| Location | Problem |
|---|---|
| `src/services/firebase/weeklyCycle.service.ts:299` | **`getRecentWeeklyCycles` FAILS against production.** It pairs `where userId ==` with `orderBy weekStart desc`, which needs a composite index, and `firestore.indexes.json` has no `weeklyCycles` entry at all. Nothing calls it today; `getLatestWeeklyCycle` is the index-free alternative. Anything that adds ordered history must add the index first |
| `src/services/firebase/weeklyCycle.service.ts:143` | **`hasPickedToday` is coupled to the time question being mandatory.** If a later slice lets the user skip it, the predicate silently reports "nobody has ever picked" and the morning prompt never clears. The stated fix is an explicit `pickedAt` timestamp, not a second field |
| `src/protocolEngine/protocolMatrix.ts:118` and `src/hooks/useTodayCard.ts:272` | **The time axis is inert.** Every cell holds one variant, so the picker's answer cannot change what is served |
| `src/protocolEngine/selectProtocol.ts:6` | **Totality is a rule, not a type property.** The array-shaped cell can miss the class asked for; only `selectProtocol`'s ladder and one test hold it |
| `src/protocolEngine/types.ts:69` | **`ProtocolVariant.id` is deliberately not unique per variant** and cannot be widened without migrating stored `weeklyCycles.protocolId` rows and changing an event schema designed to be read cold |
| `src/services/firebase/weeklyCycle.service.ts:19` and `:494` | **`downshiftEvents` is orphaned.** Collection, model, and create/read helpers survive; nothing writes. Kept because the rows already written are a true record |
| `src/hooks/useTasks.ts:5` | **"THIS HOOK HAS ZERO CONSUMERS, DELIBERATELY."** Explicitly labelled TECH DEBT |
| `src/screens/weekly/weeklyContinuity.ts:11` | **Order is load-bearing and silent when wrong.** `computeContinuity` needs oldest-first; both Firestore readers return other orders. Wrong order returns a wrong number without throwing |
| `src/navigation/AppNavigator.tsx:534` | **`FivePillarTabs` renders four tabs.** The name is knowingly wrong and retained because `navTargets.ts:6` and `useWeeklyLanding.ts:6` name it in prose |
| `src/navigation/AppNavigator.tsx:950` | **`FocusDayBlocks`'s `headerBackTitle` is wrong for one of its two parents** (reads "Focus" when arriving from Tasks). Accepted, not fixed |
| `src/routes.ts:132` / `AppNavigator.tsx:1112` | **The weekly close's real trigger is not wired.** It is entered from Home, not from an elapsed week |
| `src/components/dashboard/DailyReflectionCard.tsx` + `dashboardConfig.ts:52` | `DASHBOARD_SUPPRESS.dailyReflection` suppresses a component nothing renders |
| `src/constants/featureDiscovery.ts` | **5 dead `navigationTarget` values** — `BrainHealthDashboard`, `AIChat`, `Goals`, `Habits`, `Messages` — none is a registered route. Inert because `ComingUpSection` has zero render sites, which is itself the deeper problem |
| `src/services/reminderScheduler.service.ts:263` | `MAX_HABIT_REMINDER_TRIGGERS = 40`; `applyReminderCap` drops whole habits past the cap. Logged, not surfaced to the user |
| `src/screens/InsightsScreen.tsx:35` | Hardcoded `VARA_COLORS` instead of `src/constants/colors` |
| `src/utils/secureStorePersistence.ts:14` | `getReactNativePersistence` no longer exported by `firebase/auth` — auth persistence sits on an API that no longer exists in the installed SDK |

---

## OPEN QUESTIONS

Each phrased as the specific check that would resolve it.

1. **Do the two `protocolAudio/nsdr/*.mp3` files actually exist in the bucket?** Open the Firebase Console → Storage for `vara-4a99f.firebasestorage.app` and list `protocolAudio/nsdr/`. Both `nsdr-10` and `nsdr-20` are reachable in production through Energy → Rest and Stress Recovery; if the objects are missing, those two practices fail at `getDownloadURL`.

2. **What is the actual `ai-chat` 500?** Reproduce a coach message with the backend running and read the server's `console.error('ai-chat error:', err)` line (`backend/server.js:291`). That line prints the cause; nothing else can distinguish a missing API key from a quota rejection from a TLS failure.

3. **Is the backend even reachable from the device?** Check what `EXPO_PUBLIC_API_URL` (or equivalent in `src/config/env.ts`) resolves to in the installed build, and whether an ngrok tunnel is currently up. A connection failure surfaces through `buildChatErrorContent` and may be being read as a 500.

4. **Does tapping a habit reminder for a deleted habit crash or no-op?** Device walk: create a habit with a reminder, delete it without triggering `syncAllReminders`, wait for the notification, tap it. The handler receives `{ type: 'habit-reminder', habitId }` for a nonexistent doc.

5. **Does flipping `ONBOARDING_V3` to `false` still produce a walkable V2 arc?** Device walk with the flag flipped and a fresh account. Nothing in the suite exercises the false branch, and the V2 arc's notification prompt is documented as orphaned.

6. **Does `firestore.rules` impose a group member cap or a members-array size limit?** Read `firestore.rules` for the `groups` match block. The mobile client imposes none.

7. **Are the `weeklyCycles`, `dailyLogs`, and `analyticsEvents` rules deployed to production?** Deploy state is not inferrable from the repo. A successful on-device weekly open / daily pick / event write is the proof.

8. **Does `AIConsentModal` gate the Guide, and at what point?** Trace it on device — I did not establish whether it blocks the pill, the modal, or the first send.

9. **Does the picker's "Not now" leave a user permanently prompted?** Device walk across a midnight boundary with the app foregrounded, to confirm `useTodayCard`'s `AppState` + render-sync date roll actually re-arms the prompt.

10. **Is anything still writing to `habits.category` from the web app?** Check the web tree at repo root, or inspect a handful of recent `habits` documents in the Firestore console. Two category fields with overlapping labels is a live divergence, not a historical one.

11. **What does `chatWithAI` actually receive back when the deployed backend responds?** `ai.service.ts:159` reads `response.reply`, but `/api/journal-summary` and some other handlers return `{ text }`. Confirm the deployed `/api/ai-chat` returns `reply` and not `text`; a shape mismatch would render an empty assistant message rather than an error.

---

## SURPRISES

Ordered by how badly a planner reading only the roadmap would be misled.

1. **`CheckInFlow` — the entire check-in flow — is dark, and it takes the practice-index and the two "reset" affordances with it.** The prompt asks in 2c whether any non-daily-protocol entry to a practice exists on Home. The answer is that three separate components which do exactly that (`BrainStateCheckin`, `OverwhelmSafetyCard`, `SlimResetAffordance`) all still compile, all still hold live `navigate('CheckInFlow', …)` calls, and none of them is rendered by any screen. Consequently `CheckInFlowScreen`, `PracticesIndexScreen` (route `Practices`, title "Other options"), and the richer before/after state-shift capture inside it are all unreachable in production. Only the `__DEV__` `DevCheckInFlow` harness can reach them. A planner would reasonably assume from the roadmap that the check-in engine was *retired*; it was not retired, it was orphaned, and it is a large amount of working machinery sitting one render call away from live.

2. **Main is not at the 3b-ii-b merge.** The prompt states it is. HEAD is `15ae35e` "Merge TB-3: task-to-block bridge" (2026-08-15). The daily protocol picker (`504282a`) landed 2026-08-11, and four merged slices sit on top of it: TB-1b, TB-2b, TB-2c, and TB-3. `FocusDayBlocks` and `FocusTasks` are live routes that a 3b-ii-b-era plan would not know about, and `FocusDayBlocks` now has two parents.

3. **The time question is asked, stored, and completely inert.** The daily picker collects `dailyTimeBudget` and writes it to `dailyLogs`. `useTodayCard` passes it honestly to `selectProtocol`. Because every one of the 12 cells holds exactly one variant, the returned protocol is identical for `short`, `medium`, and `long`. **24 of the 36 grid slots are unauthored** (pinned by a test), and whole columns are structurally empty — neither `stress` nor `routines` has a `long` variant at any capacity tier. A refactor plan that treats the outcome × capacity × time matrix as a working three-axis system is planning against a diagonal.

4. **`weeklyCycles.protocolId` is written by two call sites and read by nobody.** It is persisted at the weekly open and at the onboarding terminal, it is typed as a closed 12-member union in the analytics schema, `types.ts:73` explains that `ProtocolVariant.id` cannot be made unique per variant *because* this field is persisted — and there is not a single read or equality comparison against it anywhere in the tree. The constraint it imposes on the type design is real; the value it stores is currently write-only.

5. **There are two entirely separate things called "protocol," and both have a field called `protocolId`.** Engine A is the outcome × capacity matrix (`src/protocolEngine/`, ids like `focus-normal`, persisted on `weeklyCycles`). Engine B is the practice catalog (`src/constants/brainStateProtocols.ts`, ids like `cyclic-sighing-2`, persisted on `brainStateCheckIns` and `protocolSessions`, used as `PracticeRun` route params). `src/services/protocolSelector.service.ts` exports its own function literally named `selectProtocol`, with a different signature, from `src/protocolEngine/selectProtocol.ts`. The only bridge is one plain string constant. A refactor that greps for `protocolId` or `selectProtocol` will hit both and they are not the same thing.

6. **The Guide's per-conversation context is built and then thrown away.** `AIChatModal.buildCoachContext()` fires six Firestore reads on every message and returns a flat object. The backend destructures `context.page.label` / `context.page.path` / `context.userSummary.goals` / `context.userSummary.habits` — none of which exist on what the client sends. The `=== CONTEXT ===` block reaching the model is always literally `Current page: Unknown (path: /)`, `Goals: None on file`, `Habits: None on file`. The middleware's attempt to sanitize `context.page.label` is a silent no-op on a string primitive (CommonJS sloppy mode). This is invisible from either side alone.

7. **The Guide's system prompt is built on a taxonomy the product no longer uses.** It teaches five "Neuro\*" pillars, references a "readiness score" and "AMCC challenges" that do not exist in the mobile tree, and knows nothing whatsoever about the four `OutcomeKey`s, capacity tiers, the floor commitment, continuity, or the weekly cycle — i.e. nothing about the loop the app is actually built around.

8. **The weekly-loop analytics events are NOT `__DEV__`-gated and are firing in production.** I checked `useWeeklyLanding.ts`, all four `screens/weekly/*.tsx`, `useWeeklyCloseEntry.ts`, and `analyticsEvents.service.ts`. The only `__DEV__` in that path is a comment. The weekly screens are registered unconditionally and Home pushes into them. All eight declared events (`weekly_open`, `weekly_close`, `weekly_close_failed`, `floor_set`, `weekly_entry`, `weekly_close_entry`, `sign_up`, `login`) reach `analyticsEvents` on live paths. Prior project notes recording that only `sign_up`/`login` fire are out of date.

9. **`InsightsScreen` reads nothing from the weekly loop.** It is a fully-built, reachable, six-widget analytics screen constructed entirely on `habits`, `focusSessions`, `journalEntries`, `brainMetrics`, and a backend AI narrative. It does not touch `weeklyCycles`, `dailyLogs`, `floorMet`, or continuity. Meanwhile the weekly loop *is* accumulating exactly the data an Insights surface would want — three 1–5 ratings, a floor boolean, a free-text note, an adjustment choice, per-day completion — and nothing reads any of it back. Insights and the weekly loop are two products sharing a binary.

10. **"Block" does not exist. It is a mute, and it is one-directional and client-side.** There is no `blockedUsers` collection and no `blockUser` function. `mutedUsers` filters the muter's own feed. It does not stop a muted user from DMing the muter, seeing their posts, or joining their groups. Nothing in the tree documents this distinction, and a plan that lists "report and block" as shipped would be overstating the block half.

11. **Home is doing live Firestore work for output nothing renders.** `useDashboard` still computes `getNudgeSuggestion` (with its own completion queries against `brainMetrics` and others) and `getDashboardCardOrder` on every load of the app's launch surface. Neither value appears in `DashboardScreen`'s destructure. Sixteen dashboard components have zero render sites, one of which (`QuickActionCarousel`) still contains an `addDoc(collection(db,'habits'), …)` write path.

12. **The Practices tab has no path to a practice's *catalog*, and Home has no path to a practice at all.** Reaching any single practice requires Practices → Energy → category → run, or Practices → Stress Recovery → run. Stress Recovery is a deliberate zero-unique-content cross-list of Energy's Regulate + Rest. The Learn tab renders one sentence and nothing tappable. So of the four tabs, one is a launcher, one is empty, one is Community, and Home offers exactly one action.

13. **The Reminder screen writes before the terminal does.** Onboarding V3's design principle is "nothing is persisted until screen 9," stated in `OnboardingV3Context.tsx:14`. Screen 8 breaks it: it calls `updateNotificationPreferences` and `scheduleDailyRhythm` in place. A user who abandons at screen 8 has notification preferences written and possibly a daily reminder scheduled, but no `userPrivate` document, no weekly cycle, and `hasCompletedOnboarding` still false — so they restart the arc from screen 1 with a reminder already firing.

14. **The V3 arc is nine screens, not eight, and its own doc comments say eight.** `V3_ORDER` has nine entries and `V3_TOTAL_STEPS` is 9, so the step indicator correctly reads "9 of 9". But `OnboardingV3DoneScreen.tsx:2` says "Step 8 of 8", `OnboardingV3ReminderScreen.tsx:2` says "Step 7 of 8", and `OnboardingV3FirstWinScreen.tsx:1` says "Step 6 of 8". `routes.ts` also warns that `V3_ORDER` drives the step numbers but **not** the navigate chain — each screen names its successor literally, and nothing enforces the two agree, so inserting a screen would renumber correctly while being skipped entirely.

15. **`WeeklyEntryScreen` exists as a route but is never pushed — only `replace`d into, from two screens that are exiting.** Home resolves the identical rule inline through `useWeeklyLanding` because a tab cannot be `replace`d into. So the routing rule has one implementation (`resolveWeeklyEntry`) and two consumers, one of which is a screen that exists mostly to be a landing pad for `replace` calls.

16. **The `focus-video/` Storage prefix is entirely dev-only, and `VideoPlayerModal` has no production call site.** The only named production asset, `focus-video/focus_explainer_v1.mp4`, appears solely inside a doc comment. The two real fixtures are 125 MB and 242 MB test files, neither encoded with `+faststart`.

17. **`src/screens/community/MessagesScreen.tsx` is imported into `AppNavigator.tsx:87` and registered nowhere.** The `Conversations` route mounts `src/screens/ConversationsScreen.tsx` instead. The unused import survives because a comment three hundred lines later still refers to "MessagesScreen has custom header." Two files, similar names, one live.

18. **`getRecentWeeklyCycles` would fail against production if anything called it.** It needs a composite index that `firestore.indexes.json` does not contain. It is currently uncalled, and `weeklyContinuity.ts:20` documents deliberately routing around it. Any Insights work that wants ordered weekly history walks straight into this.

---

*End of inventory. Read-only pass; the only file written was this one.*
