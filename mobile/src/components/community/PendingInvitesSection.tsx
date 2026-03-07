/**
 * PendingInvitesSection Component
 * Displays pending group and challenge invites with accept/decline actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import {
  getAllPendingInvites,
  acceptGroupInvite,
  declineGroupInvite,
  acceptChallengeInvite,
  declineChallengeInvite,
} from '../../services/firebase/invites.service';
import { GroupInvite, ChallengeInvite } from '../../types/models';
import Button from '../Button';
import Card from '../Card';

interface PendingInvitesSectionProps {
  /** Show as collapsible section (default) or always expanded */
  collapsible?: boolean;
  /** Maximum number of invites to show before "See all" */
  maxVisible?: number;
  /** Callback when an invite is accepted */
  onInviteAccepted?: (type: 'group' | 'challenge', id: string) => void;
  /** Callback when invites count changes */
  onCountChange?: (count: number) => void;
}

export const PendingInvitesSection: React.FC<PendingInvitesSectionProps> = ({
  collapsible = true,
  maxVisible = 3,
  onInviteAccepted,
  onCountChange,
}) => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [groupInvites, setGroupInvites] = useState<GroupInvite[]>([]);
  const [challengeInvites, setChallengeInvites] = useState<ChallengeInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(!collapsible);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const totalInvites = groupInvites.length + challengeInvites.length;

  // Load pending invites
  const loadInvites = useCallback(async () => {
    if (!user) return;
    try {
      const { groups, challenges, total } = await getAllPendingInvites();
      setGroupInvites(groups);
      setChallengeInvites(challenges);
      onCountChange?.(total);
    } catch (error) {
      console.error('Error loading pending invites:', error);
    } finally {
      setLoading(false);
    }
  }, [user, onCountChange]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  // Handle accept group invite
  const handleAcceptGroupInvite = async (invite: GroupInvite) => {
    if (processingIds.has(invite.id)) return;

    setProcessingIds(prev => new Set(prev).add(invite.id));
    try {
      await acceptGroupInvite(invite.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setGroupInvites(prev => prev.filter(i => i.id !== invite.id));
      onInviteAccepted?.('group', invite.groupId);
      onCountChange?.(totalInvites - 1);

      // Navigate to the group
      navigation.navigate('Community', {
        screen: 'GroupDetail',
        params: { groupId: invite.groupId },
      });
    } catch (error) {
      console.error('Error accepting group invite:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to accept invite. Please try again.');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(invite.id);
        return next;
      });
    }
  };

  // Handle decline group invite
  const handleDeclineGroupInvite = async (invite: GroupInvite) => {
    if (processingIds.has(invite.id)) return;

    setProcessingIds(prev => new Set(prev).add(invite.id));
    try {
      await declineGroupInvite(invite.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setGroupInvites(prev => prev.filter(i => i.id !== invite.id));
      onCountChange?.(totalInvites - 1);
    } catch (error) {
      console.error('Error declining group invite:', error);
      Alert.alert('Error', 'Failed to decline invite. Please try again.');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(invite.id);
        return next;
      });
    }
  };

  // Handle accept challenge invite
  const handleAcceptChallengeInvite = async (invite: ChallengeInvite) => {
    if (processingIds.has(invite.id)) return;

    setProcessingIds(prev => new Set(prev).add(invite.id));
    try {
      await acceptChallengeInvite(invite.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setChallengeInvites(prev => prev.filter(i => i.id !== invite.id));
      onInviteAccepted?.('challenge', invite.challengeId);
      onCountChange?.(totalInvites - 1);

      // Navigate to the challenge
      navigation.navigate('Community', {
        screen: 'ChallengeDetail',
        params: { challengeId: invite.challengeId },
      });
    } catch (error) {
      console.error('Error accepting challenge invite:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to accept invite. Please try again.');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(invite.id);
        return next;
      });
    }
  };

  // Handle decline challenge invite
  const handleDeclineChallengeInvite = async (invite: ChallengeInvite) => {
    if (processingIds.has(invite.id)) return;

    setProcessingIds(prev => new Set(prev).add(invite.id));
    try {
      await declineChallengeInvite(invite.id);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setChallengeInvites(prev => prev.filter(i => i.id !== invite.id));
      onCountChange?.(totalInvites - 1);
    } catch (error) {
      console.error('Error declining challenge invite:', error);
      Alert.alert('Error', 'Failed to decline invite. Please try again.');
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(invite.id);
        return next;
      });
    }
  };

  // Toggle expanded state
  const toggleExpanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded(prev => !prev);
  };

  // Render group invite card
  const renderGroupInvite = (invite: GroupInvite) => {
    const isProcessing = processingIds.has(invite.id);

    return (
      <Card key={invite.id} style={styles.inviteCard}>
        <View style={styles.inviteContent}>
          <View style={[styles.iconContainer, styles.groupIcon]}>
            <Icon name="account-group" size={20} color={Colors.evergreenTeal} />
          </View>
          <View style={styles.inviteInfo}>
            <Text style={styles.inviteName} numberOfLines={1}>
              {invite.groupName}
            </Text>
            <Text style={styles.inviteFrom} numberOfLines={1}>
              Invited by {invite.inviterName}
            </Text>
          </View>
        </View>
        <View style={styles.inviteActions}>
          <Button
            variant="primary"
            size="small"
            style={styles.acceptButton}
            onPress={() => handleAcceptGroupInvite(invite)}
            loading={isProcessing}
            disabled={isProcessing}
          >
            Accept
          </Button>
          <Button
            variant="outline"
            size="small"
            style={styles.declineButton}
            onPress={() => handleDeclineGroupInvite(invite)}
            disabled={isProcessing}
          >
            Decline
          </Button>
        </View>
      </Card>
    );
  };

  // Render challenge invite card
  const renderChallengeInvite = (invite: ChallengeInvite) => {
    const isProcessing = processingIds.has(invite.id);

    return (
      <Card key={invite.id} style={styles.inviteCard}>
        <View style={styles.inviteContent}>
          <View style={[styles.iconContainer, styles.challengeIcon]}>
            <Icon name="trophy" size={20} color={Colors.sunriseAmber} />
          </View>
          <View style={styles.inviteInfo}>
            <Text style={styles.inviteName} numberOfLines={1}>
              {invite.challengeName}
            </Text>
            <Text style={styles.inviteFrom} numberOfLines={1}>
              Invited by {invite.inviterName}
            </Text>
          </View>
        </View>
        <View style={styles.inviteActions}>
          <Button
            variant="primary"
            size="small"
            style={styles.acceptButton}
            onPress={() => handleAcceptChallengeInvite(invite)}
            loading={isProcessing}
            disabled={isProcessing}
          >
            Accept
          </Button>
          <Button
            variant="outline"
            size="small"
            style={styles.declineButton}
            onPress={() => handleDeclineChallengeInvite(invite)}
            disabled={isProcessing}
          >
            Decline
          </Button>
        </View>
      </Card>
    );
  };

  // Don't render if no invites
  if (!loading && totalInvites === 0) {
    return null;
  }

  // Combine and limit invites for display
  const allInvites = [
    ...groupInvites.map(i => ({ type: 'group' as const, data: i })),
    ...challengeInvites.map(i => ({ type: 'challenge' as const, data: i })),
  ];
  const visibleInvites = expanded ? allInvites : allInvites.slice(0, maxVisible);
  const hasMore = allInvites.length > maxVisible;

  return (
    <View style={styles.container}>
      {/* Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={collapsible ? toggleExpanded : undefined}
        activeOpacity={collapsible ? 0.7 : 1}
      >
        <View style={styles.headerLeft}>
          <View style={styles.badgeContainer}>
            <Icon name="email-open" size={18} color={Colors.evergreenTeal} />
            {totalInvites > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalInvites}</Text>
              </View>
            )}
          </View>
          <Text style={styles.headerTitle}>Pending Invites</Text>
        </View>
        {collapsible && (
          <Icon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color={Colors.textSecondary}
          />
        )}
      </TouchableOpacity>

      {/* Content */}
      {(expanded || !collapsible) && (
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={Colors.evergreenTeal} size="small" />
            </View>
          ) : (
            <>
              {visibleInvites.map(({ type, data }) =>
                type === 'group'
                  ? renderGroupInvite(data as GroupInvite)
                  : renderChallengeInvite(data as ChallengeInvite)
              )}
              {hasMore && !expanded && (
                <TouchableOpacity
                  style={styles.seeAllButton}
                  onPress={toggleExpanded}
                >
                  <Text style={styles.seeAllText}>
                    See all {totalInvites} invites
                  </Text>
                  <Icon name="chevron-right" size={16} color={Colors.evergreenTeal} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    marginBottom: Spacing.base,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.dewSage,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeContainer: {
    position: 'relative',
    marginRight: Spacing.sm,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.white,
  },
  headerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  content: {
    padding: Spacing.base,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.base,
  },
  inviteCard: {
    marginBottom: Spacing.sm,
    padding: Spacing.sm,
  },
  inviteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  groupIcon: {
    backgroundColor: Colors.tealLight,
  },
  challengeIcon: {
    backgroundColor: 'rgba(244, 197, 66, 0.15)',
  },
  inviteInfo: {
    flex: 1,
  },
  inviteName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
  },
  inviteFrom: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  acceptButton: {
    flex: 1,
  },
  declineButton: {
    flex: 1,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: 4,
  },
  seeAllText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default PendingInvitesSection;
