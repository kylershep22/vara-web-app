/**
 * The inside of A2: the destination's body line and the route strip beneath it.
 *
 * SHARED BY BOTH A2 SURFACES. Onboarding step 3 wraps it in the arc's scaffold
 * with a step indicator; the post-migration screen on Home wraps it in the same
 * scaffold without one. Everything that differs between the two is chrome, so
 * chrome is all either of them owns.
 *
 * TITLE AND PRIMARY ARE NOT HERE. Both are scaffold props, and the scaffold is
 * what the caller supplies, so putting them here would mean two components
 * arguing about who renders the headline.
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { Colors, Spacing, Typography } from '../../constants';
import { A2_BODIES } from '../../constants/journeyCopy';
import type { DestinationKey, PhaseKey } from '../../types/models';
import { RouteStrip } from './RouteStrip';

interface RouteExplainerBodyProps {
  destination: DestinationKey;
  /** Passed through to the strip. 'remove' for every journey today. */
  currentPhase?: PhaseKey;
  testID?: string;
}

export const RouteExplainerBody: React.FC<RouteExplainerBodyProps> = ({
  destination,
  currentPhase,
  testID = 'route-explainer',
}) => (
  <>
    <Text style={styles.body} testID={`${testID}-body-${destination}`}>
      {A2_BODIES[destination]}
    </Text>
    <RouteStrip
      destination={destination}
      currentPhase={currentPhase}
      testID={`${testID}-strip`}
    />
  </>
);

const styles = StyleSheet.create({
  body: {
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
});

export default RouteExplainerBody;
