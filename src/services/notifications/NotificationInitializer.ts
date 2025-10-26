import * as Notifications from 'expo-notifications';
import { WorkoutReminderService } from './WorkoutReminderService';

export class NotificationInitializer {
  private static initialized = false;

  /**
   * Initialize notification system on app startup
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Set up notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      // Request permissions
      await WorkoutReminderService.requestPermissions();

      // Set up notification listeners
      this.setupNotificationListeners();

      // Reschedule any existing reminders (in case app was updated)
      await WorkoutReminderService.rescheduleAllReminders();

      this.initialized = true;
      console.log('✅ Notification system initialized');
    } catch (error) {
      console.error('❌ Failed to initialize notification system:', error);
    }
  }

  /**
   * Set up notification event listeners
   */
  private static setupNotificationListeners(): void {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener(async (notification) => {
      console.log('📱 Notification received:', notification);
      
      // You can add custom handling here, like showing an in-app banner
      const data = notification.request.content.data;
      if (data?.type === 'workout_reminder') {
        console.log(`🏋️ Workout reminder: ${data.workoutName}`);
        
        // Auto-remove one-time reminders after they fire
        await this.handleReminderFired(data.reminderId);
      }
    });

    // Handle notification response (user tapped notification)
    Notifications.addNotificationResponseReceivedListener(async (response) => {
      console.log('👆 Notification tapped:', response);
      
      const data = response.notification.request.content.data;
      if (data?.type === 'workout_reminder') {
        console.log(`🎯 User tapped workout reminder: ${data.workoutName}`);
        
        // Auto-remove one-time reminders after they fire
        await this.handleReminderFired(data.reminderId);
        
        // You can navigate to workout screen here
        // For example: router.push('/(main)/workout');
      }
    });
  }

  /**
   * Handle when a reminder notification has fired
   * Automatically removes one-time reminders from the list
   */
  private static async handleReminderFired(reminderId: string): Promise<void> {
    try {
      if (!reminderId) {
        console.log('⚠️ No reminder ID provided, skipping auto-removal');
        return;
      }

      const { WorkoutReminderService } = await import('./WorkoutReminderService');
      const reminders = await WorkoutReminderService.getReminders();
      const reminder = reminders.find(r => r.id === reminderId);
      
      if (!reminder) {
        console.log(`⚠️ Reminder with ID ${reminderId} not found`);
        return;
      }

      if (reminder.type === 'one-time') {
        console.log(`🗑️ Auto-removing one-time reminder: ${reminder.workoutName}`);
        await WorkoutReminderService.deleteReminder(reminderId);
        console.log(`✅ Successfully removed one-time reminder: ${reminder.workoutName}`);
      } else {
        console.log(`📅 Keeping recurring reminder: ${reminder.workoutName}`);
      }
    } catch (error) {
      console.error('❌ Error handling reminder fired:', error);
    }
  }

  /**
   * Clean up notification system
   */
  static async cleanup(): Promise<void> {
    try {
      // Remove all listeners
      Notifications.removeAllNotificationListeners();
      
      // Optionally cancel all notifications
      // await Notifications.cancelAllScheduledNotificationsAsync();
      
      this.initialized = false;
      console.log('🧹 Notification system cleaned up');
    } catch (error) {
      console.error('❌ Failed to cleanup notification system:', error);
    }
  }

  /**
   * Check if notifications are properly set up
   */
  static async getStatus(): Promise<{
    initialized: boolean;
    permissionsGranted: boolean;
    scheduledCount: number;
  }> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      
      return {
        initialized: this.initialized,
        permissionsGranted: status === 'granted',
        scheduledCount: scheduled.length,
      };
    } catch (error) {
      console.error('Error getting notification status:', error);
      return {
        initialized: false,
        permissionsGranted: false,
        scheduledCount: 0,
      };
    }
  }
}
