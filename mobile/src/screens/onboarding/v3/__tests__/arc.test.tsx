// The V3 arc's NAVIGATE CHAIN, not its registration.
//
// WHY THIS FILE EXISTS. routes.ts warns that V3_ORDER drives the stack order
// and the step indicator but NOT the chain: every screen names its successor
// with a literal, so inserting a screen means repointing the one before it, and
// nothing enforces that the two agree. The failure mode is silent and green:
// the step numbers renumber themselves correctly off V3_ORDER while the arc
// walks straight past the new screen.
//
// A test that asserted "A2 is registered" or "A2 appears in V3_ORDER" would
// have passed on exactly that broken arc. So these tests press the CTA and
// assert where it actually lands. Slice 4's insertion of A2 at step 3 is the
// first thing they pin; the ColdOpen case is here because slice 4's rename of
// Outcome -> Destination broke that literal too, and only the compiler caught
// it.

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

const mockContext = jest.fn();
jest.mock('../OnboardingV3Context', () => ({
  useOnboardingV3: () => mockContext(),
}));

// The scaffold is stubbed to its two controls. This suite is about where the
// arc goes, and the real one drags the onboarding design system in with it.
jest.mock('../../../../components/onboarding/OnboardingScaffold', () => ({
  OnboardingScaffold: ({ onPrimary, primaryDisabled, children, title }: any) => {
    const { Text, TouchableOpacity, View } = require('react-native');
    return (
      <View>
        <Text testID="scaffold-title">{title}</Text>
        <TouchableOpacity
          testID="v3-primary"
          disabled={primaryDisabled}
          onPress={() => {
            if (!primaryDisabled) onPrimary();
          }}
        >
          <Text>next</Text>
        </TouchableOpacity>
        {children}
      </View>
    );
  },
}));

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { OnboardingV3ColdOpenScreen } from '../OnboardingV3ColdOpenScreen';
import { OnboardingV3DestinationScreen } from '../OnboardingV3DestinationScreen';
import { OnboardingV3RouteScreen } from '../OnboardingV3RouteScreen';
import { V3_ORDER, V3_ROUTES, V3_TOTAL_STEPS, v3StepNumber } from '../routes';

const FULL = {
  destination: 'calm' as const,
  setDestination: jest.fn(),
  whyNote: null,
  capacity: null,
  floorCommitment: null,
  weekStartDay: null,
  reminderTime: null,
  setWhyNote: jest.fn(),
  setCapacity: jest.fn(),
  setFloorCommitment: jest.fn(),
  setWeekStartDay: jest.fn(),
  setReminderTime: jest.fn(),
};

beforeEach(() => {
  mockNavigate.mockReset();
  mockGoBack.mockReset();
  mockContext.mockReset().mockReturnValue(FULL);
});

describe('the arc actually walks through A2', () => {
  test('step 2 advances to the route screen, not past it to Why', () => {
    // THE ONE THAT CATCHES THE INSERTION BUG. If Destination still pointed at
    // Why, every step number would still be right and A2 would never render.
    render(<OnboardingV3DestinationScreen />);

    fireEvent.press(screen1());

    expect(mockNavigate).toHaveBeenCalledWith(V3_ROUTES.Route);
    expect(mockNavigate).not.toHaveBeenCalledWith(V3_ROUTES.Why);
  });

  test('the route screen advances to Why, so nothing is stranded after it', () => {
    render(<OnboardingV3RouteScreen />);

    fireEvent.press(screen1());

    expect(mockNavigate).toHaveBeenCalledWith(V3_ROUTES.Why);
  });

  test('the cold open advances to the renamed destination screen', () => {
    // Slice 4 renamed Outcome -> Destination. This literal lived two files away
    // from the rename and is exactly the kind that rots silently.
    render(<OnboardingV3ColdOpenScreen />);

    fireEvent.press(screen1());

    expect(mockNavigate).toHaveBeenCalledWith(V3_ROUTES.Destination);
  });

  test('a user who has picked nothing cannot leave step 2', () => {
    mockContext.mockReturnValue({ ...FULL, destination: null });
    render(<OnboardingV3DestinationScreen />);

    fireEvent.press(screen1());

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('the arc shape after the insertion', () => {
  test('A2 sits at step 3, immediately after the destination pick', () => {
    // Roadmap section 9 item 1, resolved: step 3 and not Jen's step 5.
    expect(v3StepNumber(V3_ROUTES.Route)).toBe(3);
    expect(v3StepNumber(V3_ROUTES.Route)).toBe(
      v3StepNumber(V3_ROUTES.Destination) + 1
    );
  });

  test('every route appears exactly once, and the arc is ten steps', () => {
    expect(V3_ORDER).toHaveLength(V3_TOTAL_STEPS);
    expect(new Set(V3_ORDER).size).toBe(V3_TOTAL_STEPS);
    expect(V3_TOTAL_STEPS).toBe(10);
  });
});

/** The stubbed scaffold's primary. Re-queried per render. */
function screen1() {
  const { screen } = require('@testing-library/react-native');
  return screen.getByTestId('v3-primary');
}
