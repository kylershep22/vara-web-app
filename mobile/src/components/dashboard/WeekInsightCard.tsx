import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';

interface WeekInsightCardProps {
  headline: string;
  supporting: string;
  onPressFullStory?: () => void;
  onDismiss?: () => void;
}

const WeekInsightCard: React.FC<WeekInsightCardProps> = ({
  headline,
  supporting,
  onPressFullStory,
  onDismiss,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.accentBar} />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headlineRow}>
            <Icon name="lightbulb-outline" size={18} color={Colors.evergreenTeal} style={styles.icon} />
            <Text style={styles.headline}>{headline}</Text>
          </View>
          {onDismiss && (
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.supporting}>{supporting}</Text>
        {onPressFullStory && (
          <TouchableOpacity onPress={onPressFullStory} style={styles.linkRow}>
            <Text style={styles.linkText}>See your full week story</Text>
            <Icon name="arrow-right" size={14} color={Colors.evergreenTeal} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(184,205,186,0.3)',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  accentBar: {
    width: 3,
    backgroundColor: Colors.evergreenTeal,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  icon: {
    marginRight: 8,
  },
  headline: {
    flex: 1,
    fontSize: 15,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  supporting: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 4,
    marginLeft: 26,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 26,
  },
  linkText: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginRight: 4,
  },
});

export default WeekInsightCard;
