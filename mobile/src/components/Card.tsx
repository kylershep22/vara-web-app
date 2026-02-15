/**
 * Custom Card Component
 * Styled card following Vara Mobile UI Standards v1.0
 *
 * Cards use:
 * - White background (#FFFFFF)
 * - 12px border radius (radius-lg)
 * - 24px internal padding (spacing-lg)
 * - Subtle shadows (structural only)
 */

import React from 'react';
import { Card as PaperCard, CardProps } from 'react-native-paper';
import { StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, Layout } from '../constants';

type ShadowSize = 'none' | 'sm' | 'md' | 'lg';

interface CustomCardProps extends CardProps {
  padding?: number;
  elevated?: boolean;
  shadow?: ShadowSize;
}

const Card: React.FC<CustomCardProps> = ({
  padding = Spacing.lg, // 24px per UI standards
  elevated = true,
  shadow = 'md',
  style,
  children,
  ...props
}) => {
  // Get shadow styles from Layout system
  const getShadowStyle = () => {
    if (!elevated) return {};
    return Layout.shadow[shadow] || {};
  };

  return (
    <PaperCard
      style={[
        styles.card,
        getShadowStyle(),
        { padding } as ViewStyle,
        style,
      ]}
      {...props}
    >
      {children}
    </PaperCard>
  );
};

const styles = StyleSheet.create({
  card: {
    // White surface per UI standards
    backgroundColor: Colors.surface,
    // radius-lg (12px) per UI standards
    borderRadius: Layout.borderRadius.lg,
    // Reset default Paper elevation (we use custom shadows)
    elevation: 0,
  },
});

export default Card;
