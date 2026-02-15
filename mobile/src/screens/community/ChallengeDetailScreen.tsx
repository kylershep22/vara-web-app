/**
 * Challenge Detail Screen
 * View challenge details, leaderboard, activity feed, and check in
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import { Text, Avatar, Divider, ProgressBar, Portal, Modal, Button as PaperButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Button, LoadingSpinner, Input, Card } from '../../components';
import { InviteMembersModal } from '../../components/community';
import { Colors, Spacing, Typography, Layout, getGroupCategory } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { canUserInviteToChallenge } from '../../services/firebase/invites.service';
import * as Haptics from 'expo-haptics';
import {
  fetchChallengeById,
  fetchChallengeLeaderboard,
  fetchMyParticipation,
  fetchChallengeCheckIns,
  fetchMyCheckIns,
  joinChallenge,
  leaveChallenge,
  checkIn,
  hasCheckedInToday,
  getDaysRemaining,
  getChallengeProgress,
  formatChallengeDuration,
  isUserMemberOfChallenge,
} from '../../services/firebase/challenges.service';
import { Challenge, ChallengeParticipant, ChallengeCheckIn } from '../../types/models';
import { getUserById, UserProfile } from '../../services/firebase/community.service';

type ChallengeDetailRouteProp = RouteProp<
  { ChallengeDetail: { challengeId: string; challengeName: string } },
  'ChallengeDetail'
>;

const ChallengeDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<ChallengeDetailRouteProp>();
  const { challengeId, challengeName } = route.params;
  const { user } = useAuth();

  // Data state
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [owner, setOwner] = useState<UserProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<ChallengeParticipant[]>([]);
  const [myParticipation, setMyParticipation] = useState<ChallengeParticipant | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<ChallengeCheckIn[]>([]);
  const [myCheckIns, setMyCheckIns] = useState<ChallengeCheckIn[]>([]);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [checkInNote, setCheckInNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [canInvite, setCanInvite] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'activity' | 'my-progress'>('leaderboard');

  const loadData = useCallback(async () => {
    try {
      // Load challenge
      const challengeData = await fetchChallengeById(challengeId);
      if (!challengeData) {
        Alert.alert('Error', 'Challenge not found');
        navigation.goBack();
        return;
      }
      setChallenge(challengeData);

      // Load owner
      const ownerData = await getUserById(challengeData.ownerId);
      setOwner(ownerData);

      // Load leaderboard
      const leaderboardData = await fetchChallengeLeaderboard(challengeId);
      setLeaderboard(leaderboardData);

      // Load recent activity
      const recentData = await fetchChallengeCheckIns(challengeId, 20);
      setRecentCheckIns(recentData);

      // If user is member, load their data
      if (user && challengeData.members.includes(user.uid)) {
        const participation = await fetchMyParticipation(challengeId);
        setMyParticipation(participation);

        const myCheckInsData = await fetchMyCheckIns(challengeId);
        setMyCheckIns(myCheckInsData);

        const todayStatus = await hasCheckedInToday(challengeId);
        setCheckedInToday(todayStatus);

        // Check if user can invite others
        const canUserInvite = await canUserInviteToChallenge(challengeId, user.uid);
        setCanInvite(canUserInvite);
      }
    } catch (error) {
      console.error('Error loading challenge:', error);
      Alert.alert('Error', 'Failed to load challenge details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [challengeId, user, navigation]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleJoin = async () => {
    try {
      await joinChallenge(challengeId);
      Alert.alert('Success', `You joined "${challengeName}"!`);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join challenge');
    }
  };

  const handleLeave = async () => {
    Alert.alert('Leave Challenge', `Are you sure you want to leave "${challengeName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await leaveChallenge(challengeId);
            Alert.alert('Success', 'You left the challenge');
            loadData();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to leave challenge');
          }
        },
      },
    ]);
  };

  const handleCheckIn = async () => {
    setSubmitting(true);
    try {
      await checkIn(challengeId, checkInNote.trim() || undefined);
      Alert.alert('Great job!', "You've checked in for today!");
      setShowCheckInModal(false);
      setCheckInNote('');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to check in');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !challenge) {
    return <LoadingSpinner message="Loading challenge..." />;
  }

  const isMember = isUserMemberOfChallenge(challenge, user?.uid);
  const categoryConfig = getGroupCategory(challenge.category);
  const daysLeft = getDaysRemaining(challenge.endDate);
  const memberCount = challenge.memberCount || challenge.members.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text variant="titleLarge" style={styles.headerTitle} numberOfLines={1}>
          {challenge.name}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.evergreenTeal]} />
        }
      >
        {/* Challenge Info Card */}
        <Card style={styles.infoCard}>
          {/* Category & Status */}
          <View style={styles.topBadges}>
            <View style={[styles.categoryBadge, { backgroundColor: categoryConfig.color + '20' }]}>
              <Icon name={categoryConfig.icon as any} size={16} color={categoryConfig.color} />
              <Text style={[styles.categoryText, { color: categoryConfig.color }]}>{categoryConfig.label}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    challenge.status === 'active'
                      ? Colors.success + '20'
                      : challenge.status === 'upcoming'
                      ? Colors.info + '20'
                      : Colors.textSecondary + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      challenge.status === 'active'
                        ? Colors.success
                        : challenge.status === 'upcoming'
                        ? Colors.info
                        : Colors.textSecondary,
                  },
                ]}
              >
                {challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
              </Text>
            </View>
          </View>

          {/* Goal */}
          <View style={styles.goalSection}>
            <Icon name="target" size={20} color={Colors.evergreenTeal} />
            <Text style={styles.goalText}>{challenge.challengeGoal}</Text>
          </View>

          {/* Description */}
          {challenge.description && (
            <Text style={styles.description}>{challenge.description}</Text>
          )}

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Icon name="account-group" size={18} color={Colors.evergreenTeal} />
              <Text style={styles.statValue}>{memberCount}</Text>
              <Text style={styles.statLabel}>participants</Text>
            </View>
            <View style={styles.stat}>
              <Icon name="timer-sand" size={18} color={daysLeft <= 7 ? Colors.warning : Colors.evergreenTeal} />
              <Text style={styles.statValue}>{daysLeft}</Text>
              <Text style={styles.statLabel}>days left</Text>
            </View>
            <View style={styles.stat}>
              <Icon name="check-circle-outline" size={18} color={Colors.evergreenTeal} />
              <Text style={styles.statValue}>{challenge.totalCheckIns || 0}</Text>
              <Text style={styles.statLabel}>check-ins</Text>
            </View>
          </View>

          {/* Owner */}
          <View style={styles.ownerRow}>
            {owner?.avatar ? (
              <Avatar.Image size={24} source={{ uri: owner.avatar }} />
            ) : (
              <Avatar.Text
                size={24}
                label={(owner?.displayName || 'U').charAt(0).toUpperCase()}
                style={styles.ownerAvatar}
              />
            )}
            <Text style={styles.ownerText}>
              Created by <Text style={styles.ownerName}>{owner?.displayName || 'Unknown'}</Text>
            </Text>
          </View>

          {/* Duration */}
          <Text style={styles.durationText}>
            {formatChallengeDuration(challenge.startDate, challenge.endDate)}
          </Text>
        </Card>

        {/* My Progress (if member) */}
        {isMember && myParticipation && (
          <Card style={styles.progressCard}>
            <Text variant="titleMedium" style={styles.progressTitle}>
              Your Progress
            </Text>
            <View style={styles.progressStats}>
              <View style={styles.progressStat}>
                <Text style={styles.progressStatValue}>{myParticipation.checkInCount}</Text>
                <Text style={styles.progressStatLabel}>Check-ins</Text>
              </View>
              <View style={styles.progressStat}>
                <Text style={styles.progressStatValue}>{myParticipation.currentStreak}</Text>
                <Text style={styles.progressStatLabel}>Day Streak</Text>
              </View>
              <View style={styles.progressStat}>
                <Text style={styles.progressStatValue}>{myParticipation.longestStreak}</Text>
                <Text style={styles.progressStatLabel}>Best Run</Text>
              </View>
            </View>
            <View style={styles.progressBarSection}>
              <View style={styles.progressBarHeader}>
                <Text style={styles.progressBarLabel}>
                  {myParticipation.checkInCount}/{challenge.targetCount} {challenge.unit || 'times'}
                </Text>
                <Text style={styles.progressBarPercent}>
                  {getChallengeProgress(myParticipation.checkInCount, challenge.targetCount)}%
                </Text>
              </View>
              <ProgressBar
                progress={getChallengeProgress(myParticipation.checkInCount, challenge.targetCount) / 100}
                color={Colors.evergreenTeal}
                style={styles.progressBar}
              />
            </View>

            {/* Check-in Button */}
            {challenge.status === 'active' && (
              <Button
                variant={checkedInToday ? 'outline' : 'primary'}
                onPress={() => setShowCheckInModal(true)}
                disabled={checkedInToday}
                style={styles.checkInButton}
              >
                {checkedInToday ? 'Checked In Today' : 'Check In Now'}
              </Button>
            )}
          </Card>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'leaderboard' && styles.tabActive]}
            onPress={() => setActiveTab('leaderboard')}
          >
            <Icon
              name="trophy"
              size={18}
              color={activeTab === 'leaderboard' ? Colors.evergreenTeal : Colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'leaderboard' && styles.tabTextActive]}>
              Leaderboard
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'activity' && styles.tabActive]}
            onPress={() => setActiveTab('activity')}
          >
            <Icon
              name="pulse"
              size={18}
              color={activeTab === 'activity' ? Colors.evergreenTeal : Colors.textSecondary}
            />
            <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>Activity</Text>
          </TouchableOpacity>
          {isMember && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'my-progress' && styles.tabActive]}
              onPress={() => setActiveTab('my-progress')}
            >
              <Icon
                name="chart-line"
                size={18}
                color={activeTab === 'my-progress' ? Colors.evergreenTeal : Colors.textSecondary}
              />
              <Text style={[styles.tabText, activeTab === 'my-progress' && styles.tabTextActive]}>
                My Check-ins
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Content */}
        {activeTab === 'leaderboard' && (
          <Card style={styles.tabContent}>
            {leaderboard.length === 0 ? (
              <Text style={styles.emptyTabText}>No participants yet. Be the first!</Text>
            ) : (
              leaderboard.map((participant, index) => (
                <LeaderboardItem key={participant.id} participant={participant} rank={index + 1} />
              ))
            )}
          </Card>
        )}

        {activeTab === 'activity' && (
          <Card style={styles.tabContent}>
            {recentCheckIns.length === 0 ? (
              <Text style={styles.emptyTabText}>No activity yet. Start checking in!</Text>
            ) : (
              recentCheckIns.map((checkInItem) => <ActivityItem key={checkInItem.id} checkIn={checkInItem} />)
            )}
          </Card>
        )}

        {activeTab === 'my-progress' && isMember && (
          <Card style={styles.tabContent}>
            {myCheckIns.length === 0 ? (
              <Text style={styles.emptyTabText}>You haven't checked in yet. Start today!</Text>
            ) : (
              myCheckIns.map((checkInItem) => <MyCheckInItem key={checkInItem.id} checkIn={checkInItem} />)
            )}
          </Card>
        )}

        {/* Join/Leave Actions */}
        <View style={styles.actionsSection}>
          {!isMember ? (
            <Button variant="primary" onPress={handleJoin} style={styles.actionButton}>
              Join Challenge
            </Button>
          ) : (
            <>
              {canInvite && (
                <Button
                  variant="primary"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowInviteModal(true);
                  }}
                  style={styles.actionButton}
                >
                  <Icon name="account-plus" size={16} color={Colors.textOnPrimary} /> Invite Members
                </Button>
              )}
              <Button variant="outline" onPress={handleLeave} style={styles.leaveButton}>
                Leave Challenge
              </Button>
            </>
          )}
        </View>
      </ScrollView>

      {/* Check-in Modal */}
      <Portal>
        <Modal
          visible={showCheckInModal}
          onDismiss={() => setShowCheckInModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Check In
          </Text>
          <Text style={styles.modalSubtitle}>Great work! Add an optional note about today's progress.</Text>
          <Input
            label="Note (optional)"
            value={checkInNote}
            onChangeText={setCheckInNote}
            placeholder="How did it go today?"
            multiline
            numberOfLines={3}
            style={styles.modalInput}
          />
          <View style={styles.modalActions}>
            <PaperButton mode="outlined" onPress={() => setShowCheckInModal(false)} style={styles.modalButton}>
              Cancel
            </PaperButton>
            <PaperButton
              mode="contained"
              onPress={handleCheckIn}
              loading={submitting}
              disabled={submitting}
              style={styles.modalButton}
              buttonColor={Colors.evergreenTeal}
            >
              Check In
            </PaperButton>
          </View>
        </Modal>
      </Portal>

      {/* Invite Members Modal */}
      <InviteMembersModal
        visible={showInviteModal}
        onDismiss={() => setShowInviteModal(false)}
        type="challenge"
        entityId={challengeId}
        entityName={challenge?.name || 'Challenge'}
        existingMemberIds={challenge?.members || []}
        onInvitesSent={(count) => {
          if (count > 0) {
            Alert.alert('Success', `${count} invite${count > 1 ? 's' : ''} sent!`);
          }
        }}
      />
    </SafeAreaView>
  );
};

// Leaderboard Item Component
const LeaderboardItem: React.FC<{ participant: ChallengeParticipant; rank: number }> = ({
  participant,
  rank,
}) => {
  const getMedalColor = (rank: number) => {
    if (rank === 1) return '#FFD700';
    if (rank === 2) return '#C0C0C0';
    if (rank === 3) return '#CD7F32';
    return Colors.textSecondary;
  };

  return (
    <View style={styles.leaderboardItem}>
      <View style={styles.rankContainer}>
        {rank <= 3 ? (
          <Icon name="medal" size={24} color={getMedalColor(rank)} />
        ) : (
          <Text style={styles.rankText}>{rank}</Text>
        )}
      </View>
      {participant.avatar ? (
        <Avatar.Image size={40} source={{ uri: participant.avatar }} />
      ) : (
        <Avatar.Text
          size={40}
          label={(participant.displayName || 'U').charAt(0).toUpperCase()}
          style={styles.leaderboardAvatar}
        />
      )}
      <View style={styles.leaderboardInfo}>
        <Text style={styles.leaderboardName}>{participant.displayName || 'Anonymous'}</Text>
        <Text style={styles.leaderboardStats}>
          {participant.checkInCount} check-ins | {participant.currentStreak} day run
        </Text>
      </View>
      {participant.completedTarget && (
        <Icon name="check-decagram" size={24} color={Colors.success} />
      )}
    </View>
  );
};

// Activity Item Component
const ActivityItem: React.FC<{ checkIn: ChallengeCheckIn }> = ({ checkIn }) => {
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
      {userProfile?.avatar ? (
        <Avatar.Image size={36} source={{ uri: userProfile.avatar }} />
      ) : (
        <Avatar.Text
          size={36}
          label={(userProfile?.displayName || 'U').charAt(0).toUpperCase()}
          style={styles.activityAvatar}
        />
      )}
      <View style={styles.activityInfo}>
        <Text style={styles.activityText}>
          <Text style={styles.activityName}>{userProfile?.displayName || 'Someone'}</Text> checked in
        </Text>
        {checkIn.note && <Text style={styles.activityNote}>"{checkIn.note}"</Text>}
        <Text style={styles.activityTime}>{formatTime(checkIn.createdAt)}</Text>
      </View>
    </View>
  );
};

// My Check-in Item Component
const MyCheckInItem: React.FC<{ checkIn: ChallengeCheckIn }> = ({ checkIn }) => {
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
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  infoCard: {
    margin: Spacing.lg,
  },
  topBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.sm,
    gap: 4,
  },
  categoryText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.sm,
  },
  statusText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  goalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dewSage,
    padding: Spacing.base,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  goalText: {
    flex: 1,
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
  },
  description: {
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.base,
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: Colors.borderLight,
    marginBottom: Spacing.base,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ownerAvatar: {
    backgroundColor: Colors.evergreenTeal,
  },
  ownerText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  ownerName: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  durationText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing.xs,
  },
  progressCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  progressTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.base,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: Spacing.base,
  },
  progressStat: {
    alignItems: 'center',
  },
  progressStatValue: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.evergreenTeal,
  },
  progressStatLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  progressBarSection: {
    marginBottom: Spacing.base,
  },
  progressBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  progressBarLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  progressBarPercent: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.silverSage,
  },
  checkInButton: {
    marginTop: Spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: 4,
    marginBottom: Spacing.base,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: 4,
    borderRadius: Layout.borderRadius.sm,
  },
  tabActive: {
    backgroundColor: Colors.dewSage,
  },
  tabText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  tabContent: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  emptyTabText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
  },
  leaderboardAvatar: {
    backgroundColor: Colors.evergreenTeal,
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  leaderboardName: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  leaderboardStats: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  activityItem: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
  },
  activityAvatar: {
    backgroundColor: Colors.evergreenTeal,
  },
  activityInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  activityText: {
    color: Colors.textPrimary,
  },
  activityName: {
    fontWeight: Typography.fontWeight.semibold,
  },
  activityNote: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  activityTime: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
  },
  myCheckInItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  myCheckInInfo: {
    flex: 1,
  },
  myCheckInDate: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  myCheckInNote: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  actionsSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  actionButton: {
    marginBottom: Spacing.base,
  },
  leaveButton: {
    borderColor: Colors.error,
  },
  modal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  modalInput: {
    marginBottom: Spacing.base,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});

export default ChallengeDetailScreen;
