/**
 * Custom Card Component
 * Styled card following Vara design system
 */

import React from 'react';
import { Card as PaperCard, CardProps } from 'react-native-paper';
import { StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing } from '../constants';

interface CustomCardProps extends CardProps {
  padding?: number;
  elevated?: boolean;
}

const Card: React.FC<CustomCardProps> = ({
  padding = Spacing.md,
  elevated = true,
  style,
  children,
  ...props
}) => {
  return (
    <PaperCard
      style={[
        styles.card,
        elevated && styles.elevated,
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
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
});

export default Card;
