/**
 * GroupDetailHeader
 * Renders the full header for the GroupDetailScreen including group info,
 * action buttons, challenges, weekly prompt, and posts section header.
 */

import React, { memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Button } from '..';
import { ChallengeCard } from './ChallengeCard';
import { Badge } from '../shared/Badge';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { Challenge, ChallengeParticipant, GroupPrompt } from '../../types/models';
import { Group, UserProfile } from '../../services/firebase/community.service';
import { formatChallengePosition } from '../../services/firebase/challenges.service';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface GroupDetailHeaderProps {
  group: Group | null;
  initialGroupName?: string;
  owner: UserProfile | null;
  isMember: boolean;
  isOwner: boolean;
  canInvite: boolean;
  postCount: number;
  groupChallenges: Challenge[];
  challengeParticipations: Map<string, ChallengeParticipant | null>;
  groupPrompt: GroupPrompt | null;
  promptResponseCount: number;
  currentUserId: string;
  onGoBack: () => void;
  onLeaveGroup: () => void;
  onShowMembers: () => void;
  onShowCreatePost: () => void;
  onShowCreateChallenge: () => void;
  onShowInviteModal: () => void;
  onJoinGroup: () => void;
  onNavigateToChallenge: (challengeId: string, challengeName: string) => void;
  onJoinChallenge: (challengeId: string, challengeName: string) => void;
  onShowSetPrompt: () => void;
}

const isChallengeParticipant = (challenge: Challenge, currentUserId: string): boolean => {
  return challenge.members.includes(currentUserId);
};

const GroupDetailHeader = memo(({
  group,
  initialGroupName,
  owner,
  isMember,
  isOwner,
  canInvite,
  postCount,
  groupChallenges,
  challengeParticipations,
  groupPrompt,
  promptResponseCount,
  currentUserId,
  onGoBack,
  onLeaveGroup,
  onShowMembers,
  onShowCreatePost,
  onShowCreateChallenge,
  onShowInviteModal,
  onJoinGroup,
  onNavigateToChallenge,
  onJoinChallenge,
  onShowSetPrompt,
}: GroupDetailHeaderProps) => {
  return (
    <View>
      {/* Back Button Header */}
      <View style={headerStyles.backButtonHeader}>
        <TouchableOpacity
          onPress={onGoBack}
          style={headerStyles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-left" size={20} color={Colors.evergreenTeal} />
        </TouchableOpacity>
        <Text style={headerStyles.backButtonTitle} numberOfLines={1}>
          {group?.name || initialGroupName || 'Group'}
        </Text>
        {isMember ? (
          <TouchableOpacity
            onPress={() => {
              const options: any[] = [];
              if (!isOwner) {
                options.push({
                  text: 'Leave Group',
                  style: 'destructive',
                  onPress: onLeaveGroup,
                });
              }
              options.push({ text: 'Cancel', style: 'cancel' });
              Alert.alert('Options', undefined, options);
            }}
            style={headerStyles.overflowButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="dots-horizontal" size={18} color={Colors.mutedSageGray} />
          </TouchableOpacity>
        ) : (
          <View style={headerStyles.backButtonSpacer} />
        )}
      </View>

      {/* Group Header */}
      <View style={headerStyles.groupHeader}>
        <View style={headerStyles.groupIconContainer}>
          <Text style={headerStyles.groupIconText}>
            <Icon name="account-group" size={26} color={Colors.evergreenTeal} />
          </Text>
        </View>

        <Text style={headerStyles.groupName}>
          {group?.name}
        </Text>

        {group?.description && (
          <Text style={headerStyles.groupDescription}>
            {group.description}
          </Text>
        )}

        {/* Group Meta Badges */}
        <View style={headerStyles.groupMeta}>
          {group?.category && (
            <Badge label={group.category} variant="category" />
          )}
          <Badge
            label={group?.isPublic ? 'Public' : 'Private'}
            variant="active"
          />
          <TouchableOpacity onPress={onShowMembers}>
            <Badge
              label={`${group?.memberCount || group?.members.length || 0} members`}
              variant="default"
            />
          </TouchableOpacity>
        </View>

        {/* Owner Info */}
        {owner && (
          <View style={headerStyles.ownerInfo}>
            <View style={[headerStyles.ownerAvatar, { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ color: Colors.textOnPrimary, fontSize: 13, fontWeight: '600' }}>
                {(owner.displayName || 'U').substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={headerStyles.ownerText}>
              Hosted by <Text style={headerStyles.ownerName}>{owner.displayName}</Text>
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={headerStyles.actionButtons}>
          {isMember ? (
            <>
              <Button
                variant="primary"
                style={headerStyles.actionButtonPrimary}
                onPress={onShowCreatePost}
              >
                <Icon name="pencil" size={16} color={Colors.textOnPrimary} /> Post
              </Button>
              <Button
                variant="outline"
                style={headerStyles.actionButtonSecondary}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onShowCreateChallenge();
                }}
              >
                <Icon name="leaf" size={16} color={Colors.evergreenTeal} /> Challenge
              </Button>
              {canInvite && (
                <Button
                  variant="outline"
                  style={headerStyles.actionButtonInvite}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onShowInviteModal();
                  }}
                >
                  <Icon name="account-plus" size={16} color={Colors.evergreenTeal} /> Invite
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="primary"
              style={headerStyles.actionButtonPrimary}
              onPress={onJoinGroup}
            >
              Join Group
            </Button>
          )}
        </View>
      </View>

      {/* Group Challenges Section */}
      {groupChallenges.length > 0 && (
        <View style={headerStyles.challengesSection}>
          <View style={headerStyles.sectionHeader}>
            <Text style={headerStyles.sectionTitle}>
              Group Challenges
            </Text>
            <Text style={headerStyles.sectionSubtitle}>
              {groupChallenges.length} {groupChallenges.length === 1 ? 'challenge' : 'challenges'}
            </Text>
          </View>
          <View style={headerStyles.challengesList}>
            {groupChallenges.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                participation={challengeParticipations.get(challenge.id)}
                isMember={isChallengeParticipant(challenge, currentUserId)}
                onPress={() => onNavigateToChallenge(challenge.id, challenge.name)}
                onJoin={() => onJoinChallenge(challenge.id, challenge.name)}
              />
            ))}
          </View>
        </View>
      )}

      {/* Empty Challenges State (only show when member but no challenges) */}
      {isMember && groupChallenges.length === 0 && (
        <View style={headerStyles.emptyChallengesSection}>
          <View style={headerStyles.emptyChallengesContent}>
            <Icon name="leaf" size={32} color={Colors.textSecondary} />
            <View style={headerStyles.emptyChallengesText}>
              <Text style={headerStyles.emptyChallengesTitle}>
                No group challenges yet
              </Text>
              <Text style={headerStyles.emptyChallengesSubtitle}>
                Create a challenge to motivate group members
              </Text>
            </View>
            <TouchableOpacity
              style={headerStyles.createChallengeButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onShowCreateChallenge();
              }}
            >
              <Icon name="plus" size={16} color={Colors.evergreenTeal} />
              <Text style={headerStyles.createChallengeButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Active Challenge Card */}
      {(() => {
        const activeChallenges = groupChallenges?.filter((c: Challenge) => c.status === 'active') || [];
        if (activeChallenges.length > 0) {
          return (
            <View style={headerStyles.activeChallengeWrapper}>
            <View style={headerStyles.activeChallengeCard}>
              <View style={headerStyles.activeChallengeHeader}>
                <Text style={headerStyles.activeChallengeHeaderIcon}>{'\u25C8'}</Text>
                <Text style={headerStyles.activeChallengeHeaderText}>Active Challenge</Text>
              </View>
              <TouchableOpacity
                style={headerStyles.activeChallengeContent}
                onPress={() => onNavigateToChallenge(activeChallenges[0].id, activeChallenges[0].name)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={headerStyles.activeChallengeName}>{activeChallenges[0].name}</Text>
                  <Text style={headerStyles.activeChallengeInfo}>
                    {formatChallengePosition(activeChallenges[0].startDate, activeChallenges[0].endDate)} · {activeChallenges[0].memberCount || activeChallenges[0].members?.length || 0} participants
                  </Text>
                  <View style={headerStyles.activeChallengeProgress}>
                    <View style={headerStyles.activeChallengeProgressBar}>
                      <View style={{
                        height: '100%',
                        borderRadius: 4,
                        backgroundColor: Colors.evergreenTeal,
                        width: `${(() => {
                          const c = activeChallenges[0];
                          const start = c.startDate?.toDate ? c.startDate.toDate() : new Date(c.startDate as any);
                          const end = c.endDate?.toDate ? c.endDate.toDate() : new Date(c.endDate as any);
                          const total = end.getTime() - start.getTime();
                          const elapsed = Date.now() - start.getTime();
                          return total > 0 ? Math.min(Math.max(elapsed / total, 0), 1) * 100 : 0;
                        })()}%`,
                      }} />
                    </View>
                  </View>
                </View>
                <Text style={headerStyles.activeChallengeViewLink}>View {'\u2192'}</Text>
              </TouchableOpacity>
            </View>
            </View>
          );
        }
        if (activeChallenges.length === 0 && isMember) {
          return (
            <View style={headerStyles.noActiveChallengeCard}>
              <Icon name="leaf" size={24} color={Colors.textSecondary} />
              <Text style={headerStyles.noActiveChallengeText}>No active challenges yet</Text>
              <TouchableOpacity
                style={headerStyles.noActiveChallengeButton}
                onPress={onShowCreateChallenge}
              >
                <Text style={headerStyles.noActiveChallengeButtonText}>+ Create</Text>
              </TouchableOpacity>
            </View>
          );
        }
        return null;
      })()}

      {/* Weekly Prompt Card */}
      {groupPrompt && (
        <View style={headerStyles.promptWrapper}>
          <View style={headerStyles.promptCard}>
            <Text style={headerStyles.promptLabel}>WEEKLY REFLECTION</Text>
            <Text style={headerStyles.promptQuestion}>{groupPrompt.prompt}</Text>
            <View style={headerStyles.promptFooter}>
              <Text style={headerStyles.promptResponseCount}>{promptResponseCount} responses this week</Text>
              <TouchableOpacity onPress={onShowCreatePost}>
                <Text style={headerStyles.promptShareLink}>Share yours {'\u2192'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Set Weekly Prompt button (owner only) */}
      {isOwner && (
        <TouchableOpacity onPress={onShowSetPrompt} style={headerStyles.setPromptButton}>
          <Icon name="message-text-outline" size={16} color={Colors.evergreenTeal} />
          <Text style={headerStyles.setPromptButtonText}>
            {groupPrompt ? 'Edit Weekly Prompt' : 'Set Weekly Prompt'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Posts Section Header */}
      <View style={headerStyles.postsSectionHeader}>
        <Text style={headerStyles.postsSectionTitle}>Posts</Text>
        <Text style={headerStyles.postsSectionCount}>
          {postCount} {postCount === 1 ? 'post' : 'posts'}
        </Text>
      </View>
    </View>
  );
});

const headerStyles = StyleSheet.create({
  // Header bar
  backButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  backButtonTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.softCharcoal,
  },
  backButtonSpacer: {
    width: 32,
  },
  overflowButton: {
    padding: Spacing.xs,
  },
  // Group Header Card
  groupHeader: {
    padding: 16,
    paddingBottom: 0,
    alignItems: 'center',
  },
  groupIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.dewSageLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  groupIconText: {
    fontSize: 26,
    color: Colors.evergreenTeal,
  },
  groupName: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.evergreenTeal,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  groupDescription: {
    fontSize: 14,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: Spacing.base,
    paddingHorizontal: Spacing.lg,
  },
  groupMeta: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  ownerAvatar: {
    backgroundColor: Colors.evergreenTeal,
    marginRight: Spacing.sm,
  },
  ownerText: {
    color: Colors.mutedSageGray,
  },
  ownerName: {
    color: Colors.softCharcoal,
    fontWeight: Typography.fontWeight.semibold,
  },
  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    width: '100%',
  },
  actionButtonPrimary: {
    flex: 1,
    height: 48,
  },
  actionButtonSecondary: {
    flex: 1,
    height: 48,
  },
  actionButtonInvite: {
    height: 48,
  },
  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.mistWhite,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  sectionSubtitle: {
    color: Colors.textSecondary,
  },
  challengesSection: {
    backgroundColor: Colors.mistWhite,
  },
  challengesList: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.base,
  },
  emptyChallengesSection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
  },
  emptyChallengesContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    gap: Spacing.base,
  },
  emptyChallengesText: {
    flex: 1,
  },
  emptyChallengesTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  emptyChallengesSubtitle: {
    color: Colors.textSecondary,
  },
  createChallengeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.md,
    gap: 4,
  },
  createChallengeButtonText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  // Active Challenge Card styles
  activeChallengeWrapper: {
    padding: 12,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  activeChallengeCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dewSage,
    overflow: 'hidden',
  },
  activeChallengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.dewSageLight,
    gap: Spacing.sm,
  },
  activeChallengeHeaderIcon: {
    fontSize: 14,
    color: Colors.evergreenTeal,
  },
  activeChallengeHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.evergreenTeal,
  },
  activeChallengeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 16,
  },
  activeChallengeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.softCharcoal,
    marginBottom: 4,
  },
  activeChallengeInfo: {
    fontSize: 12,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.sm,
  },
  activeChallengeProgress: {
    marginTop: 4,
  },
  activeChallengeProgressBar: {
    height: 4,
    borderRadius: 4,
    backgroundColor: Colors.dewSageLight,
  },
  activeChallengeViewLink: {
    fontSize: 14,
    color: Colors.evergreenTeal,
    fontWeight: '500',
    marginLeft: Spacing.sm,
  },
  noActiveChallengeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.base,
    padding: Spacing.base,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.borderLight,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
  },
  noActiveChallengeText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  noActiveChallengeButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.md,
  },
  noActiveChallengeButtonText: {
    fontSize: 14,
    color: Colors.evergreenTeal,
    fontWeight: '500',
  },
  // Weekly Prompt styles
  promptWrapper: {
    padding: 12,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  promptCard: {
    backgroundColor: Colors.dewSageLight,
    borderWidth: 1,
    borderColor: Colors.dewSage,
    padding: 16,
    borderRadius: 12,
  },
  promptLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.evergreenTeal,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  promptQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.softCharcoal,
    lineHeight: 22,
    marginBottom: 12,
  },
  promptFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promptResponseCount: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  promptShareLink: {
    fontSize: 14,
    color: Colors.evergreenTeal,
    fontWeight: '500',
  },
  setPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.base,
    paddingVertical: Spacing.sm,
  },
  setPromptButtonText: {
    fontSize: 14,
    color: Colors.evergreenTeal,
    fontWeight: '500',
  },
  // Posts section header
  postsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: Spacing.base,
  },
  postsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.softCharcoal,
  },
  postsSectionCount: {
    fontSize: 14,
    color: Colors.mutedSageGray,
  },
});

export default GroupDetailHeader;
