/**
 * NotificationPermissionRow (NPM-2, Kyle's D4, D6 and Ruling 4): the device's
 * notification permission, on both Settings and Notifications, one
 * implementation.
 *
 * Allowed: status only, and the row is NOT a button. Denied: the row is a
 * button that opens iOS Settings. Not yet asked: the row is a button that asks
 * for permission. The spoken label names the action only in the two states
 * where the row performs it. Renders nothing until the first read answers.
 * It never writes a notification preference.
 */
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import Text from './Text';
import { Colors, Spacing, Typography } from '../../constants';
import { useNotificationPermission } from '../../hooks/useNotificationPermission';
import { NOTIFICATION_PERMISSION_COPY as COPY, NOTIFICATION_SPOKEN } from '../../screens/notificationSettings.copy';

export const NotificationPermissionRow: React.FC = () => {
  const { state, openSettings, requestPermission } = useNotificationPermission();
  if (state === null) return null;

  if (state === 'allowed') {
    return (
      <View
        style={styles.row}
        accessible
        accessibilityLabel={NOTIFICATION_SPOKEN.permissionAllowed}
        testID="notification-permission-row"
      >
        <View style={styles.text}>
          <Text style={styles.label}>{COPY.label}</Text>
          <Text style={styles.status}>{COPY.allowed.status}</Text>
        </View>
      </View>
    );
  }

  const denied = state === 'denied';
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={denied ? openSettings : requestPermission}
      accessibilityRole="button"
      accessibilityLabel={denied ? NOTIFICATION_SPOKEN.permissionDenied : NOTIFICATION_SPOKEN.permissionNotAsked}
      activeOpacity={0.8}
      testID="notification-permission-row"
    >
      <View style={styles.text}>
        <Text style={styles.label}>{COPY.label}</Text>
        <Text style={styles.status}>{denied ? COPY.denied.status : COPY.notAsked.status}</Text>
        <Text style={styles.action}>{denied ? COPY.denied.action : COPY.notAsked.action}</Text>
      </View>
      <Icon name="chevron-right" size={20} color={Colors.textSecondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    minHeight: 64,
  },
  text: { flex: 1, marginRight: Spacing.base },
  label: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
  status: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    marginTop: 1,
  },
  action: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
    marginTop: Spacing.xs,
  },
});

export default NotificationPermissionRow;
