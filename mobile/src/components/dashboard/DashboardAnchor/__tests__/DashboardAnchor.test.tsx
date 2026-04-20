import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DashboardAnchor } from '../DashboardAnchor';
import { getBrainStateBrief } from '../brainStateBriefs';

const foggyBrief = getBrainStateBrief('foggy');

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

jest.mock('react-native-reanimated', () => {
  const actual = jest.requireActual('react-native-reanimated/mock');
  return {
    ...actual,
    useSharedValue: (val: any) => ({ value: val }),
    useAnimatedStyle: (fn: any) => fn(),
    useAnimatedReaction: (_dep: any, _fn: any) => {},
    withTiming: (val: any) => val,
    interpolate: (_val: any, _input: any, output: any) => output[output.length - 1],
  };
});

const baseProps = {
  brainState: 'foggy' as const,
  protocolCompleted: false,
  checkInDate: '2026-04-20',
  onChangeStatePress: jest.fn(),
  scrollY: { value: 0 } as any,
};

describe('DashboardAnchor', () => {
  beforeEach(() => {
    (AsyncStorage.getItem as jest.Mock).mockReset();
    (AsyncStorage.setItem as jest.Mock).mockReset();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('renders the expanded view by default', async () => {
    const { findByText } = render(<DashboardAnchor {...baseProps} />);
    expect(
      await findByText(
        foggyBrief.message
      )
    ).toBeTruthy();
  });

  it('toggles to collapsed view when tapped', async () => {
    const { getByTestId, findByText, getByText } = render(<DashboardAnchor {...baseProps} />);
    await findByText(foggyBrief.message);
    fireEvent.press(getByTestId('dashboard-anchor-expanded-pressable'));
    await waitFor(() => {
      expect(getByText('Protocol ready')).toBeTruthy();
    });
  });

  it('persists collapsed state to AsyncStorage keyed on checkInDate', async () => {
    const { getByTestId, findByText } = render(<DashboardAnchor {...baseProps} />);
    await findByText(foggyBrief.message);
    fireEvent.press(getByTestId('dashboard-anchor-expanded-pressable'));
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'dashboard_anchor_collapsed_2026-04-20',
        'true'
      );
    });
  });

  it('hydrates collapsed state from AsyncStorage on mount', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
    const { findByText } = render(<DashboardAnchor {...baseProps} />);
    expect(await findByText('Protocol ready')).toBeTruthy();
  });

  it('calls onChangeStatePress when Change is tapped in the collapsed view', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
    const onChangeStatePress = jest.fn();
    const { findByText } = render(
      <DashboardAnchor {...baseProps} onChangeStatePress={onChangeStatePress} />
    );
    const changeBtn = await findByText('Change');
    fireEvent.press(changeBtn);
    expect(onChangeStatePress).toHaveBeenCalledTimes(1);
  });

  it('exposes the full brief message in the accessibility label when collapsed', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');
    const { findByLabelText } = render(<DashboardAnchor {...baseProps} />);
    const node = await findByLabelText(
      new RegExp(`Foggy\\..*${escapeRegex(foggyBrief.message)}.*Protocol ready`)
    );
    expect(node).toBeTruthy();
  });

  it('uses a different AsyncStorage key when checkInDate changes (new day)', async () => {
    const { rerender, findByText } = render(<DashboardAnchor {...baseProps} />);
    await findByText(foggyBrief.message);

    rerender(<DashboardAnchor {...baseProps} checkInDate="2026-04-21" brainState="clear" />);

    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalledWith(
        'dashboard_anchor_collapsed_2026-04-21'
      );
    });
  });
});
