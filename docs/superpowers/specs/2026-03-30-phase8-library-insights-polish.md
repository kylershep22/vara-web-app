# Phase 8: Library & Insights Polish — Design Spec

**Date:** 2026-03-30
**Status:** Pending
**Parent:** Web-Mobile Parity Roadmap

## Problem

Web library pages exist but lack a unified Discover hub entry point. Web Insights page has basic charts but is missing the mobile's habit heatmap, sparkline trend cards, and narrative recap. The Week Insight Card was deferred from Phase 1 and needs to be added to the dashboard.

## Solution

Add a Discover hub, align Insights visualizations with mobile, and complete the Week Insight Card integration.

## Feature 1: Discover Hub

### Purpose
Central entry point for all wellness library content, replacing direct sidebar links to individual categories.

### Layout
1. **Header:** "Discover" title + subtitle "Science-backed tools for your brain & body"
2. **Featured card:** Welcome message explaining the library
3. **Browse by Category** (4 cards in a 2x2 grid):
   - Breathwork (Wind icon, teal accent) → `/discover/breathwork`
   - Sleep (Moon icon, sage accent) → `/discover/sleep`
   - Movement (Activity icon, amber accent) → `/discover/movement`
   - Masterclass (GraduationCap icon, warm accent) → `/discover/masterclass`
4. **Popular Content** section (optional — quick links to top items)

### Navigation Change
- Sidebar "Discover" section gets a single "Discover" entry instead of 4 separate links
- Individual category pages remain at their current routes
- Discover hub at `/discover`

## Feature 2: Insights Visualizations

### Habit Heatmap
- **30-day grid** layout (6 rows x 5 columns or calendar-style)
- **5-level color scale:** white → light sage → mid sage → teal mid → dark teal
- Reflects daily habit completion counts (0, 1, 2, 3, 4+ completions)
- **Legend:** "Less" → "More" with color swatches
- **Data:** Aggregated from `habitCompletions` collection, grouped by dateISO

### Sparkline Trend Cards
- Row of 2-3 cards, each showing:
  - Metric label (e.g., "Habit Completions", "Focus Sessions", "Journal Entries")
  - Large value number
  - Micro sparkline chart (7-point SVG line)
  - Trend indicator: "Improving" / "Steady" / "Needs attention" with color
- **Data sources:** habitCompletions, focusSessions, journalEntries (count per day over 7 days)

### Narrative Recap
- AI-generated prose summary of the week/month
- Uses existing `/api/journal-summary` endpoint or new `/api/weekly-narrative` endpoint
- Cached for 7 days (localStorage)
- Fallback text if insufficient data

### Timeframe Selector
- Tabs: Week | Month (start with these two)
- Adjusts date range for all visualizations

## Feature 3: Week Insight Card (Dashboard)

Deferred from Phase 1 because `useWeeklyCorrelations` and `weekInsightTemplates` didn't exist on web.

### Implementation
1. Port `useWeeklyCorrelations` hook from mobile to web
2. Port `weekInsightTemplates` constants (insight selection logic)
3. Create `WeekInsightCard` component
4. Add back to Dashboard.jsx

### Weekly Correlations Hook
Fetches 7 days of data from:
- `morningCheckIns` or `brainStateCheckIns` (mood/energy)
- `journalEntries` (journaling days)
- `habitCompletions` (completion rates)
- `focusSessions` (focus minutes)

Computes correlations:
- Sleep-Habit correlation
- Energy-Habit correlation
- Journal-Mood correlation
- Stress trend
- Top driver
- Best day

### Insight Selection (Priority Order)
1. Week-over-week score improvement
2. Sleep-Habit correlation
3. Journal-Mood correlation
4. Energy-Habit correlation
5. Stress decline
6. Best day discovery

### Card UI
- Lightbulb icon with 3px left accent bar (teal)
- Headline text (bold)
- Supporting text (detail)
- "See your full week story" link → `/insights`
- Dismiss button (X icon)
- Dismissed state stored in localStorage

## Web Files to Create/Modify

| File | Action |
|------|--------|
| `src/pages/Discover.jsx` | Create — Hub page |
| `src/components/insights/HabitHeatmap.jsx` | Create — 30-day heatmap |
| `src/components/insights/SparklineTrendCard.jsx` | Create — Metric + sparkline |
| `src/components/insights/NarrativeRecap.jsx` | Create — AI weekly summary |
| `src/components/dashboard/WeekInsightCard.jsx` | Create — Dashboard insight card |
| `src/hooks/useWeeklyCorrelations.js` | Create — Port from mobile |
| `src/constants/weekInsightTemplates.js` | Create — Insight selection logic |
| `src/pages/Insights.jsx` | Modify — Add heatmap, sparklines, narrative, timeframe selector |
| `src/pages/Dashboard.jsx` | Modify — Re-add WeekInsightCard |
| `src/components/layout/SidebarLayout.jsx` | Modify — Update Discover section |
| `src/App.js` | Modify — Add `/discover` route |

## Out of Scope
- Podcast section (no dedicated podcast feature exists in mobile — audio content handled generically)
- Quarter/Year/All-time timeframes (start with Week/Month)
- Interactive heatmap (click to see day details)
