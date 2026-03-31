export const WEEK_INSIGHT_TEMPLATES = [
  {
    id: "high_completions",
    check: (data) => {
      if (data.totalCompletions >= 14) {
        return {
          headline: "Strong week — you're building momentum",
          detail: `${data.totalCompletions} habit completions this week. Consistency is compounding.`,
        };
      }
      return null;
    },
  },
  {
    id: "journal_mood",
    check: (data) => {
      if (data.journalDays >= 3) {
        return {
          headline: "Journaling is paying off",
          detail: `You journaled ${data.journalDays} days this week. Written reflection strengthens self-awareness.`,
        };
      }
      return null;
    },
  },
  {
    id: "focus_sessions",
    check: (data) => {
      if (data.focusMinutes >= 50) {
        return {
          headline: "Deep work gains",
          detail: `${data.focusMinutes} minutes of focused time this week. Your attention muscle is growing.`,
        };
      }
      return null;
    },
  },
  {
    id: "best_day",
    check: (data) => {
      if (data.totalCompletions >= 5) {
        return {
          headline: `${data.bestDay} was your best day`,
          detail: "Look for patterns — what made that day click? Lean into it.",
        };
      }
      return null;
    },
  },
  {
    id: "getting_started",
    check: (data) => {
      if (data.totalCompletions > 0) {
        return {
          headline: "Every step counts",
          detail: `${data.totalCompletions} completions this week. You're showing up — that's what matters most.`,
        };
      }
      return null;
    },
  },
];

export function selectInsight(data) {
  if (!data) return null;
  for (const template of WEEK_INSIGHT_TEMPLATES) {
    const result = template.check(data);
    if (result) return { id: template.id, ...result };
  }
  return null;
}
