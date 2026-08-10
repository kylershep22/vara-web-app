// ContinuityCard — the unbroken-weeks count (spec 1) on Home, below the fold.
//
// THE THREE-STATE RULE IS THE WHOLE TEST FILE. null (the read failed) and 0
// (nothing closed yet) both render NOTHING, and only a positive run renders at
// all. A visible "0 weeks" is a deficit framed as a number, and the week a user
// misses is the week Home most needs not to score them.
//
// Continuity is neutral accountability, never a streak: no percentage, no bar,
// no fraction of a target, nothing red.

import React from 'react';
import { render } from '@testing-library/react-native';

import { ContinuityCard } from '../ContinuityCard';

describe('ContinuityCard', () => {
  describe('zero and unknown are silent', () => {
    test('renders nothing when the count is 0', () => {
      const screen = render(<ContinuityCard continuity={0} />);

      expect(screen.queryByTestId('home-continuity')).toBeNull();
      expect(screen.queryByText(/0 week/)).toBeNull();
    });

    test('renders nothing when the read failed', () => {
      // null is not zero. Showing a 0 here would state something about the
      // user that was never read.
      const screen = render(<ContinuityCard continuity={null} />);

      expect(screen.queryByTestId('home-continuity')).toBeNull();
    });
  });

  describe('a run that exists is shown as a plain count', () => {
    test('shows the count for a multi-week run', () => {
      const screen = render(<ContinuityCard continuity={3} />);

      expect(screen.getByTestId('home-continuity')).toBeTruthy();
      expect(screen.getByText(/3 weeks/)).toBeTruthy();
    });

    test('reads the singular for a single week', () => {
      const screen = render(<ContinuityCard continuity={1} />);

      expect(screen.getByText(/1 week /)).toBeTruthy();
    });

    test('carries no percentage, bar or fraction', () => {
      const screen = render(<ContinuityCard continuity={4} />);

      expect(screen.queryByText(/%/)).toBeNull();
      expect(screen.queryByText(/\d+\s*\/\s*\d+/)).toBeNull();
    });
  });
});
