// Focus rhythms (Four-Pillar IA Phase B-3c). A quiet, opt-in capture of when
// focus tends to come most easily for the user. Stored as time-of-day keys on
// the user doc; nothing here is scored, counted, or tracked. Downstream use
// (nudge / anchor timing) is intentionally out of scope for this slice.

export interface FocusRhythmOption {
  key: string;
  label: string;
}

export const FOCUS_RHYTHM_OPTIONS: FocusRhythmOption[] = [
  { key: 'early_morning', label: 'Early morning' },
  { key: 'mid_morning', label: 'Mid-morning' },
  { key: 'afternoon', label: 'Afternoon' },
  { key: 'evening', label: 'Evening' },
  { key: 'late_night', label: 'Late at night' },
  { key: 'varies', label: 'It varies' },
];

export const FOCUS_RHYTHM_KEYS = FOCUS_RHYTHM_OPTIONS.map((o) => o.key);
