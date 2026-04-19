import React from 'react';
import { render } from '@testing-library/react-native';
import { LockedDivider } from '../LockedDivider';

describe('LockedDivider', () => {
  it('renders the unlock label text', () => {
    const { getByText } = render(<LockedDivider />);
    expect(
      getByText('Check in to unlock your personalized dashboard')
    ).toBeTruthy();
  });

  it('exposes an accessibility label describing the locked state', () => {
    const { getByLabelText } = render(<LockedDivider />);
    expect(
      getByLabelText('Personalized dashboard is locked until you check in')
    ).toBeTruthy();
  });

  it('renders a lock icon by testID', () => {
    const { getByTestId } = render(<LockedDivider />);
    expect(getByTestId('locked-divider-icon')).toBeTruthy();
  });
});
