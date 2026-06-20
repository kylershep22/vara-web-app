// Shared dashboard card styles.
//
// One eyebrow/cap style used by the card "cap" labels and the acknowledgment
// label (mockup .cap / .lab): 12px, medium, muted, uppercase, ~.02em tracking.
// Card elevation uses the UI-Standards Layout.shadow.sm (the mockup card shadow
// 0 1px 3px rgba(0,0,0,.04)) — referenced directly at each card, not duplicated.

import type { TextStyle } from 'react-native';
import { Colors, Typography } from '../../constants';

export const dashboardEyebrow: TextStyle = {
  fontSize: Typography.fontSize.xs,
  fontWeight: Typography.fontWeight.medium,
  color: Colors.mutedSageGray,
  textTransform: 'uppercase',
  letterSpacing: 0.3, // ~.02em at 12px
};
