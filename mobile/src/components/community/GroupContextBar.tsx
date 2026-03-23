import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Colors, Typography } from '../../constants';

interface GroupContextBarProps {
  groupName: string;
  onPress?: () => void;
}

const PeopleIcon: React.FC = () => (
  <Svg width={13} height={13} viewBox="0 0 16 16" fill="none">
    <Circle cx={6} cy={5} r={2.5} stroke={Colors.evergreenTeal} strokeWidth={1.4} strokeLinecap="round" />
    <Path d="M1 14C1 11.2 3.2 9 6 9" stroke={Colors.evergreenTeal} strokeWidth={1.4} strokeLinecap="round" />
    <Circle cx={11} cy={5} r={2.5} stroke={Colors.evergreenTeal} strokeWidth={1.4} strokeLinecap="round" />
    <Path d="M16 14C16 11.2 13.8 9 11 9" stroke={Colors.evergreenTeal} strokeWidth={1.4} strokeLinecap="round" />
  </Svg>
);

export const GroupContextBar: React.FC<GroupContextBarProps> = ({ groupName, onPress }) => {
  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress ? { onPress, activeOpacity: 0.7 } : {};

  return (
    <Container style={styles.bar} {...containerProps}>
      <PeopleIcon />
      <Text style={styles.groupName} numberOfLines={1}>{groupName}</Text>
    </Container>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#EEF5EC',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8F0E7',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  groupName: {
    fontSize: 11.5,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    flex: 1,
  },
});
