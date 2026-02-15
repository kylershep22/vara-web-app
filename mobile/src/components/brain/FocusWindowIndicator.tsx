/**
 * Focus Window Indicator
 * Shows peak cognitive hours based on circadian rhythm and wake time
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Text, Portal, Modal, Button as PaperButton } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card } from '../index';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useBrainHealthVocabulary } from '../../hooks';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../../context/AuthContext';

export const FocusWindowIndicator: React.FC = () => {
  const { user } = useAuth();
  const { getComponentText } = useBrainHealthVocabulary();
  const [wakeTime, setWakeTime] = useState<string>('');
  const [tempWakeTime, setTempWakeTime] = useState<Date>(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [focusWindow, setFocusWindow] = useState<{ start: string; end: string } | null>(null);

  // Get translated text
  const { title: componentTitle, description: componentDescription } = getComponentText('focusWindow');

  // Load wake time from storage
  useEffect(() => {
    const loadWakeTime = async () => {
      if (!user) return;

      try {
        const stored = await SecureStore.getItemAsync(`wakeTime_${user.uid}`);
        if (stored) {
          setWakeTime(stored);
          calculateFocusWindow(stored);
          // Parse stored time to Date for picker
          const [hours, minutes] = stored.split(':').map(Number);
          const date = new Date();
          date.setHours(hours, minutes, 0, 0);
          setTempWakeTime(date);
        }
      } catch (error) {
        console.error('Error loading wake time:', error);
      }
    };

    loadWakeTime();
  }, [user]);

  // Calculate peak focus window (90-180 min after waking)
  const calculateFocusWindow = (wake: string) => {
    if (!wake || !wake.match(/^\d{1,2}:\d{2}$/)) return;

    const [hours, minutes] = wake.split(':').map(Number);

    // Start: 90 min after waking
    const startMinutes = hours * 60 + minutes + 90;
    const startHours = Math.floor(startMinutes / 60) % 24;
    const startMins = startMinutes % 60;

    // End: 180 min after waking
    const endMinutes = hours * 60 + minutes + 180;
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;

    const formatTime = (h: number, m: number) => {
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
    };

    setFocusWindow({
      start: formatTime(startHours, startMins),
      end: formatTime(endHours, endMins),
    });
  };

  // Handle time picker change
  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      setTempWakeTime(selectedDate);
    }
  };

  // Format Date to HH:MM string
  const formatTimeString = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  // Format Date for display (12-hour format)
  const formatTimeDisplay = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Save wake time
  const handleSaveWakeTime = async () => {
    if (!user) return;

    const timeString = formatTimeString(tempWakeTime);

    try {
      await SecureStore.setItemAsync(`wakeTime_${user.uid}`, timeString);
      setWakeTime(timeString);
      calculateFocusWindow(timeString);
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving wake time:', error);
    }
  };

  // Check if currently in focus window
  const isInFocusWindow = (): boolean => {
    if (!focusWindow) return false;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Parse focus window times
    const parseTime = (timeStr: string): number => {
      const [time, period] = timeStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);

      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;

      return hours * 60 + minutes;
    };

    const startMinutes = parseTime(focusWindow.start);
    const endMinutes = parseTime(focusWindow.end);

    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  };

  const inWindow = isInFocusWindow();

  return (
    <>
      <Card style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Icon name="clock-outline" size={24} color={Colors.evergreenTeal} />
            <View>
              <Text variant="titleMedium" style={styles.title}>
                {componentTitle}
              </Text>
              <Text variant="bodySmall" style={styles.subtitle}>
                {componentDescription}
              </Text>
            </View>
          </View>
          {!wakeTime && (
            <TouchableOpacity onPress={() => {
              // Set default to 7:00 AM
              const defaultTime = new Date();
              defaultTime.setHours(7, 0, 0, 0);
              setTempWakeTime(defaultTime);
              setModalVisible(true);
            }}>
              <Icon name="cog" size={20} color={Colors.evergreenTeal} />
            </TouchableOpacity>
          )}
        </View>

        {!wakeTime ? (
          <TouchableOpacity
            style={styles.setupPrompt}
            onPress={() => {
              // Set default to 7:00 AM
              const defaultTime = new Date();
              defaultTime.setHours(7, 0, 0, 0);
              setTempWakeTime(defaultTime);
              setModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Icon name="alarm" size={32} color={Colors.textSecondary} />
            <Text variant="bodyMedium" style={styles.setupText}>
              Set your wake time to see your peak cognitive hours
            </Text>
            <PaperButton mode="outlined" style={styles.setupButton}>
              Set Wake Time
            </PaperButton>
          </TouchableOpacity>
        ) : (
          <View>
            <View style={[styles.focusTimeCard, inWindow && styles.focusTimeCardActive]}>
              <View style={styles.focusTimeHeader}>
                <Icon
                  name={inWindow ? 'lightning-bolt' : 'clock-time-four-outline'}
                  size={28}
                  color={inWindow ? Colors.sunriseAmber : Colors.evergreenTeal}
                />
                <Text variant="labelLarge" style={[styles.focusTimeLabel, inWindow && styles.focusTimeLabelActive]}>
                  {inWindow ? 'IN YOUR FOCUS WINDOW NOW!' : 'Your Peak Focus Window'}
                </Text>
              </View>

              <Text variant="headlineSmall" style={[styles.focusTimeValue, inWindow && styles.focusTimeValueActive]}>
                {focusWindow?.start} - {focusWindow?.end}
              </Text>

              <Text variant="bodySmall" style={styles.focusTimeDescription}>
                {inWindow
                  ? 'Your brain is primed for peak performance. Great time for deep work!'
                  : 'Your brain peaks 90-180 minutes after waking. Schedule your hardest tasks here.'}
              </Text>
            </View>

            <View style={styles.wakeTimeRow}>
              <Text variant="bodySmall" style={styles.wakeTimeLabel}>
                Wake time: {wakeTime}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  // Parse current wake time to Date
                  const [hours, minutes] = wakeTime.split(':').map(Number);
                  const date = new Date();
                  date.setHours(hours, minutes, 0, 0);
                  setTempWakeTime(date);
                  setModalVisible(true);
                }}
              >
                <Text variant="bodySmall" style={styles.changeButton}>
                  Change
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Card>

      {/* Wake Time Setup Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Set Your Wake Time
          </Text>
          <Text variant="bodyMedium" style={styles.modalSubtitle}>
            When do you typically wake up?
          </Text>

          {/* Time Picker */}
          <View style={styles.timePickerContainer}>
            {Platform.OS === 'ios' ? (
              <DateTimePicker
                value={tempWakeTime}
                mode="time"
                display="spinner"
                onChange={handleTimeChange}
                style={styles.timePicker}
                textColor={Colors.textPrimary}
              />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.timeButton}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Icon name="clock-outline" size={24} color={Colors.evergreenTeal} />
                  <Text variant="headlineMedium" style={styles.timeButtonText}>
                    {formatTimeDisplay(tempWakeTime)}
                  </Text>
                  <Icon name="chevron-down" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
                {showTimePicker && (
                  <DateTimePicker
                    value={tempWakeTime}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}
              </>
            )}
          </View>

          <View style={styles.infoBox}>
            <Icon name="information" size={20} color={Colors.evergreenTeal} />
            <Text variant="bodySmall" style={styles.infoText}>
              Your brain reaches peak cognitive performance 90-180 minutes after waking, when your body temperature rises.
            </Text>
          </View>

          <View style={styles.modalActions}>
            <PaperButton
              mode="outlined"
              onPress={() => setModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </PaperButton>
            <PaperButton
              mode="contained"
              onPress={handleSaveWakeTime}
              style={styles.modalButton}
              buttonColor={Colors.evergreenTeal}
            >
              Save
            </PaperButton>
          </View>
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  title: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  setupPrompt: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.borderLight,
    borderRadius: Layout.borderRadius.md,
  },
  setupText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.base,
    paddingHorizontal: Spacing.base,
  },
  setupButton: {
    marginTop: Spacing.sm,
  },
  focusTimeCard: {
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    borderWidth: Layout.borderRadius.thin,
    borderColor: Colors.evergreenTeal + '40',
  },
  focusTimeCardActive: {
    backgroundColor: Colors.sunriseAmber + '15',
    borderColor: Colors.sunriseAmber,
    borderWidth: Layout.borderWidth.medium,
  },
  focusTimeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  focusTimeLabel: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize.xs,
  },
  focusTimeLabelActive: {
    color: Colors.sunriseAmber,
  },
  focusTimeValue: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  focusTimeValueActive: {
    color: Colors.sunriseAmber,
  },
  focusTimeDescription: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    lineHeight: Typography.fontSize.xs * 1.6,
  },
  wakeTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.base,
  },
  wakeTimeLabel: {
    color: Colors.textSecondary,
  },
  changeButton: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  modal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  modalSubtitle: {
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  timePickerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  timePicker: {
    width: '100%',
    height: 150,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.evergreenTeal + '40',
  },
  timeButtonText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
  },
  infoBox: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  infoText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    lineHeight: Typography.fontSize.xs * 1.6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
