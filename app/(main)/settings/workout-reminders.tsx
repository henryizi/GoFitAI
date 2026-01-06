import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  RefreshControl,
  Platform,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { router } from 'expo-router';
import { 
  WorkoutReminderService, 
  WorkoutReminder, 
  WorkoutReminderSettings 
} from '../../../src/services/notifications/WorkoutReminderService';
import { NotificationInitializer } from '../../../src/services/notifications/NotificationInitializer';
import { useAuth } from '../../../src/hooks/useAuth';

// Clean Design System
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  success: '#22C55E',
  warning: '#FF9500',
  error: '#FF453A',
};

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

export default function WorkoutRemindersScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [reminders, setReminders] = useState<WorkoutReminder[]>([]);
  const [settings, setSettings] = useState<WorkoutReminderSettings>({
    enabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    reminderMinutesBefore: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState({
    initialized: false,
    permissionsGranted: false,
    scheduledCount: 0,
  });
  const [workoutPlanInfo, setWorkoutPlanInfo] = useState({
    name: 'Your Workout Plan',
    workoutTypes: [] as string[],
  });
  
  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      const promises = [
        WorkoutReminderService.getReminders(),
        WorkoutReminderService.getSettings(),
        NotificationInitializer.getStatus(),
      ];

      // Add workout plan info if user is available
      if (user?.id) {
        promises.push(
          WorkoutReminderService.getWorkoutPlanName(user.id),
          WorkoutReminderService.getWorkoutTypes(user.id)
        );
      }

      const results = await Promise.all(promises);
      const [remindersData, settingsData, statusData, planName, workoutTypes] = results;
      setReminders(remindersData);
      setSettings(settingsData);
      setNotificationStatus(statusData);
      
      // Set workout plan info if available
      if (planName && workoutTypes) {
        setWorkoutPlanInfo({
          name: planName as string,
          workoutTypes: workoutTypes as string[],
        });
      }
    } catch (error) {
      console.error('Error loading workout reminders data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggleReminder = async (id: string) => {
    try {
      await WorkoutReminderService.toggleReminder(id);
      await loadData();
    } catch (error) {
      console.error('Error toggling reminder:', error);
      Alert.alert('Error', 'Failed to update reminder');
    }
  };

  const handleDeleteReminder = async (id: string, workoutName: string) => {
    Alert.alert(
      'Delete Reminder',
      `Are you sure you want to delete the reminder for "${workoutName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await WorkoutReminderService.deleteReminder(id);
              await loadData();
            } catch (error) {
              console.error('Error deleting reminder:', error);
              Alert.alert('Error', 'Failed to delete reminder');
            }
          },
        },
      ]
    );
  };

  const handleUpdateSettings = async (newSettings: Partial<WorkoutReminderSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      await WorkoutReminderService.saveSettings(updatedSettings);
      setSettings(updatedSettings);
      
      // Reschedule all reminders with new settings
      await WorkoutReminderService.rescheduleAllReminders();
      await loadData();
    } catch (error) {
      console.error('Error updating settings:', error);
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const handleRequestPermissions = async () => {
    const granted = await WorkoutReminderService.requestPermissions();
    if (granted) {
      await loadData();
      Alert.alert('Success', 'Notification permissions granted!');
    } else {
      Alert.alert(
        'Permissions Required',
        'Please enable notifications in your device settings to receive workout reminders.',
        [
          { text: 'Cancel' },
          { text: 'Open Settings', onPress: () => {
            // On iOS, this would open Settings app
            // On Android, you might need to use a different approach
          }}
        ]
      );
    }
  };

  const handleClearAllNotifications = () => {
    Alert.alert(
      'Clear All Notifications',
      'This will cancel all scheduled workout reminders. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await WorkoutReminderService.cancelAllNotifications();
              await loadData();
              Alert.alert('Success', 'All notifications cleared');
            } catch (error) {
              console.error('Error clearing notifications:', error);
              Alert.alert('Error', 'Failed to clear notifications');
            }
          },
        },
      ]
    );
  };

  const toggleDay = (day: string) => {
    // Note: this might be unused now if we move the modal logic
  };

  // AI Coach greeting
  const getAIGreeting = useMemo(() => {
    const hour = new Date().getHours();
    
    let greeting = '';
    let message = '';
    
    if (hour < 12) {
      greeting = 'Good morning';
    } else if (hour < 17) {
      greeting = 'Good afternoon';
    } else {
      greeting = 'Good evening';
    }
    
    message = reminders.length > 0 
      ? `You have ${reminders.length} workout reminder${reminders.length !== 1 ? 's' : ''} set up.`
      : "Set up workout reminders to stay consistent with your fitness routine.";
    
    return { greeting, message };
  }, [reminders.length]);

  const ReminderSettingItem = ({ 
    title, 
    subtitle, 
    value, 
    onValueChange, 
    icon 
  }: {
    title: string;
    subtitle: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    icon: string;
  }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingIconContainer}>
        <Icon name={icon as any} size={20} color={colors.primary} />
      </View>
      <View style={styles.settingText}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(255,255,255,0.2)', true: colors.primary }}
        thumbColor={value ? colors.text : colors.textSecondary}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: 60 + insets.bottom + 20 }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* AI Coach Header */}
        <View style={styles.coachHeader}>
          <TouchableOpacity 
            onPress={() => router.replace('/(main)/dashboard')} 
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Icon name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.coachAvatarContainer}>
            <Image
              source={require('../../../assets/mascot.png')}
              style={styles.coachAvatar}
            />
            <View style={styles.coachOnlineIndicator} />
          </View>
          <View style={styles.coachTextContainer}>
            <Text style={styles.coachGreeting}>{getAIGreeting.greeting}</Text>
            <Text style={styles.coachMessage}>{getAIGreeting.message}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/(main)/settings/create-reminder')}
            style={styles.addButton}
            activeOpacity={0.8}
          >
            <Icon name="plus" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[
              styles.statusIconContainer,
              { backgroundColor: notificationStatus.permissionsGranted ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 69, 58, 0.12)' }
            ]}>
              <Icon 
                name={notificationStatus.permissionsGranted ? "check-circle" : "alert-circle"} 
                size={20} 
                color={notificationStatus.permissionsGranted ? colors.success : colors.error} 
              />
            </View>
            <View style={styles.statusTextContainer}>
              <Text style={styles.statusTitle}>
                {notificationStatus.permissionsGranted ? 'Notifications Enabled' : 'Permissions Required'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {notificationStatus.permissionsGranted 
                  ? `${notificationStatus.scheduledCount} reminder${notificationStatus.scheduledCount !== 1 ? 's' : ''} scheduled`
                  : 'Enable notifications to receive workout reminders'
                }
              </Text>
            </View>
          </View>
          {!notificationStatus.permissionsGranted && (
            <TouchableOpacity
              style={styles.enableButton}
              onPress={handleRequestPermissions}
              activeOpacity={0.8}
            >
              <Text style={styles.enableButtonText}>Enable Notifications</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Workout Plan Info */}
        {workoutPlanInfo.workoutTypes.length > 0 && (
          <View style={styles.planCard}>
            <View style={styles.planHeader}>
              <View style={styles.planIconContainer}>
                <Icon name="dumbbell" size={20} color={colors.primary} />
              </View>
              <View style={styles.planTextContainer}>
                <Text style={styles.planTitle}>{workoutPlanInfo.name}</Text>
                <Text style={styles.planSubtitle}>Available workout types for reminders</Text>
              </View>
            </View>
            <View style={styles.workoutTypesList}>
              {workoutPlanInfo.workoutTypes.map((type, index) => (
                <View key={index} style={styles.workoutTypeChip}>
                  <Text style={styles.workoutTypeText}>{type}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reminder Settings</Text>
          
          <ReminderSettingItem
            title="Workout Reminders"
            subtitle="Enable all workout reminder notifications"
            value={settings.enabled}
            onValueChange={(value) => handleUpdateSettings({ enabled: value })}
            icon="bell"
          />
          
          <ReminderSettingItem
            title="Sound"
            subtitle="Play notification sound"
            value={settings.soundEnabled}
            onValueChange={(value) => handleUpdateSettings({ soundEnabled: value })}
            icon="volume-high"
          />
          
          <ReminderSettingItem
            title="Vibration"
            subtitle="Vibrate when notification arrives"
            value={settings.vibrationEnabled}
            onValueChange={(value) => handleUpdateSettings({ vibrationEnabled: value })}
            icon="vibrate"
          />
        </View>

        {/* Active Reminders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Reminders</Text>
            <TouchableOpacity 
              style={styles.addReminderButton}
              onPress={() => router.push('/(main)/settings/create-reminder')}
              activeOpacity={0.8}
            >
              <Icon name="plus" size={16} color={colors.primary} />
              <Text style={styles.addReminderButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {reminders.length === 0 ? (
            <View style={styles.emptyCard}>
              <Icon name="calendar-clock" size={40} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No Reminders Set</Text>
              <Text style={styles.emptySubtitle}>
                Tap the + button to create your first workout reminder
              </Text>
              <TouchableOpacity
                style={styles.addReminderButtonLarge}
                onPress={() => router.push('/(main)/settings/create-reminder')}
                activeOpacity={0.8}
              >
                <Icon name="plus" size={18} color={colors.primary} />
                <Text style={styles.addReminderButtonLargeText}>Add Reminder</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.remindersList}>
              {reminders.map((reminder) => (
                <View key={reminder.id} style={styles.reminderCard}>
                  <View style={styles.reminderIconContainer}>
                    <Icon name="dumbbell" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.reminderInfo}>
                    <Text style={styles.reminderName}>{reminder.workoutName}</Text>
                    <Text style={styles.reminderDetails}>
                      {WorkoutReminderService.formatTime(reminder.scheduledTime)}
                      {reminder.type === 'recurring' && reminder.days.length > 0 && (
                        <Text> • {WorkoutReminderService.formatDays(reminder.days)}</Text>
                      )}
                    </Text>
                    <Text style={styles.reminderCreated}>
                      Created {new Date(reminder.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.reminderActions}>
                    <Switch
                      value={reminder.isActive}
                      onValueChange={() => handleToggleReminder(reminder.id)}
                      trackColor={{ false: 'rgba(255,255,255,0.2)', true: colors.primary }}
                      thumbColor={reminder.isActive ? colors.text : colors.textSecondary}
                      style={styles.reminderSwitch}
                    />
                    <TouchableOpacity
                      onPress={() => handleDeleteReminder(reminder.id, reminder.workoutName)}
                      style={styles.deleteButton}
                      activeOpacity={0.8}
                    >
                      <Icon name="delete-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Advanced Actions */}
        {reminders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Advanced</Text>
            
            <TouchableOpacity
              style={styles.advancedButton}
              onPress={handleClearAllNotifications}
              activeOpacity={0.8}
            >
              <View style={styles.advancedIconContainer}>
                <Icon name="notification-clear-all" size={18} color={colors.error} />
              </View>
              <Text style={styles.advancedButtonText}>Clear All Notifications</Text>
              <Icon name="chevron-right" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoCard}>
          <View style={styles.infoIconContainer}>
            <Icon name="information" size={20} color={colors.primary} />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>About Workout Reminders</Text>
            <Text style={styles.infoText}>
              Workout reminders help you stay consistent with your fitness routine. 
              Set up reminders for specific workout types and days to get notified 
              when it's time to "lock in" and crush your goals! 💪
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 20,
  },

  // AI Coach Header
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  coachAvatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  coachAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    resizeMode: 'contain',
  },
  coachOnlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#000000',
  },
  coachTextContainer: {
    flex: 1,
  },
  coachGreeting: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  coachMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },

  // Status Card
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  statusSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  enableButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  enableButtonText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },

  // Plan Card
  planCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  planIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planTextContainer: {
    flex: 1,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  planSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  workoutTypesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  workoutTypeChip: {
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  workoutTypeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  addReminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  addReminderButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  addReminderButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
    marginTop: 8,
  },
  addReminderButtonLargeText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },

  // Setting Item
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 14,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },

  // Empty Card
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },

  // Reminders List
  remindersList: {
    gap: 10,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  reminderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderInfo: {
    flex: 1,
  },
  reminderName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  reminderDetails: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  reminderCreated: {
    fontSize: 11,
    color: colors.textSecondary,
    opacity: 0.7,
  },
  reminderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reminderSwitch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  deleteButton: {
    padding: 4,
  },

  // Advanced Button
  advancedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 69, 58, 0.15)',
    gap: 12,
  },
  advancedIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 69, 58, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  advancedButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.error,
  },

  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    gap: 12,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
