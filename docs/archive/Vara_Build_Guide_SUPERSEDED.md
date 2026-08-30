> **SUPERSEDED — April 2026 guide, retired August 2026.** This document describes
> a prior version of Vara: the five-state vocabulary (Wired/Foggy/Steady/Clear/
> Alive), five-tab IA, floating V button, intent paths, protocol tiers, and 7-day
> trial are ALL RETIRED. Do not build from this document. Current precedence:
> see mobile/CLAUDE.md. Kept for history only.

---

# Vara Build Guide
**[RETIRED INSTRUCTION — do not load this document in any session. See mobile/CLAUDE.md.]**

Version 1.0 | April 2026

---

## How to use this document

This is the single source of truth for what Vara is, how it behaves, and what's off-limits. Other specs in the repo cover specific features in depth. This document covers the rules that apply to **everything**.

When Claude Code encounters an ambiguous decision, it should default to what this guide says. When it finds a conflict between this guide and another spec, this guide wins unless explicitly noted.

**If a question isn't covered here and isn't covered by a specific spec, stop and ask the user.** Don't guess on brand-level decisions.

---

## The product in one paragraph

Vara is a brain-health–centered iOS and Android app that helps high-performing, high-stress professionals recover from acute stress moments using short, research-backed protocols (breathwork, sensory resets, movement, NSDR). The core loop is: user checks in with their current brain state → tells Vara how much time they have → runs a recommended protocol → checks in again to measure the shift → sees patterns over time. The differentiation is that Vara actually measures whether the protocol worked and uses that data to surface personalized insights. Target users are people like stressed lawyers and sales professionals — not wellness enthusiasts.

---

## Non-negotiable principles

These apply to every screen, every string of copy, every feature decision.

### 1. The measurement is the product
Every check-in captures a state. Every protocol is followed by a re-check. Every re-check produces a state transition. State transitions are the atomic unit of Vara's value — they power Patterns, the algorithm, and the user's felt sense that the app works. Never replace state transitions with softer measurements (Yes/No, 1-10 scales, mood emoji). If the data isn't state-in to state-out, the product breaks.

### 2. No streaks, no gamification, no shame
Vara never shows streak counts, loss messages ("you broke your streak"), competitive framing, leaderboards, or achievement badges. Recovery and adjustment are normal and healthy, not failures. When a user returns after an absence, the language is "welcome back" and "pick up wherever feels right" — never "you've been away for X days" or "get back on track."

### 3. Support over surveillance
The app never monitors, reports on, or nudges based on compliance. It surfaces insights the user requested (via check-ins and protocol completions), never insights they didn't opt into. When Patterns surfaces a trend, it's observational ("your Wired time is most common on Tuesdays"), not prescriptive ("you need to fix your Tuesdays").

### 4. Calm over stimulation
No bounce animations, spring effects, confetti, fireworks, celebration animations, or visual urgency. Motion is functional (orient, confirm, transition) and subtle. Color usage is restrained — the default screen is Mist White background + Soft Charcoal text + Evergreen Teal for the primary action. Accent colors (Sunrise Amber, Golden Apricot) are used sparingly.

### 5. Evidence over hype
Claims are conditional ("can help," "designed to support," "many people find"). Never absolute ("will fix," "guaranteed," "unlocks"). Research-backed language is welcome when accurate (e.g., "Stanford 2023 research on cyclic sighing"). Pseudoscientific or exaggerated claims are banned.

### 6. Clarity over cleverness
Every screen has one primary action. Labels are plain language. Users should never have to guess what to do next. If a screen has multiple possible next steps, one must be visually dominant.

---

## The five-state vocabulary

This is the backbone of the product. All check-ins, re-checks, and Pattern insights use these five states.

**Internal code labels** (what the codebase uses today — DO NOT rename):
- `wired`
- `foggy`
- `okay` → **being renamed to `steady` during Phase 1 of the implementation plan**
- `clear`
- `energized` → **being renamed to `alive` during Phase 1 of the implementation plan**

**User-facing labels** (what users see in the UI):
- **Wired** — "On, activated, hard to settle"
- **Foggy** — "Dulled, low clarity, slowed down"
- **Steady** — "Baseline, functional, fine"
- **Clear** — "Focused, available, present"
- **Alive** — "Energized, open, engaged"

Each state has a specific color association (used in Patterns, not in general UI):
- Wired: warm accent (Sunrise Amber range)
- Foggy: muted gray-green
- Steady: Silver Sage
- Clear: Evergreen Teal
- Alive: Golden Apricot

Never introduce a sixth state. Never collapse states. Never use synonyms ("energized" instead of "alive") in user-facing copy after the rename.

---

## The core loop (v2)

This is what the product does. Every other feature supports this.

1. **Check-in.** User selects one of the five states.
2. **Time window.** User selects how much time they have: 2, 5, 10, 20, or 45+ minutes.
3. **Algorithm selects a protocol** using: state + time window + time of day + user's intent path + recent session history.
4. **Protocol runs.** User completes a guided session.
5. **Re-check.** User selects their new state using the same five-state chips.
6. **Adaptive response:**
   - If the state shifted positively → affirming message, route to Today
   - If the state didn't shift → validating message, offer "try something longer" OR "rest and come back later"

**Non-negotiables within the loop:**
- The re-check uses the full five-state chip selection, not Yes/No
- The "didn't shift" path never retries immediately with another 2-minute protocol
- The "didn't shift" path always validates before offering options
- State transitions are recorded as session data for Patterns

For full detail, see `Vara_Core_Loop_v2.md` in this repo.

---

## The protocol library

Vara has 11 protocols, organized by evidence tier.

**Tier 1 (Strong RCT evidence):** Cyclic Sighing, Brief Movement
**Tier 2 (Good research):** Box Breathing, Extended Exhale, NSDR, Coherence Breathing, Cold Water Reset
**Tier 3 (Clinical tradition):** Sensory Reset, Mindful Walking, Focused Work Window
**Tier 4 (Traditional, use with care):** Bright Light Exposure

**Explicitly excluded from the library:** Earthing, Wim Hof, cold plunges, breath retention exercises, supplements. These have either thin evidence or liability concerns.

Protocol durations range from 2 minutes (Cyclic Sighing, Sensory Reset) to 45-90 minutes (Focused Work Window). The algorithm uses the user's time window as a hard filter.

For full protocol definitions, see `Vara_Brain_State_Model_v2.2.md` in this repo.

---

## The four intent paths

Users are grouped into one of four paths during onboarding based on their stated intent. The path shapes the first 7 days of recommendations and copy, then decays linearly to zero influence by day 8.

1. **Down-regulation** — for users who selected overwhelm or reactivity
2. **Sleep** — for users who selected "can't wind down at night"
3. **Activation** — for users who selected scattered focus or running on empty
4. **Default / Curious** — for users who selected "want to understand" or "just exploring"

Each path biases: protocol recommendations, Patterns copy tone, Coach (V) tone.

For full intent path spec, see `Vara_Intent_Paths.md` in this repo.

---

## UI/UX rules

### Modal design system
Every modal follows the v1.1 design system:
- One primary CTA, full-width, bottom-pinned
- Cancel/close top-left
- Centered modals for object creation (new habit, new goal)
- Bottom sheets for responsive flows (check-ins, protocol selection)
- Overlay: 40% black for centered modals, 30% for bottom sheets
- No asterisks anywhere
- Floating label OR placeholder — not both
- Active warm titles ("Add a new habit" not "New Habit")
- Reassurance line ("You can always adjust this later") on creation flows

For full modal spec, see `Vara_Modal_Design_System_v1.1.md` in this repo.

### Color tokens (use only these — never hardcoded values)

**Primary:**
- Evergreen Teal: `#1B5E57` (primary CTAs, headlines)
- Mist White: `#FAFAF6` (page backgrounds)

**Secondary:**
- Silver Sage: `#B8CDBA` (dividers, secondary buttons)
- Dew Sage: `#D5E3D1` (section backgrounds)

**Accent (use sparingly, max 10-15% of any screen):**
- Sunrise Amber: `#F4C542`
- Golden Apricot: `#F5B971`

**Text:**
- Soft Charcoal: `#3E3E3E` (primary text — never pure black)
- Muted Sage Gray: `#6F7F77` (helper text)

**Semantic:**
- Soft Coral: `#D97A6E` (errors — never red)

### Typography
- Typeface: Inter
- Scale: 32 (display, rare) / 26 (H1) / 22 (H2) / 18 (H3) / 16 (body) / 14 (body-sm) / 12 (caption)
- Line height: 1.5× body, 1.3× headings
- Never ALL CAPS for body text
- Minimal italics

### Spacing (4px base unit, no arbitrary values)
`4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`

### Corner radius
`4 / 8 / 12 / 16 / 9999` (full circle)

### Shadows (subtle, used sparingly)
- `shadow-sm`: `0 1px 3px rgba(0,0,0,0.04)`
- `shadow-md`: `0 2px 8px rgba(0,0,0,0.06)`
- `shadow-lg`: `0 4px 16px rgba(0,0,0,0.08)`

### Motion
- Ease-out for forward motion, ease-in-out for state changes, never ease-in
- No bounce, no spring, no elastic effects
- Durations: 100-150ms (feedback), 250-300ms (transitions), 400-500ms (content fills)
- Respect `Reduce Motion` system setting

### Icons
Use Lucide icons library. Default size 20px inline, 24px navigation, 32px feature.

---

## Copy rules

### Tone
Calm, intelligent (not clinical), human, clear. Never urgent, never preachy, never performative.

### Approved language patterns
- "Supporting focus and mental clarity"
- "Reducing cognitive load"
- "Working with how your brain responds"
- "Designed to support"
- "Can help you"
- "Many people find"
- "When it feels manageable"
- "A small step you can try"

### Banned language

**Shame/motivation:**
- "No excuses"
- "You just need discipline"
- "If you really wanted this"

**Hype/overpromise:**
- "Life-changing"
- "Guaranteed results"
- "Fix your brain"
- "Unlock your potential"

**Medical claims:**
- "Treats anxiety/depression/ADHD"
- "Clinically proven cure"
- "Rewires your brain" (without context)

**Urgency:**
- "Don't miss out"
- "Act now"
- "This is your last chance"

**Streak/gamification language of any kind.**

### Button label patterns
Approved: "Explore Vara," "Begin at your own pace," "Set a focus," "Reflect for a moment," "Pick up where you left off," "Resume when ready"

Banned: "Start now," "Try harder," "Don't break your streak," "Get back on track"

### Error messages
Supportive, not punitive. "Soft Coral (#D97A6E) for borders and icons, never red." Example: "That doesn't quite match the format we need" — not "Invalid input."

### Empty states
Never shame. "Your reflections live here" — not "You haven't written anything yet." Always explain what will happen as the user uses the surface.

For full copy patterns, see `Vara_Voice_Tone_Rules.pdf` and `Vara_CTA_Headline_Library.pdf` in this repo.

---

## The floating V button

The floating V button is a persistent coach-access affordance. It's visible only on the 5 tab roots (Today, Practices index, Patterns index, Community index, You). It is hidden on all modals, protocol running screens, details screens, onboarding, and settings sub-screens.

Visual: 52px diameter teal circle with white "V," bottom-right, 16px right inset, 12px above the tab bar.

For full spec, see `Vara_Floating_V_Button_Spec.md` in this repo.

---

## The Coach (V)

V is a conversational interface to the user's state, patterns, and the protocol library. Scope:

**V can:**
- Answer questions about the user's patterns and history
- Recommend a protocol based on current context
- Explain protocol mechanics in research-grounded terms
- Handle "I have a big thing coming up, what should I do?" — routes to a check-in + protocol
- Tone-calibrate based on the user's intent path

**V cannot:**
- Provide medical advice, diagnosis, or treatment
- Replace professional mental health care
- Make claims that aren't in the protocol library or evidence base
- Express personal opinions on politics, religion, or other brand-sensitive topics

V's system prompt includes: the core loop mechanics, the state vocabulary, the protocol library, the user's intent path (for tone calibration), and the banned language list.

---

## Data rules

### What Vara captures
- Brain state check-ins (pre-protocol)
- Time window selections
- Protocol completions (with actual duration)
- State re-checks (post-protocol)
- User-chosen next steps on "didn't shift" path
- Reflection entries (journal)
- Habit completions (if user uses habits)
- Routine completions (if user uses routines)

### What Vara does NOT capture
- Precise GPS location
- Biometric identifiers
- Medical records
- Payment card numbers (handled by App Store / Google Play)
- Facial or voice data

### Privacy defaults
- All user data is private by default
- Community posts and journal entries are never shared unless the user explicitly opts in
- Sensitive data is never referenced in non-essential contexts
- The user can delete their account and data from Settings

For full privacy spec, see `Vara_Privacy_Policy.docx` in this repo.

---

## Technical defaults

### Platform
React Native 0.81 + Expo SDK 54 + TypeScript. iOS first, Android at Google Play submission per the existing `eas.json`.

### State management
Use existing patterns. Don't introduce new state libraries.

### Styling
Use existing theme/tokens. Don't introduce new color values.

### Storage
Firestore via `services/firebase/*` for persistent data. No `localStorage`, `AsyncStorage` for ephemeral UI state only.

### Dark mode
Not supported at v1. Ship light mode only. Dark mode is planned for v1.1 post-launch.

### Haptics
Use `expo-haptics`. Light impact for button taps and toggles. Success notification for successful completion. Warning (not error) for validation. No haptics during protocols or on scroll.

---

## When in doubt

1. If a design decision feels like it's adding pressure, it's wrong — simplify it.
2. If a copy string feels clever or performative, it's wrong — make it plainer.
3. If a feature feels like gamification, it's wrong — remove the gamification.
4. If a data capture feels invasive, it's wrong — don't capture it.
5. If a motion feels playful, it's wrong — reduce it.

When this guide conflicts with existing code, the guide wins. Flag the conflict to the user before changing production code, but the intent is to bring the code into alignment with these principles.

---

*This is a living document. Updates propagate via commit to the main branch of the repo. Last updated: April 2026.*
