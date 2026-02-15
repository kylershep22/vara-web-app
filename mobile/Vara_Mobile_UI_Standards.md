# Vara — Mobile App UI Standards
**Version 1.0 | February 2026 | Brain-Health–Centered Design System**

This document defines the pixel-level, component-level, and interaction-level standards for every screen, element, and pattern in the Vara mobile app. All new features and UI work **must** reference and comply with this system.

---

## 1. Design Philosophy & Guiding Principles

### 1.1 The Core Design Mandate

Every design decision in the Vara app must answer one question: **does this reduce cognitive load and support the user's brain health?** If a design element adds visual noise, creates urgency, or introduces decision friction, it is off-brand and must be revised.

> **Design North Star:** Vara's interface should feel like a place where the user can breathe. Every pixel, every transition, every word should lower mental pressure—not increase it.

### 1.2 Non-Negotiable Design Principles

Apply in priority order:

1. **Calm Over Stimulation** — Default to restraint. Remove elements rather than add them. White space is a feature. Color is used sparingly. Animations are subtle and purposeful. Nothing in the interface should spike the user's nervous system activation.
2. **Clarity Over Cleverness** — Every screen should communicate its purpose within two seconds. One primary action per screen. Labels are plain language. Navigation is predictable. Users should never have to guess what to do next.
3. **Support Over Surveillance** — The UI never shames, pressures, or guilt-trips. No red alerts for missed days, no "get back on track" language. Recovery and adjustment are treated as healthy, not as failure. Streak counters are permitted as positive reinforcement when framed supportively.
4. **Structure Without Rigidity** — The interface provides clear pathways but never locks users in. Routines can be adjusted. Goals can be modified. The system adapts to the user, not the other way around.
5. **Evidence Over Hype** — Visual design, copy, and interactions never overpromise. Progress indicators are honest. Educational content uses responsible language. Claims use conditional phrasing.

### 1.3 Design Decision Framework

Before finalizing any component, screen, or interaction, apply this four-question check:

| Question | If the Answer Is No… |
|---|---|
| Does this reduce cognitive load? | Simplify or remove the element. |
| Does this feel calm and supportive? | Adjust tone, color, motion, or copy. |
| Would an overwhelmed user feel safe here? | Reduce density, add breathing room. |
| Is there only one clear primary action? | De-emphasize competing actions. |

---

## 2. Design Tokens

Design tokens are the atomic values that define Vara's visual language. Every color, size, spacing value, radius, and shadow used in the app must reference a token—never a raw value.

### 2.1 Token Naming Convention

All tokens follow a semantic naming pattern: `category-role-variant`.

| Category | Example Token | Value |
|---|---|---|
| Color | `color-primary` | `#1B5E57` |
| Color | `color-background-primary` | `#FAFAF6` |
| Color | `color-background-surface` | `#FFFFFF` |
| Color | `color-text-primary` | `#3E3E3E` |
| Color | `color-text-secondary` | `#6F7F77` |
| Color | `color-accent-warm` | `#F4C542` |
| Color | `color-accent-soft` | `#F5B971` |
| Color | `color-secondary` | `#B8CDBA` |
| Color | `color-secondary-light` | `#D5E3D1` |
| Color | `color-error` | `#D97A6E` |
| Spacing | `spacing-2xs` | `2px` |
| Spacing | `spacing-xs` | `4px` |
| Spacing | `spacing-sm` | `8px` |
| Spacing | `spacing-md` | `12px` |
| Spacing | `spacing-base` | `16px` |
| Spacing | `spacing-lg` | `24px` |
| Spacing | `spacing-xl` | `32px` |
| Spacing | `spacing-2xl` | `48px` |
| Spacing | `spacing-3xl` | `64px` |
| Radius | `radius-sm` | `4px` |
| Radius | `radius-md` | `8px` |
| Radius | `radius-lg` | `12px` |
| Radius | `radius-xl` | `16px` |
| Radius | `radius-full` | `9999px` |
| Shadow | `shadow-none` | `none` |
| Shadow | `shadow-sm` | `0 1px 3px rgba(0,0,0,0.04)` |
| Shadow | `shadow-md` | `0 2px 8px rgba(0,0,0,0.06)` |
| Shadow | `shadow-lg` | `0 4px 16px rgba(0,0,0,0.08)` |
| Font Size | `font-size-display` | `32px` |
| Font Size | `font-size-h1` | `26px` |
| Font Size | `font-size-h2` | `22px` |
| Font Size | `font-size-h3` | `18px` |
| Font Size | `font-size-body` | `16px` |
| Font Size | `font-size-body-sm` | `14px` |
| Font Size | `font-size-caption` | `12px` |
| Font Weight | `font-weight-regular` | `400` |
| Font Weight | `font-weight-medium` | `500` |
| Font Weight | `font-weight-semibold` | `600` |

> **Rule:** No raw color, spacing, font-size, or radius values should appear in any component code. Every value must reference a design token.

---

## 3. Color System

### 3.1 Full Palette

| Name | HEX | Role | Usage | Emotion |
|---|---|---|---|---|
| Evergreen Teal | `#1B5E57` | Primary | Primary CTAs, headlines, logo, anchors | Stability, trust, depth |
| Mist White | `#FAFAF6` | Background | Page backgrounds, cards, whitespace | Calm, clarity, openness |
| Silver Sage | `#B8CDBA` | Secondary | Secondary buttons, dividers, UI accents | Balance, restoration |
| Dew Sage | `#D5E3D1` | Secondary Light | Section backgrounds, soft contrast blocks | Freshness, relief |
| Sunrise Amber | `#F4C542` | Accent | Highlights, emphasis, small icons only | Warmth, optimism |
| Golden Apricot | `#F5B971` | Accent | Secondary highlights, illustrations | Gentle energy |
| Soft Charcoal | `#3E3E3E` | Text Primary | Body copy, primary text | Readable, soft |
| Muted Sage Gray | `#6F7F77` | Text Secondary | Helper text, captions, labels | Subdued, secondary |

### 3.2 Color Usage Rules

- The default palette for any screen is **Mist White background + Soft Charcoal text + Evergreen Teal for the primary action**. This triad covers 80% of the interface.
- Accent colors (Sunrise Amber, Golden Apricot) must never exceed **10–15%** of any screen's visual area. They are for small highlights, icons, or illustration details only.
- Never stack two or more accent colors adjacent to each other. Accent colors should be separated by neutral space.
- Avoid high contrast or neon tones. **Never use pure black (`#000000`)** for text—always use Soft Charcoal (`#3E3E3E`).
- When a screen feels visually heavy, the first correction is **removing color and adding whitespace**, not adjusting hues.
- Dark mode (if implemented): reverse Mist White to a deep warm gray (`#1A1A1A`), Soft Charcoal to off-white (`#E8E8E4`). Teal remains the anchor.

### 3.3 Semantic Color Mapping

| Role | Token / Value |
|---|---|
| Primary Action (buttons, links) | Evergreen Teal `#1B5E57` |
| Background (default screen) | Mist White `#FAFAF6` |
| Card / Surface Background | White `#FFFFFF` or Mist White `#FAFAF6` |
| Section Divider Background | Dew Sage `#D5E3D1` at 40% opacity |
| Primary Text | Soft Charcoal `#3E3E3E` |
| Secondary / Helper Text | Muted Sage Gray `#6F7F77` |
| Success / Positive | Evergreen Teal `#1B5E57` (not green) |
| Warning / Attention | Sunrise Amber `#F4C542` |
| Error / Needs Attention | Soft Coral `#D97A6E` (**not red**) |
| Disabled State | Silver Sage `#B8CDBA` at 50% opacity |

> **Important:** Vara never uses red for errors or alerts. Red triggers urgency and stress responses. Use Soft Coral (`#D97A6E`) paired with supportive copy for any error or attention state.

---

## 4. Typography System

### 4.1 Typeface

**Primary typeface:** Inter (with system sans-serif as fallback). Inter is clean, modern, highly readable, and neutral—it doesn't add cognitive noise.

### 4.2 Type Scale

| Role | Size / Weight | Token Name |
|---|---|---|
| Display (rare, hero only) | 32px / Semi-Bold (600) | `font-display` |
| Heading 1 (screen titles) | 26px / Semi-Bold (600) | `font-h1` |
| Heading 2 (section titles) | 22px / Semi-Bold (600) | `font-h2` |
| Heading 3 (subsections) | 18px / Medium (500) | `font-h3` |
| Body (default) | 16px / Regular (400) | `font-body` |
| Body Small | 14px / Regular (400) | `font-body-sm` |
| Caption / Label | 12px / Medium (500) | `font-caption` |
| Button Text | 16px / Medium (500) | `font-button` |
| Tab / Nav Label | 12px / Medium (500) | `font-nav` |

### 4.3 Typography Rules

- **Line height:** 1.5× for body text, 1.3× for headings.
- **Letter spacing:** Default (0) for body, +0.02em for captions and labels, -0.01em for display headings.
- **Maximum line length:** 65–75 characters for body text.
- **Never use ALL CAPS** for body text or paragraphs. ALL CAPS may be used sparingly for tab labels or small category tags only (12px or smaller).
- Minimal italics—reserve for emphasis within body text or for educational callout labels only.
- **Heading color:** Evergreen Teal (`#1B5E57`) for H1 and H2, Soft Charcoal (`#3E3E3E`) for H3 and below.
- Text should always feel inviting, not demanding. If a heading feels aggressive, reduce size or weight.

---

## 5. Spacing & Layout Tokens

### 5.1 Spacing Scale (4px Base Unit)

All spacing in the app uses multiples of 4px. No arbitrary values.

| Token | Value | Common Use |
|---|---|---|
| `spacing-2xs` | 2px | Inline icon-to-text gap (rare) |
| `spacing-xs` | 4px | Tight internal padding, tag padding |
| `spacing-sm` | 8px | Space between related elements, icon margins |
| `spacing-md` | 12px | Internal card padding (compact), list item gaps |
| `spacing-base` | 16px | Default padding, margins between sibling components |
| `spacing-lg` | 24px | Section internal padding, card content padding |
| `spacing-xl` | 32px | Gap between major sections on a screen |
| `spacing-2xl` | 48px | Screen top/bottom safe zones, major section breaks |
| `spacing-3xl` | 64px | Hero spacing, onboarding visual breathing room |

### 5.2 Screen Layout Rules

- **Horizontal screen padding:** 16px (`spacing-base`) on both sides consistently.
- **Vertical flow:** Screens scroll vertically. Avoid horizontal scrolling except for intentional carousels with clear affordance.
- **Section spacing:** 32px (`spacing-xl`) between major sections. 16px (`spacing-base`) between elements within a section.
- **Safe areas:** Respect platform-specific safe area insets (iOS notch, Android navigation bar). Add 48px (`spacing-2xl`) bottom padding above any tab bar.
- **Card internal padding:** 16px–24px depending on content density. Default to 24px (`spacing-lg`).
- **Scroll indicator:** Use subtle Dew Sage fade at the bottom of scrollable content areas—never a harsh cutoff.

### 5.3 Corner Radius Tokens

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 4px | Tags, small chips, inline badges |
| `radius-md` | 8px | Input fields, secondary elements |
| `radius-lg` | 12px | Cards, buttons, modals |
| `radius-xl` | 16px | Bottom sheets, large cards |
| `radius-full` | 9999px | Circular elements (avatars, dot indicators) |

### 5.4 Shadow Tokens

Shadows are subtle and used sparingly. They provide depth hierarchy without visual heaviness.

| Token | Value | Usage |
|---|---|---|
| `shadow-none` | `none` | Default for most elements |
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.04)` | Subtle lift for cards on white backgrounds |
| `shadow-md` | `0 2px 8px rgba(0,0,0,0.06)` | Elevated cards, floating action buttons |
| `shadow-lg` | `0 4px 16px rgba(0,0,0,0.08)` | Modals, bottom sheets |

> **Rule:** Never use drop shadows on logos, icons, or text. Shadows are structural only—used to convey elevation in the interface hierarchy.

---

## 6. Iconography Standards

### 6.1 Icon Style

- **Line style:** Rounded line icons with 1.5px stroke weight. Consistent across the entire icon set.
- **Corners:** Rounded caps and joins. No sharp angles.
- **Fill:** Soft-fill only where needed for active/selected states. Never solid fill as default.
- **Complexity:** Minimal detail. Icons should be recognizable at 20px and legible at 16px.
- **Style:** Abstract and suggestive over literal. Avoid overly literal brain diagrams.
- Nature-inspired metaphors are encouraged: leaves, waves, sunrise, hills, flow patterns.

### 6.2 Icon Sizing

| Context | Size | Notes |
|---|---|---|
| Navigation bar icons | 24px | Active: Teal filled. Inactive: Muted Sage Gray outline. |
| In-line content icons | 20px | Used next to body text, list items. |
| Card accent icons | 24–32px | Decorative, top-left or right of card. |
| Feature icons (onboarding) | 48px | Larger, illustrative. Teal or Sage. |
| Empty state illustrations | 80–120px | Centered, soft gradients, nature-inspired. |

### 6.3 Icon Color Rules

- Default icon color: Muted Sage Gray (`#6F7F77`) for inactive, secondary states.
- Active / selected: Evergreen Teal (`#1B5E57`).
- Highlight / accent icons: Sunrise Amber (`#F4C542`) used very sparingly.
- **Never use red icons.** For attention states, use Soft Coral paired with supportive messaging.
- Icons inside buttons inherit the button's text color.

---

## 7. Core Component Library

Every reusable UI element in the app is defined here with its visual specs, states, and usage rules. Components not listed here should be reviewed against these standards before implementation.

### 7.1 Buttons

#### Primary Button

| Property | Specification |
|---|---|
| Background | Evergreen Teal `#1B5E57` |
| Text | White, 16px, Medium (500), Inter |
| Height | 48px |
| Horizontal Padding | 24px |
| Corner Radius | 12px (`radius-lg`) |
| Shadow | `shadow-none` (default), `shadow-sm` on press |
| Pressed State | Darken 10%, subtle scale to 0.98 |
| Disabled State | Teal at 40% opacity, no interaction |
| Loading State | Text replaced with subtle pulse animation |

**There should be only one primary button visible per screen.** If two actions are needed, one must be secondary.

#### Secondary Button

| Property | Specification |
|---|---|
| Background | Transparent |
| Border | 1.5px solid Evergreen Teal `#1B5E57` |
| Text | Evergreen Teal, 16px, Medium (500), Inter |
| Height | 48px |
| Horizontal Padding | 24px |
| Corner Radius | 12px (`radius-lg`) |
| Pressed State | Fill with Dew Sage at 30% opacity |
| Disabled State | Border and text at 40% opacity |

#### Tertiary / Text Button

| Property | Specification |
|---|---|
| Background | None |
| Text | Evergreen Teal, 16px, Medium (500), underline on press |
| Height | 40px (smaller touch target acceptable) |
| Use Case | Skip, cancel, optional secondary actions |

> **CTA Copy Rule:** All button labels must follow the Vara CTA Library. Approved styles include: "Explore Vara," "Begin at your own pace," "Set a focus," "Reflect for a moment." **Never** use urgency-based labels like "Start now" or "Don't miss out."

### 7.2 Cards

#### Standard Card

| Property | Specification |
|---|---|
| Background | White `#FFFFFF` |
| Border | None (use shadow for elevation) OR 1px Silver Sage |
| Corner Radius | 12px (`radius-lg`) |
| Internal Padding | 24px (`spacing-lg`) |
| Shadow | `shadow-sm` |
| Spacing Between Cards | 16px (`spacing-base`) |
| Max Content | Title (H3) + 2–3 lines body + optional action |

#### Highlight Card (Educational / Insight)

| Property | Specification |
|---|---|
| Background | Dew Sage `#D5E3D1` at 50% opacity |
| Border | None |
| Left Accent | 4px solid Evergreen Teal (optional) |
| Internal Padding | 24px |
| Corner Radius | 12px |
| Use Case | Brain-health tips, educational nudges, insights |

#### Card Interaction Rules

- Cards that are tappable should have a subtle press state: scale to 0.98 with a 150ms ease-out transition.
- Cards should never have more than one primary action. If a card has a button, the entire card should not also be tappable.
- Avoid cramming content. If a card needs more than a title, a short body, and one action, consider splitting into multiple cards or using a detail screen.

### 7.3 Input Fields

| Property | Specification |
|---|---|
| Background | White `#FFFFFF` |
| Border | 1.5px solid Silver Sage `#B8CDBA` |
| Focus Border | 1.5px solid Evergreen Teal `#1B5E57` |
| Corner Radius | 8px (`radius-md`) |
| Height | 48px (single-line), auto (multi-line) |
| Internal Padding | 12px horizontal, 14px vertical |
| Placeholder Text | Muted Sage Gray `#6F7F77`, Regular 400 |
| Input Text | Soft Charcoal `#3E3E3E`, Regular 400 |
| Label (above field) | 12px, Medium 500, Muted Sage Gray |
| Error State | Border: Soft Coral `#D97A6E`, helper text below in Soft Coral |
| Error Copy Style | Supportive, not punitive (e.g., "This field needs a bit more") |

### 7.4 Toggles & Selection Controls

#### Toggle Switch

| Property | Specification |
|---|---|
| Track (off) | Silver Sage `#B8CDBA` |
| Track (on) | Evergreen Teal `#1B5E57` |
| Thumb | White, subtle `shadow-sm` |
| Size | 48px wide, 28px tall |
| Animation | 200ms ease, smooth slide |

#### Checkbox

| Property | Specification |
|---|---|
| Unchecked | 1.5px Silver Sage border, white fill, 8px radius |
| Checked | Teal fill, white checkmark, 8px radius |
| Size | 22px |

#### Radio Button

| Property | Specification |
|---|---|
| Unselected | 1.5px Silver Sage border, white fill, full radius |
| Selected | Teal border, Teal inner dot |
| Size | 22px outer, 10px inner dot |

### 7.5 Bottom Sheets & Modals

#### Bottom Sheet

| Property | Specification |
|---|---|
| Background | White `#FFFFFF` |
| Corner Radius (top) | 16px (`radius-xl`) |
| Handle Bar | 40px wide, 4px tall, Silver Sage, centered, 12px from top |
| Internal Padding | 24px horizontal, 24px top (below handle), 32px bottom |
| Overlay | Black at 30% opacity |
| Entry Animation | Slide up, 300ms ease-out |
| Dismiss | Swipe down, tap overlay, or explicit close button |
| Shadow | `shadow-lg` |

#### Modal Dialog

| Property | Specification |
|---|---|
| Background | White `#FFFFFF` |
| Corner Radius | 16px (`radius-xl`) |
| Max Width | 85% of screen width |
| Internal Padding | 24px |
| Overlay | Black at 40% opacity |
| Entry Animation | Fade in + subtle scale from 0.95, 250ms |
| Actions | One primary, one secondary (tertiary dismiss optional) |
| Use Sparingly | Modals interrupt flow; prefer inline actions or bottom sheets |

### 7.6 List Items

| Property | Specification |
|---|---|
| Height | 56–72px depending on content density |
| Left Padding | 16px |
| Right Padding | 16px |
| Divider | 1px Silver Sage, inset 16px from left |
| Tap State | Background fills with Dew Sage at 20% opacity |
| Leading Element | Icon (20–24px) or avatar (36px), 12px gap to text |
| Trailing Element | Chevron, toggle, or metadata text |
| Primary Text | 16px, Regular, Soft Charcoal |
| Secondary Text | 14px, Regular, Muted Sage Gray |

### 7.7 Tags & Chips

| Property | Specification |
|---|---|
| Background (default) | Dew Sage `#D5E3D1` at 60% opacity |
| Background (selected) | Evergreen Teal `#1B5E57` |
| Text (default) | Soft Charcoal, 12px, Medium 500 |
| Text (selected) | White, 12px, Medium 500 |
| Corner Radius | 4px (`radius-sm`) |
| Padding | 4px vertical, 10px horizontal |
| Spacing Between Tags | 8px |

### 7.8 Progress Indicators

Vara's approach to progress is gentle and supportive. Progress indicators should communicate without creating pressure.

#### Progress Bar

| Property | Specification |
|---|---|
| Track | Silver Sage `#B8CDBA` at 30% opacity, 6px tall, full radius |
| Fill | Evergreen Teal `#1B5E57`, animated fill (400ms ease) |
| Corner Radius | Full radius (9999px) |
| Label (optional) | Step count in Muted Sage Gray, 12px |
| Never Show | Competitive framing or red/yellow warnings |

#### Circular / Radial Progress

| Property | Specification |
|---|---|
| Track | Silver Sage at 20% opacity, 4px stroke |
| Fill | Evergreen Teal, 4px stroke, rounded cap |
| Animation | Smooth fill, 500ms ease-in-out |
| Center Content | Optional icon or short label (not percentage by default) |

> **Progress Copy Rule:** Never frame progress as a deficit ("You're only 30% done"). Frame as accomplishment ("You've completed 3 of 10 steps") or simply show the visual indicator without judgment.

---

## 8. Screen Layout Templates

To maintain structural consistency, every new screen should start from one of these five templates. Templates define the layout skeleton—components fill the content.

### Template A: Single-Focus Action

**Used for:** Goal setting, reflection prompts, check-ins, single-task screens.

| Zone | Content |
|---|---|
| Top (safe area + 24px) | Back arrow or close button (left-aligned) |
| Header (centered) | Screen title (H1), optional subtitle (body-sm, Muted Sage Gray) |
| Content (centered) | One primary content block (input, card, or prompt) |
| Bottom (sticky, 16px above safe area) | Primary button, full-width with 16px horizontal margin |

Key principle: the user sees one thing and knows exactly what to do. No sidebar, no competing actions, no visual clutter.

### Template B: List / Feed

**Used for:** Habit lists, routine overviews, history, browsing educational content.

| Zone | Content |
|---|---|
| Top | Screen title (H1, left-aligned) + optional filter/sort (right) |
| Content | Scrollable list of cards or list items, 16px gaps |
| Empty State | Centered illustration + supportive message + one CTA |
| Bottom | Tab bar (if main section) or no sticky footer |

### Template C: Detail / Content

**Used for:** Educational articles, habit detail views, insights, expanded card content.

| Zone | Content |
|---|---|
| Top | Back arrow + small title (H3, left-aligned, inline with nav) |
| Hero (optional) | Illustration or accent-colored header block (Dew Sage bg) |
| Content | Vertical prose flow: H2 heading, body text, optional callout cards |
| Action (optional) | One sticky CTA at bottom if the screen requires action |

### Template D: Reflection / Input

**Used for:** Journaling, mood check-ins, open-ended reflection prompts.

| Zone | Content |
|---|---|
| Top | Close/back + screen title |
| Prompt | Centered question or prompt (H2, Teal), generous top spacing |
| Input Area | Multi-line text field, expanding, or selection chips |
| Bottom | Primary button ("Save reflection" or similar) + skip option as text button |

The reflection template should feel like an invitation, not a form. Extra whitespace around the prompt is intentional—it signals that this is a moment to pause.

### Template E: Dashboard / Overview

**Used for:** Home screen, daily summary, weekly review. Use sparingly—dashboards risk cognitive overload.

| Zone | Content |
|---|---|
| Top | Greeting (personalized, warm), date |
| Content | 2–3 cards max, stacked vertically, clear hierarchy |
| Guidance | One featured insight or educational callout card |
| Quick Action | One prominent CTA, contextual to time of day |
| Bottom | Tab bar |

> **Dashboard Restraint:** The home screen is the highest-risk surface for cognitive overload. Limit to three visible cards above the fold. If content exceeds this, prioritize ruthlessly. The home screen is a doorway, not a destination.

---

## 9. Navigation Patterns

### 9.1 Tab Bar (Primary Navigation)

| Property | Specification |
|---|---|
| Position | Bottom of screen, above safe area |
| Background | White `#FFFFFF`, with `shadow-sm` top border or 1px Silver Sage |
| Height | 56px (excluding safe area) |
| Max Tabs | 4–5 tabs maximum. More than 5 creates decision overload. |
| Active Tab | Teal icon (filled) + Teal label, 12px Medium |
| Inactive Tab | Muted Sage Gray icon (outline) + Muted Sage Gray label |
| Animation | No animation on switch. Instant state change. |
| Haptic | Light haptic on tab tap (iOS) |

### 9.2 Top Navigation Bar

| Property | Specification |
|---|---|
| Height | 44px (excluding status bar) |
| Background | Mist White `#FAFAF6` (seamless with screen) |
| Title | H3, centered or left-aligned depending on hierarchy |
| Back Button | Left-aligned, Teal, chevron icon 24px + optional "Back" text label |
| Action Button | Right-aligned, Teal, icon or text (max one action) |
| Border | None by default. 1px Silver Sage if scroll content reaches top. |

### 9.3 Navigation Transition Rules

- **Forward navigation** (drilling into content): slide in from right, 250ms ease-out.
- **Back navigation:** slide out to right, 250ms ease-out.
- **Modal presentation** (bottom sheets, modals): slide up or fade in.
- **Tab switches:** no transition animation, instant content swap.
- All transitions use **ease-out** curves. Never use bounce, elastic, or spring effects—these feel playful or stimulating, not calm.

---

## 10. Interaction & Motion Standards

### 10.1 Motion Philosophy

Motion in Vara serves one purpose: to orient the user. It should communicate spatial relationships, confirm actions, and smooth transitions. Motion should never entertain, distract, or draw attention to itself. If a user wouldn't notice the motion was there, it's working correctly.

### 10.2 Timing & Easing

| Type | Duration | Easing |
|---|---|---|
| Button press feedback | 100–150ms | ease-out |
| Screen transitions | 250ms | ease-out |
| Bottom sheet entry | 300ms | ease-out |
| Modal fade-in | 250ms | ease-in-out |
| Progress bar fill | 400ms | ease-in-out |
| Content fade-in (lazy load) | 200ms | ease-in |
| Card press scale | 150ms | ease-out |

### 10.3 Prohibited Motion Patterns

- **Bounce or spring effects:** These feel playful and create micro-spikes of stimulation. Use sparingly and only for celebratory moments.
- **Shake animations (for errors):** Shaking communicates aggression. Use a gentle color shift + supportive copy instead.
- **Auto-playing animations that loop indefinitely:** Limit to single-play or short loops (3-4 cycles max).
- **Fast transitions under 150ms:** These feel abrupt and jarring.
- **Parallax scrolling:** Adds visual complexity without functional benefit.

### 10.4 Permitted Celebration Patterns

Celebration animations (confetti, sparkles, gentle fireworks) are permitted for meaningful accomplishments:
- Completing a goal or milestone
- Achieving a streak milestone (7 days, 30 days, etc.)
- Finishing a challenge

Keep celebrations brief (1-2 seconds), use brand colors (Teal, Sage, Amber), and pair with warm, affirming copy.

### 10.5 Haptic Feedback (iOS)

| Action | Haptic Type |
|---|---|
| Button tap | Light impact |
| Toggle switch | Light impact |
| Successful completion | Success notification |
| Error / needs attention | Warning notification (not error) |
| Pull to refresh | Selection changed |

Haptics should be gentle and confirmatory. Never use heavy or rigid impact styles.

---

## 11. States & Feedback

Every interactive element and content area has multiple states. Defining these ensures that users always understand what's happening and never feel lost or punished.

### 11.1 Loading States

- **Skeleton screens preferred** over spinners. Show the layout shape in Silver Sage at 20% opacity with a gentle pulse animation (1.5s cycle).
- **Spinners** (when needed): Simple circular, Evergreen Teal, 24px, 1.5px stroke. No text label unless loading exceeds 3 seconds.
- If loading exceeds 3 seconds, show a supportive message: "Taking a moment…" (not "Please wait").
- **Pull-to-refresh indicator:** Teal circular indicator, consistent with platform defaults.

### 11.2 Empty States

Empty states are an opportunity to guide and reassure, not to signal failure.

| Element | Specification |
|---|---|
| Illustration | Centered, 80–120px, soft nature-inspired graphic |
| Headline | H3, Teal, warm and inviting (e.g., "This is a fresh start") |
| Body | Body-sm, Muted Sage Gray, 1–2 sentences explaining what can go here |
| CTA | One primary button or text link to get started |

> **Empty State Copy:** Never use language that implies the user is behind or has failed. Good: "No reflections yet—whenever you're ready." Bad: "You haven't done anything yet."

### 11.3 Success States

- **Confirmation:** Brief inline message or subtle screen transition. Celebration animations (confetti, sparkles) are permitted for significant milestones.
- **Copy tone:** Warm and affirming but understated. "Saved" or "Nicely done" or "Reflection captured."
- **Color:** Evergreen Teal for success indicators. Never bright green.
- **Duration:** Success messages auto-dismiss after 2–3 seconds. No required tap to dismiss.
- **Celebrations:** Reserve confetti/sparkle animations for meaningful accomplishments (goal completion, streak milestones). Keep brief and use brand colors.

### 11.4 Error States

- **Color:** Soft Coral `#D97A6E` for borders and icons. Never red.
- **Copy:** Supportive and specific. "This field needs a bit more" or "Something didn't go through—try again when ready."
- **Placement:** Inline, directly below the relevant field or component. Never in a separate modal unless the error is system-wide.
- **Never blame the user.** The system encountered the issue, not the person.

### 11.5 Disabled States

- **Visual:** Primary color at 40% opacity. Element should not respond to touch.
- If a user taps a disabled element, show a brief tooltip explaining why it's unavailable (e.g., "Complete the step above first").

### 11.6 Recovery & Re-engagement States

When a user returns after time away, the app should never guilt-trip. Recovery states should feel like a warm welcome, not a report card.

| Scenario | Response |
|---|---|
| Missed days in a routine | Supportive message: "Welcome back. Pick up wherever feels right." |
| Incomplete goal | Offer to adjust: "Want to update this goal?" |
| Long absence (7+ days) | Gentle re-onboarding card on home screen, no metrics on what was missed |
| Notification after absence | "Vara is here whenever you're ready"—never "You've been away for 12 days!" |

---

## 12. Copy & Microcopy Patterns

UI copy is as much a design element as color or spacing. Every string in the app must follow these standards to maintain Vara's calm, supportive voice at the component level.

### 12.1 Button Labels

| Context | Approved Pattern |
|---|---|
| Start a new routine | "Create a routine" or "Begin at your own pace" |
| Save an entry | "Save" or "Capture this" |
| Skip an optional step | "Skip for now" or "Maybe later" |
| Confirm a deletion | "Remove" (never "Delete forever") |
| Resume after absence | "Pick up where you left off" or "Resume when ready" |
| Adjust a goal | "Adjust your plan" or "Reset gently" |

### 12.2 Placeholder Text

- Input placeholders should be instructive and gentle: "What's on your mind?" not "Type here."
- Search: "Search your reflections…" not "Search."
- Journal: "Write freely—no pressure…"

### 12.3 Notification Copy

- Notifications must feel like a gentle tap on the shoulder, not an alarm.
- **Approved:** "A small moment for reflection, if it feels right."
- **Approved:** "Your evening routine is ready whenever you are."
- **Never:** "Don't forget your routine!" or "You haven't checked in today."

### 12.4 Error Messages

| Scenario | Copy |
|---|---|
| Network failure | "Something didn't connect. Try again when ready." |
| Empty required field | "This needs a bit more to continue." |
| Invalid format | "That doesn't quite match the format we need." |
| Session timeout | "Your session timed out. Let's get you back in." |
| Generic fallback | "Something went wrong on our end. Sorry about that." |

### 12.5 Confirmation Messages

| Action | Copy |
|---|---|
| Routine saved | "Routine saved." |
| Reflection captured | "Reflection captured." |
| Goal updated | "Goal updated—adjusted to fit." |
| Settings changed | "Updated." |

> **Microcopy Principle:** When in doubt, shorter is calmer. A one-word confirmation ("Saved") is less cognitively demanding than a full sentence. Reserve longer confirmations for moments where emotional warmth is needed, like completing a meaningful reflection.

---

## 13. Accessibility Standards

Accessibility is not optional. Supporting brain health means supporting all brains—including users with visual, motor, cognitive, or auditory differences. These are minimum standards.

### 13.1 Color Contrast

- All text must meet **WCAG 2.1 AA** contrast ratios: 4.5:1 for body text, 3:1 for large text (18px+ bold or 24px+ regular).
- Interactive elements must be distinguishable without relying solely on color. Use labels, icons, or underlines as secondary indicators.
- Test all color combinations against Mist White (`#FAFAF6`) and White (`#FFFFFF`) backgrounds. Muted Sage Gray (`#6F7F77`) on white is borderline—use 14px or larger only.

### 13.2 Touch Targets

- **Minimum touch target:** 48×48px for all interactive elements.
- **Spacing between touch targets:** minimum 8px to prevent accidental taps.
- Small text links must have expanded touch areas (padding or hit slop) even if visual size is smaller.

### 13.3 Screen Reader Support

- All images and icons must have meaningful alt text or be marked decorative (`aria-hidden`).
- Buttons and interactive elements must have accessible labels that describe the action, not the appearance ("Save reflection" not "Green button").
- Screen order must match visual order. No reliance on visual position alone for meaning.
- Form inputs must have programmatically associated labels.

### 13.4 Motion Sensitivity

- Respect the user's **"Reduce Motion"** system setting. When enabled, replace all animations with instant state changes or simple fades.
- No animation should be the only way to communicate information. Pair all motion with a static indicator.

### 13.5 Cognitive Accessibility

This aligns directly with Vara's brand philosophy and should be treated as a feature, not a constraint:

- One primary action per screen reduces decision paralysis.
- Clear labels and short sentences reduce cognitive processing load.
- Consistent layout templates reduce learning curve.
- Generous white space reduces visual overwhelm.
- Supportive, non-punitive error messages reduce anxiety.

---

## 14. Quality Checklist

Before any screen, component, or feature ships, it must pass this checklist. This is the final gate between design and the user.

### 14.1 Visual Consistency

- [ ] All colors reference design tokens (no raw hex values in code).
- [ ] All spacing uses the 4px base scale (no arbitrary pixel values).
- [ ] Typography uses defined type scale (no ad-hoc font sizes or weights).
- [ ] Corner radii match the token scale (`radius-sm`, `radius-md`, `radius-lg`, `radius-xl`).
- [ ] Shadows match defined shadow tokens (`shadow-none`, `shadow-sm`, `shadow-md`, `shadow-lg`).
- [ ] Icons use the correct style (rounded, 1.5px stroke, correct size for context).

### 14.2 Interaction Quality

- [ ] Every interactive element has visible pressed, focused, and disabled states.
- [ ] Transitions follow timing and easing specs (no bounce, no spring, no shake).
- [ ] Only one primary action is visible per screen.
- [ ] Loading states use skeleton screens or the approved spinner pattern.
- [ ] Error states use Soft Coral (not red) with supportive copy.

### 14.3 Copy Quality

- [ ] All button labels reference the CTA Library or follow its patterns.
- [ ] No urgency, shame, or pressure language anywhere on the screen.
- [ ] Error messages are supportive and specific (never blame the user).
- [ ] Empty states include a warm message and a clear, optional CTA.
- [ ] Notification copy follows the "gentle tap on the shoulder" standard.

### 14.4 Accessibility

- [ ] Color contrast meets WCAG 2.1 AA minimums.
- [ ] All touch targets are 48px or larger.
- [ ] Screen reader labels are present and meaningful.
- [ ] Reduced Motion preference is respected.

### 14.5 Brand Alignment

- [ ] Does this screen reduce cognitive load?
- [ ] Does the screen feel calm and supportive?
- [ ] Would an overwhelmed user feel safe here?
- [ ] Does this screen map to one of Vara's five messaging pillars?
- [ ] Does the copy use brain-health framing (explicitly or implicitly)?

---

*This is a living document. Update as the design system evolves. Version changes should be logged and communicated to all contributors.*
