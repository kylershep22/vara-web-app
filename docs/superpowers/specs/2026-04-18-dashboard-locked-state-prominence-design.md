# Dashboard Locked-State Prominence

**Date:** 2026-04-18
**Status:** Draft
**Platform:** Mobile (React Native/Expo)
**Branch:** `feature/brain-checkin-entry-point`

---

## Overview

Strengthen the visual treatment of the `pre-checkin` dashboard phase so users clearly understand the dashboard is "locked" until they complete their morning brain check-in. Today the cards dim to `opacity: 0.5` and a small gray italic hint reads "Check in to unlock your personalized dashboard." Both treatments are too subtle — beta feedback and in-product observation show users don't always notice the gated state, and the check-in gets less engagement as a result.

This spec keeps the **preview-style** philosophy from the entry-point design (cards still visible, not hidden) but pushes the dim deeper, adds a light blur, and promotes the "unlock" hint into a proper visual divider.

### Design Principles

- **Preview, don't hide** — cards remain recognizable; users should see what's waiting for them
- **One unambiguous next action** — the check-in is the only thing that looks interactive
- **No em dashes in user-facing text**
- **Reuse existing phase machinery** — no new state, just stronger presentation of the `pre-checkin` phase

---

## Visual Changes

### Card muting (pre-checkin)

| Property | Before | After |
|---|---|---|
| Opacity | `0.5` | `0.35` |
| Blur | none | `expo-blur` intensity `15` |
| pointerEvents | `none` | `none` (unchanged) |
| Transition duration | 400ms | 400ms (unchanged) |

### "Check in to unlock" hint

The existing `<Text style={styles.checkinHint}>` is replaced by a new `<LockedDivider />` component.

| Property | Before (hint) | After (divider) |
|---|---|---|
| Position | plain text below check-in | horizontal-rule divider with centered lock icon + label |
| Font size | 13 | 16 (`Typography.fontSize.base`) |
| Font weight | regular | `Typography.fontWeight.medium` |
| Color | `Colors.textSecondary` | `Colors.textPrimary` |
| Style | italic | upright |
| Icon | none | `lock-outline` 16px, `Colors.evergreenTeal` |
| Rule lines | none | two 1px flex-1 lines in `Colors.border` flanking the label |

---

## Component: `LockedDivider`

New file: `mobile/src/components/dashboard/LockedDivider.tsx`

### Responsibility

Render a horizontal-rule divider with a centered lock icon and the label "Check in to unlock your personalized dashboard." Purely presentational — no state, no props.

### Layout

```
─────────  🔒  Check in to unlock your personalized dashboard  ─────────
```

- Root: `View` with `flexDirection: 'row'`, `alignItems: 'center'`, `marginVertical: Spacing.lg`
- Left rule: `<View style={styles.rule} />` (flex: 1, height: 1, backgroundColor: `Colors.border`)
- Center block: `View` with `flexDirection: 'row'`, `alignItems: 'center'`, gap via `marginHorizontal: Spacing.sm` on each side
  - Icon: `<MaterialCommunityIcons name="lock-outline" size={16} color={Colors.evergreenTeal} />` with `marginRight: Spacing.xs`
  - Label: `<Text>` with `fontSize: Typography.fontSize.base`, `fontWeight: Typography.fontWeight.medium`, `color: Colors.textPrimary`, `numberOfLines: 1`
- Right rule: `<View style={styles.rule} />` (same as left)

### Accessibility

- `accessibilityRole="text"`
- `accessibilityLabel="Personalized dashboard is locked until you check in"`

### Props

None. Static divider.

---

## Dependency

Add `expo-blur` at the SDK 54-compatible version (`~14.0.x`) via:

```
expo install expo-blur
```

Rationale: native blur gives a noticeably more "locked preview" feel than opacity alone. `expo-blur` is maintained by the Expo team and supported on SDK 54 for both iOS and Android (`dimezisBlurView` backend on Android). The single import is used only in `DashboardScreen.tsx`.

---

## DashboardScreen Changes

File: `mobile/src/screens/DashboardScreen.tsx`

### Shared values

```ts
const cardOpacity = useSharedValue(dashboardPhase === 'pre-checkin' ? 0.35 : 1);
const blurIntensity = useSharedValue(dashboardPhase === 'pre-checkin' ? 15 : 0);

useEffect(() => {
  cardOpacity.value = withTiming(
    dashboardPhase === 'pre-checkin' ? 0.35 : 1,
    { duration: 400 }
  );
  blurIntensity.value = withTiming(
    dashboardPhase === 'pre-checkin' ? 15 : 0,
    { duration: 400 }
  );
}, [dashboardPhase]);
```

### Render structure (`pre-checkin` region)

Replace:

```tsx
{dashboardPhase === 'pre-checkin' && (
  <Text style={styles.checkinHint}>
    Check in to unlock your personalized dashboard
  </Text>
)}

<Animated.View
  style={[mutedStyle]}
  pointerEvents={isMuted ? 'none' : 'auto'}
>
  {cardOrder.map((cardId) => renderCard(cardId))}
</Animated.View>
```

With:

```tsx
{dashboardPhase === 'pre-checkin' && (
  <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)}>
    <LockedDivider />
  </Animated.View>
)}

<Animated.View
  style={[cardWrapperStyle]}
  pointerEvents={isMuted ? 'none' : 'auto'}
>
  <AnimatedBlurView
    animatedProps={blurAnimatedProps}
    tint="light"
    style={StyleSheet.absoluteFill}
    pointerEvents="none"
  />
  {cardOrder.map((cardId) => renderCard(cardId))}
</Animated.View>
```

Where:
- `AnimatedBlurView = Animated.createAnimatedComponent(BlurView)`
- `blurAnimatedProps = useAnimatedProps(() => ({ intensity: blurIntensity.value }))`
- `cardWrapperStyle = useAnimatedStyle(() => ({ opacity: cardOpacity.value }))` (renamed from `mutedStyle`)

The `BlurView` is always mounted so intensity can animate smoothly; at intensity 0 it's visually inert.

### Styles cleanup

Remove `styles.checkinHint` — no longer used.

---

## Animation Behavior

| Event | Element | Animation |
|---|---|---|
| Mount in `pre-checkin` | Cards | Static at opacity 0.35, blur intensity 15 (no entrance animation) |
| Mount in `pre-checkin` | LockedDivider | Static (no entrance animation) |
| Phase flips `pre-checkin` → `post-checkin` | Cards | Opacity 0.35 → 1, blur 15 → 0, both over 400ms |
| Phase flips `pre-checkin` → `post-checkin` | LockedDivider | FadeOut 200ms (via reanimated Layout API) |
| Phase flips reverse (rare — only via dev tools) | Cards | Opacity 1 → 0.35, blur 0 → 15, 400ms |
| Phase flips reverse | LockedDivider | FadeIn 200ms |

The divider's faster 200ms fade means it disappears before the reveal completes, so the user sees the dashboard "wake up" after the lock is removed rather than having the divider linger.

---

## Testing

### Unit tests

`mobile/src/components/dashboard/__tests__/LockedDivider.test.tsx`:
- Renders the lock icon (`lock-outline`).
- Renders the text "Check in to unlock your personalized dashboard".
- Has accessibility label "Personalized dashboard is locked until you check in".
- Matches snapshot.

### Integration tests

Extend or create `mobile/src/screens/__tests__/DashboardScreen.test.tsx`:
- In `pre-checkin` phase: `LockedDivider` is present in the tree; card wrapper has `pointerEvents="none"`.
- In `post-checkin` phase: `LockedDivider` is absent; card wrapper has `pointerEvents="auto"`.
- In `returning` phase: `LockedDivider` is absent.

### Manual test plan

1. Fresh login on an account with no check-in for today → verify locked state is visibly dimmer + blurred and the divider is prominent and readable.
2. Tap a brain-state option → verify the cards smoothly animate back to full opacity and the blur/divider fade out within ~400ms.
3. Pull-to-refresh while in `pre-checkin` → locked state persists and no flicker on the BlurView.
4. Test on a low-end Android device → confirm no dropped frames during the phase transition.
5. Test with VoiceOver/TalkBack → divider is announced with the accessibility label; muted cards are not focusable.

---

## Files Affected

| File | Change |
|---|---|
| `mobile/package.json` | Add `expo-blur` dependency |
| `mobile/src/components/dashboard/LockedDivider.tsx` | New |
| `mobile/src/components/dashboard/__tests__/LockedDivider.test.tsx` | New |
| `mobile/src/components/dashboard/index.ts` | Export `LockedDivider` |
| `mobile/src/screens/DashboardScreen.tsx` | Update muted rendering, add blur, replace hint with divider |
| `mobile/src/screens/__tests__/DashboardScreen.test.tsx` | New or extended |

---

## Out of Scope

- Changes to the check-in UI itself (sizing, copy, interaction) — untouched.
- Changes to any other phase (`post-checkin`, `returning`) — untouched.
- Changes to card ordering or content — untouched.
- Haptic feedback on the check-in (could be a future enhancement).
