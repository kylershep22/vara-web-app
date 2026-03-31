# Insights Screen UI Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the Insights screen with better zero-state handling, honest data rendering, sentence-case labels, conditional trend text, a contextual nudge for sparse data, and an updated heatmap header.

**Architecture:** Five independent component-level changes plus a nav bar update. Each insight component (`HeroSummaryCard`, `SparklineTrendCard`, `RingProgressCard`, `HabitHeatmap`) is modified in isolation. The `InsightsScreen` orchestrator gets minor prop/label updates. Nav bar is updated in `AppNavigator.tsx`.

**Tech Stack:** React Native, react-native-reanimated, react-native-svg, Firestore

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `mobile/src/navigation/AppNavigator.tsx` | **Modify** | Task 1: Nav bar Mist White |
| `mobile/src/components/insights/HeroSummaryCard.tsx` | **Modify** | Task 2: Sentence case eyebrow, zero-state ring + subtitle |
| `mobile/src/components/insights/SparklineTrendCard.tsx` | **Modify** | Task 3: Honest sparkline for single data point, conditional trend labels |
| `mobile/src/screens/InsightsScreen.tsx` | **Modify** | Task 3: Pass `dataPointCount` to sparkline cards, fix label casing |
| `mobile/src/components/insights/RingProgressCard.tsx` | **Modify** | Task 4: Sentence case title, contextual nudge |
| `mobile/src/components/insights/HabitHeatmap.tsx` | **Modify** | Task 5: Updated header with icon-circle + inline "Past 30 days", remove subheading |

---

### Task 1: Nav Bar Update

**Files:**
- Modify: `mobile/src/navigation/AppNavigator.tsx`

Apply the same Mist White treatment used for the Sleep screens to the Insights and InsightsDetail (if it exists) screen registrations.

- [ ] **Step 1: Update Insights screen header options**

Find the Insights AppStack.Screen registration (around line 534-546). Replace the header options:

```typescript
options={{
  animation: 'slide_from_right',
  headerShown: true,
  title: 'Insights',
  headerStyle: { backgroundColor: Colors.mistWhite },
  headerTintColor: Colors.evergreenTeal,
  headerTitleStyle: { fontWeight: '600', color: Colors.softCharcoal },
  headerShadowVisible: false,
}}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep "AppNavigator" | head -5`

- [ ] **Step 3: Commit**

```bash
git add mobile/src/navigation/AppNavigator.tsx
git commit -m "feat: update Insights nav bar to Mist White background"
```

---

### Task 2: HeroSummaryCard — Zero State + Sentence Case

**Files:**
- Modify: `mobile/src/components/insights/HeroSummaryCard.tsx`

Three changes:
1. Eyebrow text → sentence case, no letter spacing
2. Ring shows "—" + "check in" when `checkInsCount === 0`
3. Subtitle shows "Your score appears after your first check-in" when `checkInsCount === 0`

- [ ] **Step 1: Update the eyebrow text**

Replace line 118:
```typescript
<Text style={styles.eyebrow}>{timeframeLabel.toUpperCase()} AT A GLANCE</Text>
```
with:
```typescript
<Text style={styles.eyebrow}>{timeframeLabel} at a glance</Text>
```

Update the `eyebrow` style — remove `letterSpacing`, change `fontWeight` and `color`:
```typescript
eyebrow: {
  fontSize: 12,
  fontWeight: '500',
  color: 'rgba(255,255,255,0.55)',
},
```

- [ ] **Step 2: Update RingProgress for zero state**

Modify the `RingProgress` component to accept `checkInsCount`:

```typescript
const RingProgress: React.FC<{ percentage: number; size: number; checkInsCount: number }> = ({
  percentage,
  size,
  checkInsCount,
}) => {
```

Update the ring value display (replace lines 80-83):

```tsx
<View style={[styles.ringValueContainer, { width: size, height: size }]}>
  {checkInsCount === 0 ? (
    <View style={{ alignItems: 'center' }}>
      <Text style={styles.ringValueZero}>—</Text>
      <Text style={styles.ringCheckInLabel}>check in</Text>
    </View>
  ) : (
    <Text style={styles.ringValue}>{percentage}%</Text>
  )}
</View>
```

When `checkInsCount === 0`, set the ring stroke opacity lower. Update the background ring stroke:
```typescript
stroke="rgba(255,255,255,0.18)"
strokeWidth={4.5}
```

Also set the progress ring strokeWidth to 4.5 to match.

Pass `checkInsCount` from the parent:
```tsx
<RingProgress percentage={readinessScore || 0} size={54} checkInsCount={checkInsCount} />
```
(Note: the prop is called `checkInsCount` in `HeroSummaryCardProps`)

- [ ] **Step 3: Update subtitle for zero state**

Replace the subtitle rendering (line 120-122):

```tsx
<Text style={[styles.subtitle, checkInsCount === 0 && styles.subtitleZero]}>
  {checkInsCount === 0
    ? 'Your score appears after your first check-in'
    : `${getTrendText()} · ${checkInsCount} check-in${checkInsCount !== 1 ? 's' : ''}`
  }
</Text>
```

Add the zero-state styles:
```typescript
ringValueZero: {
  fontSize: 20,
  fontWeight: '700',
  color: 'rgba(255,255,255,0.4)',
},
ringCheckInLabel: {
  fontSize: 7.5,
  color: 'rgba(255,255,255,0.5)',
  letterSpacing: 0.3,
  marginTop: -2,
},
subtitleZero: {
  fontSize: 10,
  color: 'rgba(255,255,255,0.75)',
  lineHeight: 15,
},
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep "HeroSummaryCard" | head -5`

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/insights/HeroSummaryCard.tsx
git commit -m "feat: add zero-state handling and sentence case to Brain Readiness card"
```

---

### Task 3: SparklineTrendCard — Honest Data + Conditional Trends

**Files:**
- Modify: `mobile/src/components/insights/SparklineTrendCard.tsx`
- Modify: `mobile/src/screens/InsightsScreen.tsx`

#### SparklineTrendCard.tsx changes:

- [ ] **Step 1: Add `dataPointCount` prop**

Update the interface:
```typescript
interface SparklineTrendCardProps {
  label: string;
  value: string | number;
  data: number[];
  color: string;
  trend: 'up' | 'steady' | 'down';
  dataPointCount?: number; // number of real data points (days with activity)
}
```

Destructure it in the component.

- [ ] **Step 2: Update Sparkline for single-point rendering**

In the `Sparkline` component, after the existing `if (data.length === 0)` check, add handling for single real data point. Count real data points as non-zero values:

```typescript
const realPoints = data.filter(v => v > 0).length;
```

When `realPoints <= 1`, render a flat baseline with a single vertical rise:

```tsx
if (realPoints <= 1) {
  // Find the first non-zero point (or use last point as fallback)
  const firstRealIndex = data.findIndex(v => v > 0);
  const idx = firstRealIndex >= 0 ? firstRealIndex : data.length - 1;
  const val = data[idx] || 0;
  const baseY = height - padding - 3;
  const pointX = padding + (idx / Math.max(data.length - 1, 1)) * chartWidth;
  const pointY = val > 0 ? padding + chartHeight * 0.3 : baseY; // Place dot at ~70% height

  return (
    <Svg width={width} height={height}>
      {/* Flat baseline */}
      <Path
        d={`M ${padding} ${baseY} L ${width - padding} ${baseY}`}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeOpacity={0.3}
        strokeLinecap="round"
      />
      {val > 0 && (
        <>
          {/* Vertical rise to data point */}
          <Path
            d={`M ${pointX} ${baseY} L ${pointX} ${pointY}`}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
          />
          {/* Data point dot */}
          <Circle cx={pointX} cy={pointY} r={2.5} fill={color} />
        </>
      )}
    </Svg>
  );
}
```

Place this block after the `if (data.length === 0)` return and before the existing multi-point logic.

- [ ] **Step 3: Update trend text to be conditional**

Replace the `getTrendText` and `getTrendIcon` functions, and update the trend rendering:

```typescript
const getRealDataCount = () => data.filter(v => v > 0).length;

const getTrendDisplay = () => {
  const realCount = dataPointCount ?? getRealDataCount();
  if (realCount < 3) {
    return { text: `Day ${realCount} of 7`, color: VARA_COLORS.sageGray, icon: '' };
  }
  switch (trend) {
    case 'up':
      return { text: '\u2191 Improving', color: VARA_COLORS.tealMid, icon: '' };
    case 'down':
      return { text: '\u2193 Needs attention', color: '#D97A6E', icon: '' };
    default:
      return { text: 'Trending steady', color: VARA_COLORS.sageGray, icon: '' };
  }
};
```

Replace the trend Text element:
```tsx
const trendDisplay = getTrendDisplay();
// ...
<Text style={[styles.trend, { color: trendDisplay.color }]}>
  {trendDisplay.text}
</Text>
```

- [ ] **Step 4: Update InsightsScreen.tsx — label casing and dataPointCount**

In `InsightsScreen.tsx`, find the `SparklineTrendCardRow` usage (around line 588-603). Update:

1. Change `label: 'Days Engaged'` → `label: 'Days engaged'`
2. Add `dataPointCount` to both cards. Calculate it from the data:

```typescript
const activeDaysCount = dailyCheckIns.filter(v => v > 0).length;
```

Pass it:
```typescript
{
  label: 'Days engaged',
  value: `${metrics.habits.completions}`,
  data: dailyCheckIns,
  color: VARA_COLORS.apricot,
  trend: getCheckInsTrend(),
  dataPointCount: activeDaysCount,
},
{
  label: 'Check-ins',
  value: metrics.habits.completions.toString(),
  data: dailyCheckIns,
  color: VARA_COLORS.teal,
  trend: getCheckInsTrend(),
  dataPointCount: activeDaysCount,
},
```

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep "SparklineTrendCard\|InsightsScreen" | head -5`

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/insights/SparklineTrendCard.tsx mobile/src/screens/InsightsScreen.tsx
git commit -m "feat: honest sparkline rendering and conditional trend labels"
```

---

### Task 4: RingProgressCard — Sentence Case + Contextual Nudge

**Files:**
- Modify: `mobile/src/components/insights/RingProgressCard.tsx`

- [ ] **Step 1: Update title to sentence case**

Change line 120:
```typescript
<Text style={styles.title}>Goal & Habit Progress</Text>
```
to:
```typescript
<Text style={styles.title}>Goal & habit progress</Text>
```

- [ ] **Step 2: Add totalCheckIns prop and nudge**

Update the interface:
```typescript
interface RingProgressCardProps {
  goals: { percentage: number };
  habits: { percentage: number };
  tasks: { percentage: number };
  totalCheckIns?: number;
}
```

Destructure `totalCheckIns` in the component.

Add the nudge condition and rendering after the `ringsRow` View:

```tsx
{/* Contextual nudge for sparse data */}
{totalCheckIns !== undefined && totalCheckIns < 3 &&
  [goals.percentage, habits.percentage, tasks.percentage].filter(p => p === 0).length >= 2 && (
  <View style={styles.nudge}>
    <Text style={styles.nudgeText}>
      Check-ins and completed habits will build this out over time.
    </Text>
  </View>
)}
```

Add the nudge styles:
```typescript
nudge: {
  backgroundColor: 'rgba(213,227,209,0.38)',
  borderLeftWidth: 2.5,
  borderLeftColor: VARA_COLORS.teal,
  borderTopRightRadius: 8,
  borderBottomRightRadius: 8,
  paddingVertical: 8,
  paddingHorizontal: 10,
  marginTop: 8,
},
nudgeText: {
  fontSize: 10,
  fontWeight: '400',
  color: VARA_COLORS.charcoal,
  lineHeight: 16,
},
```

- [ ] **Step 3: Pass totalCheckIns from InsightsScreen**

In `InsightsScreen.tsx`, find the `RingProgressCard` usage (around line 608-612). Add the `totalCheckIns` prop:

```typescript
<RingProgressCard
  goals={{ percentage: metrics.goals.avgProgress }}
  habits={{ percentage: metrics.habits.completionRate }}
  tasks={{ percentage: metrics.tasks.completionRate }}
  totalCheckIns={metrics.habits.completions}
/>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep "RingProgressCard\|InsightsScreen" | head -5`

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/insights/RingProgressCard.tsx mobile/src/screens/InsightsScreen.tsx
git commit -m "feat: add contextual nudge and sentence case to Goal & Habit Progress card"
```

---

### Task 5: HabitHeatmap — Updated Header

**Files:**
- Modify: `mobile/src/components/insights/HabitHeatmap.tsx`

Modify the header inside the component: icon-circle pattern + "Habit activity" (sentence case) + inline "Past 30 days" secondary label. Remove the separate subheading.

- [ ] **Step 1: Update the header JSX**

Replace the header and subheading blocks (lines 76-87):

```tsx
{/* Header */}
<View style={styles.header}>
  <View style={styles.iconCircle}>
    <Icon name="calendar-blank-outline" size={14} color={VARA_COLORS.teal} />
  </View>
  <Text style={styles.title}>Habit activity</Text>
  <Text style={styles.secondaryLabel}>Past {daysToShow} days</Text>
</View>
```

- [ ] **Step 2: Update styles**

Replace `header`, `headerLeft`, `iconContainer`, `title`, and `subheading` styles with:

```typescript
header: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 7,
},
iconCircle: {
  width: 27,
  height: 27,
  borderRadius: 14,
  backgroundColor: 'rgba(213,227,209,0.65)',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 8,
},
title: {
  fontSize: 11,
  fontWeight: '600',
  color: VARA_COLORS.charcoal,
},
secondaryLabel: {
  fontSize: 9,
  fontWeight: '400',
  color: VARA_COLORS.sageGray,
  marginLeft: 8,
},
```

Remove the now-unused `headerLeft` and `subheading` styles.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep "HabitHeatmap" | head -5`

- [ ] **Step 4: Commit**

```bash
git add mobile/src/components/insights/HabitHeatmap.tsx
git commit -m "feat: update Habit Activity header with icon-circle and inline secondary label"
```

---

### Task 6: Manual QA Checklist

- [ ] **Step 1: Nav bar** — Insights has Mist White background, Soft Charcoal title, Evergreen Teal back arrow.

- [ ] **Step 2: Brain Readiness zero state** — With a fresh/empty account, the ring shows "—" with "check in" below it, not "0%". Subtitle reads "Your score appears after your first check-in".

- [ ] **Step 3: Eyebrow text** — "This week at a glance" in sentence case, no letter spacing. Not "THIS WEEK AT A GLANCE".

- [ ] **Step 4: Metric card labels** — "Days engaged" (sentence case), "Check-ins" (unchanged).

- [ ] **Step 5: Sparkline Day 1** — With only 1 day of activity, sparkline shows a flat baseline with a single data point. No fabricated multi-point curve.

- [ ] **Step 6: Trend labels** — With < 3 data points, shows "Day X of 7". With 3+, shows appropriate trend text ("Improving", "Needs attention", or "Trending steady").

- [ ] **Step 7: Goal & habit progress title** — "Goal & habit progress" in sentence case.

- [ ] **Step 8: Contextual nudge** — When 2+ metrics are at 0% and totalCheckIns < 3, Dew Sage nudge appears: "Check-ins and completed habits will build this out over time." Hidden when condition not met.

- [ ] **Step 9: Habit activity header** — Icon-circle with calendar icon + "Habit activity" + "Past 30 days" inline. No separate subheading inside the card. No ALL CAPS.

- [ ] **Step 10: No regressions** — Filter chips unchanged. Brain Readiness card layout unchanged when populated. Heatmap grid/legend unchanged. Weekly activity section unchanged.
