import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Colors, Typography, Spacing } from '../../constants';

interface CommunityOrientationCardProps {
  onFindGroup: () => void;
  onSkip: () => void;
  onNavigateGroups?: () => void;
  onNavigateChallenges?: () => void;
}

const GroupsIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Circle cx={6} cy={5} r={2.5} stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" />
    <Path d="M1 14C1 11.2 3.2 9 6 9" stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" />
    <Circle cx={11} cy={5} r={2.5} stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" />
    <Path d="M16 14C16 11.2 13.8 9 11 9" stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" />
  </Svg>
);

const ChallengesIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M8 1L9.8 5.8L15 6.2L11 9.6L12.4 15L8 12L3.6 15L5 9.6L1 6.2L6.2 5.8L8 1Z" stroke="#FFFFFF" strokeWidth={1.3} strokeLinejoin="round" />
  </Svg>
);

const PostsIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M2 2H14V11H9L6 14V11H2V2Z" stroke="#FFFFFF" strokeWidth={1.3} strokeLinejoin="round" strokeLinecap="round" />
  </Svg>
);

interface PillProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress?: () => void;
}

const ConceptPill: React.FC<PillProps> = ({ icon, title, subtitle, onPress }) => (
  <TouchableOpacity style={styles.pill} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.pillIconBox}>
      {icon}
    </View>
    <View style={styles.pillTextBlock}>
      <Text style={styles.pillTitle}>{title}</Text>
      <Text style={styles.pillSubtitle}>{subtitle}</Text>
    </View>
  </TouchableOpacity>
);

export const CommunityOrientationCard: React.FC<CommunityOrientationCardProps> = ({
  onFindGroup,
  onSkip,
  onNavigateGroups,
  onNavigateChallenges,
}) => (
  <View>
    <View style={styles.card}>
      <Text style={styles.heading}>Welcome to Community</Text>
      <Text style={styles.body}>
        A space to share, encourage, and build alongside people working on the same things you are.
      </Text>

      <View style={styles.pillsContainer}>
        <ConceptPill
          icon={<GroupsIcon />}
          title="Groups"
          subtitle="Ongoing shared spaces for connection"
          onPress={onNavigateGroups}
        />
        <ConceptPill
          icon={<ChallengesIcon />}
          title="Challenges"
          subtitle="Time-bound intentions to try together"
          onPress={onNavigateChallenges}
        />
        <ConceptPill
          icon={<PostsIcon />}
          title="Posts & Check-ins"
          subtitle="Share moments from your journey"
          onPress={onSkip}
        />
      </View>

      <TouchableOpacity style={styles.ctaButton} onPress={onFindGroup} activeOpacity={0.8}>
        <Text style={styles.ctaText}>Find a group to start →</Text>
      </TouchableOpacity>
    </View>

    <TouchableOpacity onPress={onSkip} activeOpacity={0.7}>
      <Text style={styles.skipText}>Skip for now</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
  },
  heading: {
    fontSize: 16,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 14,
  },
  pillsContainer: {
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 10,
  },
  pillIconBox: {
    width: 28,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillTextBlock: {
    flex: 1,
  },
  pillTitle: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  pillSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  ctaButton: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 16,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  skipText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.mutedSageGray,
    textDecorationLine: 'underline',
    marginTop: 8,
    marginBottom: Spacing.base,
  },
});
