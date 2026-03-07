# Vara Design System

Canonical reference for the Vara mobile app design tokens. All values are defined in `src/constants/` and should be imported from there.

## Color Palette

Source: `src/constants/colors.ts`

### Primary Colors

| Token | Hex | Usage |
|---|---|---|
| `evergreenTeal` | `#1B5E57` | Primary brand, CTAs, headings, success |
| `silverSage` | `#B8CDBA` | Borders, accents, input borders |

### Secondary Colors

| Token | Hex | Usage |
|---|---|---|
| `sunriseAmber` | `#F4C542` | Secondary accent, task-related UI |
| `goldenApricot` | `#F5B971` | Warnings, tertiary accent |

### Neutral Colors

| Token | Hex | Usage |
|---|---|---|
| `mistWhite` | `#FAFAF6` | Default background |
| `softCharcoal` | `#3E3E3E` | Primary text |
| `white` | `#FFFFFF` | Card surfaces |
| `mutedSageGray` | `#6F7F77` | Secondary text, captions |

### Accent Colors

| Token | Hex | Usage |
|---|---|---|
| `dewSage` | `#D5E3D1` | Soft backgrounds, tags |
| `softCoral` | `#D97A6E` | Error states (never use pure red) |

### Derived Alpha Colors

| Token | Value | Usage |
|---|---|---|
| `tealLight` | `rgba(27,94,87,0.08)` | Selected state tints |
| `tealMedium` | `rgba(27,94,87,0.15)` | Active badge borders |
| `dewSageLight` | `rgba(213,227,209,0.5)` | Icon containers, inactive pills |
| `divider` | `rgba(184,205,186,0.4)` | Dividers, borders |

### Brain Health Pillar Colors

| Pillar | Token | Hex |
|---|---|---|
| Growth | `brainPillars.growth` | `#1B5E57` (Evergreen Teal) |
| Energy | `brainPillars.energy` | `#F4C542` (Sunrise Amber) |
| Focus | `brainPillars.focus` | `#B8CDBA` (Silver Sage) |
| Resilience | `brainPillars.resilience` | `#F5B971` (Golden Apricot) |
| Connection | `brainPillars.connection` | `#D5E3D1` (Dew Sage) |

### Rules

- Never use colors outside this palette
- Never use pure red (`#FF0000`) -- use `softCoral` for errors
- Shadow color (`#000000`) is only for shadows, never for text
- Use alpha variants of palette colors for overlays and tints

## Typography

Source: `src/constants/typography.ts`

### Font Family

Primary: **Inter** (Regular, Medium, SemiBold, Bold)
Fallback: System sans-serif

### Font Sizes

| Token | Size | Usage |
|---|---|---|
| `xs` | 12px | Caption, label |
| `sm` | 14px | Body small |
| `base` | 16px | Body (default) |
| `lg` | 18px | H3 (subsections) |
| `xl` | 22px | H2 (section titles) |
| `2xl` | 26px | H1 (screen titles) |
| `3xl` | 32px | Display (rare, hero only) |
| `timer` | 48px | Breathwork timer only |

### Font Weights

| Token | Value | Usage |
|---|---|---|
| `regular` | 400 | Body text |
| `medium` | 500 | Buttons, nav, captions |
| `semibold` | 600 | Headings, section titles |
| `bold` | 700 | Emphasis (rare) |

### Text Style Presets

Use `TextStyles` for common patterns:

| Preset | Size/Weight | Color |
|---|---|---|
| `display` | 32px / SemiBold | -- |
| `h1` | 26px / SemiBold | Evergreen Teal |
| `h2` | 22px / SemiBold | Evergreen Teal |
| `h3` | 18px / Medium | Soft Charcoal |
| `body` | 16px / Regular | -- |
| `bodySmall` | 14px / Regular | -- |
| `caption` | 12px / Medium | -- |
| `button` | 16px / Medium | -- |
| `nav` | 12px / Medium | -- |

### Rules

- Never use ALL CAPS for buttons
- Line height: 1.5x for body, 1.3x for headings
- Letter spacing: 0 for body, -0.25 for headings, +0.5 for captions

## Spacing

Source: `src/constants/spacing.ts`

### Spacing Scale

| Token | Value | Usage |
|---|---|---|
| `2xs` | 2px | Inline icon-to-text gap (rare) |
| `xs` | 4px | Tight padding, tag padding |
| `sm` | 8px | Related elements, icon margins |
| `md` | 12px | Compact card padding, list gaps |
| `base` | 16px | Default padding, margins |
| `lg` | 24px | Section padding, card content |
| `xl` | 32px | Between major sections |
| `2xl` | 48px | Safe zones, major breaks |
| `3xl` | 64px | Hero spacing, onboarding |

### Layout Constants

| Token | Value |
|---|---|
| `screenPaddingHorizontal` | 16px |
| `screenPaddingVertical` | 24px |
| `cardPadding` | 24px |
| `cardMargin` | 16px |
| `inputHeight` | 48px |
| `headerHeight` | 56px |
| `tabBarHeight` | 56px |

### Border Radius

| Token | Value | Usage |
|---|---|---|
| `sm` | 4px | Small chips |
| `md` | 8px | Inputs, small cards |
| `lg` | 12px | Cards, buttons |
| `xl` | 16px | Large cards |
| `pill` | 9999px | Filter tabs, tags |

### Button Heights

All buttons must be at least 48px tall (WCAG touch target minimum):

| Token | Value | Usage |
|---|---|---|
| `sm` | 48px | Tertiary, inline actions |
| `md` | 48px | Primary, secondary |
| `lg` | 56px | Large CTAs |

## Celebrations & Encouragement

### Philosophy

"Would this feel equally meaningful on day 1 as day 100?"

Vara uses **quiet acknowledgment** over loud celebration. The goal is to recognize effort without creating pressure.

### Approved Patterns

- **QuietFinish:** Inline overlay with calm message ("Done for today. Well done."). Auto-dismisses after 2.5s.
- **MomentOfRecognition:** Modal shown at engagement thresholds (7, 30, 60, 100 days). Never displays the number.
- **AnimatedCheckbox:** Subtle scale animation with brief acknowledgment text ("Done.", "Noted.", "Captured.").

### Prohibited Patterns

- Streak counters or streak numbers visible to the user
- Confetti animations
- Urgency language ("Don't break your streak!", "Don't miss out!")
- Gamification mechanics (points, levels, leaderboards)
- Overly enthusiastic copy ("Amazing!", "You're crushing it!")

## CTAs (Calls to Action)

### Approved Examples

| Context | CTA Text |
|---|---|
| Paywall (new user) | "Start your 7-day free trial" |
| Paywall (expired) | "Continue with Vara" |
| Restore purchase | "Restore previous purchase" |
| Onboarding | "Get started" |
| Habit completion | "Done." / "Noted." / "Captured." |

### Prohibited Examples

| Prohibited | Why |
|---|---|
| "Subscribe Now" | Urgency language |
| "Unlock Your Potential" | Hype-driven |
| "Don't miss out" | Fear-based |
| "Act now" | Urgency |
| "Limited time offer" | Scarcity tactics |
| "Start your journey" | Overused / vague |

## Accessibility Requirements

- All interactive elements must have `accessibilityLabel` and `accessibilityRole`
- Minimum touch target: 44x44 points
- Color must not be the only indicator of state
- Support `useReducedMotion` for all animations
- Use `src/utils/accessibility.ts` helpers for consistent label generation
