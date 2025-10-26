import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '../../../src/styles/colors';
import { 
  WorkoutReminderService, 
  WorkoutReminder, 
  WorkoutReminderSettings 
} from '../../../src/services/notifications/WorkoutReminderService';
import { NotificationInitializer } from '../../../src/services/notifications/NotificationInitializer';
import { useAuth } from '../../../src/hooks/useAuth';

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
  }, []);

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
      <View style={styles.settingInfo}>
        <Icon name={icon as any} size={24} color={colors.primary} />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          <Text style={styles.settingSubtitle}>{subtitle}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(255,255,255,0.2)', true: colors.primary }}
        thumbColor={value ? colors.white : colors.textSecondary}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Reminders</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Status Card */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            01 <Text style={styles.sectionTitleText}>NOTIFICATION STATUS</Text>
          </Text>
          <LinearGradient
            colors={[
              notificationStatus.permissionsGranted 
                ? 'rgba(76, 175, 80, 0.2)' 
                : 'rgba(244, 67, 54, 0.2)',
              'rgba(0,0,0,0.3)'
            ]}
            style={styles.statusCard}
          >
            <View style={styles.statusHeader}>
              <Icon 
                name={notificationStatus.permissionsGranted ? "check-circle" : "alert-circle"} 
                size={24} 
                color={notificationStatus.permissionsGranted ? '#4CAF50' : '#F44336'} 
              />
              <Text style={styles.statusTitle}>
                {notificationStatus.permissionsGranted ? 'Notifications Enabled' : 'Permissions Required'}
              </Text>
            </View>
            <Text style={styles.statusSubtitle}>
              {notificationStatus.permissionsGranted 
                ? `${notificationStatus.scheduledCount} reminders scheduled`
                : 'Enable notifications to receive workout reminders'
              }
            </Text>
            {!notificationStatus.permissionsGranted && (
              <TouchableOpacity
                style={styles.enableButton}
                onPress={handleRequestPermissions}
              >
                <Text style={styles.enableButtonText}>Enable Notifications</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>

        {/* Workout Plan Info */}
        {workoutPlanInfo.workoutTypes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              02 <Text style={styles.sectionTitleText}>WORKOUT PLAN</Text>
            </Text>
            <LinearGradient
              colors={['rgba(255,107,53,0.2)', 'rgba(0,0,0,0.3)']}
              style={styles.planCard}
            >
              <View style={styles.planHeader}>
                <Icon name="dumbbell" size={24} color={colors.primary} />
                <Text style={styles.planTitle}>{workoutPlanInfo.name}</Text>
              </View>
              <Text style={styles.planSubtitle}>Available workout types for reminders:</Text>
              <View style={styles.workoutTypesList}>
                {workoutPlanInfo.workoutTypes.map((type, index) => (
                  <View key={index} style={styles.workoutTypeChip}>
                    <Text style={styles.workoutTypeText}>{type}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            03 <Text style={styles.sectionTitleText}>REMINDER SETTINGS</Text>
          </Text>
          
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
            <Text style={styles.sectionTitle}>
              04 <Text style={styles.sectionTitleText}>YOUR REMINDERS</Text>
            </Text>
            <Text style={styles.reminderCount}>
              {reminders.length} {reminders.length === 1 ? 'reminder' : 'reminders'}
            </Text>
          </View>

          {reminders.length === 0 ? (
            <LinearGradient
              colors={['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.2)']}
              style={styles.emptyCard}
            >
              <Icon name="calendar-clock" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyTitle}>No Reminders Set</Text>
              <Text style={styles.emptySubtitle}>
                Go to the dashboard to create your first workout reminder
              </Text>
              <TouchableOpacity
                style={styles.dashboardButton}
                onPress={() => router.push('/(main)/dashboard')}
              >
                <Icon name="home" size={16} color={colors.primary} />
                <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
              </TouchableOpacity>
            </LinearGradient>
          ) : (
            <View style={styles.remindersList}>
              {reminders.map((reminder) => (
                <LinearGradient
                  key={reminder.id}
                  colors={['rgba(255,107,53,0.1)', 'rgba(0,0,0,0.2)']}
                  style={styles.reminderCard}
                >
                  <View style={styles.reminderHeader}>
                    <View style={styles.reminderInfo}>
                      <Text style={styles.reminderName}>{reminder.workoutName}</Text>
                      <Text style={styles.reminderDetails}>
                        {WorkoutReminderService.formatTime(reminder.scheduledTime)} • {WorkoutReminderService.formatDays(reminder.days)}
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
                        thumbColor={reminder.isActive ? colors.white : colors.textSecondary}
                        style={styles.reminderSwitch}
                      />
                      <TouchableOpacity
                        onPress={() => handleDeleteReminder(reminder.id, reminder.workoutName)}
                        style={styles.deleteButton}
                      >
                        <Icon name="delete" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>
              ))}
            </View>
          )}
        </View>

        {/* Advanced Actions */}
        {reminders.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              04 <Text style={styles.sectionTitleText}>ADVANCED</Text>
            </Text>
            
            <TouchableOpacity
              style={styles.advancedButton}
              onPress={handleClearAllNotifications}
            >
              <Icon name="notification-clear-all" size={20} color="#F44336" />
              <Text style={styles.advancedButtonText}>Clear All Notifications</Text>
              <Icon name="chevron-right" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.infoSection}>
          <LinearGradient
            colors={['rgba(255,107,53,0.1)', 'rgba(255,107,53,0.05)']}
            style={styles.infoCard}
          >
            <Icon name="information" size={24} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>About Workout Reminders</Text>
              <Text style={styles.infoText}>
                Workout reminders help you stay consistent with your fitness routine. 
                Set up reminders for specific workout types and days to get notified 
                when it's time to "lock in" and crush your goals! 💪
              </Text>
            </View>
          </LinearGradient>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    color: colors.white,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectionTitleText: {
    color: colors.white,
    marginLeft: 8,
    letterSpacing: 1,
  },
  reminderCount: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  statusCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
  },
  statusSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  enableButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  enableButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  planTitle: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
  },
  planSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  workoutTypesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  workoutTypeChip: {
    backgroundColor: 'rgba(255,107,53,0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.5)',
  },
  workoutTypeText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: '500',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyTitle: {
    fontSize: 18,
    color: colors.white,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,107,53,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
  },
  dashboardButtonText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  remindersList: {
    gap: 12,
  },
  reminderCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  reminderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reminderInfo: {
    flex: 1,
    marginRight: 16,
  },
  reminderName: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
    marginBottom: 4,
  },
  reminderDetails: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  reminderCreated: {
    fontSize: 12,
    color: colors.textSecondary,
    opacity: 0.8,
  },
  reminderActions: {
    alignItems: 'center',
    gap: 12,
  },
  reminderSwitch: {
    transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }],
  },
  deleteButton: {
    padding: 4,
  },
  advancedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.2)',
  },
  advancedButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#F44336',
    fontWeight: '500',
    marginLeft: 12,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoCard: {
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.2)',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
