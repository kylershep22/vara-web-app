// The pre-pick hero reads as a standing invitation, not an undone task.
//
// WHY THIS NEEDS A TEST AT ALL. Skipping the picker is a first-class answer, so
// this card is an ALL-DAY resting state rather than a flash before a modal. It
// can sit on Home from morning to bedtime, and the failure mode is not that it
// breaks: it is that someone later adds a badge, a count, a warning colour or a
// "not yet" and turns a calm invitation into a nag. Prose in the component says
// so; this holds it to that.

import React from 'react';
import { render, screen } from '@testing-library/react-native';

import { SetTodayCard } from '../SetTodayCard';
import { Colors } from '../../../constants';
import { PICKER_COPY } from '../../../screens/weekly/copy';

/** Every style object React actually applied, flattened out of the tree. */
function renderedStyles(): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const visit = (node: any) => {
    if (!node || typeof node !== 'object') return;
    const style = node.props?.style;
    const push = (s: unknown) => {
      if (Array.isArray(s)) s.forEach(push);
      else if (s && typeof s === 'object') out.push(s as Record<string, unknown>);
    };
    push(style);
    (node.children ?? []).forEach(visit);
  };
  visit(screen.toJSON());
  return out;
}

describe('SetTodayCard', () => {
  test('invites the user in, and the invitation is tappable', () => {
    const onPress = jest.fn();
    render(<SetTodayCard onPress={onPress} />);

    expect(screen.getByTestId('home-set-today')).toBeTruthy();
    expect(screen.getByTestId('home-set-today-open')).toBeTruthy();
    expect(screen.getByText(PICKER_COPY.promptCta)).toBeTruthy();
  });

  describe('it never reads as an error', () => {
    test('uses no coral anywhere, which is the brand error colour', () => {
      // An unanswered day is not a failure. Coral is reserved for writes that
      // did not land, and it may never appear on this card.
      render(<SetTodayCard onPress={jest.fn()} />);

      for (const style of renderedStyles()) {
        expect(style.color).not.toBe(Colors.softCoral);
        expect(style.backgroundColor).not.toBe(Colors.softCoral);
        expect(style.borderColor).not.toBe(Colors.softCoral);
      }
    });

    test('renders no error or warning affordance', () => {
      render(<SetTodayCard onPress={jest.fn()} />);

      expect(screen.queryByTestId('home-set-today-error')).toBeNull();
      expect(screen.queryByTestId('home-set-today-warning')).toBeNull();
    });
  });

  describe('it never reads as an outstanding task', () => {
    test('the copy carries no urgency, scold, or not-yet framing', () => {
      // The words that would turn a resting state into a chore. "Set today"
      // and "Two quick questions and today is ready" were both in the first
      // draft and both said the day was incomplete.
      const copy = [
        PICKER_COPY.promptHeading,
        PICKER_COPY.promptBody,
        PICKER_COPY.promptCta,
      ]
        .join(' ')
        .toLowerCase();

      for (const scold of [
        '!',
        'still',
        'yet',
        'forgot',
        'missing',
        'incomplete',
        'overdue',
        'reminder',
        "haven't",
        'need to',
        'must',
      ]) {
        expect(copy).not.toContain(scold);
      }
    });

    test('shows no count, badge, or streak of any kind', () => {
      // There is nothing to break by not answering, so there is nothing here
      // that could count how long it has been waiting.
      render(<SetTodayCard onPress={jest.fn()} />);

      expect(screen.queryByTestId('home-set-today-badge')).toBeNull();
      const flat = JSON.stringify(screen.toJSON());
      expect(flat).not.toMatch(/\bday(s)? (in a row|streak)\b/i);
    });
  });
});
