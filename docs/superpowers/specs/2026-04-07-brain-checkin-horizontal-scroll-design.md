# BrainStateCheckin — Horizontal Scroll (Mobile)

**Date:** 2026-04-07
**Platform:** Mobile (React Native)
**File:** `mobile/src/components/dashboard/BrainStateCheckin.tsx`

## Problem

The expanded (not-yet-checked-in) state of the dashboard brain check-in card renders the 5 brain states as a vertical stack of rows, each with label + description. This takes up a large amount of vertical space on the home dashboard before the user has checked in for the day.

## Goal

Tighten the first-view experience by replacing the vertical stack with a horizontal, scrollable row of pills (dot + label only). No changes to post-selection behavior.

## Scope

**In scope:** Only the expanded state render path in `BrainStateCheckin.tsx`.

**Out of scope:**
- Collapsed state (already-checked-in row)
- Week trend section
- Captured confirmation overlay
- Loading overlay
- `BRAIN_STATES` data array (descriptions remain in data for potential future use)
- Web version of this component

## Changes

### 1. Copy
- Prompt: `"How's your brain feeling?"` → `"How are you feeling right now?"`
- Subtext: `"Just one tap. No wrong answers."` (unchanged)

### 2. Layout
Replace the vertical `View` (`statesContainer`) with a horizontal `ScrollView`:
- `horizontal`
- `showsHorizontalScrollIndicator={false}`
- `contentContainerStyle`: horizontal padding so first/last pills don't butt against card edges; gap between pills via `marginRight` or `gap`

### 3. Pill style
Each pill is a `TouchableOpacity` containing only a color dot + label (no description):
- Shape: `borderRadius: 999`
- Border: `1px` `Colors.border`
- Padding: `paddingHorizontal: Spacing.base`, `paddingVertical: Spacing.sm`
- Background: transparent (border only) when unselected; `Colors.dewSage` when selected
- Dot: existing 10x10 colored dot, `marginRight: Spacing.xs`
- Label: `Typography.fontSize.sm`, `fontWeight.medium`, `Colors.textPrimary`
- Flex direction row, items centered

### 4. Sizing
Pills size to content (natural widths). With 5 states, the 5th will naturally peek/scroll on narrow screens — no fixed widths, no snap.

### 5. Behavior
`handleSelect` unchanged: tap still triggers light haptic, shows captured overlay for 2s, then collapses.

### 6. Cleanup
Remove unused styles: `statesContainer`, `stateRow`, `stateRowSelected`, `stateTextContainer`, `stateLabel`, `stateDescription`. Add new pill styles: `scrollContent`, `pill`, `pillSelected`, `pillLabel`.

## Testing

Manual verification on device/simulator:
- All 5 pills reachable via horizontal scroll
- Tap records check-in, triggers captured overlay, and collapses card
- Collapsed state and week trend render unchanged
- Expanded card is visibly shorter vertically than before
- Selected state styling visible during the brief pre-collapse window

## Non-goals

- No changes to data model, services, or hooks
- No animation changes
- No accessibility regressions (label remains the accessible name of each pill)
