import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants';
import { ChallengeCheckIn } from '../../types/models';

interface WeekRhythmDotsProps {
  checkIns: ChallengeCheckIn[];
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const getWeekDates = (): Date[] => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - mondayOffset);
  monday.setHours(0, 0, 0, 0);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
};

const formatDateKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const WeekRhythmDots: React.FC<WeekRhythmDotsProps> = ({ checkIns }) => {
  const weekDates = getWeekDates();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const checkInDates = new Set(checkIns.map(ci => ci.date));

  return (
    <View style={styles.container}>
      {weekDates.map((date, index) => {
        const dateKey = formatDateKey(date);
        const isCheckedIn = checkInDates.has(dateKey);
        const isPast = date < today;
        const isToday = formatDateKey(date) === formatDateKey(today);
        const isFuture = date > today;

        const isChecked = isCheckedIn;

        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        return (
          <View key={index} style={styles.dayColumn} accessible={false}>
            <Text style={styles.dayLabel}>{DAY_LABELS[index]}</Text>
            <View
              style={[styles.dot, isChecked ? styles.checkedDot : styles.futureDot]}
              accessible={false}
              accessibilityLabel={`${dayNames[index]}: ${isChecked ? 'completed' : 'not yet'}`}
            >
              {isChecked ? (
                <Icon name="check" size={14} color={Colors.white} />
              ) : (
                <View style={styles.innerDot} />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.base,
  },
  dayColumn: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.mutedSageGray,
  },
  dot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedDot: {
    backgroundColor: Colors.evergreenTeal,
  },
  futureDot: {
    backgroundColor: Colors.dewSageLight,
  },
  innerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.silverSage,
  },
});
