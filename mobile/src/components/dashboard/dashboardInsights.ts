// Dashboard insight — a small curated, daily-rotating set for the calm Insight
// card. A static launch set behind a seam (same daily-rotation pattern as
// brainStateBriefs): swap for a content-system feed later without touching the
// card. "Reflects your day" = current state + a forward suggestion; this is the
// gentle education slot, never a stat, score, or streak.
//
// ⚠️ INTERIM copy — calm, conditional, no metrics/urgency. Final copy lands with
// the dashboard spec.

export interface DashboardInsight {
  title: string;
  body: string;
}

const INSIGHTS: DashboardInsight[] = [
  {
    title: 'Small resets add up',
    body: 'A couple of minutes to settle can change how the next hour feels.',
  },
  {
    title: 'Energy is a rhythm',
    body: 'Most people dip in the early afternoon. A short reset can meet it.',
  },
  {
    title: 'Breath leads the body',
    body: 'A slow exhale is one of the quickest ways to feel a little calmer.',
  },
  {
    title: 'Capacity, not pressure',
    body: 'The aim is a bit more room to meet your day, not another box to tick.',
  },
  {
    title: 'Light shapes your day',
    body: 'A few minutes of daylight in the morning can steady your evening.',
  },
];

/**
 * Deterministic daily rotation through the curated set (same approach as
 * brainStateBriefs.getBrainStateBrief) so the card is stable within a day and
 * changes gently day to day.
 */
export function getDashboardInsight(date: Date = new Date()): DashboardInsight {
  const dayIndex = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  return INSIGHTS[dayIndex % INSIGHTS.length];
}
