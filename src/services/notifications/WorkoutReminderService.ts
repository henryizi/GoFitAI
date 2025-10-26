import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { WorkoutService } from '../workout/WorkoutService';

export interface WorkoutReminder {
  id: string;
  workoutName: string;
  scheduledTime: string; // HH:MM format
  days: string[]; // Array of days: ['monday', 'tuesday', etc.] - empty for one-time reminders
  isActive: boolean;
  notificationId?: string;
  createdAt: string;
  type: 'recurring' | 'one-time'; // Type of reminder
  scheduledDate?: string; // ISO date string for one-time reminders
}

export interface WorkoutReminderSettings {
  enabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  reminderMinutesBefore: number; // Minutes before scheduled time to remind
}

export class WorkoutReminderService {
  private static readonly STORAGE_KEY = 'workout_reminders';
  private static readonly SETTINGS_KEY = 'workout_reminder_settings';

  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('Notification permissions not granted');
        return false;
      }

      // Configure notification channel for Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('workout-reminders', {
          name: 'Workout Reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF6B35',
          sound: 'default',
        });
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Get all workout reminders
   */
  static async getReminders(): Promise<WorkoutReminder[]> {
    try {
      const remindersStr = await AsyncStorage.getItem(this.STORAGE_KEY);
      return remindersStr ? JSON.parse(remindersStr) : [];
    } catch (error) {
      console.error('Error getting workout reminders:', error);
      return [];
    }
  }

  /**
   * Save workout reminders
   */
  static async saveReminders(reminders: WorkoutReminder[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(reminders));
    } catch (error) {
      console.error('Error saving workout reminders:', error);
      throw error;
    }
  }

  /**
   * Get reminder settings
   */
  static async getSettings(): Promise<WorkoutReminderSettings> {
    try {
      const settingsStr = await AsyncStorage.getItem(this.SETTINGS_KEY);
      return settingsStr ? JSON.parse(settingsStr) : {
        enabled: true,
        soundEnabled: true,
        vibrationEnabled: true,
        reminderMinutesBefore: 0, // Remind exactly at scheduled time
      };
    } catch (error) {
      console.error('Error getting reminder settings:', error);
      return {
        enabled: true,
        soundEnabled: true,
        vibrationEnabled: true,
        reminderMinutesBefore: 0,
      };
    }
  }

  /**
   * Save reminder settings
   */
  static async saveSettings(settings: WorkoutReminderSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving reminder settings:', error);
      throw error;
    }
  }

  /**
   * Create a new workout reminder
   */
  static async createReminder(
    workoutName: string,
    scheduledTime: string,
    days: string[],
    type: 'recurring' | 'one-time' = 'recurring',
    scheduledDate?: string
  ): Promise<WorkoutReminder> {
    try {
      const reminders = await this.getReminders();
      const newReminder: WorkoutReminder = {
        id: Date.now().toString(),
        workoutName,
        scheduledTime,
        days: type === 'one-time' ? [] : days,
        isActive: true,
        createdAt: new Date().toISOString(),
        type,
        scheduledDate: type === 'one-time' ? (scheduledDate || new Date().toISOString().split('T')[0]) : undefined,
      };

      reminders.push(newReminder);
      await this.saveReminders(reminders);
      
      // Schedule the notification
      await this.scheduleNotification(newReminder);
      
      return newReminder;
    } catch (error) {
      console.error('Error creating workout reminder:', error);
      throw error;
    }
  }

  /**
   * Update an existing workout reminder
   */
  static async updateReminder(
    id: string,
    updates: Partial<Omit<WorkoutReminder, 'id' | 'createdAt'>>
  ): Promise<void> {
    try {
      const reminders = await this.getReminders();
      const index = reminders.findIndex(r => r.id === id);
      
      if (index === -1) {
        throw new Error('Reminder not found');
      }

      // Cancel existing notification if it exists
      if (reminders[index].notificationId) {
        await Notifications.cancelScheduledNotificationAsync(reminders[index].notificationId!);
      }

      // Update the reminder
      reminders[index] = { ...reminders[index], ...updates };
      await this.saveReminders(reminders);

      // Reschedule notification if active
      if (reminders[index].isActive) {
        await this.scheduleNotification(reminders[index]);
      }
    } catch (error) {
      console.error('Error updating workout reminder:', error);
      throw error;
    }
  }

  /**
   * Delete a workout reminder
   */
  static async deleteReminder(id: string): Promise<void> {
    try {
      const reminders = await this.getReminders();
      const reminder = reminders.find(r => r.id === id);
      
      if (reminder?.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
      }

      const filteredReminders = reminders.filter(r => r.id !== id);
      await this.saveReminders(filteredReminders);
    } catch (error) {
      console.error('Error deleting workout reminder:', error);
      throw error;
    }
  }

  /**
   * Toggle reminder active state
   */
  static async toggleReminder(id: string): Promise<void> {
    try {
      const reminders = await this.getReminders();
      const reminder = reminders.find(r => r.id === id);
      
      if (!reminder) {
        throw new Error('Reminder not found');
      }

      if (reminder.isActive) {
        // Deactivate: cancel notification
        if (reminder.notificationId) {
          await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
          reminder.notificationId = undefined;
        }
        reminder.isActive = false;
      } else {
        // Activate: schedule notification
        reminder.isActive = true;
        await this.scheduleNotification(reminder);
      }

      await this.saveReminders(reminders);
    } catch (error) {
      console.error('Error toggling workout reminder:', error);
      throw error;
    }
  }

  /**
   * Schedule a notification for a workout reminder
   */
  private static async scheduleNotification(reminder: WorkoutReminder): Promise<void> {
    try {
      const settings = await this.getSettings();
      
      // TEMPORARY FIX: Reset reminderMinutesBefore to 0 if it's not 0
      if (settings.reminderMinutesBefore !== 0) {
        console.log(`[WorkoutReminderService] FIXING: reminderMinutesBefore was ${settings.reminderMinutesBefore}, resetting to 0`);
        settings.reminderMinutesBefore = 0;
        await this.saveSettings(settings);
      }
      
      if (!settings.enabled) {
        return;
      }

      // Cancel existing notification if it exists
      if (reminder.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(reminder.notificationId);
      }

      const [hours, minutes] = reminder.scheduledTime.split(':').map(Number);
      
      console.log(`[WorkoutReminderService] Parsed time - Hours: ${hours}, Minutes: ${minutes}`);
      console.log(`[WorkoutReminderService] Settings - reminderMinutesBefore: ${settings.reminderMinutesBefore}`);

      // Create notification content
      const notificationContent = {
        title: '🏋️ Workout Time!',
        body: `Time to lock in! It's ${reminder.workoutName} day. Let's crush those goals! 💪`,
        sound: settings.soundEnabled ? 'default' : undefined,
        vibrate: settings.vibrationEnabled ? [0, 250, 250, 250] : undefined,
        data: {
          reminderId: reminder.id,
          workoutName: reminder.workoutName,
          type: 'workout_reminder',
        },
      };

      let notificationId: string;

      if (reminder.type === 'one-time') {
        // Schedule for today at the specified time
        const today = new Date();
        let scheduledDate: Date;
        
        if (reminder.scheduledDate) {
          // Parse the date string and ensure it's in local timezone
          const dateStr = reminder.scheduledDate;
          console.log(`[WorkoutReminderService] Parsing scheduledDate: ${dateStr}`);
          scheduledDate = new Date(dateStr + 'T00:00:00'); // Force local timezone
        } else {
          scheduledDate = today;
        }
        
        console.log(`[WorkoutReminderService] Scheduled date: ${scheduledDate.toLocaleString()}`);
        
        // Create the trigger date with the scheduled time
        const triggerDate = new Date(scheduledDate);
        
        // Set the exact scheduled time first
        triggerDate.setHours(hours, minutes, 0, 0);
        
        // Then subtract the reminder minutes before
        if (settings.reminderMinutesBefore > 0) {
          triggerDate.setMinutes(triggerDate.getMinutes() - settings.reminderMinutesBefore);
        }
        
        // If the trigger time is in the past (for today), schedule for tomorrow
        const now = new Date();
        if (triggerDate <= now && scheduledDate.toDateString() === now.toDateString()) {
          console.log(`[WorkoutReminderService] Time is in the past for today, scheduling for tomorrow`);
          triggerDate.setDate(triggerDate.getDate() + 1);
        }

        console.log(`[WorkoutReminderService] DEBUG - Original scheduled time: ${scheduledDate.toLocaleString()}`);
        console.log(`[WorkoutReminderService] DEBUG - Hours: ${hours}, Minutes: ${minutes}`);
        console.log(`[WorkoutReminderService] DEBUG - reminderMinutesBefore setting: ${settings.reminderMinutesBefore}`);
        console.log(`[WorkoutReminderService] DEBUG - Final trigger time: ${triggerDate.toLocaleString()}`);
        console.log(`[WorkoutReminderService] Current time: ${new Date().toLocaleString()}`);
        console.log(`[WorkoutReminderService] Time difference (ms): ${triggerDate.getTime() - new Date().getTime()}`);
        console.log(`[WorkoutReminderService] Time difference (minutes): ${(triggerDate.getTime() - new Date().getTime()) / 60000}`);

        // Only schedule if the time is in the future (with a 10-second buffer to avoid immediate firing)
        const tenSecondsFromNow = new Date(now.getTime() + 10000); // Add 10 second buffer
        
        console.log(`[WorkoutReminderService] Comparison - triggerDate > tenSecondsFromNow: ${triggerDate > tenSecondsFromNow}`);
        
        if (triggerDate > tenSecondsFromNow) {
          notificationId = await Notifications.scheduleNotificationAsync({
            content: {
              ...notificationContent,
              body: `Time to lock in! It's ${reminder.workoutName} time. Let's crush those goals! 💪`,
            },
            trigger: triggerDate,
          });
          
          reminder.notificationId = notificationId;
          console.log(`[WorkoutReminderService] Successfully scheduled notification with ID: ${notificationId}`);
          
          // Verify the notification was scheduled correctly
          try {
            const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
            const ourNotification = scheduledNotifications.find(n => n.identifier === notificationId);
            if (ourNotification) {
              console.log(`[WorkoutReminderService] Verified notification scheduled for: ${new Date(ourNotification.trigger.value).toLocaleString()}`);
            } else {
              console.log(`[WorkoutReminderService] WARNING: Could not find scheduled notification with ID ${notificationId}`);
            }
          } catch (verifyError) {
            console.log(`[WorkoutReminderService] Could not verify scheduled notification: ${verifyError}`);
          }
        } else {
          console.log(`[WorkoutReminderService] Skipping notification scheduling - time is in the past or within 10-second buffer`);
        }
      } else {
        // Schedule for each day of the week (recurring)
        const dayNumbers = this.getDayNumbers(reminder.days);
        
        // Calculate the trigger time properly for recurring notifications
        let triggerHour = hours;
        let triggerMinute = minutes - settings.reminderMinutesBefore;
        
        // Handle minute underflow
        if (triggerMinute < 0) {
          triggerMinute += 60;
          triggerHour -= 1;
        }
        
        // Handle hour underflow
        if (triggerHour < 0) {
          triggerHour += 24;
        }
        
        console.log(`[WorkoutReminderService] Scheduling recurring notifications for days: ${dayNumbers}`);
        console.log(`[WorkoutReminderService] Trigger time: ${triggerHour}:${triggerMinute.toString().padStart(2, '0')}`);
        
        for (const dayNumber of dayNumbers) {
          notificationId = await Notifications.scheduleNotificationAsync({
            content: notificationContent,
            trigger: {
              weekday: dayNumber,
              hour: triggerHour,
              minute: triggerMinute,
              repeats: true,
            },
          });

          // Store the first notification ID (we'll use it to cancel all)
          if (!reminder.notificationId) {
            reminder.notificationId = notificationId;
          }
        }
      }

      // Update the reminder with notification ID
      const reminders = await this.getReminders();
      const index = reminders.findIndex(r => r.id === reminder.id);
      if (index !== -1) {
        reminders[index].notificationId = reminder.notificationId;
        await this.saveReminders(reminders);
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
      throw error;
    }
  }

  /**
   * Convert day names to day numbers (1 = Sunday, 2 = Monday, etc.)
   */
  private static getDayNumbers(days: string[]): number[] {
    const dayMap: { [key: string]: number } = {
      sunday: 1,
      monday: 2,
      tuesday: 3,
      wednesday: 4,
      thursday: 5,
      friday: 6,
      saturday: 7,
    };

    return days.map(day => dayMap[day.toLowerCase()]).filter(Boolean);
  }

  /**
   * Get day names from day numbers
   */
  static getDayNames(dayNumbers: number[]): string[] {
    const dayNames = ['', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return dayNumbers.map(num => dayNames[num]).filter(Boolean);
  }

  /**
   * Reschedule all active reminders (useful after app updates or settings changes)
   */
  static async rescheduleAllReminders(): Promise<void> {
    try {
      const reminders = await this.getReminders();
      const activeReminders = reminders.filter(r => r.isActive);

      for (const reminder of activeReminders) {
        await this.scheduleNotification(reminder);
      }
    } catch (error) {
      console.error('Error rescheduling all reminders:', error);
      throw error;
    }
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      
      // Clear notification IDs from storage
      const reminders = await this.getReminders();
      const updatedReminders = reminders.map(r => ({ ...r, notificationId: undefined }));
      await this.saveReminders(updatedReminders);
    } catch (error) {
      console.error('Error canceling all notifications:', error);
      throw error;
    }
  }

  /**
   * Get upcoming notifications (for debugging/testing)
   */
  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  /**
   * Format time for display (12-hour format)
   */
  static formatTime(time: string): string {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  /**
   * Format days for display
   */
  static formatDays(days: string[]): string {
    if (days.length === 7) {
      return 'Every day';
    }
    
    const dayAbbreviations: { [key: string]: string } = {
      sunday: 'Sun',
      monday: 'Mon',
      tuesday: 'Tue',
      wednesday: 'Wed',
      thursday: 'Thu',
      friday: 'Fri',
      saturday: 'Sat',
    };

    return days.map(day => dayAbbreviations[day.toLowerCase()]).join(', ');
  }

  /**
   * Get workout types from user's active workout plan
   */
  static async getWorkoutTypes(userId: string): Promise<string[]> {
    try {
      const activePlan = await WorkoutService.getActivePlan(userId);
      
      if (!activePlan) {
        console.log('[WorkoutReminderService] No active plan found, using default workout types');
        return ['General Workout', 'Cardio', 'Strength Training'];
      }

      // Get workout days from the plan's weekly schedule
      const weeklySchedule = activePlan.weeklySchedule || activePlan.weekly_schedule;
      
      if (!weeklySchedule || !Array.isArray(weeklySchedule)) {
        console.log('[WorkoutReminderService] No weekly schedule found, using default workout types');
        return ['General Workout', 'Cardio', 'Strength Training'];
      }

      // Extract unique workout day names/focuses
      const workoutTypes = weeklySchedule
        .map((day: any) => {
          // Try different possible field names for the workout day name
          return day.focus || day.day || day.name || 'Workout';
        })
        .filter((type: string, index: number, array: string[]) => 
          // Remove duplicates and ensure it's a string
          typeof type === 'string' && array.indexOf(type) === index
        );

      console.log('[WorkoutReminderService] Found workout types from active plan:', workoutTypes);
      
      // If we have workout types from the plan, use them, otherwise use defaults
      return workoutTypes.length > 0 ? workoutTypes : ['General Workout', 'Cardio', 'Strength Training'];
      
    } catch (error) {
      console.error('[WorkoutReminderService] Error getting workout types:', error);
      return ['General Workout', 'Cardio', 'Strength Training'];
    }
  }

  /**
   * Get workout plan name for display
   */
  static async getWorkoutPlanName(userId: string): Promise<string> {
    try {
      const activePlan = await WorkoutService.getActivePlan(userId);
      return activePlan?.name || 'Your Workout Plan';
    } catch (error) {
      console.error('[WorkoutReminderService] Error getting workout plan name:', error);
      return 'Your Workout Plan';
    }
  }
}
