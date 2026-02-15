/**
 * Empty State Card
 * Consistent empty state message for sections with no data
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

// Vara brand colors
const VARA_COLORS = {
  dewSage: '#D5E3D1',
  sageGray: '#6F7F77',
};

interface EmptyStateCardProps {
  message: string;
  actionText?: string;
}

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  message,
  actionText,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {actionText && <Text style={styles.action}> · {actionText}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: VARA_COLORS.dewSage,
  },
  message: {
    fontSize: 12,
    color: VARA_COLORS.sageGray,
  },
  action: {
    fontSize: 12,
    color: VARA_COLORS.sageGray,
  },
});

export default EmptyStateCard;
