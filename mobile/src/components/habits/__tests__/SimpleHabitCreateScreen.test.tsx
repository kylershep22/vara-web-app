// SimpleHabitCreateScreen — the live habit-create surface (DASHBOARD_V2).
//
// The category capture is the reason these tests exist. A created habit keeps
// no link back to where it came from, so if the category is not captured here
// it cannot be recovered later. "Required" therefore has to mean genuinely
// blocked, not defaulted, and every one of the nine keys has to survive the
// trip to the save callback intact.

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { SimpleHabitCreateScreen } from '../SimpleHabitCreateScreen';
import { HABIT_CATEGORY_KEYS } from '../../../constants/habitTaxonomy';

function renderSheet(focusRhythmWindows?: string[]) {
  const onSave = jest.fn();
  const utils = render(
    <SimpleHabitCreateScreen
      visible
      onDismiss={jest.fn()}
      onSave={onSave}
      focusRhythmWindows={focusRhythmWindows}
    />
  );
  return { ...utils, onSave };
}

/** The Save button, found by the accessibility label it ships with. */
function saveButton(utils: ReturnType<typeof renderSheet>) {
  return utils.getByLabelText('Save Habit');
}

describe('SimpleHabitCreateScreen — category is required', () => {
  it('offers all nine categories, with Other last', () => {
    const utils = renderSheet();
    for (const key of HABIT_CATEGORY_KEYS) {
      expect(utils.getByTestId(`habit-create-category-${key}`)).toBeTruthy();
    }
    expect(utils.getByTestId('habit-create-category-other')).toBeTruthy();
  });

  it('asks a plain question, with no warning about skipping', () => {
    const utils = renderSheet();
    expect(utils.getByText(/What kind of habit is this\?/)).toBeTruthy();
    // The requirement is marked, never threatened: no copy about what breaks.
    expect(utils.queryByText(/miss|lose|won't work|skip/i)).toBeNull();
  });

  it('marks the category as required before Save is ever reached', () => {
    const utils = renderSheet();
    // Visible asterisk, matching the "Habit Name *" convention.
    expect(utils.getByText(/What kind of habit is this\? \*/)).toBeTruthy();
  });

  it('pre-selects nothing', () => {
    const utils = renderSheet();
    for (const key of HABIT_CATEGORY_KEYS) {
      const chip = utils.getByTestId(`habit-create-category-${key}`);
      expect(chip.props.accessibilityState?.selected).toBe(false);
    }
  });

  it('keeps save disabled with a name but no category', () => {
    const utils = renderSheet();
    fireEvent.changeText(utils.getByDisplayValue(''), 'Morning walk');
    expect(saveButton(utils).props.accessibilityState?.disabled).toBe(true);
  });

  it('keeps save disabled with a category but no name', () => {
    const utils = renderSheet();
    fireEvent.press(utils.getByTestId('habit-create-category-movement'));
    expect(saveButton(utils).props.accessibilityState?.disabled).toBe(true);
  });

  it('does not fire onSave while the category is missing', () => {
    const utils = renderSheet();
    fireEvent.changeText(utils.getByDisplayValue(''), 'Morning walk');
    fireEvent.press(saveButton(utils));
    expect(utils.onSave).not.toHaveBeenCalled();
  });

  it('enables save once both a name and a category are present', () => {
    const utils = renderSheet();
    fireEvent.changeText(utils.getByDisplayValue(''), 'Morning walk');
    fireEvent.press(utils.getByTestId('habit-create-category-movement'));
    expect(saveButton(utils).props.accessibilityState?.disabled).toBe(false);
  });
});

describe('SimpleHabitCreateScreen — what the category writes', () => {
  it.each([...HABIT_CATEGORY_KEYS])('passes %s through to onSave', (key) => {
    const utils = renderSheet();
    fireEvent.changeText(utils.getByDisplayValue(''), 'A habit');
    fireEvent.press(utils.getByTestId(`habit-create-category-${key}`));
    fireEvent.press(saveButton(utils));

    expect(utils.onSave).toHaveBeenCalledTimes(1);
    expect(utils.onSave.mock.calls[0][0]).toMatchObject({
      name: 'A habit',
      category: key,
    });
  });

  it('is single-select: the last pick wins and the first clears', () => {
    const utils = renderSheet();
    fireEvent.changeText(utils.getByDisplayValue(''), 'A habit');
    fireEvent.press(utils.getByTestId('habit-create-category-movement'));
    fireEvent.press(utils.getByTestId('habit-create-category-finances'));

    expect(
      utils.getByTestId('habit-create-category-movement').props.accessibilityState?.selected
    ).toBe(false);
    expect(
      utils.getByTestId('habit-create-category-finances').props.accessibilityState?.selected
    ).toBe(true);

    fireEvent.press(saveButton(utils));
    expect(utils.onSave.mock.calls[0][0].category).toBe('finances');
  });

  it('writes no legacy free-text category field', () => {
    const utils = renderSheet();
    fireEvent.changeText(utils.getByDisplayValue(''), 'A habit');
    fireEvent.press(utils.getByTestId('habit-create-category-connection'));
    fireEvent.press(saveButton(utils));

    // The legacy field belongs to the old taxonomy and its live readers.
    // Nothing on the create path may touch it.
    expect(utils.onSave.mock.calls[0][0]).not.toHaveProperty('habitCategory');
    expect(Object.keys(utils.onSave.mock.calls[0][0])).not.toContain('legacyCategory');
  });
});

describe('SimpleHabitCreateScreen — category chips are accessible', () => {
  it('exposes the group as a radiogroup of radios', () => {
    const utils = renderSheet();
    expect(
      utils.getByLabelText('What kind of habit is this? Required.').props.accessibilityRole
    ).toBe('radiogroup');
    expect(
      utils.getByTestId('habit-create-category-movement').props.accessibilityRole
    ).toBe('radio');
  });

  it('speaks "Required" as a word and never the asterisk', () => {
    const utils = renderSheet();
    // The visible label carries "*", but its own spoken label is clean, so no
    // screen reader announces "asterisk".
    expect(utils.getByLabelText('What kind of habit is this?')).toBeTruthy();
    // And the group conveys the requirement in words instead. React Native's
    // AccessibilityState has no `required` member, so this is the equivalent.
    expect(utils.getByLabelText('What kind of habit is this? Required.')).toBeTruthy();
  });

  it('labels each chip with its lay-language name, never the raw key', () => {
    const utils = renderSheet();
    expect(utils.getByTestId('habit-create-category-sleep_rest').props.accessibilityLabel).toBe(
      'Sleep & rest'
    );
    expect(
      utils.getByTestId('habit-create-category-learning_growth').props.accessibilityLabel
    ).toBe('Learning & growth');
  });

  it('gives every chip a 48px minimum target', () => {
    const utils = renderSheet();
    for (const key of HABIT_CATEGORY_KEYS) {
      const chip = utils.getByTestId(`habit-create-category-${key}`);
      const flat = Object.assign({}, ...[chip.props.style].flat(Infinity).filter(Boolean));
      expect(flat.minHeight).toBe(48);
    }
  });

  it('signals selection with more than hue: background and border both move', () => {
    const utils = renderSheet();
    const flatten = () => {
      const chip = utils.getByTestId('habit-create-category-health');
      return Object.assign({}, ...[chip.props.style].flat(Infinity).filter(Boolean));
    };
    const before = flatten();
    fireEvent.press(utils.getByTestId('habit-create-category-health'));
    const after = flatten();

    expect(after.backgroundColor).not.toBe(before.backgroundColor);
    expect(after.borderColor).not.toBe(before.borderColor);
  });
});

// ── Layer 2: the rhythm-aware timeOfDay nudge ──────────────────────────────
//
// The nudge steers the EXISTING "When?" chips. It never pre-selects, because
// 'anytime' is always lit and a silent slide would make an assignment look like
// the user's own choice. Silent unless the habit benefits from a focus window
// AND the stored rhythms point somewhere.

const NUDGE = 'habit-create-rhythm-nudge';
const ACCEPT = 'habit-create-rhythm-nudge-accept';

/** Name it, then pick a category: the two gates before anything can save. */
function fillOut(utils: ReturnType<typeof renderSheet>, category: string) {
  fireEvent.changeText(utils.getByDisplayValue(''), 'A habit');
  fireEvent.press(utils.getByTestId(`habit-create-category-${category}`));
}

describe('SimpleHabitCreateScreen — when the rhythm nudge appears', () => {
  it('offers the slot for a focus-demanding habit with a mappable rhythm', () => {
    const utils = renderSheet(['early_morning']);
    fillOut(utils, 'focus_work');

    expect(utils.getByTestId(NUDGE)).toBeTruthy();
    expect(
      utils.getByText('You said focus comes easiest for you in the morning.')
    ).toBeTruthy();
    expect(utils.getByText('Aim this for Morning')).toBeTruthy();
  });

  it('also offers for the other focus-demanding category', () => {
    const utils = renderSheet(['evening']);
    fillOut(utils, 'learning_growth');
    expect(utils.getByText('Aim this for Evening')).toBeTruthy();
  });

  it('stays silent for a category that does not benefit from a focus window', () => {
    const utils = renderSheet(['early_morning']);
    fillOut(utils, 'movement');
    expect(utils.queryByTestId(NUDGE)).toBeNull();
  });

  it('stays silent before any category is picked', () => {
    const utils = renderSheet(['early_morning']);
    fireEvent.changeText(utils.getByDisplayValue(''), 'A habit');
    expect(utils.queryByTestId(NUDGE)).toBeNull();
  });

  it('stays silent when no rhythms are set', () => {
    const utils = renderSheet([]);
    fillOut(utils, 'focus_work');
    expect(utils.queryByTestId(NUDGE)).toBeNull();
  });

  it('stays silent when the prop is absent entirely', () => {
    const utils = renderSheet();
    fillOut(utils, 'focus_work');
    expect(utils.queryByTestId(NUDGE)).toBeNull();
  });

  it('stays silent for varies-only', () => {
    const utils = renderSheet(['varies']);
    fillOut(utils, 'focus_work');
    expect(utils.queryByTestId(NUDGE)).toBeNull();
  });

  it('stays silent for late-night-only', () => {
    const utils = renderSheet(['late_night']);
    fillOut(utils, 'focus_work');
    expect(utils.queryByTestId(NUDGE)).toBeNull();
  });

  it('re-evaluates as the category changes', () => {
    const utils = renderSheet(['afternoon']);
    fillOut(utils, 'movement');
    expect(utils.queryByTestId(NUDGE)).toBeNull();

    fireEvent.press(utils.getByTestId('habit-create-category-focus_work'));
    expect(utils.getByTestId(NUDGE)).toBeTruthy();

    fireEvent.press(utils.getByTestId('habit-create-category-health'));
    expect(utils.queryByTestId(NUDGE)).toBeNull();
  });

  it('offers the first slot in the day when windows span several', () => {
    const utils = renderSheet(['evening', 'afternoon']);
    fillOut(utils, 'focus_work');
    expect(utils.getByText('Aim this for Afternoon')).toBeTruthy();
    expect(utils.queryByText('Aim this for Evening')).toBeNull();
  });
});

describe('SimpleHabitCreateScreen — offer, not assignment', () => {
  it('leaves timeOfDay as anytime while the nudge sits unanswered', () => {
    const utils = renderSheet(['early_morning']);
    fillOut(utils, 'focus_work');

    // The nudge is on screen and nothing has moved: Anytime is still what saves.
    expect(utils.getByTestId(NUDGE)).toBeTruthy();
    fireEvent.press(saveButton(utils));
    expect(utils.onSave.mock.calls[0][0].timeOfDay).toBe('anytime');
  });

  it('sets the slot only once the accept affordance is tapped', () => {
    const utils = renderSheet(['early_morning']);
    fillOut(utils, 'focus_work');
    fireEvent.press(utils.getByTestId(ACCEPT));
    fireEvent.press(saveButton(utils));

    expect(utils.onSave.mock.calls[0][0].timeOfDay).toBe('morning');
  });

  it('retires the nudge once accepted, rather than restating it', () => {
    const utils = renderSheet(['early_morning']);
    fillOut(utils, 'focus_work');
    fireEvent.press(utils.getByTestId(ACCEPT));
    expect(utils.queryByTestId(NUDGE)).toBeNull();
  });

  it('retires the nudge when the user picks a slot themselves', () => {
    // Answered by choosing something else. Re-offering would be nagging.
    const utils = renderSheet(['early_morning']);
    fillOut(utils, 'focus_work');
    fireEvent.press(utils.getByText('Evening'));
    expect(utils.queryByTestId(NUDGE)).toBeNull();
  });

  it('respects an override made after accepting', () => {
    const utils = renderSheet(['early_morning']);
    fillOut(utils, 'focus_work');
    fireEvent.press(utils.getByTestId(ACCEPT));
    fireEvent.press(utils.getByText('Evening'));
    fireEvent.press(saveButton(utils));

    expect(utils.onSave.mock.calls[0][0].timeOfDay).toBe('evening');
  });

  it('respects an override back to anytime', () => {
    const utils = renderSheet(['early_morning']);
    fillOut(utils, 'focus_work');
    fireEvent.press(utils.getByTestId(ACCEPT));
    fireEvent.press(utils.getByText('Anytime'));
    fireEvent.press(saveButton(utils));

    expect(utils.onSave.mock.calls[0][0].timeOfDay).toBe('anytime');
  });

  it('adds no second time control: accepting drives the same chips', () => {
    const utils = renderSheet(['afternoon']);
    fillOut(utils, 'focus_work');
    fireEvent.press(utils.getByTestId(ACCEPT));

    // The existing Afternoon chip is now the selected one; there is no parallel
    // picker holding its own value.
    fireEvent.press(saveButton(utils));
    expect(utils.onSave.mock.calls[0][0].timeOfDay).toBe('afternoon');
  });
});

describe('SimpleHabitCreateScreen — the nudge is perceivable and reachable', () => {
  it('exposes the accept as a real button carrying the whole offer', () => {
    const utils = renderSheet(['early_morning']);
    fillOut(utils, 'focus_work');
    const accept = utils.getByTestId(ACCEPT);

    expect(accept.props.accessibilityRole).toBe('button');
    // Rationale and offer together, so the reason is neither colour-only nor
    // dependent on reading a neighbouring line.
    expect(accept.props.accessibilityLabel).toBe(
      'You said focus comes easiest for you in the morning. Aim this for Morning'
    );
  });

  it('gives the accept a 48px target', () => {
    const utils = renderSheet(['early_morning']);
    fillOut(utils, 'focus_work');
    const flat = Object.assign(
      {},
      ...[utils.getByTestId(ACCEPT).props.style].flat(Infinity).filter(Boolean)
    );
    expect(flat.minHeight).toBe(48);
  });
});

describe('SimpleHabitCreateScreen — unchanged when no nudge applies', () => {
  it('saves exactly as before for a non-focus habit', () => {
    const utils = renderSheet(['early_morning']);
    fillOut(utils, 'movement');
    fireEvent.press(utils.getByText('Morning'));
    fireEvent.press(saveButton(utils));

    expect(utils.onSave.mock.calls[0][0]).toMatchObject({
      name: 'A habit',
      category: 'movement',
      timeOfDay: 'morning',
      frequencyType: 'daily',
    });
  });

  it('still defaults to anytime with no rhythms at all', () => {
    const utils = renderSheet();
    fillOut(utils, 'focus_work');
    fireEvent.press(saveButton(utils));
    expect(utils.onSave.mock.calls[0][0].timeOfDay).toBe('anytime');
  });
});
