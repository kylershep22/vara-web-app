# Vara Mobile UI Standards

**Version 2.0 | August 2026 | The visual and interaction authority for the Vara mobile app**

Supersedes `Vara_Mobile_UI_Standards.md` v1.0 (February 2026) and absorbs `mobile/docs/DESIGN_SYSTEM.md`. Both retire on the commit that lands this file. There is now one design document.

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

- **Hero bands** (a watercolor header behind the screen title with a scrim, `BAND_STRONG_SCRIM`) belong on **hub and arrival screens only**. Never on a decision screen, an input screen, a list, a sheet, or a session. This is the single most important placement rule in the illustration system and it is locked.
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

### 5.1 Typeface

**Inter**, all weights from Regular (400) to SemiBold (600). Bold (700) exists in the token set for rare emphasis and is almost never the right choice. System sans-serif is the fallback. No second typeface.

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
- Do not add small tracked-out labels above headings ("FOCUS" over "Your focus session"). If a category needs naming, the heading names it.
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
| `2xl` | 20 | Today arrival cards, the capacity invitation. Also the value `Layout.community.buttonRadius` already uses off-scale; delete with the dead `Layout.community` block, logged. |
| `pill` | 9999 | Circular elements, the Guide pill, filter pills |

Per 2.6, a screen where every element shares one radius has lost a hierarchy tool. Inputs are 8, cards 12, the one primary card 16 or 20.

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

**Library:** Lucide (`lucide-react-native`). No second icon set, no custom icons unless a concept genuinely does not exist in Lucide, and then drawn to match: rounded caps and joins, 1.5px stroke, minimal detail, legible at 16.

| Context | Size | Color |
|---|---|---|
| Tab bar | 24 | Active: Teal. Inactive: Muted Sage Gray |
| Inline with text, list items | 20 | Muted Sage Gray, or Charcoal when it carries meaning |
| Card accent | 24 to 32 | Teal, or the screen's one warm point |
| Feature (onboarding, hubs) | 48 | Teal or Sage, often inside a `dewSageLight` circle |
| Inside buttons | 20 | Inherits button text color |

Rules: soft fill only for active or selected states, never as the default. Nature-derived metaphors (leaf, wave, sunrise, hill, flow) are encouraged; literal brain iconography is banned. Never a red icon. Attention states use Amber on a wash; error states use Coral.

---

## 8. Illustration and imagery

### 8.1 Watercolor hero bands

The hero band is Vara's signature arrival treatment: a soft watercolor image (`focusHeader.webp`, `energyHeader.webp`, `homeHeader.webp` and successors) behind the screen title, faded into the page by `BAND_STRONG_SCRIM`.

- **Placement is locked: hub and arrival screens only.** Today, Focus hub, Energy hub, Practices hub, Learn hub, onboarding welcome, completion. Never on a decision screen, an input or form, a list or browse screen, a sheet, a settings screen, or a running session.
- The band occupies the top of the viewport and never more than 30% of it. Content begins on the opaque part of the scrim.
- One band per screen. Bands do not repeat as section headers.
- Each pillar has its own band. The band is how the room announces itself; it does not change within a pillar.
- Reduce Transparency: bands are images, not glass, and render identically. Reduce Motion: bands never parallax or animate.

### 8.2 Spot illustrations

`SpotIllustration` and future siblings: soft, nature-derived, 80 to 120px, centered. Used in empty states (14.2), completion moments, and onboarding. Never alongside a hero band in the same viewport. Never a brain, a head, a diagram, or a person's face.

### 8.3 Photography and video

No photography in the app. Video appears only inside a player (movement demos, the Guide intro) and never autoplays, never gates a page, and always has a static poster frame.

### 8.4 The app icon and logo

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

Progress copy never frames deficit ("only 30% done") and never frames completion as a sum. The indicator is visual and unlabeled, or absent.

### 10.8 The Guide pill (new)

The Guide is Vara's AI entry point and its **single persistent help affordance**. There is no second help icon anywhere.

| Property | Spec |
|---|---|
| Form | Pill, `pill` radius, 36 to 40 tall, Teal fill, White icon (sparkle-free: a soft leaf or wave mark) and optional short label |
| Position | Docked top-right on hub screens and Today, inside the safe area, 16 from the right edge |
| Elevation | `shadow-md` (float tier) |
| Visibility | Present on Today and the four hubs. **Hidden during any session, on sheets, in onboarding, on auth, and on settings sub-screens.** |
| Behavior | Opens the Guide as a bottom sheet. Never a full-screen takeover. |
| Motion | Fades with the screen; never bounces, pulses, or badges for attention |

The pill replaced the floating action button in July 2026. No FAB pattern remains and none is reintroduced.

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

Every new screen starts from one of these seven skeletons. Templates define structure; components fill it. Each template names its signature (where the screen spends its one moment of boldness) and its prohibitions.

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

### E. Today (revised)
For: the daily arrival surface. The highest-risk screen for overload.
Top: greeting at `displayLg`, warm and personal, over the home hero band. Hero card: the capacity invitation (pre-pick) or today's protocol (post-pick), radius 20, the one primary card. Then: **at most two more cards above the fold**, one of which may be the completion acknowledgment. One noticing, if there is one, as a highlight card. Below the fold: the calm remainder, fully accessible, never gated, never blurred.
Signature: the hero band plus the display greeting. This is the screen that establishes the whole app's character. Prohibited: any number, count, or score; more than three cards above the fold; a second warm point; anything that reads as a dashboard.

### F. Hub / arrival (new)
For: Focus, Energy, Practices, Learn landing screens; onboarding welcome; completion.
Top: the pillar's hero band with the title at `displayLg` or `display`. One primary CTA (the hub's "start here"). Then two to four quiet or standard cards for the hub's sections. The Guide pill docked top-right.
Signature: the band. Everything below it is disciplined. Prohibited: a second illustration in the viewport, a sticky footer CTA (the primary is in the content), lists longer than four items without a "see all."

### G. Session / player (new)
For: a running breath practice, timer, NSDR, movement demo, routine player.
Full screen. Mist White or a deep Dew Sage wash. Top: a single quiet exit (close, left, Muted Sage Gray) and nothing else. Center: the one thing (the pacer, the timer at `timer` size, the video). Bottom: at most one control (pause) as a large secondary button, plus a tertiary "End early" in Charcoal. **The Guide pill is hidden. The tab bar is hidden.** Notifications from the app are suppressed for the duration.
Signature: the emptiness. This is the one screen where "nothing else" is the design. Prohibited: hero bands, cards, any text beyond a phase word, any count, any haptic during the practice.

---

## 12. Navigation

### 12.1 Information architecture

**Four tabs: Today, Practices, Learn, Community.** Set by the IA Roadmap v2; this document does not change it. Focus and Energy are hubs reached from Practices. The Guide is a pill, not a tab (10.8). Anything that proposes a fifth tab is a product decision for the roadmap, not a design decision here.

### 12.2 Tab bar and Liquid Glass posture

Vara adopts current iOS chrome where it buys familiarity and stays quiet everywhere else.

- **Use the native tab bar** (`NativeTabs` via expo-router, or the platform default) rather than a hand-rolled JS bar. On iOS 26 this renders as Liquid Glass with scroll-to-shrink; on iOS 18 and earlier it renders as the classic bar; on Android as Material. Vara does not reimplement any of that.
- **Content surfaces never use glass.** Cards, Today, hubs, sheets, sessions stay opaque Mist White, White, and Dew Sage. Glass belongs on floating system controls only.
- Where a glass surface is unavoidable (the native bar itself), the quietest variant: no specular drama, no motion-reactive tint.
- **Reduce Transparency** users get an opaque bar that looks intentional: White with a `divider` hairline top border. This fallback is designed, not incidental.
- Active tab: Teal icon (soft fill) and 12pt Teal label. Inactive: Muted Sage Gray outline and label. Tab switch: instant content swap, no transition, light haptic.
- The tab bar is hidden during sessions (template G) and on pushed detail screens below a hub where the platform convention hides it.

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
- **Older OS fallback**: an iOS 18 user gets the same app minus the glass chrome. That path is checked, not assumed.
- **Android** follows the same tokens and templates with Material navigation chrome via the native tab component. No separate Android design system.

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

- **Contrast**: WCAG 2.1 AA. 4.5:1 for body, 3:1 for large text (18pt Medium or 24pt Regular and up). Verify Muted Sage Gray on White and on Dew Sage washes (borderline: 14pt minimum). Verify every title on a hero band against the scrim.
- **Touch targets**: **48 by 48 is the floor** for every interactive element (Apple's 44 is the minimum; Vara adds margin). 8 minimum between adjacent targets. Small text links get hit slop to 48. In code the floor is `SizeTokens.touchTargetMin` (48); `MIN_TOUCH_TARGET_SIZE` in `accessibility.ts` and `SizeTokens.inputHeight` both still read 44 and are corrected to 48 as part of adopting this document.
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

---

## 18. Quality checklist

Every screen, component, and feature passes this before it ships. This is the final gate between design and the user, and CC's REPORT block answers it item by item for any slice with UI surface.

**Tokens and structure**
- [ ] All values reference tokens; no raw hex, size, spacing, radius, or shadow.
- [ ] Type uses the scale; line heights are multipliers; display size used on arrival screens.
- [ ] Radius encodes hierarchy (not one radius everywhere).
- [ ] At least two elevation tiers on the screen; washes used for section rhythm.
- [ ] Icons are Lucide, correct size and color for context.

**Character**
- [ ] One warm point, deliberately placed (or the content supplies warmth).
- [ ] One signature: hero band (hub/arrival only), display headline, or one orchestrated moment.
- [ ] One primary card at most; the rest quiet. Not a uniform card kit.
- [ ] Passes the distinctiveness test: could not appear unchanged in any other wellness app.
- [ ] One noticing on primary surfaces (Today, hubs).

**Interaction**
- [ ] One primary action visible.
- [ ] Pressed, focused, disabled, loading, empty, error, and offline states all exist.
- [ ] Motion follows the timing table; no bounce, spring, shake, confetti, parallax, or load-stagger.
- [ ] Destructive actions are tap-only, Charcoal-labeled, confirmed in a sheet with a Teal primary.
- [ ] Guide pill present on hubs and Today, hidden in sessions, sheets, onboarding, auth, settings.

**Copy**
- [ ] No em dashes. No urgency, shame, pressure, deficit framing, or retired vocabulary.
- [ ] Buttons name the action. Errors are supportive and specific. Empty states invite.
- [ ] No number, count, percentage, fraction, or score on any behavioral surface. No visible zero.

**Accessibility**
- [ ] Contrast AA, including titles on scrims and text on washes.
- [ ] Every touch target 48 or larger; every pressable has role and label via the helpers.
- [ ] `useReducedMotion` on every animated component; verified with Reduce Motion on.
- [ ] Text scales (no `allowFontScaling={false}`), `maxFontSizeMultiplier` 1.3, checked at xxxLarge.
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

## Appendix B. What changed from v1.0

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
