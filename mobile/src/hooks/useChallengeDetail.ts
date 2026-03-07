/**
 * useChallengeDetail
 * State management and event handlers for ChallengeDetailScreen.
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { canUserInviteToChallenge } from '../services/firebase/invites.service';
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
} from '../services/firebase/challenges.service';
import { Challenge, ChallengeParticipant, ChallengeCheckIn } from '../types/models';
import { getUserById, UserProfile } from '../services/firebase/community.service';

type ChallengeDetailRouteProp = RouteProp<
  { ChallengeDetail: { challengeId: string; challengeName: string } },
  'ChallengeDetail'
>;

export function useChallengeDetail() {
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
      const challengeData = await fetchChallengeById(challengeId);
      if (!challengeData) {
        Alert.alert('Error', 'Challenge not found');
        navigation.goBack();
        return;
      }
      setChallenge(challengeData);

      const ownerData = await getUserById(challengeData.ownerId);
      setOwner(ownerData);

      const [leaderboardData, weeklyCounts] = await Promise.all([
        fetchChallengeLeaderboard(challengeId),
        fetchWeeklyCheckInCounts(challengeId),
      ]);
      setLeaderboard(leaderboardData);
      setWeeklyCheckInCounts(weeklyCounts);

      const recentData = await fetchChallengeCheckIns(challengeId, 20);
      setRecentCheckIns(recentData);

      if (user && challengeData.members.includes(user.uid)) {
        const participation = await fetchMyParticipation(challengeId);
        setMyParticipation(participation);

        const myCheckInsData = await fetchMyCheckIns(challengeId);
        setMyCheckIns(myCheckInsData);

        const todayStatus = await hasCheckedInToday(challengeId);
        setCheckedInToday(todayStatus);

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

  const handleJoin = useCallback(async () => {
    try {
      await joinChallenge(challengeId);
      Alert.alert('Success', `You joined "${challengeName}"!`);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join challenge');
    }
  }, [challengeId, challengeName, loadData]);

  const handleLeave = useCallback(() => {
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
  }, [challengeId, challengeName, loadData]);

  const handleCheckIn = useCallback(async () => {
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
  }, [challengeId, checkInNote, checkInMood, loadData]);

  const handleCancelCheckIn = useCallback(() => {
    setShowCheckInPanel(false);
    setCheckInNote('');
    setCheckInMood('');
  }, []);

  // Derived values
  const isMember = challenge ? isUserMemberOfChallenge(challenge, user?.uid) : false;
  const memberCount = challenge ? (challenge.memberCount || challenge.members.length) : 0;

  return {
    navigation,
    challenge,
    challengeId,
    challengeName,
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
    // Re-export utilities the screen needs
    getDaysRemaining,
    getChallengeProgress,
    formatChallengeDuration,
    formatChallengePosition,
  };
}
