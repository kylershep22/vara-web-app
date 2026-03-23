/**
 * CommunityFeedHeader
 * Header content for the community feed: QuickNav, pending invites, filter pills, create post card.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageStyle,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { QuickNavButton } from './QuickNavButton';
import { PendingInvitesSection } from './PendingInvitesSection';
import { Colors, Spacing, Typography } from '../../constants';
interface PostTypeOption {
  type: 'update' | 'win' | 'reflection' | 'ask';
  emoji: string;
  label: string;
  subtitle: string;
}

const POST_TYPE_OPTIONS: PostTypeOption[] = [
  { type: 'update', emoji: '\u2728', label: 'Update', subtitle: "Share what's happening" },
  { type: 'win', emoji: '\uD83C\uDF89', label: 'Win', subtitle: 'Celebrate progress' },
  { type: 'reflection', emoji: '\uD83D\uDCAD', label: 'Reflection', subtitle: 'Share an insight' },
  { type: 'ask', emoji: '\uD83E\uDD1D', label: 'Ask', subtitle: 'Request support' },
];

interface CommunityFeedHeaderProps {
  userProfile: any;
  displayName: string;
  currentPrompt: string;
  feedFilter: 'all' | 'groups' | 'connections';
  showPostTypeSelector: boolean;
  onNavigate: (screen: string) => void;
  onSetFeedFilter: (filter: 'all' | 'groups' | 'connections') => void;
  onPostTypeSelected: (type: 'update' | 'win' | 'reflection' | 'ask') => void;
  onTogglePostTypeSelector: () => void;
  onInviteAction: (type: 'group' | 'challenge', id: string) => void;
}

export const CommunityFeedHeader: React.FC<CommunityFeedHeaderProps> = ({
  userProfile,
  displayName,
  currentPrompt,
  feedFilter,
  showPostTypeSelector,
  onNavigate,
  onSetFeedFilter,
  onPostTypeSelected,
  onTogglePostTypeSelector,
  onInviteAction,
}) => {
  const initials = (userProfile?.displayName || displayName || 'U').substring(0, 2).toUpperCase();

  return (
    <>
      {/* Quick Navigation */}
      <View style={styles.quickNav}>
        <QuickNavButton icon="account-group" label="Groups" subtitle="Your spaces" onPress={() => onNavigate('Groups')} />
        <QuickNavButton icon="account-multiple" label="People" subtitle="Connect" onPress={() => onNavigate('People')} />
        <QuickNavButton icon="leaf" label="Challenges" subtitle="Together" onPress={() => onNavigate('Challenges')} />
        <QuickNavButton icon="message-text" label="Messages" subtitle="Inbox" onPress={() => onNavigate('Conversations')} />
      </View>

      {/* Pending Invites Section */}
      <View style={styles.pendingInvitesContainer}>
        <PendingInvitesSection
          onInviteAccepted={onInviteAction}
        />
      </View>

      {/* Feed Filter Pills */}
      <View style={styles.filterPillsContainer}>
        {(['all', 'groups', 'connections'] as const).map((filter) => {
          const labels = { all: 'All Posts', groups: 'Group Posts', connections: 'User Posts' };
          const isActive = feedFilter === filter;
          return (
            <TouchableOpacity
              key={filter}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => onSetFeedFilter(filter)}
            >
              <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                {labels[filter]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Create Post Composer Row */}
      <View style={styles.composerRow}>
        <TouchableOpacity
          style={styles.composerTouchable}
          onPress={onTogglePostTypeSelector}
          activeOpacity={0.7}
        >
          {userProfile?.avatarUrl ? (
            <Image
              source={{ uri: userProfile.avatarUrl }}
              style={styles.composerAvatar as ImageStyle}
            />
          ) : (
            <View style={styles.composerAvatarFallback}>
              <Text style={styles.composerAvatarText}>{initials}</Text>
            </View>
          )}
          <Text style={styles.composerPlaceholder}>
            Share something with your community...
          </Text>
          <View style={styles.composerSendButton}>
            <Icon name="arrow-right" size={14} color={Colors.white} />
          </View>
        </TouchableOpacity>

        {/* Post Type Selector Grid */}
        {showPostTypeSelector && (
          <View style={styles.postTypeGrid}>
            {POST_TYPE_OPTIONS.map((item) => (
              <TouchableOpacity
                key={item.type}
                style={styles.postTypeCard}
                onPress={() => onPostTypeSelected(item.type)}
              >
                <Text style={styles.postTypeLabel}>{item.emoji} {item.label}</Text>
                <Text style={styles.postTypeSubtitle}>{item.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  quickNav: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
    justifyContent: 'space-evenly',
  },
  pendingInvitesContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.base,
  },
  filterPillsContainer: {
    flexDirection: 'row',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  filterPill: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
    paddingVertical: 8,
    paddingHorizontal: Spacing.base,
  },
  filterPillActive: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
  filterPillTextActive: {
    color: Colors.white,
  },
  composerRow: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  composerTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: '#E5EDE4',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  composerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  composerAvatarFallback: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  composerAvatarText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: Typography.fontWeight.semibold,
  },
  composerPlaceholder: {
    flex: 1,
    fontSize: 13,
    color: Colors.mutedSageGray,
  },
  composerSendButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: 16,
  },
  postTypeCard: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.dewSageLight,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  postTypeLabel: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  postTypeSubtitle: {
    fontSize: 12,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },
});
