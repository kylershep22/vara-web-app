// OnboardingV3Done — the SETUP week write.
//
// This screen opens the user's first cycle, which is the one cycle that may be
// a partial stub. It had no test at all before the boundary rework, and the
// thing most worth pinning is not the happy path but the DEDUP KEY: the lookup
// that stops a retry writing a second cycle only works while it is derived the
// same way as the weekStart it is checking for. Those two derivations sit four
// lines apart and nothing but a test makes them stay in step.

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('../../../../context/AuthContext', () => ({
  useAuth: () => ({ user: { uid: 'u1' } }),
}));
const mockCompleteOnboarding = jest.fn();
jest.mock('../../../../services/firebase/onboarding.service', () => ({
  completeOnboarding: (...a: any[]) => mockCompleteOnboarding(...a),
}));
const mockGetUserPrivate = jest.fn();
const mockSetUserPrivate = jest.fn();
jest.mock('../../../../services/firebase/userPrivate.service', () => ({
  getUserPrivate: (...a: any[]) => mockGetUserPrivate(...a),
  setUserPrivate: (...a: any[]) => mockSetUserPrivate(...a),
}));
const mockCreateWeeklyCycle = jest.fn();
const mockGetCycleForWeek = jest.fn();
jest.mock('../../../../services/firebase/weeklyCycle.service', () => ({
  createWeeklyCycle: (...a: any[]) => mockCreateWeeklyCycle(...a),
  getWeeklyCycleForWeek: (...a: any[]) => mockGetCycleForWeek(...a),
}));
const mockContext = jest.fn();
jest.mock('../OnboardingV3Context', () => ({
  useOnboardingV3: () => mockContext(),
}));
jest.mock('../../../../utils/logger', () => ({
  logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
// Stubbed to a bare button: the scaffold's chrome is another slice's concern
// and pulling it in drags the whole onboarding design system into a test about
// one Firestore write.
jest.mock('../../../../components/onboarding/OnboardingScaffold', () => ({
  OnboardingScaffold: ({ onPrimary, children }: any) => {
    const { Text, TouchableOpacity, View } = require('react-native');
    return (
      <View>
        <TouchableOpacity testID="v3-done-primary" onPress={onPrimary}>
          <Text>finish</Text>
        </TouchableOpacity>
        {children}
      </View>
    );
  },
}));

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

import { OnboardingV3DoneScreen } from '../OnboardingV3DoneScreen';
import { addDaysIso, isoWeekday, toIsoDate } from '../../../../utils/weekStart';

const TODAY = toIsoDate(new Date());

async function finish() {
  const screen = render(<OnboardingV3DoneScreen />);
  fireEvent.press(screen.getByTestId('v3-done-primary'));
  await waitFor(() => expect(mockCompleteOnboarding).toHaveBeenCalled());
  return screen;
}

describe('OnboardingV3DoneScreen — the setup week', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockCompleteOnboarding.mockReset().mockResolvedValue(undefined);
    mockGetUserPrivate.mockReset().mockResolvedValue(null);
    mockSetUserPrivate.mockReset().mockResolvedValue(undefined);
    mockCreateWeeklyCycle.mockReset().mockResolvedValue('cycle-1');
    mockGetCycleForWeek.mockReset().mockResolvedValue(null);
    mockContext.mockReset().mockReturnValue({
      outcome: 'focus',
      capacity: 'normal',
      whyNote: 'because',
      floorCommitment: 'ten minutes outside',
      weekStartDay: null,
    });
  });

  describe('with no chosen start day — the pre-picker state', () => {
    test('opens a full week starting today, exactly as before the rework', async () => {
      await finish();

      const input = mockCreateWeeklyCycle.mock.calls[0][1];
      expect(input.weekStart).toBe(TODAY);
      expect(input.weekEnd).toBe(addDaysIso(TODAY, 6));
    });
  });

  describe('with a chosen start day', () => {
    test('a mid-week setup is a stub ending the day before the next start day', async () => {
      // Start day two days out, so cycle 1 covers today and tomorrow only.
      mockGetUserPrivate.mockResolvedValue({
        weekStartDay: isoWeekday(addDaysIso(TODAY, 2)),
      });

      await finish();

      const input = mockCreateWeeklyCycle.mock.calls[0][1];
      expect(input.weekStart).toBe(TODAY);
      expect(input.weekEnd).toBe(addDaysIso(TODAY, 1));
    });

    test('a setup landing ON the start day gets a full week, not a zero-day stub', async () => {
      mockGetUserPrivate.mockResolvedValue({ weekStartDay: isoWeekday(TODAY) });

      await finish();

      const input = mockCreateWeeklyCycle.mock.calls[0][1];
      expect(input.weekStart).toBe(TODAY);
      expect(input.weekEnd).toBe(addDaysIso(TODAY, 6));
    });

    test('reads the start day AFTER writing it, so one captured this run is used', async () => {
      // The picker (3a-ii) writes weekStartDay through the same setUserPrivate
      // call this screen already makes. Planning before that write would ignore
      // the answer the user just gave.
      const order: string[] = [];
      mockSetUserPrivate.mockImplementation(async () => {
        order.push('write');
      });
      mockGetUserPrivate.mockImplementation(async () => {
        order.push('read');
        return null;
      });

      await finish();

      expect(order).toEqual(['write', 'read']);
    });
  });

  describe('the week-start preference', () => {
    test('carries a chosen start day into the private-doc patch', async () => {
      mockContext.mockReturnValue({
        outcome: 'focus',
        capacity: 'normal',
        whyNote: null,
        floorCommitment: null,
        weekStartDay: 3,
      });

      await finish();

      expect(mockSetUserPrivate.mock.calls[0][1].weekStartDay).toBe(3);
    });

    test('carries SUNDAY, which is 0 and would be eaten by a truthiness guard', async () => {
      // The one value a `if (weekStartDay)` bug would silently drop, leaving
      // the user on open-date anchoring having explicitly chosen Sunday.
      mockContext.mockReturnValue({
        outcome: 'focus',
        capacity: 'normal',
        whyNote: null,
        floorCommitment: null,
        weekStartDay: 0,
      });

      await finish();

      expect(mockSetUserPrivate.mock.calls[0][1].weekStartDay).toBe(0);
    });

    test('omits the field entirely when the step was skipped', async () => {
      // Absent, never null. planWeek then falls back to open-date anchoring,
      // which is what the app did before the question existed.
      await finish();

      expect(mockSetUserPrivate.mock.calls[0][1]).not.toHaveProperty('weekStartDay');
    });
  });

  describe('the retry dedup', () => {
    test('checks for an existing cycle under the SAME weekStart it would write', async () => {
      // A CONSISTENCY INVARIANT, not a live regression test. A setup week
      // always starts today, so the lookup key and the planned weekStart are
      // equal by construction right now and no mutation to either can separate
      // them. It is here for the slice that makes a setup week start somewhere
      // other than today, which is when the two can drift and the dedup starts
      // silently missing. The test below is the one with teeth today.
      mockGetUserPrivate.mockResolvedValue({
        weekStartDay: isoWeekday(addDaysIso(TODAY, 3)),
      });

      await finish();

      const lookupKey = mockGetCycleForWeek.mock.calls[0][1];
      const written = mockCreateWeeklyCycle.mock.calls[0][1].weekStart;
      expect(lookupKey).toBe(written);
    });

    test('writes nothing when the setup week already exists', async () => {
      mockGetCycleForWeek.mockResolvedValue({
        id: 'cycle-1',
        weekStart: TODAY,
        weekEnd: addDaysIso(TODAY, 2),
      });

      await finish();

      expect(mockCreateWeeklyCycle).not.toHaveBeenCalled();
    });

    test('a retry plans the same setup week even though a cycle now exists', async () => {
      // THE HAZARD, pinned. `priorWeekEnd` is passed as null literally rather
      // than read from the user's cycles: on the retry a cycle DOES exist, so a
      // derived value would flip the plan from "stub starting today" to "the
      // next anchored week", the lookup key would move with it, the dedup would
      // miss, and the retry would write the duplicate the check exists to
      // prevent.
      //
      // The existing cycle below carries a real weekEnd on purpose. A fixture
      // without one collapses any derivation back to null and neutralises the
      // very mutation this test is meant to catch.
      mockGetUserPrivate.mockResolvedValue({
        weekStartDay: isoWeekday(addDaysIso(TODAY, 3)),
      });
      await finish();
      const firstWritten = mockCreateWeeklyCycle.mock.calls[0][1];

      mockGetCycleForWeek.mockReset().mockResolvedValue({
        id: 'cycle-1',
        weekStart: firstWritten.weekStart,
        weekEnd: firstWritten.weekEnd,
      });
      mockCompleteOnboarding.mockClear();
      mockCreateWeeklyCycle.mockClear();
      await finish();

      // The LAST lookup is the dedup one. Indexing from the front would be
      // satisfied by any other read that happened to run first, which is how a
      // derived priorWeekEnd slips past this assertion.
      const calls = mockGetCycleForWeek.mock.calls;
      expect(calls[calls.length - 1][1]).toBe(firstWritten.weekStart);
      expect(mockCreateWeeklyCycle).not.toHaveBeenCalled();
    });
  });

  describe('ordering', () => {
    test('completes onboarding only after the cycle is persisted', async () => {
      // completeOnboarding flips the navigator off the onboarding stack, so
      // anything not written by then lands the user on a Home with no week.
      const order: string[] = [];
      mockCreateWeeklyCycle.mockImplementation(async () => {
        order.push('cycle');
        return 'cycle-1';
      });
      mockCompleteOnboarding.mockImplementation(async () => {
        order.push('complete');
      });

      await finish();

      expect(order).toEqual(['cycle', 'complete']);
    });

    test('a failed cycle write shows the retry and does not complete onboarding', async () => {
      mockCreateWeeklyCycle.mockRejectedValue(new Error('offline'));
      const screen = render(<OnboardingV3DoneScreen />);
      fireEvent.press(screen.getByTestId('v3-done-primary'));

      await waitFor(() => expect(screen.getByTestId('v3-done-error')).toBeTruthy());
      expect(mockCompleteOnboarding).not.toHaveBeenCalled();
    });
  });
});
