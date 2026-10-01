/**
 * PlanScreen: the dead notification opt-in is gone (ROUTINE-REMINDERS R-K).
 *
 * The mount-time push to NotificationOptIn latched before its prompt state
 * loaded, so it never fired. It is removed, not fixed: a routine reminder asks
 * for permission at the moment it is set, in RoutineEditor. This mounts the
 * screen with the opt-in hook reporting that a prompt IS due, which is the one
 * state in which the old code would have navigated.
 */
import fs from 'fs';
import path from 'path';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({}),
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});
jest.mock('../Time/RoutinesTab', () => ({ RoutinesTab: () => null }));
jest.mock('../Time/ActiveRoutinePlayer', () => ({ ActiveRoutinePlayer: () => null }));
jest.mock('../../components/ai/GuidePill', () => ({ GuidePill: () => null }));
jest.mock('../../hooks/useNotificationOptIn', () => ({
  useNotificationOptIn: () => ({ shouldShowPrompt: true, markPromptShown: jest.fn() }),
}));

import React from 'react';
import { render, act } from '@testing-library/react-native';
import PlanScreen from '../PlanScreen';

describe('PlanScreen and the notification opt-in', () => {
  test('never navigates to NotificationOptIn, even when a prompt is due', async () => {
    // Mutation caught: restoring the mount-time opt-in effect.
    render(<PlanScreen />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(mockNavigate).not.toHaveBeenCalledWith('NotificationOptIn');
  });

  test('no longer imports the opt-in hook', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'PlanScreen.tsx'), 'utf8');
    expect(source).not.toMatch(/useNotificationOptIn/);
    expect(source).not.toMatch(/NotificationOptIn['"]/);
  });
});
