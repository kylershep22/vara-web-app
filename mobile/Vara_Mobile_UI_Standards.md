# Vara Mobile UI Standards

**Version 2.1 | September 2026 | The visual and interaction authority for the Vara mobile app**

Supersedes v2.0 (August 2026). v2.0 superseded `Vara_Mobile_UI_Standards.md` v1.0 (February 2026) and absorbed `mobile/docs/DESIGN_SYSTEM.md`. Both retire on the commit that lands this file. There is now one design document.

**v2.1 is the design-authority reconciliation for the visual redesign** (journey roadmap row R0). It is a documentation pass: no code changed with it. Every count it cites is a measured reading of `mobile/src/` taken at `c30671c` and is labelled as baseline debt in 17, not as a target. The v2.0 to v2.1 changelog is in Appendix B.

---

## 0. How to use this document

**What this document governs.** Everything visible and everything the user touches: tokens, color, type, spacing, elevation, illustration, motion, components, screen templates, navigation, platform conventions, states, and accessibility. If a screen looks or moves a certain way, this document is why.

**What it defers to.** Positioning and pillars: `docs/1_Vara_Canonical_Positioning_Brief.md`. Information architecture, the Today surface, the capacity model: `docs/Vara_Today_IA_Restructure_Roadmap_v2.md`. Copy, including every string inside a component spec below: `docs/brand/Vara_Brand_Voice_Copy_Guidelines.md`, with `3_Vara_Voice_and_Tone_Rules_v2_2.md` for the register. Where a copy example in this document disagrees with those, they win. Product behavior: `docs/Vara_Reconciled_Product_Spec.md`. The full precedence ladder lives in `mobile/CLAUDE.md`.

**What is enforced by machine and what is not.** Section 17 lists exactly which rules fail a test or a lint. Everything else in this document is a prose standard that a reviewer checks. Treat the two categories the same way in practice; the difference is only in who catches the miss.

**If a decision is not covered here or in a spec, stop and ask Kyle.** Do not guess on visual or interaction decisions at the brand level. Ask with a concrete proposal attached.

**Naming used throughout.** "Hub" means a pillar landing screen (Focus, Energy, Practices, Learn). "Arrival" means a screen the user lands on rather than drills into (Today, hubs, onboarding welcome, completion). "Session" means a running practice, timer, or player. "The Guide" means the docked AI pill.

---

## 1. Design philosophy

### 1.1 The mandate

Vara helps people create capacity: headroom in a full life, across Focus, Energy, Time, and Community. The interface exists to give someone who arrived depleted a place where they can breathe, and a clear, inviting next step.

Every design decision answers one question: **does this create room, or does it take room?** An element that adds visual noise, manufactures urgency, or introduces a decision the user did not ask for takes room. An element that orients, invites, or lets the eye rest creates it.

> **North star.** Vara's interface should feel like a well-designed room with the window open. Warm, considered, unhurried, and clearly someone's. Calm is a register, not an absence. A screen with nothing on it is not calm; it is empty.

### 1.2 The five principles, in priority order

**1. Calm over stimulation.** Nothing in the interface spikes the nervous system. No urgency, no flashing, no bounce, no reward-loop animation, no visual competition. This is the first principle and it wins conflicts. It does **not** mean muted, flat, or gray. It means every element that has presence earned it.

**2. Clarity over cleverness.** A screen communicates its purpose within two seconds. One primary action per screen. Plain labels. Predictable navigation. If a treatment is beautiful but makes the next step less obvious, the treatment goes.

**3. Support over surveillance.** The interface never scores, ranks, or tallies the user, never frames a gap as a failure, never pushes a number at them they did not ask for. It reflects honestly when they go looking (see 14.7) and judges never.

**4. Structure without rigidity.** Clear pathways, no locks. Anything set can be adjusted. "Adjust your plan" is a first-class action, not a buried setting.

**5. Evidence over hype.** Visuals never overclaim. Progress is honest. Claims in the interface are conditional ("designed to support," "can help"). Nothing looks like a medical device or a dashboard.

### 1.3 The decision framework

Before any component, screen, or interaction is called done, answer all five:

| Question | If no |
|---|---|
| Does this reduce cognitive load? | Simplify or remove. |
| Does this feel calm and considered? | Adjust tone, color, motion, or copy. |
| Would an overwhelmed user feel safe here? | Reduce density, add breathing room. |
| Is there one clear primary action? | De-emphasize competing actions. |
| **Could this screen belong to any wellness app?** | **Give it a signature. See Section 2.** |

The fifth question is new in v2.0 and is a requirement, not a nice-to-have. The first four were being applied iteratively and converged on the safest possible screen, which is by definition the least distinctive one. Both tests must pass.

---

## 2. Visual character: the positive requirements

v1.0 was almost entirely prohibitions. Prohibitions tell a builder what to delete and never what to reach for, and applied on their own they produce a product that is technically compliant and forgettable. This section is the positive half. These are requirements. A screen that satisfies every prohibition and none of these is not finished.

### 2.1 Depth, not flatness

Vara's surfaces are layered, not flat. Three elevation tiers exist and every screen uses at least two of them:

- **Ground**: Mist White (`#FAFAF6`). The page.
- **Surface**: White (`#FFFFFF`) with `shadow-sm`, or Dew Sage wash (`#D5E3D1` at 40 to 60%) with no shadow. Cards, panels, sections.
- **Float**: White with `shadow-md` or `shadow-lg`. Sheets, the Guide pill, a hero card, a floating control.

A screen that is entirely one tier reads as flat and unfinished. Sections alternate between ground and a soft Dew Sage wash so the eye has somewhere to rest and somewhere to land. Section washes are **not** accent color and do not count against the accent ceiling in 4.2.

### 2.2 Warmth has a home on every screen

The palette has two warm tones (Sunrise Amber `#F4C542`, Golden Apricot `#F5B971`) and v1.0 taught everyone to be afraid of them. The rule is not "avoid warmth." The rule is **one warm point per screen**: a single place, chosen deliberately, where the warm tone lives. A small illustration detail, the fill of a selected chip, the sun in a watercolor header, an icon on the suggested action. One. Never two competing. Never on text. Never on a button fill.

A screen with no warm point at all is permitted only when the content itself supplies warmth (a photograph-free watercolor band already does). A screen of teal, sage, and charcoal with nothing warm on it is the "boring" failure mode and should be caught in review.

### 2.3 Type is a design element, not a delivery vehicle

Inter is the only typeface, and that is a feature: one family, used with real contrast. Display and H1 sizes exist to be used on arrival screens. The type scale has large jumps on purpose (26 to 32 to 34), and a hub or Today headline set at display size with tightened tracking (`letterSpacing.tighter`) reads as designed. A screen where every heading is 18 or 22 and every body line is 16 has thrown away its most reliable tool for hierarchy.

Concrete requirements:
- Arrival screens (Today, hubs, onboarding welcome, completion) set their headline at `display` (32) or `displayLg` (34), tracking `tighter`.
- Body text sits at 16 with 1.5 line height. Never shrink body to fit.
- Helper text is 14, not 12. Twelve-point is for tab labels and tags only.
- Numerals that matter (a timer, a duration) use the `timer` size (48) or `display`, tabular figures, and are the largest thing on their screen.

### 2.4 Illustration is part of the system

Vara has a watercolor and spot-illustration language (hero bands, `SpotIllustration`, `focusHeader.webp` and siblings). It is not decoration. It is how a screen says which room you are in.

- **Hero bands** (a watercolor header behind the screen title with a scrim, `BAND_STRONG_SCRIM`) are one of four kinds of art, not the only one. Placement is set by 2.8 and 8.2: **pushed hubs only**, never on a tab root, never on a decision screen, an input screen, a list, a sheet, or a session. v2.0 read "hub and arrival screens only" and named Today among them; 2.8 supersedes that, because Today is an immersive surface and an environmental background and a hero band never share a viewport.
- **Spot illustrations** belong in empty states, completion moments, and onboarding. Soft, nature-derived, 80 to 120px, never a literal brain.
- **Photography**: none. Vara does not use photographs in the app.
- One illustration per screen. A hero band and a spot illustration never share a viewport.

### 2.5 Motion has presence

v1.0 said "if a user wouldn't notice the motion, it's working." That produced an app where nothing moved with intent and transitions felt like page loads. Corrected: **motion should feel fluid and continuous, never lively.** The user should feel the interface respond to them, not perform for them.

- Transitions carry spatial meaning: forward slides in from the right, sheets rise from the bottom, dismissals reverse. The user always knows where they are.
- Continuity where the platform allows it: a card that opens into its detail should feel like the same object growing, not a cut.
- One orchestrated moment per screen at most, and only where it shows what changed: the completion acknowledgment settling in, the breath pacer's own rhythm. Never a fade-and-slide on every element on load.
- Press feedback is immediate (under 100ms to first visual change) and confirmatory: scale to 0.98, light haptic.

### 2.6 Rhythm, not uniformity

The anti-pattern to catch in review is the **uniform card kit**: every piece of content in an identical white rounded card, same radius, same shadow, same padding, stacked. It is the visual signature of generated UI and it is what "boring" means in practice.

Requirements:
- Radius encodes hierarchy: 8 for inputs and inline elements, 12 for standard cards and buttons, 16 for sheets and hero cards, 20 for arrival cards on Today. Not everything is 12.
- Cards vary in prominence. On any screen with more than one card, one is visibly primary (larger type, a wash or a hero treatment, more padding) and the rest are quiet.
- Not everything is a card. A section of content on the ground tier with a heading and generous whitespace is often better than a card. Use cards when the content is a discrete object the user acts on.
- Dividers are rare. Whitespace and washes separate sections; a hairline divider is for list items only.

### 2.7 The distinctiveness test

> Could this screen appear, unchanged, in any calm wellness app? If yes, it is not done.

Run it alongside the calm test, never instead of it. The way to pass both is to spend the screen's boldness in exactly one place (the headline treatment, the hero band, the warm point, the one orchestrated moment) and keep everything else disciplined. Then, before shipping, remove one thing.

### 2.8 Surface treatments (new in v2.1)

A screen's surface treatment is decided by **what the screen is for**, never by what its neighbours look like. Consistency is not a reason to give a screen a treatment its function does not want, and it is not a reason to withhold one. There are exactly three treatments.

**IMMERSIVE.** Full-viewport environmental artwork as the ground (8.1). Content scrolls over it; the artwork and the tab bar stay fixed. **All text sits on a surface-tier element or a local gradient scrim, never raw on the artwork**, with one named exception: the Today greeting. That exception is not a general licence. It is a single string whose legibility is checked as walk assertion 18(g) against the actual shipped asset at the darkest region it can sit over, and it survives only as long as that assertion passes. The artwork is the screen's one warm point (2.2); **no other warm accent fill appears on an immersive surface.** Today is the canonical and, for now, the only example.

**ATMOSPHERIC.** Mist White ground, restrained washes (the 4.2 wash rule applies in full), botanical accents (8.3). A hero band is **permitted on an atmospheric surface only when the route is a pushed hub with the tab bar hidden; never on a tab root.** Journey map, journey phase pages, and the pillar hubs.

**FOCUS.** Clean ground, no environmental art, no band. Reading, detail, forms, settings, sessions, onboarding, auth, community. Most of the app is a focus surface and that is correct: the treatments above are for arrival and wayfinding, and a screen the user came to in order to do something does not compete with itself.

**A route not in the table below has no surface type and cannot be built; adding a route adds a row here in the same slice.** This is the same contract 3.3 places on tokens and `functions/src/lib/accountDeletion.js` places on collections, and for the same reason: nothing else in the repo notices if you skip it.

**Tab roots (`FivePillarTabs`, tab bar visible)**

| Route | Screen | Surface |
|---|---|---|
| `Home` | `DashboardScreen` | **IMMERSIVE** |
| `PillarPractices` | `JourneyMapScreen` | **ATMOSPHERIC** |
| `PillarLearn` | `LearnHubScreen` | **ATMOSPHERIC** |
| `Community` | `CommunityNavigator` | **FOCUS**, retained as-is; out of redesign scope until R6+ |

**`CommunityNavigator` (nested in the Community tab, tab bar visible)**

`CommunityMain`, `Groups`, `GroupDetail`, `Challenges`, `ChallengeDetail`, `People`, `Conversations`, `Chat`, `UserProfile`, `ReportReason`, `ReportDetail`, `ReportConfirmation`: all twelve are **FOCUS**, retained as-is; out of redesign scope until R6+.

**Pushed hubs and journey surfaces (`AppStack`, tab bar hidden)**

| Route | Screen | Surface |
|---|---|---|
| `PillarFocus` | `FocusHubScreen` | **ATMOSPHERIC** (band permitted, 8.2) |
| `PillarEnergy` | `EnergyHubScreen` | **ATMOSPHERIC** (band permitted, 8.2) |
| `PillarTime` | `PlanScreen` | **ATMOSPHERIC** |
| `PillarStressRecovery` | `StressRecoveryScreen` | **ATMOSPHERIC** |
| `JourneyPhase` | `JourneyPhaseScreen` | **ATMOSPHERIC** (template 11H) |

**Every other pushed screen (`AppStack`, tab bar hidden): FOCUS**

`Insights`, `FocusTimer`, `Journal`, `Breathwork`, `BreathworkDetail`, `Sleep`, `SleepDetail`, `Movement`, `MovementDetail`, `Masterclass`, `MasterclassDetail`, `PodcastEpisode`, `HelpSupport`, `WearableIntegration`, `HabitDetail`, `NotificationOptIn`, `CheckInFlow`, `Practices`, `PracticeRun`, `FocusDayBlocks`, `FocusTasks`, `EnergyBrowse`, `FocusRhythms`, `WeeklyEntry`, `WeeklyFloor`, `WeeklyClose`, `EmailVerification`.

`Main`, `ProfileStack` and `RemoveCapture` are navigator containers and carry no surface of their own.

**`ProfileNavigator` (pushed as `ProfileStack`): FOCUS**

`ProfileMain`, `Settings`, `NotificationSettings`, `MutedAccounts`.

**`RemoveCaptureNavigator` (pushed as `RemoveCapture`): FOCUS**

`RemoveCaptureIdentify`, `RemoveCaptureClarify`, `RemoveCaptureSleep`, `RemoveCaptureTiming`, `RemoveCaptureFirstMove`, `RemoveCaptureReplacement`, `RemoveCaptureSupport`.

**`OnboardingStack` (V3, the live branch): FOCUS**

`OnboardingV3ColdOpen`, `OnboardingV3Destination`, `OnboardingV3Route`, `OnboardingV3Why`, `OnboardingV3Capacity`, `OnboardingV3Floor`, `OnboardingV3WeekStart`, `OnboardingV3FirstWin`, `OnboardingV3Reminder`, `OnboardingV3Done`.

**`AuthStack` and `PaywallStack`: FOCUS**

`Login`, `Signup`, `ForgotPassword`, `Paywall`, `RedeemCode`.

**Exempt: listed so absence is never read as an oversight**

- **Dark onboarding branches**, unreachable while `ONBOARDING_V3` is true. V2: `OnboardingProblem`, `OnboardingStateCheckIn`, `OnboardingStressor`, `OnboardingPeakWindow`, `OnboardingReflect`, `OnboardingProtocol`, `OnboardingRecheck`, `OnboardingBridge`, `OnboardingAnchor`. V1: `OnboardingWelcome`, `OnboardingCheckIn`, `OnboardingInsight`, `OnboardingActivity`, `OnboardingValues`, `OnboardingPersonalizedEntry`.
- **`BottomTabsNavigator`** (`Home`, `Rhythms`, `Community` under the retired five-tab IA), unreachable while `FOUR_PILLAR_IA` is true.
- **`__DEV__` screens**: `DevBreathPacer`, `DevAudioLoader`, `DevGuidedSessionPlayer`, `DevCheckInFlow`, `DevVideoPlayer`.

Exempt means no surface type is assigned and none is required. It does not mean the route may be redesigned without one: a dark route that is ever relit gets a row here first.

---

## 3. Design tokens

### 3.1 The rule

**No raw color, size, spacing, radius, or shadow value appears in component code.** Every value is imported from `src/constants/`. The eslint rule `no-restricted-syntax` fails the build on any hex literal. This is the mechanism that keeps a hundred contributions looking like one product.

### 3.2 Naming

Tokens are semantic: `category-role-variant`. Code exposes them as PascalCase objects with camelCase keys (`Colors.evergreenTeal`, `Spacing.base`, `Typography.fontSize.xl`). The prose name in this document and the code key are listed together in every table below.

### 3.3 Where each token lives (merged from DESIGN_SYSTEM.md)

| Token family | File | Object |
|---|---|---|
| Colors, derived alpha colors | `src/constants/colors.ts` | `Colors` |
| Font sizes, weights, presets | `src/constants/typography.ts` | `Typography`, `TextStyles` |
| Spacing scale, layout constants, radius, button heights | `src/constants/spacing.ts` | `Spacing`, `Layout` (radius is `Layout.borderRadius`, heights are `Layout.buttonHeight`) |
| Flat token mirrors and animation values | `src/constants/designTokens.ts` | `RadiusTokens` (alias of `Layout.borderRadius`), `SizeTokens`, `TypographyTokens`, `AnimationTokens` |
| Step transition duration | `src/constants/motion.ts` | `STEP_TRANSITION_DURATION_MS` (250) |
| Hero band scrim stops | `src/components/shared/ScreenHeader.tsx` | `BAND_STRONG_SCRIM` (a gradient stop-locations array; relocation to `designTokens.ts` is on the backlog) |

Two mirrors exist (`Layout.*` in spacing.ts and the flat `SizeTokens` / `TypographyTokens` in designTokens.ts). Where they disagree, `Layout` and `Typography` are canonical and the flat mirror is corrected to match; known splits are listed in 16.

When a new token is needed, it is added to the relevant file **and** to this document in the same commit. A token in code with no entry here is undocumented drift; an entry here with no token in code is a promise the build cannot keep.

---

## 4. Color system

### 4.1 The palette

| Name | Code key | Hex | Role |
|---|---|---|---|
| Evergreen Teal | `evergreenTeal` | `#1B5E57` | Primary action, H1/H2, active states, success, the brand anchor |
| Mist White | `mistWhite` | `#FAFAF6` | Ground: page backgrounds |
| White | `white` | `#FFFFFF` | Surface: cards, sheets |
| Dew Sage | `dewSage` | `#D5E3D1` | Section washes, highlight cards, soft fills |
| Silver Sage | `silverSage` | `#B8CDBA` | Borders, dividers, secondary button outline, inactive tracks |
| Sunrise Amber | `sunriseAmber` | `#F4C542` | The warm point: small highlights, selected-chip fill, illustration detail |
| Golden Apricot | `goldenApricot` | `#F5B971` | Secondary warmth: illustration, attention (non-error) |
| Soft Charcoal | `softCharcoal` | `#3E3E3E` | Body text, H3 and below |
| Muted Sage Gray | `mutedSageGray` | `#6F7F77` | Helper text, captions, inactive icons |
| Soft Coral | `softCoral` | `#D97A6E` | **Genuine errors only.** See 4.4. |

**Derived alpha tokens** (use these instead of composing your own):

| Code key | Value | Use |
|---|---|---|
| `tealLight` | `rgba(27,94,87,0.08)` | Selected-state tint, pressed fill on secondary |
| `tealMedium` | `rgba(27,94,87,0.15)` | Active badge border, focus ring |
| `dewSageLight` | `rgba(213,227,209,0.5)` | Icon containers, inactive pills, section wash |
| `divider` | `rgba(184,205,186,0.4)` | Hairline dividers |
| `mistWhiteTransparent` | Mist White at 0 alpha | Hero band scrim endpoint |

Pure black (`#000000`) is never used for text or fills. It appears only inside shadow tokens.

### 4.2 Usage rules

- **The default triad** is Mist White ground, Soft Charcoal text, Evergreen Teal for the one primary action. It covers most of any screen.
- **Washes are not accents.** Dew Sage and `dewSageLight` may cover large areas (a section background, a highlight card, a full hub band under the hero) and do not count toward the accent ceiling. Use them to create the layering in 2.1.
- **Warm accents (Amber, Apricot) stay at or under 10 to 15% of the visual field** and follow the one-warm-point rule in 2.2. They never fill a button, never color text, never sit adjacent to each other.
- **4.2 defines "accent" for every document that uses the term.** `docs/Vara_Dashboard_Spec.md` and `docs/Vara_FourPillar_IA_Spec.md` both state the 10 to 15% figure without the wash exemption above; they inherit the definition from here rather than setting a second one, and neither is amended. A full-viewport environmental background in the mist and sage families is a wash under this rule, not an accent. Warm pigment inside artwork is an accent and counts (8.1).
- **Teal is the anchor, not wallpaper.** Teal fills: the primary button, the active tab, selected chips, the Guide pill, progress fills. Teal does not fill cards or large areas; a full-teal card reads as an alert.
- When a screen feels heavy, remove color and add whitespace before adjusting a hue.
- **Dark mode is not supported at v1.** Ship light only. Do not add dark-mode branches speculatively; they rot.

### 4.3 Semantic mapping

| Role | Token |
|---|---|
| Primary action | `evergreenTeal` |
| Success, completion | `evergreenTeal` (never bright green) |
| Attention, non-error notice | `sunriseAmber` icon on a Dew Sage wash |
| Error, failed state | `softCoral` border or icon, supportive copy |
| Disabled | Primary color at 40% opacity |
| Selected | `evergreenTeal` fill with white content, or `tealLight` tint |
| Focus ring (keyboard/switch control) | `tealMedium`, 2px |

### 4.4 Soft Coral: the two rules

1. **Coral means "something went wrong."** Validation errors, failed network writes, a session that could not save. It is never decorative, never a "warning," never a highlight.
2. **Coral is barred from routine destructive controls.** Removing a block, deleting a task, clearing a reflection, leaving a group: these are ordinary actions the user chose, not errors. Their controls use a Soft Charcoal or Muted Sage Gray text button labeled "Remove" and a confirmation sheet whose primary action is teal. Red-coded destruction is an urgency pattern and it is banned. This is enforced for the blocks feature by `blocksBrandGuard.test.ts` and is the standard everywhere.

### 4.5 Hero band scrim

Hero bands place a title over a watercolor image. Legibility comes from `BAND_STRONG_SCRIM`, a vertical gradient of Mist White with stop positions `[0, 0.05, 0.82, 1]` (transparent at the top, opaque at the bottom, with the steep section near the base where the title sits). Title text over a band is always Soft Charcoal or Evergreen Teal on the opaque part of the scrim and must pass 4.5:1 against the scrim, not against the image.

---

## 5. Typography

### 5.1 Typeface and implementation

**Inter**, all weights from Regular (400) to SemiBold (600). Bold (700) exists in the token set for rare emphasis and is almost never the right choice. System sans-serif is the fallback. No second typeface.

**Implementation (new in v2.1).** All user-facing text renders through a **shared text primitive**. The primitive does two things a bare React Native `Text` cannot:

1. **It resolves weight to a registered family.** React Native does not synthesise a weight from a named custom family: `fontFamily` selects the face, and `fontWeight` alone selects nothing from Inter. The primitive maps each weight to its registered family (`Inter_18pt-Regular` 400, `Inter_18pt-Medium` 500, `Inter_18pt-SemiBold` 600, `Inter_18pt-Bold` 700), which are the four faces loaded by `useFonts` in `App.tsx`.
2. **It applies `maxFontSizeMultiplier` from a single `MAX_FONT_SCALE` token.** 5.3 requires the ceiling on every `Text`; a per-file constant cannot deliver that and cannot be changed in one place when the ceiling is raised post-launch.

**Once the primitive exists, `fontWeight` on a bare `Text` is a defect**, because it silently renders the system font at the requested weight and looks close enough to pass review. The migration clause is in 17.

**State of the code, measured at Step 0 and recorded so it is not rediscovered as a surprise: as of v2.1 Inter is loaded and rendered nowhere.** `useFonts` registers all four faces at boot and no style in `mobile/src/` sets `fontFamily` to any of them. `Typography.fontFamily` has zero consumers, the eight `fontFamily` assignments in the tree are all `'monospace'` in developer surfaces, and the React Native Paper theme overrides size and weight without a family too. **The app therefore ships in the system font**, and has since the tokens were written. Every type decision in 5.2 has been evaluated against the wrong faces.

**One consequence to carry into the primitive's first slice:** Inter's metrics are not the system font's, so **literal `lineHeight` values must be re-verified for clipping when Inter first renders.** 149 of them ship today (17). The B-3d clipping bug documented at `src/constants/typography.ts:75` is the failure mode, and a font swap is exactly the change that reopens it.

### 5.2 Scale

| Role | Code key | Size | Weight | Tracking (`letterSpacing` key) | Color | Use |
|---|---|---|---|---|---|---|
| Display large | `displayLg` | 34 | 600 | `tighter` (-0.5) | Teal or Charcoal | Today greeting, hub titles over a band |
| Display | `display` / `3xl` | 32 | 600 | `tighter` (-0.5) | Teal | Arrival headlines, onboarding welcome |
| Heading 1 | `h1` / `2xl` | 26 | 600 | `tight` (-0.25) | Teal | Screen titles |
| Heading 2 | `h2` / `xl` | 22 | 600 | `tight` (-0.25) | Teal | Section titles |
| Heading 3 | `h3` / `lg` | 18 | 500 | `normal` (0) | Charcoal | Card titles, subsections |
| Body | `body` / `base` | 16 | 400 | `normal` (0) | Charcoal | Default text |
| Body small | `bodySmall` / `sm` | 14 | 400 | `normal` (0) | Charcoal or Muted Sage Gray | Helper text, secondary lines |
| Caption | `caption` / `xs` | 12 | 500 | `wide` (+0.5) | Muted Sage Gray | Tab labels, tags, timestamps |
| Button | `button` | 16 | 500 | `normal` (0) | Inherits | Button labels |
| Timer | `timer` | 48 | 500 | `TypographyTokens.letterSpacingTimer` (-0.02 em, multiplied by the font size at the call site), tabular | Teal | Session timers and durations only |

Tracking values are React Native `letterSpacing`, which is absolute points. The keys are `Typography.letterSpacing.tighter` (-0.5), `tight` (-0.25), `normal` (0), `wide` (0.5), assigned directly. One exception exists: `TypographyTokens.letterSpacingTimer` is an em value (-0.02) and must be multiplied by the font size at the call site, as `PomodoroTab` and `ActiveRoutinePlayer` do. Assigning it directly yields -0.02pt, which looks like no tracking rather than a bug. Never add a second em-denominated token; new tracking goes on the points scale.

Line height: `normal` (1.5) for body sizes, `heading` (1.3) for headings, `display` (1.1) for display and timer sizes. Line heights are expressed as multipliers in code (`Typography.lineHeight.*`, applied with `lineHeightFor(size, multiplier)`), never as fixed pixel values, so they scale with the font. See 5.3.

### 5.3 Dynamic Type (new in v2.0, required)

Vara's audience includes people who run large text deliberately. The app must support it, and v1.0's fixed-pixel model is why it currently does not.

**Launch standard:**
- Text scales with the system setting. `allowFontScaling` is never set to `false` on a `Text` component.
- Every `Text` carries `maxFontSizeMultiplier={1.3}` via the shared text component or a default, so layouts have a known ceiling to design against. This is a launch-time constraint, not the end state.
- Line heights are multipliers, not pixels (see 5.2), so they grow with the text.
- Layouts tolerate the 1.3 ceiling without clipping or overlap: no fixed-height text containers, `numberOfLines` only where truncation is a deliberate design choice, buttons grow vertically rather than truncating labels.
- Every screen is checked once at the Accessibility "xxxLarge" setting before it ships.

**Post-launch standard:** raise the ceiling toward full Dynamic Type support, surface by surface, starting with Today and the session player.

### 5.4 Rules

- Never ALL CAPS for body, headings, or buttons. Tab labels and tags at 12pt are the only exception, and even there sentence case is preferred.
- Maximum line length 65 to 75 characters. On a 390pt-wide screen at 16pt with 16pt margins, that is naturally satisfied; do not reduce margins to fit more.
- Italics are reserved for a single emphasized phrase in body text or the disclaimer line. Never for headings.
- Do not accent one word of a headline in a different color or weight. It is the commonest tell of generated UI. The headline is one voice.
- **Small labels above headings are banned.** "FOCUS" over "Your focus session" is the shape. If a category needs naming, the heading names it.

  **One exception, and it is narrow (new in v2.1).** A label above a heading is permitted when it carries **state or context**: where the user is, or where the content below came from. It must be **sentence case, no `textTransform`, no letter-spacing, at or under 12pt.** It **never** carries a category name, a section name, or a phase name.

  The two instances shipping today are the pattern to copy: `JOURNEY_LINE_LABEL` ("Where you are") above the Today journey line, and `PHASE_STATE_LABELS` ("Complete" / "Where you are" / "Ahead" / "Skipped") above a phase-page title. A word for the user's **position** is not a name for a **category**. Both predate v2.1 and were in undocumented violation of this rule as v2.0 wrote it; the exception is what makes them legal, and writing it down is a fix this version performs rather than a tolerance it grants.

  **The branch not taken, recorded so it reads as a decision and not an omission:** putting the four phase **descriptors** (Create space / Restore capacity / Build new patterns / Focus on what matters) in this slot was considered and rejected. The prohibition is recorded in three places (journey roadmap row 7j, Content Pack v1 `§phase-descriptors` point 2, and this rule), the copy owner is in the decision because both string sets are hers, and revisiting it costs three dated amendments landing together.

  **Uppercase or tracked-out labels above headings remain violations regardless of what they say.** 24 ship today across 20 files, three of them at 14pt, which breaks even 5.4's tab-label-and-tag exception. They are baseline debt under 17, not precedent.
- Text should feel inviting. If a heading feels like a demand, reduce its weight before its size.

---

## 6. Spacing, layout, radius, elevation

### 6.1 Spacing scale (4px base)

Every spacing value is a multiple of 4. No arbitrary values.

| Code key | Value | Use |
|---|---|---|
| `2xs` | 2 | Inline icon-to-text gap (rare) |
| `xs` | 4 | Tight internal padding, tag padding |
| `sm` | 8 | Between related elements, icon margins |
| `md` | 12 | Compact card padding, list-item gaps |
| `base` | 16 | Default padding, margins between siblings, screen horizontal padding |
| `lg` | 24 | Card content padding, section internal padding |
| `xl` | 32 | Between major sections |
| `2xl` | 48 | Safe zones, major section breaks |
| `3xl` | 64 | Hero breathing room, onboarding |

### 6.2 Layout constants

| Code key | Value |
|---|---|
| `screenPaddingHorizontal` | 16 |
| `screenPaddingVertical` | 24 |
| `cardPadding` | 24 (16 for compact cards) |
| `cardMargin` | 16 |
| `inputHeight` | 48 |
| `headerHeight` | 56 |
| `tabBarHeight` | 56 (excluding safe area; native tab bars manage their own) |

Screen rules: 16 horizontal padding on both sides, always. Vertical scroll only; horizontal scrolling is reserved for a deliberate carousel with visible affordance. 32 between major sections, 16 within. Respect safe-area insets everywhere. A scrollable region that ends above a tab bar or sticky CTA carries 48 bottom padding so the last item is never trapped.

### 6.3 Corner radius (encodes hierarchy)

Code: `Layout.borderRadius.*` (mirrored as `RadiusTokens`).

| Code key | Value | Use |
|---|---|---|
| `sm` | 4 | Tags, chips, inline badges |
| `md` | 8 | Inputs, secondary inline elements |
| `lg` | 12 | Standard cards, buttons, modals |
| `xl` | 16 | Sheets, hero cards, large cards |
| `2xl` | 20 | Today arrival cards, the capacity invitation, the immersive surface card (10.2) |
| `pill` | 9999 | Circular elements, the Guide pill, filter pills |

Per 2.6, a screen where every element shares one radius has lost a hierarchy tool. Inputs are 8, cards 12, the one primary card 16 or 20.

**Two corrections to v2.0, both verified by reading `src/constants/spacing.ts` (new in v2.1).** v2.0 stated that `Layout.community.buttonRadius` was off-scale and that the `Layout.community` block was dead. **Both are wrong.** `buttonRadius` is 20, which equals `2xl` and is on the scale; and the block is **live**, holding six values (`postCardRadius` 12, `buttonRadius` 20, `postAuthorAvatarSize` 40, `commentAvatarSize` 32, `postContentPadding` 16, `actionButtonHeight` 48). Nothing is deleted on the strength of the retracted claim. Whether community-specific layout values should live in their own block at all is a question for R6+, when the community surfaces are redesigned, and it is a structural question rather than a scale violation.

**Off-scale radii are baseline debt, not licence.** 164 literal radius values ship off the scale above (17). Two different faults hide in that number and they get different fixes: values chosen by eye (10, 14, 18, 6) move onto the scale, and circles written as a large raw number (40, 60, 80, 100, 999) become `pill`.

### 6.4 Elevation (shadow tokens)

Code: the shadow tokens in `designTokens.ts`.

| Code key | Value | Tier | Use |
|---|---|---|---|
| `none` | none | Ground | Default |
| `sm` | `0 1px 3px rgba(0,0,0,0.04)` | Surface | Cards on Mist White |
| `md` | `0 2px 8px rgba(0,0,0,0.06)` | Float | Elevated cards, the Guide pill, a hero card |
| `lg` | `0 4px 16px rgba(0,0,0,0.08)` | Float | Sheets, modals |

Shadows are structural: they say which tier a thing is on. Never on text, icons, or the logo. A card on a Dew Sage wash uses no shadow; the wash already separates it.

---

## 7. Iconography

**Library: Material Community Icons** (`MaterialCommunityIcons` from `@expo/vector-icons`). **Outline variants by default; filled variants for active and selected states only.**

**The reason is inventory, not design, and saying so is the point.** MCI is in 178 files; Lucide is in 11 and Ionicons in 17. The house set is the one the app is actually built in, and a 178-file migration to satisfy a document would be the document choosing work for the product. v2.0 named Lucide and the app was never in it.

**The 1.5px-stroke character rule is retired with Lucide.** It described Lucide's drawing and does not describe MCI, so keeping it would have set a standard no icon in the app meets. Custom icons remain a last resort, drawn to match **MCI's** weight and corner treatment, minimal detail, legible at 16.

**Lucide (11 files) and Ionicons (17 files) are legacy.** Permitted only in files on an allowlist that **shrinks as screens are redesigned**, never grows. R1 adds the lint that holds the allowlist; until then it is a review item. Lucide's 11 files are the onboarding surface plus `TodayHeroCard`, `OnboardingScaffold` and `SelectionRow`, which means the onboarding redesign is where most of it retires.

**Brand marks stay SVG.** The wordmark and lotus are artwork, not icons, and never come from an icon set.

| Context | Size | Color |
| Context | Size | Color |
|---|---|---|
| Tab bar | 24 | Active: filled variant, Teal. Inactive: outline variant, Muted Sage Gray |
| Inline with text, list items | 20 | Muted Sage Gray, or Charcoal when it carries meaning |
| Card accent | 24 to 32 | Teal, or the screen's one warm point |
| Feature (onboarding, hubs) | 48 | Teal or Sage, often inside a `dewSageLight` circle |
| Inside buttons | 20 | Inherits button text color |

Rules: filled variants for active or selected states only, never as the default. Nature-derived metaphors (leaf, wave, sunrise, hill, flow) are encouraged; literal brain iconography is banned. Never a red icon. Attention states use Amber on a wash; error states use Coral.

---

## 8. Art on a screen

Four kinds of art, each with one place it may appear. **Where each may appear is set by the surface treatment in 2.8, not by taste.** The v2.0 structure assumed the hero band was the only art a screen could carry; that is no longer true, and the numbering below changed with it. **A reader chasing a pre-v2.1 citation of "8.1 hero bands" wants 8.2.**

The rule that binds all four: **one kind of art per viewport.** An environmental background and a hero band never appear together, a hero band and a spot illustration never appear together, and a botanical accent never sits behind text.

### 8.1 Environmental backgrounds (new in v2.1)

Full-viewport artwork used as the ground of an **immersive surface only** (2.8). Content scrolls over it; the artwork and the tab bar stay fixed.

**Asset spec:**

| Property | Value |
|---|---|
| Composition aspect | 0.461 (the tallest supported viewport) |
| Pixel dimensions | 1290 x 2796 (430 x 932 pt at @3x) |
| Format | WebP, lossy |
| Alpha | None. The artwork is a ground, never a layer |
| Baked content | None. No text, no icons, no UI, no simulated cards |

**The safe corridor.** The asset is cover-fit, so on the shortest supported viewport (iPhone SE 3rd generation, 375 x 667 pt) it is cropped. **Signature content and the low-detail greeting zone must survive an 18% height crop**, which means **nothing load-bearing sits in the top or bottom 9%** of the composition. Design the middle 82% as the guaranteed frame and treat the rest as bleed.

**Warm pigment inside the artwork counts against the 4.2 accent ceiling** and carries the one-warm-point rule in 2.2 with it. The wash content does not: 4.2 already puts washes outside the ceiling, and a mist-and-sage background is a wash however much of the screen it covers. **Immersive is not an exception to 4.2** and is not written as one.

**The current asset does not meet this spec.** `mobile/assets/images/todayBackground.webp` is 941 x 1672 at aspect 0.563, which crops 18% of its width on the tallest device rather than its height, and is under half the required pixel height. **It is replaced in R1**, and measuring the replacement's warm fraction is an R1 item.

### 8.2 Watercolor hero bands

The hero band is a soft watercolor image (`focusHeader.webp`, `energyHeader.webp`, `homeHeader.webp` and successors) behind the screen title, faded into the page by `BAND_STRONG_SCRIM`.

- **Placement: pushed hubs only** (2.8). The tab bar is hidden on those routes. **Never on a tab root**, never on a decision screen, an input or form, a list or browse screen, a sheet, a settings screen, or a running session.
- **Never in the same viewport as an environmental background.** This is the failure mode an immersive Today creates by construction if `ScreenHeader` is not removed from it, and walk assertion 18(b) exists to catch it.
- The band occupies the top of the viewport and never more than 30% of it. Content begins on the opaque part of the scrim.
- One band per screen. Bands do not repeat as section headers.
- Each pillar has its own band. The band is how the room announces itself; it does not change within a pillar.
- Reduce Transparency: bands are images, not glass, and render identically. Reduce Motion: bands never parallax or animate.
- Scrim rule unchanged: 4.5.

### 8.3 Atmospheric accents (new in v2.1)

Botanical marks on an **atmospheric surface**: a leaf edge, a stem, a soft wash shape at a margin. They are what gives an atmospheric screen its character when it has no band.

**Restraint is the whole specification:**

- **Decorative only.** An accent never carries meaning, never marks state, and never becomes an affordance.
- **Never behind text.** If text would cross it, the accent moves or goes. There is no scrim for a botanical accent, because an accent that needs one is a background (8.1) and belongs to a different surface type.
- **Never a second warm point.** An atmospheric screen has one warm point (2.2) and an accent is either it or is not warm.
- **At a margin, not at the centre.** An accent frames; it does not occupy.
- One per viewport, at most.

### 8.4 Spot illustrations

`SpotIllustration` and future siblings: soft, nature-derived, 80 to 120px, centered. Used in empty states (14.2), completion moments, and onboarding. Never alongside a hero band or an environmental background in the same viewport. Never a brain, a head, a diagram, or a person's face.

**`SpotIllustration` has zero consumers today.** It is built, exported and mounted nowhere. That is a gap in the empty states it was written for, not a reason to retire it; the rules above are unchanged and it is the component to reach for when an empty state is next designed.

### 8.5 Photography and video

No photography in the app. Video appears only inside a player (movement demos, the Guide intro) and never autoplays, never gates a page, and always has a static poster frame.

### 8.6 The app icon and logo

The block logo (teal wordmark and gold lotus on Dew Sage) is used only where iOS uses app icons and on the auth and onboarding welcome screens. It does not appear in headers, on cards, or as a watermark. It never carries a shadow.

---

## 9. Motion and interaction

### 9.1 Philosophy (revised)

Motion in Vara does three jobs: it **orients** (where did I go), it **confirms** (that worked), and it **connects** (this is the same thing, bigger). It should feel fluid and continuous. The user senses the interface responding to them. Motion never performs, never celebrates, never loops for attention, and never happens without a reason the user supplied.

### 9.2 Timing and easing

| Type | Duration | Easing |
|---|---|---|
| Press feedback (scale, tint) | 100 to 150ms | ease-out |
| Chip or toggle state change | 150 to 200ms | ease-out |
| Screen push / pop | 250 to 300ms | ease-out |
| Sheet rise / dismiss | 300 to 350ms | ease-out |
| Modal fade and scale | 250ms | ease-in-out |
| Card-to-detail continuity | 300 to 350ms | ease-in-out |
| Content fade-in after load | 200ms | ease-in |
| Progress fill | 400ms | ease-in-out |
| Completion acknowledgment settle | 400 to 500ms | ease-out |

Forward motion is ease-out. State changes are ease-in-out. Nothing is ease-in except a content fade. Nothing is under 100ms (it reads as a cut) and nothing non-continuous is over 500ms (it reads as waiting).

### 9.3 Prohibited

- Bounce, spring, elastic, overshoot. Any physics that "settles."
- Shake for errors. Errors change color and speak; they do not tremble.
- Confetti, fireworks, particles, sparkles, celebration overlays. `ConfettiOverlay` was deleted in August 2026 and stays deleted.
- Looping or idle animation on any surface except the breath pacer during a session.
- Parallax on scroll.
- Staggered fade-and-slide entrance on every element at load. One orchestrated moment per screen at most.
- Motion as the sole carrier of information. Every animated state has a static equivalent.

### 9.4 Reduce Motion

`useReducedMotion` (`src/hooks/useReducedMotion.ts`) gates every animation. When enabled: transitions become instant or a plain 150ms cross-fade, the breath pacer shows a text cue and a static shape change per phase, progress fills jump, and the completion acknowledgment appears without motion. Every animated component imports the hook; a component that animates without it is a defect.

**Walk assertion 18(e) covers every animation on a touched surface, not only animations the slice added.** A slice that restyles a screen inherits whatever already moves on it, including motion it did not write and would not have written. 26 animated files ship without the hook today (17), so on most surfaces the inherited case is the likely one.

### 9.5 Haptics

`expo-haptics`. Gentle and confirmatory. Never heavy or rigid impact styles.

| Action | Haptic |
|---|---|
| Button tap, chip select, toggle | Light impact |
| Tab change | Light impact (iOS) |
| Completion (practice done, reflection saved) | Success notification |
| Validation issue | Warning notification (never Error) |
| Pull to refresh | Selection changed |
| During a session, on scroll, on every keystroke | None |

### 9.6 Gestures

- Edge-swipe back always works on pushed screens.
- Sheets dismiss by swipe down, by tapping the overlay, and by an explicit close.
- **Destructive actions are tap-only.** No swipe-to-delete, no long-press-to-remove. A destructive path is a visible control that opens a confirmation. This keeps destruction deliberate and discoverable and avoids gesture conflicts with system edge swipes.
- No custom gestures that shadow system ones (home indicator swipe, control center, notification pull).

---

## 10. Component library

Every reusable element, with its spec, states, and rules. Copy shown in examples follows the Brand Voice Copy Guidelines; if they disagree, the guidelines win.

### 10.1 Buttons

**Primary**

| Property | Spec |
|---|---|
| Fill | Evergreen Teal |
| Text | White, 16, Medium |
| Height | 48 (`Layout.buttonHeight.md`); 56 (`Layout.buttonHeight.lg`) for the single arrival CTA on Today or onboarding |
| Horizontal padding | 24 |
| Radius | 12 |
| Shadow | none at rest; `sm` while pressed |
| Pressed | Darken 10%, scale 0.98, light haptic |
| Disabled | 40% opacity, no touch response; tapping shows a one-line reason |
| Loading | Label replaced by a gentle pulse; width fixed so nothing shifts |

**One primary button per screen.** If two actions are needed, one is secondary. On scrolling screens the primary button is sticky at the bottom, 16 above the safe area, in the thumb zone.

**Secondary**: transparent fill, 1.5px Teal border, Teal text, otherwise as primary. Pressed: `tealLight` fill.

**Tertiary / text**: no fill, Teal text, 40 tall with hit slop to 48. For skip, cancel, "Maybe later," and adjust actions. Destructive tertiary buttons use Soft Charcoal text, not Coral (see 4.4).

Labels follow the CTA library: "Set a focus," "Begin at your own pace," "Save," "Skip for now," "Adjust your plan," "Remove." Never "Start now," "Submit," "Delete forever," or anything with a trailing arrow character.

### 10.2 Cards

**Standard card**: White, radius 12, padding 24 (16 compact), `shadow-sm`, 16 between cards. Content: a title (H3), two to three lines, at most one action. If a card has a button, the card body is not also tappable. Tappable cards press to 0.98 in 150ms.

**Primary / hero card**: the one card on a screen that leads. Radius 16 or 20, padding 24, either a Dew Sage wash (no shadow) or White with `shadow-md`. May carry the screen's warm point. Title at H2 or display. There is exactly one of these per screen, or none.

**Highlight card** (education, insight, a noticing): `dewSageLight` fill, no shadow, radius 12, optional 4px Teal left accent, padding 24. For the "why this works" line, a brain-health backbone note, or the one noticing on a surface (14.7).

**Quiet card**: for lists and secondary content. White or ground-tier with a hairline, radius 12, padding 16, no shadow. Most cards on a busy screen are quiet cards.

**Immersive surface card (new in v2.1)**: the surface-tier card used on an immersive ground (2.8). It is what makes text legible over artwork, so its specification is a contrast requirement before it is a style.

| Property | Spec |
|---|---|
| Radius | 20 (`2xl`) |
| Padding | 24 |
| Fill | White at a token opacity, set in R3 against the regenerated asset |
| Shadow | `sm`. The card separates from artwork by luminance, not by depth |
| Warm accent fill | **None.** The artwork is the screen's warm point (2.2) |

**The opacity token is not a taste decision and is not set here.** R3 sets it against the shipped asset, and it must satisfy all three of the following, **measured as composite luminance at the darkest region the card can scroll over**, not against a flat swatch and not against a token:

| Text on the card | Required ratio | Composite luminance floor |
|---|---|---|
| Soft Charcoal body | 4.5:1 | **>= 0.392** |
| Evergreen Teal at body size | 4.5:1 | **>= 0.576** |
| Evergreen Teal at 18pt Medium or larger | 3:1 | **>= 0.368** |

Whichever text the card actually carries sets the floor that applies; a card carrying Teal body text takes 0.576 and there is no averaging across rows. **The capacity-tier chip on Today uses the teal-selected treatment** (10.4), not an Amber fill, because the artwork has already spent the screen's warm point.

Do not cram. If a card needs more than a title, a short body, and one action, split it or promote it to a detail screen.

### 10.3 Inputs

| Property | Spec |
|---|---|
| Fill | White |
| Border | 1.5px Silver Sage; Teal on focus; Coral on error |
| Radius | 8 |
| Height | 48 single-line; auto for multi-line |
| Padding | 12 horizontal, 14 vertical |
| Label | 14, Medium, Muted Sage Gray, above the field. Floating label or placeholder, never both |
| Placeholder | Muted Sage Gray, instructive ("What's on your mind?") |
| Error | Coral border, one line of Coral helper text below, supportive and specific |

No asterisks for required fields; required is the default and optional fields say "(optional)". Keyboard handling follows `mobile/KEYBOARD_HANDLING_GUIDE.md`: the focused field is always visible above the keyboard and the primary button is reachable.

### 10.4 Selection controls

**Toggle**: 48 by 28, Silver Sage track off, Teal track on, white thumb with `shadow-sm`, 200ms slide. Use the system switch where it fits; it carries accessibility for free.

**Checkbox**: 22, radius 8, 1.5px Silver Sage unchecked; Teal fill with white check when checked. `accessibilityRole="checkbox"` with `accessibilityState`.

**Radio**: 22 outer, 10 inner dot, Teal when selected.

**Chips / tags**: `dewSageLight` fill and Charcoal text by default; Teal fill and White text when selected; radius 4 for tags, `pill` for filter chips; 12pt Medium; 8 between. A selected chip may use Amber fill as the screen's warm point, but only for a single-select group where one selection is the whole point (the capacity tier, for example).

**Segmented control**: for two to four mutually exclusive views. Ground-tier track, Teal-tinted selected segment, 150ms slide.

### 10.5 Sheets and modals

Vara prefers **bottom sheets** for choices and responsive flows, **centered modals** only for creating a discrete object, and **inline** for everything else. Modals interrupt; use them last. Full spec in `Vara_Modal_Design_System_v1.1.md`; the essentials:

**Bottom sheet**: White, top radius 16, 40 by 4 Silver Sage handle 12 from the top, padding 24 horizontal and top, 32 bottom, `shadow-lg`, overlay black at 30%, rises in 300 to 350ms, dismisses by swipe, overlay tap, or close. Sheets that contain choices also close when a choice is made.

**Centered modal**: White, radius 16, max 85% width, padding 24, overlay black at 40%, fade plus scale from 0.95 in 250ms. One primary, one secondary; a tertiary dismiss is optional. Title is warm and active ("Add a new habit," not "New Habit"). Creation flows carry a reassurance line ("You can always adjust this later").

**Confirmation for a destructive action**: a bottom sheet, one sentence stating what will be removed, primary Teal "Remove," tertiary "Keep." Never a red button.

### 10.6 List items

56 to 72 tall by density, 16 horizontal padding, hairline `divider` inset 16 from the left, `dewSageLight` at 20% on press. Leading icon 20 to 24 or avatar 36 with a 12 gap; trailing chevron, toggle, or metadata. Primary text 16 Regular Charcoal; secondary 14 Muted Sage Gray. Lists over roughly eight items get a section structure or a filter, not a longer scroll.

### 10.7 Progress and wayfinding (revised)

Vara shows **where you are** and **that something is happening**. It never shows **how much of you is done**.

**Permitted:**
- **Wayfinding in a finite flow** (onboarding, a multi-step setup): a row of dots or segments indicating position. No numerals, no "3 of 6," no percentage. The user sees they are near the end; they are not handed a fraction.
- **Session progress** (a breath cycle, a timer): a circular or linear Teal fill with a rounded cap, 400ms fill, no percentage label. The center of a radial shows the remaining time or a phase word, never a percent.
- **Loading**: skeletons (11.1) or the spinner.

**Banned everywhere:**
- Percentages, fractions, "X of Y," "X% complete," step counts as text.
- Progress bars against a behavioral target (habits, practices, streaks, consistency).
- Any indicator that implies a total to reach.

**Exempt: accessibility labels that convey position in a finite flow.** An `accessibilityLabel` of "Step 2 of 6" on a wayfinding dot row is permitted and expected. **The ban is on visible progress, not on wayfinding for screen-reader users.** A sighted user reads position from the dots; removing the label removes the information rather than the pressure, which is the opposite of what 10.7 is for. The exemption covers position in a flow and media position only. It does not extend to a percentage, a behavioral count, or a score in any label.

Progress copy never frames deficit ("only 30% done") and never frames completion as a sum. The indicator is visual and unlabeled, or absent.

**13 numeric-progress sites ship today** (17), the reachable ones on Insights, the Masterclass card, the routine player, Profile and the challenges service.

### 10.8 The Guide pill (new)

The Guide is Vara's AI entry point and its **single persistent help affordance**. There is no second help icon anywhere.

| Property | Spec |
|---|---|
| Form | Pill, `pill` radius, 36 to 40 tall, Teal fill, White icon (sparkle-free: a soft leaf or wave mark) and optional short label |
| Position | Docked top-right on hub screens and Today, inside the safe area, 16 from the right edge |
| Elevation | `shadow-md` (float tier) |
| Visibility | By route, see below. **Hidden during any session, on sheets, in onboarding, on auth, and on settings sub-screens.** |
| Behavior | Opens the Guide as a bottom sheet. Never a full-screen takeover. |
| Motion | Fades with the screen; never bounces, pulses, or badges for attention |

The pill replaced the floating action button in July 2026. No FAB pattern remains and none is reintroduced.

**Coverage is stated by route, not by "the four hubs" (new in v2.1).** "The four hubs" was ambiguous the moment the tab set and the hub set stopped being the same list, and it is the reason the gap below went unnoticed.

| Route | Guide pill |
|---|---|
| `Home` | Present |
| `PillarPractices` | Present |
| `PillarLearn` | Present |
| `PillarFocus`, `PillarEnergy`, `PillarTime` (pushed hubs) | Present |
| Any session (template G), any sheet, onboarding, auth, settings sub-screens | Hidden |

**The Step-0 gap, recorded as baseline debt and not as a rule.** The pill is **absent on `PillarPractices` and `PillarLearn`**, which the table above requires, and **present on `CommunityMain`**, which the table does not list. Both predate v2.1. The absences are debt under 17 and close when those surfaces are redesigned.

**Community's pill is an open question, not a rule either way.** It was added deliberately and it is not obviously wrong; whether a social surface wants an AI affordance is a product decision that belongs to the R6+ community pass. **It is neither blessed nor removed here**, and this paragraph exists so that a later reader finds a recorded question rather than an inconsistency to tidy away.

### 10.9 The consistency grid (accountability, not surveillance)

Where a surface shows the user their own recent actions (a week of practices, days a routine ran), it follows Voice and Tone v2.2 section 3.4:

- Completed days: Teal dot or fill. Empty days: a pale neutral (`dewSageLight`) mark, **never red, coral, or amber, never an X, never a broken-chain glyph.**
- Today is the only interactive cell.
- No count above or below the grid. If the user goes looking for a number it may appear in a detail view as a plain descriptive phrase ("Four practices this week"), never on Today and never as a total to hold.
- A gap's tooltip or label says "Not yet" or nothing. Never "Missed."
- Nothing resets. There is no chain to break.

The test: does an honest gap read as information or as failure? Information ships. Failure is redesigned.

### 10.10 Acknowledgment components

Vara acknowledges effort in words, proportionately, and never accumulates.

- **QuietFinish**: an inline overlay with one calm line ("Done. That's the reset."), auto-dismisses in 2.5s, no confetti, no sound, success haptic. Used after a practice, a reflection, a routine.
- **AnimatedCheckbox**: subtle scale on check with a one-word acknowledgment ("Done." "Noted." "Captured.").
- **Completion acknowledgment card** on Today: acknowledges the practice that just happened. It does not echo the state the user reported before the practice; that is named at input and then disappears.

Retired and not to be rebuilt: milestone modals keyed to day counts (`StreakMilestoneModal` / `MomentOfRecognition`, deleted August 2026), streak counters, anything that says "that's your fifth" or announces a reward ahead of time. Acknowledgment scales to the effort just made, never to the sum of efforts.

### 10.11 Toasts

`NotificationToast`: rises from the bottom above the tab bar, White with `shadow-md`, radius 12, one line, auto-dismisses in 3s, swipe to dismiss. Used for confirmations that do not deserve a screen change ("Saved.") and for a recoverable error with a retry link. Never stacks more than one.

---

## 11. Screen templates

Every new screen starts from one of these eight skeletons. Templates define structure; components fill it. Each template names its signature (where the screen spends its one moment of boldness) and its prohibitions. **Every template also has a surface treatment (2.8); where the two could disagree, 2.8 wins, because it is keyed to the route.**

### A. Single-focus action
For: setting a focus, a check-in step, any one-task screen.
Top: close or back, left. Header: title (H1) centered, optional 14pt subtitle. Content: one block (an input, a chip group, a prompt). Bottom: sticky primary button, full width, 16 above the safe area.
Signature: generous vertical whitespace around the one block. Prohibited: hero bands, secondary cards, anything competing.

### B. List / browse
For: browsing practices, routines, history, educational content.
Top: title (H1, left) with at most one filter or sort control right. Content: quiet cards or list items, 16 gaps, optional section headings. Empty state per 14.2.
Signature: the section rhythm (washes alternating with ground). Prohibited: hero bands, a sticky CTA (the list items are the actions).

### C. Detail / content
For: a practice or protocol detail, an article, an insight expanded.
Top: back plus small title (H3) inline. Optional lead: a Dew Sage wash block (not a hero band) with the H2 and a one-line "why." Content: vertical prose, H2 sections, highlight cards for the backbone note. Optional single sticky CTA.
Signature: the type. Body at 16 with real line height and one H2 that earns its size. Prohibited: hero bands, more than one CTA, a card kit.

### D. Reflection / input
For: the post-practice reflection, the after-check, a journal entry.
Top: close plus title. Prompt: H2 in Teal, centered, generous top spacing. Input: an expanding field or a single row of chips. Bottom: primary ("Save") plus a tertiary skip.
Signature: the whitespace around the prompt. It should feel like a pause, not a form. Prohibited: hero bands, helper text longer than one line, any count or history.

### E. Today (rewritten in v2.1)
For: the daily arrival surface. The highest-risk screen for overload.
**Surface: IMMERSIVE (2.8).** A full-viewport environmental background (8.1) is the ground. **No hero band and no `ScreenHeader` band**, which is the one structural change v2.1 makes to this template: an environmental background and a band never share a viewport (8.2), so the band is removed rather than layered.
**The background is fixed; the content scrolls over it.** The greeting scrolls with the content; it does not pin.
Top: greeting at `displayLg`, warm and personal. It is the one string permitted to sit directly on the artwork (2.8), and its legibility is walk assertion 18(g) against the shipped asset, not an assumption. Hero card: the capacity invitation (pre-pick) or today's protocol (post-pick), radius 20, an immersive surface card (10.2), the one primary card. Then: **at most two more cards above the fold**, one of which may be the completion acknowledgment. One noticing, if there is one, as a highlight card. Below the fold: the calm remainder, fully accessible, never gated, never blurred.
**One warm point, and the artwork supplies it.** No warm accent fill anywhere else on the screen, the capacity-tier chip included (10.2).
Signature: the environmental background plus the display greeting. This is the screen that establishes the whole app's character. Prohibited: any number, count, or score; more than three cards above the fold; a second warm point; a hero band; anything that reads as a dashboard.

### F. Hub / arrival (amended in v2.1)
For: Focus, Energy, Practices, Learn landing screens; onboarding welcome; completion.
**Surface: ATMOSPHERIC (2.8).**
**A hero band is no longer mandated.** v2.0 made the band this template's signature and therefore a requirement; v2.1 makes it **permitted only per 8.2, which is pushed hubs only.** **Tab-root hubs (Practices, Learn) are atmospheric with no band** and take their character from type, wash rhythm and botanical accents (8.3) instead.
Top: the title at `displayLg` or `display`, over the pillar's hero band where 8.2 permits one. One primary CTA (the hub's "start here"). Then two to four quiet or standard cards for the hub's sections. The Guide pill docked top-right.
Signature: the band where there is one; otherwise the headline treatment and the section rhythm. A hub without a band still has to pass 2.7. Prohibited: a second kind of art in the viewport (8), a sticky footer CTA (the primary is in the content), lists longer than four items without a "see all."

### G. Session / player (new)
For: a running breath practice, timer, NSDR, movement demo, routine player.
Full screen. Mist White or a deep Dew Sage wash. Top: a single quiet exit (close, left, Muted Sage Gray) and nothing else. Center: the one thing (the pacer, the timer at `timer` size, the video). Bottom: at most one control (pause) as a large secondary button, plus a tertiary "End early" in Charcoal. **The Guide pill is hidden. The tab bar is hidden.** Notifications from the app are suppressed for the duration.
Signature: the emptiness. This is the one screen where "nothing else" is the design. Prohibited: hero bands, cards, any text beyond a phase word, any count, any haptic during the practice.

### H. Journey / wayfinding (new in v2.1)
For: `JourneyMapScreen` and `JourneyPhaseScreen`. **These had no template**, which is why `PhasePath` was specified in a component header rather than against a screen skeleton, and why its rules have been carried in code comments.
**Surface: ATMOSPHERIC (2.8).** No hero band on the map (it is a tab root, 8.2); botanical accents (8.3) where the screen needs character.
Top: the screen title. **An eyebrow slot is permitted, under 5.4's state-and-context exception only**: it carries the user's position (`PHASE_STATE_LABELS`, `JOURNEY_LINE_LABEL`) and never a phase descriptor, a category or a section name.
Content: the phase path, then the phase's own copy. **Ahead rows stay tappable.** Browsing ahead is not an invitation to advance and is not gated; the phase page suppresses its state eyebrow in preview for that reason.
**Prohibited, and this is the template's hardest rule: no count, no fraction, no percentage, and no filling bar** (10.7, and journey roadmap section 8). A journey has a shape, not a completion. Position is shown by the path itself.
Signature: the path, and the type on the phase page.

**What this template does NOT govern, named so a presentation slice cannot quietly reach into it.** Phase state derivation (`derivePhaseStates`, `phaseStatesForRoute`), `PHASE_ORDER`, `PHASE_DISPLAY` and its sixteen approved (phase, destination) strings, `journeyActionFor`'s one-slot precedence, offer placement and exposure, phase advancement, and journey service writes are **frozen**. **This is a presentation template. The strings and the state machine belong to the journey roadmap and to the copy owner.**

---

## 12. Navigation

### 12.1 Information architecture

**Four tabs: Today, Practices, Learn, Community.** Set by the IA Roadmap v2; this document does not change it. Focus and Energy are hubs reached from Practices. The Guide is a pill, not a tab (10.8). Anything that proposes a fifth tab is a product decision for the roadmap, not a design decision here.

### 12.2 The tab bar (rewritten in v2.1)

**React Navigation's `BottomTabBar`, styled. Not replaced, and not swapped for a native component.**

v2.0 specified `NativeTabs` via expo-router and a Liquid Glass posture. **The app has never used expo-router and has no `NativeTabs` reference anywhere**; the tab bar is and remains `createBottomTabNavigator` from `@react-navigation/bottom-tabs`. Specifying a migration the product had not chosen made the section unimplementable, and every clause that rested on it is withdrawn here. What follows describes a styled `BottomTabBar`.

**Form.** Absolutely positioned, capsule, clear of the bottom safe area. Warm translucency over the content beneath it.

**Translucency and its fallback.**
- `expo-blur` **on iOS only.** It is already a dependency and is used nowhere today.
- **Android and Reduce Transparency get a designed opaque fallback, not a degraded one: White with a `divider` hairline top border.** This promise has been in the document since v2.0 and has never been walked; walk assertion 18(f) is what makes it checkable.

**Height, capsule radius and blur intensity: [PENDING R2].** No numbers are set here. A floating bar's height is a function of the safe-area inset and the label treatment, and writing a figure before the bar exists is how a token gets hardcoded against a guess.

**Content clearance. Every route with the tab bar visible (16 today: 4 tab roots plus the 12 `CommunityNavigator` routes) takes its bottom inset from `useBottomTabBarHeight()`.** The fixed 48 in 6.2 is **retired for those routes**: a floating bar's footprint is not a constant, and 6.2's figure was written for an opaque bar that sat in the layout. `useBottomTabBarHeight` is used nowhere in the app today. Routes without a visible tab bar keep 6.2 unchanged.

**No badges, counts or dots on the bar**, per `docs/Vara_FourPillar_IA_Spec.md`. The bar is chrome; it never carries state the user has to clear.

**Icons and labels.** Active: **filled** MCI variant, Teal, with a 12pt Teal label. Inactive: **outline** variant, Muted Sage Gray, with a Muted Sage Gray label (7). Tab switch: instant content swap, no transition, light haptic.

**Content surfaces never use glass.** Cards, Today, hubs, sheets and sessions stay opaque Mist White, White and Dew Sage. Translucency belongs to the floating bar and nowhere else. An immersive Today (11E) is artwork, not glass, and the distinction matters under Reduce Transparency: artwork renders identically, glass does not.

**Frozen, and owned by React Navigation rather than by this document:** routing, tab state, route names, tab order, lazy mounting, and `screenLayout` error-boundary placement. **R2 restyles the bar. It does not touch any of those.**

**Visibility is unchanged:** the tab bar is hidden during sessions (template G) and on pushed screens.

### 12.3 Top navigation

Mist White, seamless with the page (no fill), 44 tall excluding the status bar. Back: Teal chevron, 24, left, with the previous screen's short title where iOS convention supplies it. Title: H3 centered, or omitted when the screen has its own H1 or a hero band. Right: at most one action, Teal, icon or text. On hubs and Today, the right slot is the Guide pill. A hairline `divider` appears under the bar only once content has scrolled beneath it.

Large-title behavior (iOS): hubs and Today do not use the system large title; the hero band plays that role. Browse and detail screens may use the system inline title.

### 12.4 Spatial model

Forward (drill in) slides in from the right; back reverses. Sheets rise from the bottom; modals fade and scale in place; both dismiss the way they came. Tabs swap instantly. The user should be able to draw where every screen "is" relative to the one they came from. Nothing ever comes from the left or the top.

### 12.5 Deep links and returns

Returning to the app after time away lands on Today, never on a modal, never on a paywall interstitial for an entitled user, and never on a "you've been away" screen (14.6). A notification tap deep-links to the surface it named and nothing else.

---

## 13. iOS platform conventions

Vara should read as a current, native, well-maintained iOS app at the chrome level while the content stays unmistakably its own.

- **Safe areas** are respected everywhere: Dynamic Island, home indicator, status bar. Content and controls never collide with system UI. Use `react-native-safe-area-context` edges deliberately; a hero band may extend under the status bar, its title may not.
- **Dynamic Type** per 5.3. This is a platform expectation, not an accessibility extra.
- **System controls** (switch, date and time pickers, action sheets, alerts) are used where they fit. They bring familiarity and accessibility for free. A custom control needs a reason.
- **Sheets over modals**, inline over sheets. Sheets support the standard detents and swipe-to-dismiss.
- **Keyboard**: the focused input and the primary button are always reachable; `KEYBOARD_HANDLING_GUIDE.md` is the implementation reference.
- **Interruptions**: a phone call, a lock, or a background during a session pauses the session and resumes it on return without losing state. Onboarding survives a force-quit at any step.
- **Offline**: reads show cached content with a quiet "Showing what's saved" line; writes queue and confirm when back; nothing blocks on a spinner. The paywall, in particular, must render a real failure state when offerings cannot load (14.4), never a healthy-looking screen with dead buttons.
- **Accessibility settings are primary paths, not edge cases** for this audience: Reduce Motion (9.4), Reduce Transparency (12.2), Increase Contrast (verify text on washes and scrims), Bold Text, and Dynamic Type are all verified before ship.
- **Android** follows the same tokens and templates. Its tab bar is the same styled `BottomTabBar` with the opaque fallback in 12.2, since `expo-blur` is iOS-only here. No separate Android design system.

---

## 14. States and feedback

Every surface has more than one state. Defining them is how the user never feels lost or judged.

### 14.1 Loading
Skeletons over spinners: the layout's shape in `dewSageLight` with a 1.5s gentle pulse (static under Reduce Motion). Spinner when a skeleton makes no sense: Teal, 24, 1.5px stroke, no label under three seconds, then "Taking a moment" (never "Please wait"). Pull-to-refresh uses the platform indicator tinted Teal. Loading never blocks the whole screen if part of it can render.

### 14.2 Empty
An empty state is an invitation, not a report of failure. Spot illustration (80 to 120), H3 headline in Teal that is warm and specific ("Your reflections live here"), one or two lines of 14pt Muted Sage Gray explaining what will appear, one primary button or text link. Never "You haven't done anything yet." Never a zero. **Three-state rule for any count-bearing surface: something, nothing-yet, or absent; a visible zero is never shown.**

### 14.3 Success
Inline and brief. "Saved." "Reflection captured." "Done. That's the reset." Teal, never bright green. Auto-dismiss in 2 to 3s. Success haptic. No confetti, no full-screen takeover for routine saves. A first meaningful completion (a first 30-minute session, a first week's routine) earns a real sentence in a QuietFinish; a three-minute reset earns "Done."

### 14.4 Error
Coral border or icon, one line of supportive, specific copy, placed inline directly under the thing that failed. "Something didn't connect. Try again when ready." Never blame the user, never shake, never a modal unless the failure is system-wide. A recoverable error always offers the retry in place. **Any screen whose primary action depends on a network resource (offerings, a session save, the Guide) has a designed failure state with a retry**, and the failure is visible; a screen must never look healthy while its button is dead.

### 14.5 Disabled
Primary color at 40% opacity, no touch response. Tapping a disabled control shows a one-line reason as a toast ("Choose a duration first"). Nothing is disabled without a reason the user can read.

### 14.6 Recovery and return
Returning after time away is a welcome, never a report card.

| Scenario | Response |
|---|---|
| Missed days in a routine | "Welcome back. Pick up wherever feels right." |
| Incomplete goal or plan | "Want to adjust this?" as a tertiary action |
| Long absence (7+ days) | A gentle re-entry card on Today; **no metric on what was missed** |
| Notification after absence | "Vara is here whenever you're ready." Never "You've been away for 12 days." |

### 14.7 Noticing (new, required)
Every primary surface (Today, each hub) carries **one** thing the app has noticed and says plainly, without a number and without a judgment: "Evenings are usually when you reach for this." "You've been choosing the longer one lately." It appears as a highlight card (10.2), never pushed as a notification, never on a session screen. One per surface. Zero is a defect (the surface is inert); two is noise.

The line it never crosses: it describes, it does not score. It remembers a choice the user made; it never assigns them a state. A state named at check-in is used to route and then disappears; it is never reflected back after the practice.

---

## 15. Copy at the component level

The Brand Voice Copy Guidelines are the authority on every string. This section only fixes the component-level habits that recur.

- **No em dashes in any user-facing string.** Use a comma, a period, or a new sentence. Enforced by `brandCopyGuard.test.ts`.
- **Shorter is calmer.** "Saved." beats a sentence. Reserve a full line for moments that carry emotional weight.
- **Buttons say what happens.** "Save reflection," "Set a focus," "Remove." Never "Submit," "OK," "Start now," or a label ending in an arrow.
- **Placeholders instruct gently.** "What's on your mind?" not "Type here."
- **Notifications are a tap on the shoulder.** "A few minutes to settle before your day?" Present-offering, never past-referencing.
- **Errors are specific and blameless.** "This needs a bit more to continue." Never "Invalid input."
- **Empty and recovery copy never implies the user is behind.**
- **No optimization language, no attention-as-currency, no retired vocabulary** (the five brain-state words, the five-pillar names). Enforced in part by the guards; the rest is review.
- **Specific over abstract.** "Three minutes before your first meeting" beats "a moment for yourself." If a line could describe any practice, it describes none.

---

## 16. Accessibility

Supporting capacity means supporting every kind of attention and every kind of body. These are minimums, and they are part of "done," not a phase.

- **Contrast**: WCAG 2.1 AA. 4.5:1 for body, 3:1 for large text (18pt Medium or 24pt Regular and up). Verify every title on a hero band against the scrim, and every string on an immersive surface against the artwork (18(g)).
- **Muted Sage Gray fails, and "borderline" was the wrong word (corrected in v2.1).** `#6F7F77` measures **4.22:1 on White**. That is **below 4.5:1**, so it fails AA for the 14pt Regular helper text it is used for, everywhere it is used, and it is not a judgment call. v2.0 called it "borderline: 14pt minimum", which read as a caution and licensed the usage it should have stopped. It is used in 336 places. **The fix is deferred to R1** because a palette token change touches every surface at once and is not a documentation edit. **Recorded candidate: `#56655D`** (6.15:1 on White, 4.61:1 on Dew Sage), which passes AA on both grounds at body and helper sizes.
- **Touch targets**: **48 by 48 is the floor** for every interactive element (Apple's 44 is the minimum; Vara adds margin). 8 minimum between adjacent targets. Small text links get hit slop to 48. **In code all three already read 48 (corrected in v2.1):** `SizeTokens.touchTargetMin` (`src/constants/designTokens.ts:131`), `SizeTokens.inputHeight` (`designTokens.ts:161`), and `MIN_TOUCH_TARGET_SIZE` (**`src/utils/accessibility.ts:22`**, not `src/constants/`). v2.0 said two of them "still read 44 and are corrected as part of adopting this document" and named the wrong directory. **The work is done; the sentence was describing it as outstanding.**
- **Screen reader**: every pressable carries `accessibilityRole` and a meaningful `accessibilityLabel` that names the action, not the appearance ("Save reflection," not "Green button"). Checkboxes carry `accessibilityState`. Decorative images are `accessible={false}`. Progress indicators are `progressbar` with a value. Use the builders in `src/utils/accessibility.ts` (`buttonA11yProps`, `checkboxA11yProps`, `progressA11yProps`, `switchA11yProps`, `headerA11yProps`) so labels are consistent; reading order matches visual order; nothing relies on position alone.
- **Dynamic Type**: per 5.3.
- **Reduce Motion / Reduce Transparency / Increase Contrast**: per 9.4 and 12.2, verified per screen.
- **Color never carries meaning alone.** Every state has a second signal: a label, an icon, a shape.
- **Cognitive**: one primary action, short sentences, consistent templates, generous whitespace, blameless errors. This is where the brand and accessibility are the same thing.

---

## 17. What is enforced by machine

Know these before writing code. They fail the build or the suite.

| Where | Enforces |
|---|---|
| `mobile/.eslintrc.js` | No raw hex literals (`no-restricted-syntax`, error). `max-lines` 300 (warn). No `console` except error/warn. No unused vars (error). |
| `src/__tests__/brandCompliance.test.ts` | Tree walk over all of `src/`: prohibited copy (streak as user-visible text, confetti, urgency phrases). Reasoned allowlist with existence check. |
| `src/__tests__/brandCopyGuard.test.ts` | Tree walk: em dashes and the optimize family in any user-facing string. |
| `src/__tests__/copyDraftSentinel.test.ts` | Pinned count of unapproved drafted strings; any change is named in the commit. |
| `src/screens/Focus/__tests__/blocksBrandGuard.test.ts` | Soft Coral barred from routine destructive controls in the blocks feature. |
| `firestore.rules.test.js` | Rules tests via emulator (`npm run test:rules` from the repo root). |

**Not yet enforced, prose only** (a11y lint plugin is queued): accessibility props on pressables, `useReducedMotion` on animated components, `maxFontSizeMultiplier`, touch target size, one-primary-action, the accent ceiling, template compliance, the distinctiveness test. Until the lint lands, the pre-merge checklist in 18 and the device walk are the gate for these.

### Migration clause and baseline debt (new in v2.1)

**This document describes the app Vara is building, not the app that exists.** The gap is real, it is large, and it is recorded **once, here, with numbers** so that no later slice has to re-derive it, and so that no rule above can be read as a claim that the code already complies.

**Counts measured at `c30671c` over `mobile/src/`, excluding tests:**

| Debt | Count | Rule it violates |
|---|---|---|
| Raw hex literals | **501 errors in 97 files** (385 outside `src/constants/`, in 85 files) | 3.1 |
| `fontWeight` without a per-weight `fontFamily` | **975 sites in 277 files** (every weight site in the app) | 5.1 |
| Literal pixel `lineHeight` values | **149 in 91 files** | 5.2 |
| Off-scale radius literals | **164 in 99 files** | 6.3 |
| Animated components not importing `useReducedMotion` | **26 files** | 9.4 |
| Uppercase or tracked-out labels above headings | **24 in 20 files**, three at 14pt | 5.4 |
| Visible numeric progress, fractions or "X of Y" | **13 sites** | 10.7 |
| Soft Coral outside genuine errors | **4 sites** (2 routine destructive controls, 2 count badges) | 4.4 |
| Files on a legacy icon set | **28** (11 Lucide, 17 Ionicons) | 7 |

**Two numbers are corrections and are stated as such.** The raw-hex figure is the eslint run's own output (`no-restricted-syntax`, 501 of the 1100 errors in the current lint baseline), not an estimate; an earlier working figure of 331 circulated and is wrong. And the 100 raw-hex errors inside `src/constants/` are the token definitions themselves: the rule has no override for that directory, so the palette is permanently among the errors. **That is a lint-configuration gap, not debt to pay down**, and closing it is an R1 item.

**The rule, and it is three clauses:**

1. **Introduce none.** A new file that adds to any row above is a defect, whatever the surrounding file does. Precedent in the file next to yours is not permission.
2. **Comply in full in every new or materially rewritten component.** "Materially rewritten" means the slice owns the file's structure, not that it touched a line. A one-line fix in a 400-line legacy screen does not oblige the slice to migrate the screen, and must not be used as cover to migrate it either: that is unfenced work.
3. **Every R-slice's REPORT states the delta for its touched files.** Not the global number, which no slice can move: the count before and after **for the files that slice touched.** A slice that rewrites a screen and leaves its radii off-scale has not finished, and a REPORT that quotes the global figure is hiding that.

**Nothing above is a target with a date.** Debt closes when a surface is redesigned, which is what the R-series is for. The purpose of the table is that the next person to open a legacy file knows they are looking at debt rather than at the standard.

---

## 18. The standing redesign walk and the quality checklist

### 18.1 The standing redesign walk (new in v2.1)

**Binding on R2 through R6+.** Every slice of the journey build this sprint was gated by a device walk with numbered steps and pass conditions, and that gate caught something on nearly every one: a coverage claim, a severity, five unwalkable strings, an arithmetic error. **"Does it look right" is not that gate and will not catch what those caught.**

Each assertion has a pass condition. **A walk reports each one by number, pass or fail, with what was observed.** An assertion that could not be run is reported as not run, never as passed.

**(a) Surface type.** The screen runs the treatment 2.8 assigns to that route, and **is not quietly running a second one**. *Pass:* the treatment matches the table, and no element from another treatment is present.

**(b) No doubled artwork.** An environmental background and a hero band never appear in one viewport (8). *Pass:* only one kind of art is on screen. **This is the failure R3 creates by construction if `ScreenHeader` is not removed from Today**, so it is checked on Today first and specifically.

**(c) Safe areas.** Top, bottom, Dynamic Island and home indicator, with content and controls clear of all four. *Pass:* nothing is clipped, overlapped, or unreachable at any of the four edges.

**(d) Floating bar clearance.** The bar is clear of content **on the smallest and the largest supported device**, scrolled fully to the bottom, **on every tab**.

> **The device matrix, so the assertion is checkable.** **Smallest: iPhone SE (3rd generation), 375 x 667 pt at @2x, 750 x 1334 px. Largest: iPhone 16 Pro Max, 430 x 932 pt at @3x, 1290 x 2796 px.** **Physical or simulator, either is acceptable, and the walk records which**, because (d) is geometry and not rendering fidelity: a simulator reproduces point dimensions, scale factor and safe-area insets exactly, and those are the whole of what the assertion tests.
>
> **Why these two.** The SE is the narrowest and the shortest current iPhone, so one device is the binding case for horizontal layout at 375pt (hub card rows, nav labels, 5.4's 65 to 75 character line length) and for bottom clearance at 667pt scrolled fully down, at the same time. The 16 Pro Max is the tallest and the widest. The matrix also spans **both scale factors, @2x and @3x**, which (g) needs: a raster background resolves differently at each.
>
> **iPad is out of this walk, and the consequence is stated rather than left implicit.** `app.json:21` declares `supportsTablet: true` and the app has **no tablet layouts**, so an iPad renders a stretched phone layout today. The redesign does not change that and **no step of this walk would catch it.** That is a **recorded known gap**, not an oversight: either the flag is flipped to false, or tablet layout becomes its own work with its own rows. **This document records the gap and does not resolve it**, because flipping a shipped capability flag is a product decision. Note for whoever picks it up: `PRE_SUBMISSION_CHECKLIST.md:172` names an iPad Air 11-inch as a test device. That is **App Review's** device, not a Vara support claim, and it must not be read as one.

**(e) Reduce Motion.** On, with **every animation on the touched surface** confirmed absent or reduced. *Pass:* nothing moves that 9.4 says should not. **Not only animations the slice added**: a slice that restyles a screen inherits whatever already moves on it, and 26 animated files ship without the hook (17).

**(f) Reduce Transparency.** On, confirming **the designed fallback renders rather than a degraded accident**. *Pass:* the tab bar is the opaque White bar with a `divider` hairline promised in 12.2. That promise has stood since v2.0 and has never been walked.

**(g) Text contrast, measured against the actual background asset.** Not against a token, not against a flat swatch. Measured **at the darkest region the text can sit over**, and **under Increase Contrast as well as without it**. *Pass:* the numeric floors in 10.2 are met, by measurement, on both scale factors in the matrix: composite luminance **>= 0.392** for Charcoal body, **>= 0.576** for Teal at body size, **>= 0.368** for Teal at 18pt Medium or larger.

**(h) No numeric progress on any journey surface.** No count, no fraction, no percentage, no filling bar (10.7, and journey roadmap section 8). *Pass:* none is present, in visible text or in a rendered indicator. The accessibility exemption in 10.7 is for position in a flow and nothing else.

### 18.2 Quality checklist

Every screen, component, and feature passes this before it ships. This is the final gate between design and the user, and CC's REPORT block answers it item by item for any slice with UI surface.

**Tokens and structure**
- [ ] All values reference tokens; no raw hex, size, spacing, radius, or shadow.
- [ ] Type uses the scale; line heights are multipliers; display size used on arrival screens.
- [ ] Radius encodes hierarchy (not one radius everywhere).
- [ ] At least two elevation tiers on the screen; washes used for section rhythm.
- [ ] Icons are MaterialCommunityIcons (7), correct size and color, outline by default and filled only for active or selected.
- [ ] The screen runs the surface treatment 2.8 assigns to its route, and only that one.

**Character**
- [ ] One warm point, deliberately placed (or the content supplies warmth).
- [ ] One signature: the surface's art (8, placed per 2.8), a display headline, or one orchestrated moment. One kind of art per viewport.
- [ ] One primary card at most; the rest quiet. Not a uniform card kit.
- [ ] Passes the distinctiveness test: could not appear unchanged in any other wellness app.
- [ ] One noticing on primary surfaces (Today, hubs).

**Interaction**
- [ ] One primary action visible.
- [ ] Pressed, focused, disabled, loading, empty, error, and offline states all exist.
- [ ] Motion follows the timing table; no bounce, spring, shake, confetti, parallax, or load-stagger.
- [ ] Destructive actions are tap-only, Charcoal-labeled, confirmed in a sheet with a Teal primary.
- [ ] Guide pill present on the routes in 10.8's table, hidden in sessions, sheets, onboarding, auth, settings.

**Copy**
- [ ] No em dashes. No urgency, shame, pressure, deficit framing, or retired vocabulary.
- [ ] Buttons name the action. Errors are supportive and specific. Empty states invite.
- [ ] No number, count, percentage, fraction, or score on any behavioral surface. No visible zero.

**Accessibility**
- [ ] Contrast AA, including titles on scrims and text on washes.
- [ ] Every touch target 48 or larger; every pressable has role and label via the helpers.
- [ ] `useReducedMotion` on every animated component; verified with Reduce Motion on.
- [ ] Text scales (no `allowFontScaling={false}`), `maxFontSizeMultiplier` 1.3 from the shared primitive and its `MAX_FONT_SCALE` token (5.1), checked at xxxLarge.
- [ ] New or materially rewritten files add nothing to the 17 debt table, and the REPORT states the delta for the files this slice touched.
- [ ] Reduce Transparency and Increase Contrast verified; older-OS fallback looks intentional.

**Brand alignment**
- [ ] Reduces cognitive load; feels calm and considered; an overwhelmed user would feel safe.
- [ ] Leads with an outcome in the user's words; brain-health language appears only as the "why."
- [ ] Nothing reintroduces the retired list (Appendix A).

---

## Appendix A. Retired patterns (do not reintroduce)

Removed by decision, not oversight. If one reappears in a design or a diff, that is a finding.

- Streak counters, streak language as product vocabulary, "don't break your streak."
- Any score, readiness index, wellness score, percentage, fraction, or "X of Y" on a behavioral surface.
- Confetti, fireworks, celebration overlays (`ConfettiOverlay`, deleted Aug 2026).
- Day-count milestone modals (`StreakMilestoneModal` / `MomentOfRecognition`, deleted Aug 2026).
- The five brain-state words (Wired, Foggy, Steady, Clear, Alive) as UI vocabulary.
- The five-pillar model and its colors (`brainPillars` tokens, deleted Aug 2026).
- The floating action button for the coach (replaced by the Guide pill, July 2026).
- Five-tab navigation. A "Plan" or "Habits" tab.
- Red anywhere. Coral on destructive controls.
- Hero bands on decision, input, list, sheet, or session screens.
- Blur-gating or obstructing Today until the user engages.
- Brain-health framing as a headline; "optimize," "brain optimization windows," "attention is your most valuable asset."
- A photograph. A literal brain illustration. A person's face.

## Appendix B. Version changelog

Newest first. **Each block is the record of one version and is never rewritten by a later one.**

### What changed from v2.0 to v2.1 (September 2026)

The design-authority reconciliation for the visual redesign, journey roadmap row R0. **Documentation only: no code changed with this version.** Every count it cites is measured at `c30671c` and recorded as baseline debt in 17.

- **2.8 Surface treatments** is new: three treatments (immersive, atmospheric, focus), a definition of each, and a **route-to-surface table covering every registered route**, with dark and `__DEV__` routes listed as exempt so absence never reads as an oversight. A route not in the table cannot be built.
- **2.4** corrected: hero bands are one of four kinds of art, not the only one, and their placement is now 2.8 and 8.2. v2.0's "hub and arrival screens only", which included Today, is superseded.
- **4.2** now states that it **defines "accent" for every document that uses the term.** `docs/Vara_Dashboard_Spec.md` and `docs/Vara_FourPillar_IA_Spec.md` both carry the 10 to 15% figure without the wash exemption and inherit the definition from here. Neither is amended. **There is no immersive exception**: wash content was already outside the ceiling, and warm pigment inside artwork is inside it.
- **5.1** gains the **implementation rule**: all user-facing text renders through a shared primitive that resolves weight to a registered Inter face and applies `maxFontSizeMultiplier` from one `MAX_FONT_SCALE` token. It records the Step-0 fact that **Inter is loaded and rendered nowhere today** and that the app ships in the system font, and it warns that literal line heights must be re-verified for clipping when Inter first renders.
- **5.4** gains the **eyebrow exception**, scoped to **state and context only**, sentence case, no transform, no tracking, at or under 12pt, never a category or phase name. **This is a fix, not a tolerance:** the two eyebrows the app already ships (`JOURNEY_LINE_LABEL`, `PHASE_STATE_LABELS`) were banned by v2.0 as written, with no exception recorded anywhere. The rejected branch, putting the four phase descriptors in the slot, is recorded with its price.
- **6.3** corrected twice: `Layout.community.buttonRadius` is 20, which **is on the scale**, and the `Layout.community` block is **live, not dead**. Nothing is deleted on the strength of the retracted claim.
- **7 Iconography** rewritten: the house set is **MaterialCommunityIcons**, outline by default and filled for active and selected states only. **The reason is inventory (178 files), not design**, and v2.0's Lucide specification never described the app. The 1.5px-stroke character rule retires with Lucide. Lucide (11 files) and Ionicons (17) are legacy on a shrinking allowlist; R1 adds the lint.
- **8 restructured** into four kinds of art: **8.1 environmental backgrounds (new)**, 8.2 hero bands, **8.3 atmospheric accents (new)**, 8.4 spot illustrations, with photography and the logo moving to 8.5 and 8.6. **Hero bands moved from 8.1 to 8.2**; a pre-v2.1 citation of "8.1 hero bands" wants 8.2. 8.1 carries a full asset spec, an 18% safe-corridor rule, and the finding that the current `todayBackground.webp` does not meet it.
- **9.4** gains one cross-reference: walk assertion 18(e) covers **every animation on a touched surface**, not only the ones a slice added.
- **10.2** gains the **immersive surface card**, with three numeric composite-luminance floors that its opacity token must satisfy, measured at the darkest region it can scroll over. The token itself is set in R3, not here.
- **10.7** gains an **accessibility exemption**: labels conveying position in a finite flow ("Step 2 of 6") are permitted. The ban is on visible progress, not on wayfinding for screen-reader users.
- **10.8** restates Guide-pill coverage **by route** rather than by "the four hubs", which was ambiguous once the tab set and the hub set stopped matching. The Step-0 gap (absent on Practices and Learn, present on Community) is recorded as debt, and **Community's pill is recorded as an open question rather than settled either way**.
- **11E Today** rewritten to an **immersive surface with no hero band**, background fixed and content scrolling over it, the greeting the one string permitted on the artwork, and the artwork supplying the screen's single warm point.
- **11F Hubs** amended: a hero band is **no longer mandated**, only permitted per 8.2. Tab-root hubs (Practices, Learn) are atmospheric with no band.
- **11H Journey / wayfinding** is new, the template these two screens never had, which is why `PhasePath`'s rules lived in a component header. It names what it does not govern: phase derivation, `PHASE_ORDER`, `PHASE_DISPLAY`, offers and advancement are frozen.
- **12.2 rewritten.** v2.0 specified `NativeTabs` via expo-router and a Liquid Glass posture; **the app has never used expo-router and has no `NativeTabs` reference**, so every clause resting on that is withdrawn. The bar is React Navigation's `BottomTabBar`, styled: absolute, capsule, warm translucency, `expo-blur` on iOS only, with the designed opaque fallback for Android and Reduce Transparency. Height, radius and blur intensity are **[PENDING R2]**. The 16 tab-bar-visible routes take their bottom inset from `useBottomTabBarHeight()`, retiring 6.2's fixed 48 for those routes. Routing, tab state, route names, order, lazy mount and `screenLayout` placement stay frozen.
- **13** loses the iOS 18 glass-chrome fallback clause, which existed only to support the withdrawn `NativeTabs` posture; the Android bullet now points at 12.2.
- **16** corrected twice. **Muted Sage Gray `#6F7F77` measures 4.22:1 on White and fails AA** for the 14pt helper text it is used for in 336 places; v2.0's "borderline" licensed the usage it should have stopped. Fix deferred to R1, candidate `#56655D` recorded. And the touch-target sentence is corrected: **all three constants already read 48**, and `MIN_TOUCH_TARGET_SIZE` lives in `src/utils/`, not `src/constants/`.
- **17** gains the **migration clause and the baseline-debt table**, nine rows with measured counts, plus the rule: introduce none, comply in full in new or materially rewritten components, and state the per-slice delta in every REPORT. The raw-hex figure is the eslint run's own (501 errors, 385 outside `src/constants/`); an earlier working figure of 331 is wrong.
- **18** gains **18.1, the standing redesign walk**: eight numbered assertions with pass conditions, binding R2 through R6+, with the device matrix written down so assertion (d) is checkable for the first time, and the iPad gap recorded beside it unresolved. The v2.0 checklist is kept in full as 18.2, with four items corrected to match 7, 8, 10.8 and 5.1 and two added.

### What changed from v1.0 to v2.0 (August 2026)

- **Framing** rewritten from brain-health-centered to outcomes-led (create capacity), per the Canonical Positioning Brief. The quality checklist no longer asks about "five messaging pillars" or "brain-health framing."
- **Section 2 (Visual character)** is new: the positive requirements that v1.0 lacked and that produced flat, uniform screens. Depth tiers, the one-warm-point rule, type as a design element, the illustration system, motion with presence, rhythm over uniformity, and the distinctiveness test.
- **DESIGN_SYSTEM.md merged in** as the token-to-code mapping (3.3, 4.1 alpha tokens, 6.2 layout constants). Its brain-pillar color section was already deleted; its celebration and CTA sections are folded into 10.10 and 15.
- **Dynamic Type (5.3)** is new and required; v1.0's fixed-pixel model is why the app shipped with none.
- **Progress (10.7)** corrected: v1.0 approved "3 of 10 steps" and percentage labels, which contradicted the locked no-denominators rule. Wayfinding dots in finite flows are permitted; every fraction, percentage, and behavioral progress bar is banned.
- **Tabs (12.1)** corrected from "4 to 5" to four, per the IA Roadmap.
- **Guide pill (10.8)**, **hero band rules (8.1)**, **consistency grid (10.9)**, **coral on destructive controls (4.4)**, **tap-only destruction (9.6)**, **noticing (14.7)**, **offline and paywall failure states (13, 14.4)**, and **templates F and G (11)** are new; each codifies a rule that existed only in code, in a guard test, or in Voice and Tone v2.2.
- **Motion philosophy (9.1)** revised from "unnoticed" to "fluid and continuous, never lively," with the timing table extended to 350ms for sheets and continuity transitions.
- **Liquid Glass posture (12.2)** stated: native chrome, opaque content, designed Reduce Transparency fallback.
- **Touch target** reconciled to 48 everywhere (v1.0 and DESIGN_SYSTEM disagreed at 44 vs 48).
- **Section 17** (what the machine enforces) is new so the reader knows which rules fail a build and which need a reviewer.
- **Code references verified against source** (Aug 30 2026 Step-0 pass): radius and button heights live on `Layout`, not standalone exports; animation values live in `AnimationTokens`, not a `Motion` object; `BAND_STRONG_SCRIM` lives in `ScreenHeader.tsx`; tracking is expressed in the code's absolute-point `letterSpacing` keys, not em. Three tokens are new with this version: `fontSize.displayLg` (34), `lineHeight.display` (1.1), `borderRadius.2xl` (20).

---

*Living document. Owner: Kyle. Version changes are logged here and cascaded to `mobile/CLAUDE.md` when they alter an enforced rule or the precedence ladder.*
