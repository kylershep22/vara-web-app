/**
 * Challenge Detail Screen
 * View challenge details, leaderboard, activity feed, and check in.
 * Thin UI shell that delegates state/handlers to useChallengeDetail.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Button, LoadingSpinner, Card } from '../../components';
import { InviteMembersModal } from '../../components/community';
import { WeekRhythmDots } from '../../components/community/WeekRhythmDots';
import { ActivityItem, MyCheckInItem } from '../../components/community/ChallengeActivityItems';
import { Badge } from '../../components/shared/Badge';
import { CommunityAvatar } from '../../components/shared/CommunityAvatar';
import { Colors, Spacing, Typography, Layout, getGroupCategory } from '../../constants';
import { useChallengeDetail } from '../../hooks/useChallengeDetail';
import * as Haptics from 'expo-haptics';
import { ChallengeCheckIn } from '../../types/models';

const getActiveDaysThisWeek = (checkIns: ChallengeCheckIn[]): number => {
  const now = new Date();
  const dayOfWeek = now.getDay();
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

const ChallengeDetailScreen: React.FC = () => {
  const {
    navigation,
    challenge,
    challengeId,
    owner,
    leaderboard,
    myParticipation,
    recentCheckIns,
    myCheckIns,
    checkedInToday,
    weeklyCheckInCounts,
    loading,
    refreshing,
    showCheckInPanel,
    setShowCheckInPanel,
    checkInNote,
    setCheckInNote,
    checkInMood,
    setCheckInMood,
    submitting,
    showInviteModal,
    setShowInviteModal,
    canInvite,
    activeTab,
    setActiveTab,
    isMember,
    memberCount,
    onRefresh,
    handleJoin,
    handleLeave,
    handleCheckIn,
    handleCancelCheckIn,
    getChallengeProgress,
    formatChallengeDuration,
    formatChallengePosition,
  } = useChallengeDetail();

  if (loading || !challenge) {
    return <LoadingSpinner message="Loading challenge..." />;
  }

  const categoryConfig = getGroupCategory(challenge.category);

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
              Alert.alert('Options', undefined, [
                { text: 'Leave Challenge', style: 'destructive', onPress: handleLeave },
                { text: 'Cancel', style: 'cancel' },
              ]);
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
            <View style={styles.topBadges}>
              <Badge label={categoryConfig.label} variant="category" />
              <Badge
                label={challenge.status.charAt(0).toUpperCase() + challenge.status.slice(1)}
                variant="active"
              />
            </View>

            <View style={styles.goalSection}>
              <Text style={styles.goalText}>{'\u25CE'} {challenge.challengeGoal}</Text>
            </View>

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
              <Text style={styles.progressTitle}>Your Progress</Text>

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
                  <Text style={styles.progressStatLabel}>Days active</Text>
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
                <View style={styles.progressBarTrack}>
                  <View style={[styles.progressBarFill, { width: `${getChallengeProgress(myParticipation.checkInCount, challenge.targetCount)}%` }]} />
                </View>
              </View>

              {/* Check-in Button / Panel */}
              {challenge.status === 'active' && !checkedInToday && !showCheckInPanel && (
                <Button variant="primary" onPress={() => setShowCheckInPanel(true)} style={styles.checkInButton}>
                  Check In Today
                </Button>
              )}

              {challenge.status === 'active' && checkedInToday && (
                <Button variant="outline" disabled style={styles.checkInButton}>
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
                        style={[styles.emojiButton, checkInMood === emoji && styles.emojiButtonSelected]}
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
                    <TouchableOpacity style={styles.cancelReflectionButton} onPress={handleCancelCheckIn}>
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
            <Text style={[styles.tabText, activeTab === 'standings' && styles.tabTextActive]}>Standings</Text>
          </TouchableOpacity>
          {isMember && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'my-progress' && styles.tabActive]}
              onPress={() => setActiveTab('my-progress')}
            >
              <Text style={[styles.tabText, activeTab === 'my-progress' && styles.tabTextActive]}>My Check-ins</Text>
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
              <View>
                <Text style={styles.collectiveProgressText}>
                  {leaderboard.length} {leaderboard.length === 1 ? 'person is' : 'people are'} working on this challenge
                </Text>
                {leaderboard.map((participant) => (
                  <View key={participant.id} style={styles.leaderboardItem}>
                    <CommunityAvatar
                      name={participant.displayName || 'U'}
                      photoURL={participant.avatar}
                      size={36}
                    />
                    <View style={styles.leaderboardInfo}>
                      <Text style={styles.leaderboardName}>{participant.displayName || 'Anonymous'}</Text>
                      <Text style={styles.leaderboardStats}>
                        {weeklyCheckInCounts.get(participant.userId) || 0} active {(weeklyCheckInCounts.get(participant.userId) || 0) === 1 ? 'day' : 'days'} this week
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
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
    fontSize: 18,
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
  infoCardContainer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
  infoCard: {
    padding: 24,
  },
  topBadges: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    flexWrap: 'wrap',
  },
  goalSection: {
    padding: 16,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.dewSageLight,
    marginBottom: 16,
  },
  goalText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    textAlign: 'center',
    marginBottom: 16,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.evergreenTeal,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  ownerText: {
    color: Colors.mutedSageGray,
    fontSize: 14,
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
  progressCardContainer: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
  },
  progressCard: {
    padding: 24,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: 16,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Colors.mistWhite,
    borderRadius: 12,
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
    fontSize: 12,
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
  progressBarTrack: {
    height: 4,
    borderRadius: 9999,
    backgroundColor: Colors.silverSage + '30',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    borderRadius: 9999,
    backgroundColor: Colors.evergreenTeal,
  },
  checkInButton: {
    marginTop: Spacing.sm,
  },
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
    borderRadius: 12,
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
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.softCharcoal,
    backgroundColor: Colors.white,
    textAlignVertical: 'top',
    marginTop: Spacing.md,
  },
  reflectionActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: 12,
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
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.evergreenTeal,
  },
  tabText: {
    fontSize: 14,
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
  collectiveProgressText: {
    fontSize: 16,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  weeklyResetBanner: {
    paddingVertical: 12,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.dewSageLight,
    borderTopLeftRadius: Layout.borderRadius.md,
    borderTopRightRadius: Layout.borderRadius.md,
    marginBottom: 0,
  },
  weeklyResetText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: Colors.mutedSageGray,
  },
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 16,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
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
  actionsSection: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  actionButton: {
    marginBottom: Spacing.base,
  },
});

export default ChallengeDetailScreen;
