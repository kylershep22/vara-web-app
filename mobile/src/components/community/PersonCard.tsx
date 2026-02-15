/**
 * Person Card Component
 * Enhanced profile card with avatar, interests, location, and mutual connections
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Card from '../Card';
import Button from '../Button';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { getInterestLabels } from '../../constants/interests';
import {
  formatLastActive,
  getSuggestionReasonLabel,
} from '../../hooks/useSuggestedConnections';
import { EnhancedUserProfile } from '../../services/firebase/connections.service';

interface PersonCardProps {
  user: EnhancedUserProfile;
  mode: 'connection' | 'discover' | 'request' | 'suggestion';
  onConnect?: () => void;
  onMessage?: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
  onPress?: () => void;
  isPending?: boolean;
  showMutualConnections?: boolean;
}

export const PersonCard: React.FC<PersonCardProps> = ({
  user,
  mode,
  onConnect,
  onMessage,
  onAccept,
  onDecline,
  onPress,
  isPending = false,
  showMutualConnections = true,
}) => {
  const displayName = user.displayName || 'Unknown User';
  const initials = displayName.substring(0, 2).toUpperCase();

  // Get visible interests (limited to 3)
  const visibleInterests = user.interestsPublic && user.interests
    ? getInterestLabels(user.interests.slice(0, 3))
    : [];

  // Get suggestion reason text
  const suggestionText = mode === 'suggestion'
    ? getSuggestionReasonLabel(
        user.suggestionReason,
        user.sharedGroups,
        user.sharedInterests,
        user.mutualConnectionCount
      )
    : null;

  // Get mutual connections text
  const mutualText = showMutualConnections && user.mutualConnectionCount && user.mutualConnectionCount > 0
    ? `${user.mutualConnectionCount} mutual connection${user.mutualConnectionCount > 1 ? 's' : ''}`
    : null;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
    >
      <Card style={styles.card}>
        {/* Suggestion Badge */}
        {mode === 'suggestion' && suggestionText && (
          <View style={styles.suggestionBadge}>
            <Icon
              name={
                user.suggestionReason === 'group'
                  ? 'account-group'
                  : user.suggestionReason === 'interests'
                  ? 'heart'
                  : 'account-multiple'
              }
              size={12}
              color={Colors.evergreenTeal}
            />
            <Text style={styles.suggestionText}>{suggestionText}</Text>
          </View>
        )}

        <View style={styles.content}>
          {/* Avatar with teal border */}
          <View style={styles.avatarContainer}>
            <View style={styles.avatarBorder}>
              {user.avatar || user.avatarUrl ? (
                <Image
                  source={{ uri: user.avatar || user.avatarUrl }}
                  style={styles.avatarImage}
                />
              ) : (
                <Avatar.Text
                  size={52}
                  label={initials}
                  style={styles.avatar}
                  color={Colors.textOnPrimary}
                />
              )}
            </View>
            {/* Last active indicator */}
            {user.lastActiveAt && (
              <View
                style={[
                  styles.activeIndicator,
                  formatLastActive(user.lastActiveAt) === 'Active now' && styles.activeIndicatorOnline,
                ]}
              />
            )}
          </View>

          {/* User Info */}
          <View style={styles.info}>
            <Text variant="titleMedium" style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>

            {/* Location */}
            {user.location && (
              <View style={styles.locationRow}>
                <Icon name="map-marker" size={14} color={Colors.textSecondary} />
                <Text variant="bodySmall" style={styles.location} numberOfLines={1}>
                  {user.location}
                </Text>
              </View>
            )}

            {/* Last Active */}
            {user.lastActiveAt && (
              <Text variant="bodySmall" style={styles.lastActive}>
                {formatLastActive(user.lastActiveAt)}
              </Text>
            )}

            {/* Bio */}
            {user.bio && (
              <Text
                variant="bodySmall"
                style={styles.bio}
                numberOfLines={2}
              >
                {user.bio}
              </Text>
            )}

            {/* Interests Tags */}
            {visibleInterests.length > 0 && (
              <View style={styles.interestsContainer}>
                {visibleInterests.map((interest, index) => (
                  <View key={index} style={styles.interestTag}>
                    <Text style={styles.interestTagText}>{interest}</Text>
                  </View>
                ))}
                {user.interests && user.interests.length > 3 && (
                  <Text style={styles.moreInterests}>
                    +{user.interests.length - 3}
                  </Text>
                )}
              </View>
            )}

            {/* Mutual Connections */}
            {mutualText && mode !== 'suggestion' && (
              <View style={styles.mutualRow}>
                <Icon name="account-multiple" size={14} color={Colors.evergreenTeal} />
                <Text style={styles.mutualText}>{mutualText}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {mode === 'request' ? (
            <>
              <Button
                variant="primary"
                style={styles.actionButton}
                onPress={onAccept}
              >
                Accept
              </Button>
              <Button
                variant="outline"
                style={styles.actionButton}
                onPress={onDecline}
              >
                Decline
              </Button>
            </>
          ) : mode === 'connection' ? (
            <Button
              variant="outline"
              style={[styles.actionButton, styles.fullWidthButton]}
              onPress={onMessage}
            >
              <Icon name="message-outline" size={16} color={Colors.evergreenTeal} />
              <Text style={styles.buttonTextWithIcon}>Message</Text>
            </Button>
          ) : isPending ? (
            <Button
              variant="outline"
              style={[styles.actionButton, styles.fullWidthButton, styles.pendingButton]}
              disabled
            >
              Requested
            </Button>
          ) : (
            <Button
              variant="primary"
              style={[styles.actionButton, styles.fullWidthButton]}
              onPress={onConnect}
            >
              <Icon name="account-plus" size={16} color={Colors.textOnPrimary} />
              <Text style={styles.connectButtonText}>Connect</Text>
            </Button>
          )}
        </View>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.base,
    position: 'relative',
  },
  suggestionBadge: {
    position: 'absolute',
    top: -8,
    left: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.mintCream,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.full,
    zIndex: 1,
  },
  suggestionText: {
    fontSize: 11,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: Spacing.base,
  },
  avatarBorder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatar: {
    backgroundColor: Colors.evergreenTeal,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.textSecondary,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  activeIndicatorOnline: {
    backgroundColor: '#4CAF50', // Green for online
  },
  info: {
    flex: 1,
  },
  name: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  location: {
    color: Colors.textSecondary,
    flex: 1,
  },
  lastActive: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },
  bio: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  interestTag: {
    backgroundColor: Colors.mintCream,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Layout.borderRadius.full,
  },
  interestTagText: {
    fontSize: 11,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  moreInterests: {
    fontSize: 11,
    color: Colors.textSecondary,
    alignSelf: 'center',
  },
  mutualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mutualText: {
    fontSize: 12,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.base,
    paddingTop: Spacing.base,
    borderTopWidth: 1,
    borderTopColor: 'rgba(184, 205, 186, 0.2)',
  },
  actionButton: {
    flex: 1,
  },
  fullWidthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pendingButton: {
    opacity: 0.6,
  },
  buttonTextWithIcon: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
    fontSize: 14,
  },
  connectButtonText: {
    color: Colors.textOnPrimary,
    fontWeight: Typography.fontWeight.medium,
    fontSize: 14,
  },
});

export default PersonCard;
