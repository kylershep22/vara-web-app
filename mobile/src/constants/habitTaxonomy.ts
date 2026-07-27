// Habit taxonomy — the CONTROLLED nine-key category captured at habit creation.
//
// Why this exists: a created habit keeps no link back to whatever the user
// picked it from, so a habit's kind cannot be inferred after the fact. It is
// captured at creation or it is lost. Downstream features (rhythm-aware time
// suggestions, habit grouping) read the derived mapping below rather than
// guessing from the habit's name.
//
// DO NOT CONFUSE THIS WITH `Habit.category`. That is a separate, older,
// free-text field with its own live readers (Connection completion-sheet
// routing, the cognitive-reserve badge, the habit list meta line). The two
// fields coexist deliberately and must never be merged, aliased, or read
// interchangeably. Several labels collide by coincidence only: "Health",
// "Mindfulness" and "Connection" appear in both vocabularies and mean different
// things to different readers. See the note on Habit.habitCategory in
// types/models.ts.
//
// Storage rule: only the KEY is written to the habit document. Pillar and
// focus-demand are derived here at read time, so changing a mapping is a
// one-line edit with no habit migration.

/**
 * The nine keys, in the order they are offered to the user.
 *
 * `other` is deliberately last, and is a discovery signal rather than a real
 * category: a high `other` rate means the taxonomy is missing something people
 * actually track. The stored key IS that instrumentation (it is queryable), so
 * no separate analytics event is needed.
 */
export const HABIT_CATEGORY_KEYS = [
  'movement',
  'sleep_rest',
  'focus_work',
  'mindfulness',
  'learning_growth',
  'health',
  'connection',
  'finances',
  'other',
] as const;

export type HabitCategoryKey = (typeof HABIT_CATEGORY_KEYS)[number];

/**
 * The pillar a category rolls up to, in the five-pillar IA namespace.
 *
 * Deliberately NOT the `BrainPillar` union in types/models.ts (growth /
 * energy / focus / resilience / connection), which is the content taxonomy and
 * has no `community` member. Same reasoning as the route names in
 * navigation/routes.ts: overlapping literals across two taxonomies invite
 * exactly the kind of accidental cross-reading this file is trying to prevent.
 */
export type HabitPillar = 'focus' | 'energy' | 'community';

export interface HabitCategoryMapping {
  /** Null where the category legitimately belongs to no pillar. */
  pillar: HabitPillar | null;
  /** Whether this kind of habit benefits from a protected focus window. */
  focusDemand: boolean;
}

/** User-facing chip labels. Lay language, never the raw key. */
export const HABIT_CATEGORY_LABELS: Record<HabitCategoryKey, string> = {
  movement: 'Movement',
  sleep_rest: 'Sleep & rest',
  focus_work: 'Focus & work',
  mindfulness: 'Mindfulness',
  learning_growth: 'Learning & growth',
  health: 'Health',
  connection: 'Connection',
  finances: 'Finances',
  other: 'Other',
};

/**
 * The single source of truth for what a category MEANS to the backend.
 *
 * Typed as a Record over the literal union, not Record<string, ...>, so adding
 * a key to HABIT_CATEGORY_KEYS without mapping it is a compile error rather
 * than a silent undefined at runtime. (The older
 * COGNITIVE_RESERVE_CATEGORIES map in habitCategories.ts is loosely typed,
 * which is how its keys were able to drift out of sync unnoticed.)
 */
export const HABIT_CATEGORY_MAPPING: Record<HabitCategoryKey, HabitCategoryMapping> = {
  movement: { pillar: 'energy', focusDemand: false },
  sleep_rest: { pillar: 'energy', focusDemand: false },
  focus_work: { pillar: 'focus', focusDemand: true },
  mindfulness: { pillar: 'energy', focusDemand: false },
  learning_growth: { pillar: 'focus', focusDemand: true },
  health: { pillar: null, focusDemand: false },
  connection: { pillar: 'community', focusDemand: false },
  // PROVISIONAL: mapping review may flip focusDemand to true. One-line change,
  // no habit migration, because only the key is stored.
  finances: { pillar: null, focusDemand: false },
  other: { pillar: null, focusDemand: false },
};

/**
 * The mapping for a stored key, or null when the habit predates this capture
 * (habitCategory is null on every habit created before this feature) or the
 * stored value is not a key we know.
 *
 * Pre-feature habits are NOT retroactively classified. Callers must treat null
 * as "unknown", never as a default category.
 */
export function getHabitCategoryMapping(
  key: HabitCategoryKey | null | undefined
): HabitCategoryMapping | null {
  if (!key) return null;
  return HABIT_CATEGORY_MAPPING[key] ?? null;
}

/**
 * Whether a habit benefits from a protected focus window.
 *
 * False for unknown and pre-feature habits: absence of a signal is not a
 * positive one, and a false positive here would put a suggestion in front of
 * someone the app knows nothing about.
 */
export function habitBenefitsFromFocusWindow(
  key: HabitCategoryKey | null | undefined
): boolean {
  return getHabitCategoryMapping(key)?.focusDemand === true;
}

/** The pillar a habit rolls up to, or null when it has none or is unknown. */
export function habitPillar(
  key: HabitCategoryKey | null | undefined
): HabitPillar | null {
  return getHabitCategoryMapping(key)?.pillar ?? null;
}
