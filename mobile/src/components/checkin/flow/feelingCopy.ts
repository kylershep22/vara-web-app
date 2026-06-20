// Feeling-read copy for the state-pick screen (Vara_Engine_Contract.md §2).
//
// The valence read stays the engine's binary pole — Valence is 'good' | 'hard'
// and nothing here changes that. This is a PRESENTATION layer only: each
// situation gets its own question and its own two labels, and every label is
// pinned to one of the existing poles. Nothing under mobile/src/engine, no map,
// no catalog tag is touched; the engine still consumes exactly { arousal,
// valence } as before.

import type { Situation, Valence } from '../../../engine';

export interface FeelingOption {
  label: string;
  valence: Valence;
}

export interface FeelingCopy {
  question: string;
  // Good pole first, hard pole second — matches the energy block's
  // higher-then-lower order so the two reads scan consistently.
  options: [FeelingOption, FeelingOption];
}

export const FEELING_COPY: Record<Situation, FeelingCopy> = {
  get_through_hard: {
    question: 'And how are you doing?',
    options: [
      { label: 'Holding up', valence: 'good' },
      { label: 'Struggling', valence: 'hard' },
    ],
  },
  quiet_mind: {
    question: 'And how busy is it?',
    options: [
      { label: 'Manageable', valence: 'good' },
      { label: 'Too much', valence: 'hard' },
    ],
  },
  find_energy: {
    question: 'And how are you feeling?',
    options: [
      { label: 'Okay', valence: 'good' },
      { label: 'Rough', valence: 'hard' },
    ],
  },
  wind_down: {
    question: 'And are you starting to settle?',
    options: [
      { label: 'Getting there', valence: 'good' },
      { label: 'Not yet', valence: 'hard' },
    ],
  },
  grip_on_day: {
    question: "And how's the day going?",
    options: [
      { label: 'Mostly steady', valence: 'good' },
      { label: 'Scattered', valence: 'hard' },
    ],
  },
  just_reset: {
    question: 'And how are you feeling?',
    options: [
      { label: 'Okay', valence: 'good' },
      { label: 'Rough', valence: 'hard' },
    ],
  },
};
