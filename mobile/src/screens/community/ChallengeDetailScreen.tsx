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
  TextInput,
} from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Button, LoadingSpinner, Input, Card } from '../../components';
import { InviteMembersModal } from '../../components/community';
import { WeekRhythmDots } from '../../components/community/WeekRhythmDots';
import { Badge } from '../../components/shared/Badge';
import { CommunityAvatar } from '../../components/shared/CommunityAvatar';
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
  fetchWeeklyCheckInCounts,
  joinChallenge,
  leaveChallenge,
  checkIn,
  hasCheckedInToday,
  getDaysRemaining,
  getChallengeProgress,
  formatChallengeDuration,
  formatChallengePosition,
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
  const [weeklyCheckInCounts, setWeeklyCheckInCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Panel state
  const [showCheckInPanel, setShowCheckInPanel] = useState(false);
  const [checkInNote, setCheckInNote] = useState('');
  const [checkInMood, setCheckInMood] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [canInvite, setCanInvite] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'activity' | 'standings' | 'my-progress'>('activity');

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

      // Load leaderboard and weekly counts
      const [leaderboardData, weeklyCounts] = await Promise.all([
        fetchChallengeLeaderboard(challengeId),
        fetchWeeklyCheckInCounts(challengeId),
      ]);
      setLeaderboard(leaderboardData);
      setWeeklyCheckInCounts(weeklyCounts);

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

  const getActiveDaysThisWeek = (checkIns: ChallengeCheckIn[]): number => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);

    const uniqueDays = new Set(
      checkIns
        .filter(ci => new Date(ci.date) >= monday)
        .map(ci => ci.date)
    );
    return uniqueDays.size;
  };

  const getCheckInPrompt = (category?: string): string => {
    switch (category) {
      case 'fitness': return 'How did movement feel today?';
      case 'mindfulness': return 'What did you notice during your practice?';
      case 'nutrition': return 'How did this meal make you feel?';
      case 'sleep': return 'How was your rest?';
      case 'mental-health': return 'How are you feeling right now?';
      default: return 'How did this go today?';
    }
  };

  const handleCheckIn = async () => {
    setSubmitting(true);
    try {
      await checkIn(challengeId, checkInNote.trim() || undefined, checkInMood || undefined);
      setShowCheckInPanel(false);
      setCheckInNote('');
      setCheckInMood('');
      setCheckedInToday(true);
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
          <Icon name="arrow-left" size={20} color={Colors.evergreenTeal} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {challenge.name}
        </Text>
        {isMember ? (
          <TouchableOpacity
            onPress={() => {
              Alert.alert(
                'Options',
                undefined,
                [
                  {
                    text: 'Leave Challenge',
                    style: 'destructive',
                    onPress: handleLeave,
                  },
                  { text: 'Cancel', style: 'cancel' },
                ],
              );
            }}
            style={styles.overflowButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="dots-horizontal" size={18} color={Colors.mutedSageGray} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.evergreenTeal]} />
        }
      >
        {/* Challenge Info Card */}
        <View style={styles.infoCardContainer}>
          <Card style={styles.infoCard}>
            {/* Category & Status Badges */}
            <View style={styles.topBadges}>
              <Badge label={categoryConfig.label} variant="category" />
              <Badge
                label={challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
                variant="active"
              />
            </View>

            {/* Goal */}
            <View style={styles.goalSection}>
              <Text style={styles.goalText}>{'\u25CE'} {challenge.challengeGoal}</Text>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{memberCount}</Text>
                <Text style={styles.statLabel}>participants</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{formatChallengePosition(challenge.startDate, challenge.endDate).split(' of ')[0]}</Text>
                <Text style={styles.statLabel}>of {formatChallengePosition(challenge.startDate, challenge.endDate).split(' of ')[1]}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{challenge.totalCheckIns || 0}</Text>
                <Text style={styles.statLabel}>check-ins today</Text>
              </View>
            </View>

            {/* Creator Row */}
            <View style={styles.ownerRow}>
              <CommunityAvatar
                name={owner?.displayName || 'U'}
                photoURL={owner?.avatar}
                size={24}
              />
              <Text style={styles.ownerText}>
                Created by <Text style={styles.ownerName}>{owner?.displayName || 'Unknown'}</Text>
              </Text>
              <Text style={styles.ownerWeek}>
                {formatChallengeDuration(challenge.startDate, challenge.endDate)}
              </Text>
            </View>
          </Card>
        </View>

        {/* My Progress (if member) */}
        {isMember && myParticipation && (
          <View style={styles.progressCardContainer}>
          <Card style={styles.progressCard}>
            <Text style={styles.progressTitle}>
              Your Progress
            </Text>

            <WeekRhythmDots checkIns={myCheckIns} />

            <View style={styles.progressStats}>
              <View style={styles.progressStat}>
                <Text style={styles.progressStatValue}>{getActiveDaysThisWeek(myCheckIns)}</Text>
                <Text style={styles.progressStatLabel}>Active days</Text>
              </View>
              <View style={styles.progressStatDivider} />
              <View style={styles.progressStat}>
                <Text style={styles.progressStatValue}>{myParticipation.checkInCount}</Text>
                <Text style={styles.progressStatLabel}>Total check-ins</Text>
              </View>
              <View style={styles.progressStatDivider} />
              <View style={styles.progressStat}>
                <Text style={styles.progressStatValue}>{myParticipation.longestStreak}</Text>
                <Text style={styles.progressStatLabel}>Best rhythm</Text>
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

            {/* Check-in Button / Panel */}
            {challenge.status === 'active' && !checkedInToday && !showCheckInPanel && (
              <Button
                variant="primary"
                onPress={() => setShowCheckInPanel(true)}
                style={styles.checkInButton}
              >
                Check In Today
              </Button>
            )}

            {challenge.status === 'active' && checkedInToday && (
              <Button
                variant="outline"
                disabled
                style={styles.checkInButton}
              >
                Checked In Today
              </Button>
            )}

            {showCheckInPanel && (
              <View style={styles.reflectionPanel}>
                <Text style={styles.reflectionPrompt}>
                  {getCheckInPrompt(challenge.category)}
                </Text>

                <View style={styles.emojiRow}>
                  {['😤', '😐', '😊', '💪', '🌟'].map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={[
                        styles.emojiButton,
                        checkInMood === emoji && styles.emojiButtonSelected,
                      ]}
                      onPress={() => setCheckInMood(checkInMood === emoji ? '' : emoji)}
                    >
                      <Text style={styles.emojiText}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.reflectionInput}
                  placeholder="Add a note (optional)..."
                  placeholderTextColor={Colors.textSecondary}
                  value={checkInNote}
                  onChangeText={setCheckInNote}
                  multiline
                />

                <View style={styles.reflectionActions}>
                  <TouchableOpacity
                    style={styles.cancelReflectionButton}
                    onPress={() => {
                      setShowCheckInPanel(false);
                      setCheckInNote('');
                      setCheckInMood('');
                    }}
                  >
                    <Text style={styles.cancelReflectionText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.completeCheckInButton}
                    onPress={handleCheckIn}
                    disabled={submitting}
                  >
                    <Text style={styles.completeCheckInText}>
                      {submitting ? 'Checking in...' : 'Complete Check-In'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </Card>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'activity' && styles.tabActive]}
            onPress={() => setActiveTab('activity')}
          >
            <Text style={[styles.tabText, activeTab === 'activity' && styles.tabTextActive]}>Activity</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'standings' && styles.tabActive]}
            onPress={() => setActiveTab('standings')}
          >
            <Text style={[styles.tabText, activeTab === 'standings' && styles.tabTextActive]}>
              Standings
            </Text>
          </TouchableOpacity>
          {isMember && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'my-progress' && styles.tabActive]}
              onPress={() => setActiveTab('my-progress')}
            >
              <Text style={[styles.tabText, activeTab === 'my-progress' && styles.tabTextActive]}>
                My Check-ins
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tab Content */}
        {activeTab === 'standings' && (
          <Card style={styles.tabContent}>
            <View style={styles.weeklyResetBanner}>
              <Text style={styles.weeklyResetText}>Resets weekly · Everyone starts fresh each Monday</Text>
            </View>
            {leaderboard.length === 0 ? (
              <Text style={styles.emptyTabText}>No participants yet. Be the first!</Text>
            ) : (
              [...leaderboard]
                .sort((a, b) => (weeklyCheckInCounts.get(b.userId) || 0) - (weeklyCheckInCounts.get(a.userId) || 0))
                .map((participant, index) => (
                  <LeaderboardItem
                    key={participant.id}
                    participant={participant}
                    rank={index + 1}
                    weeklyCount={weeklyCheckInCounts.get(participant.userId) || 0}
                  />
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

        {/* Join/Invite Actions */}
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
            </>
          )}
        </View>
      </ScrollView>

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
const LeaderboardItem: React.FC<{ participant: ChallengeParticipant; rank: number; weeklyCount?: number }> = ({
  participant,
  rank,
  weeklyCount = 0,
}) => {
  const getRankDisplay = (rank: number) => {
    if (rank === 1) return '\uD83E\uDD47'; // gold medal emoji
    return null;
  };

  return (
    <View style={styles.leaderboardItem}>
      <View style={styles.rankContainer}>
        {rank === 1 ? (
          <Text style={[styles.rankText, { color: Colors.sunriseAmber }]}>{getRankDisplay(rank)}</Text>
        ) : (
          <Text style={styles.rankText}>{rank}</Text>
        )}
      </View>
      <CommunityAvatar
        name={participant.displayName || 'U'}
        photoURL={participant.avatar}
        size={36}
      />
      <View style={styles.leaderboardInfo}>
        <Text style={styles.leaderboardName}>{participant.displayName || 'Anonymous'}</Text>
        <Text style={styles.leaderboardStats}>
          {weeklyCount} active {weeklyCount === 1 ? 'day' : 'days'} this week
        </Text>
      </View>
      <View style={styles.leaderboardCount}>
        <Text style={styles.leaderboardCountValue}>{weeklyCount}</Text>
        <Text style={styles.leaderboardCountLabel}>this week</Text>
      </View>
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  headerSpacer: {
    width: 32,
  },
  overflowButton: {
    padding: Spacing.xs,
  },

  scrollView: {
    flex: 1,
  },

  // Info Card
  infoCardContainer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
  infoCard: {
    padding: 20,
  },
  topBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },

  // Goal
  goalSection: {
    padding: 14,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.dewSageLight,
    marginBottom: 14,
  },
  goalText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    textAlign: 'center',
    marginBottom: 14,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.evergreenTeal,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },

  // Owner Row
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  ownerText: {
    color: Colors.mutedSageGray,
    fontSize: 13,
    flex: 1,
  },
  ownerName: {
    color: Colors.softCharcoal,
    fontWeight: Typography.fontWeight.semibold,
  },
  ownerWeek: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
    marginLeft: 'auto',
  },

  // Progress Card
  progressCardContainer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
  },
  progressCard: {
    padding: 20,
  },
  progressTitle: {
    fontSize: Spacing.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: 14,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Colors.mistWhite,
    borderRadius: 10,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.base,
  },
  progressStat: {
    alignItems: 'center',
    flex: 1,
  },
  progressStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.divider,
  },
  progressStatValue: {
    fontSize: 18,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.evergreenTeal,
  },
  progressStatLabel: {
    fontSize: 11,
    color: Colors.mutedSageGray,
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
    color: Colors.mutedSageGray,
    fontSize: Typography.fontSize.xs,
  },
  progressBarPercent: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  progressBar: {
    height: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(184,205,186,0.3)',
  },
  checkInButton: {
    marginTop: Spacing.sm,
  },

  // Reflection Panel
  reflectionPanel: {
    backgroundColor: Colors.dewSageLight,
    borderWidth: 1,
    borderColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.base,
    marginTop: Spacing.sm,
  },
  reflectionPrompt: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  emojiButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiButtonSelected: {
    borderColor: Colors.evergreenTeal,
    backgroundColor: Colors.tealLight,
  },
  emojiText: {
    fontSize: 22,
  },
  reflectionInput: {
    height: 60,
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.softCharcoal,
    backgroundColor: Colors.white,
    textAlignVertical: 'top',
    marginTop: Spacing.md,
  },
  reflectionActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 10,
  },
  cancelReflectionButton: {
    flex: 1,
    height: 36,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelReflectionText: {
    color: Colors.mutedSageGray,
    fontSize: 14,
    fontWeight: Typography.fontWeight.medium,
  },
  completeCheckInButton: {
    flex: 1,
    height: 36,
    backgroundColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeCheckInText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: Typography.fontWeight.medium,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    marginHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.evergreenTeal,
  },
  tabText: {
    fontSize: 13,
    color: Colors.mutedSageGray,
    fontWeight: Typography.fontWeight.semibold,
  },
  tabTextActive: {
    color: Colors.evergreenTeal,
  },
  tabContent: {
    marginHorizontal: Spacing.base,
    marginVertical: Spacing.md,
  },
  emptyTabText: {
    color: Colors.mutedSageGray,
    textAlign: 'center',
    paddingVertical: Spacing.xl,
  },

  // Leaderboard
  weeklyResetBanner: {
    paddingVertical: 10,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.dewSageLight,
    borderTopLeftRadius: Layout.borderRadius.md,
    borderTopRightRadius: Layout.borderRadius.md,
    marginBottom: 0,
  },
  weeklyResetText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: Colors.mutedSageGray,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 14,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  rankContainer: {
    width: 20,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.mutedSageGray,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  leaderboardStats: {
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
  },
  leaderboardCount: {
    alignItems: 'center',
  },
  leaderboardCountValue: {
    fontSize: Spacing.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.evergreenTeal,
  },
  leaderboardCountLabel: {
    fontSize: 11,
    color: Colors.mutedSageGray,
  },

  // Activity
  activityItem: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    padding: 14,
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

  // My Check-ins
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

  // Actions
  actionsSection: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  actionButton: {
    marginBottom: Spacing.base,
  },
});

export default ChallengeDetailScreen;
