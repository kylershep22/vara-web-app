/**
 * ChallengeActivityItems
 * Activity feed item and personal check-in item for ChallengeDetailScreen.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { CommunityAvatar } from '../shared/CommunityAvatar';
import { Colors, Spacing, Typography } from '../../constants';
import { ChallengeCheckIn } from '../../types/models';
import { getUserById, UserProfile } from '../../services/firebase/community.service';

export const ActivityItem: React.FC<{ checkIn: ChallengeCheckIn }> = ({ checkIn }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getUserById(checkIn.userId).then(setUserProfile);
  }, [checkIn.userId]);

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.activityItem}>
      <CommunityAvatar
        name={userProfile?.displayName || 'U'}
        photoURL={userProfile?.avatar}
        size={32}
      />
      <View style={styles.activityInfo}>
        <View style={styles.activityHeader}>
          <Text style={styles.activityName}>{userProfile?.displayName || 'Someone'}</Text>
          {checkIn.mood && <Text style={styles.activityMoodEmoji}>{checkIn.mood}</Text>}
          <Text style={styles.activityTime}>{formatTime(checkIn.createdAt)}</Text>
        </View>
        {checkIn.note && <Text style={styles.activityNote}>{checkIn.note}</Text>}
      </View>
    </View>
  );
};

export const MyCheckInItem: React.FC<{ checkIn: ChallengeCheckIn }> = ({ checkIn }) => {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <View style={styles.myCheckInItem}>
      <Icon name="check-circle" size={24} color={Colors.success} />
      <View style={styles.myCheckInInfo}>
        <Text style={styles.myCheckInDate}>{formatDate(checkIn.date)}</Text>
        {checkIn.note && <Text style={styles.myCheckInNote}>{checkIn.note}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  activityItem: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  activityInfo: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  activityName: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  activityMoodEmoji: {
    fontSize: 18,
  },
  activityTime: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    marginLeft: 'auto',
  },
  activityNote: {
    fontSize: 14,
    color: Colors.softCharcoal,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  myCheckInItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.sm,
  },
  myCheckInInfo: {
    flex: 1,
  },
  myCheckInDate: {
    color: Colors.softCharcoal,
    fontWeight: Typography.fontWeight.medium,
  },
  myCheckInNote: {
    color: Colors.mutedSageGray,
    fontSize: Typography.fontSize.sm,
  },
});
