import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors } from '../../styles/colors';
import { 
  WorkoutReminderService, 
  WorkoutReminder, 
  WorkoutReminderSettings 
} from '../../services/notifications/WorkoutReminderService';
import { useAuth } from '../../hooks/useAuth';

interface WorkoutReminderCardProps {
  onReminderCreated?: () => void;
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday', short: 'Mon' },
  { key: 'tuesday', label: 'Tuesday', short: 'Tue' },
  { key: 'wednesday', label: 'Wednesday', short: 'Wed' },
  { key: 'thursday', label: 'Thursday', short: 'Thu' },
  { key: 'friday', label: 'Friday', short: 'Fri' },
  { key: 'saturday', label: 'Saturday', short: 'Sat' },
  { key: 'sunday', label: 'Sunday', short: 'Sun' },
];

// Default workout types as fallback
const DEFAULT_WORKOUT_TYPES = [
  { key: 'push', label: 'Push Day', icon: 'arm-flex' },
  { key: 'pull', label: 'Pull Day', icon: 'weight-lifter' },
  { key: 'legs', label: 'Leg Day', icon: 'run' },
  { key: 'upper', label: 'Upper Body', icon: 'dumbbell' },
  { key: 'lower', label: 'Lower Body', icon: 'human-handsup' },
  { key: 'cardio', label: 'Cardio', icon: 'heart-pulse' },
  { key: 'full_body', label: 'Full Body', icon: 'human' },
  { key: 'custom', label: 'Custom Workout', icon: 'clipboard-text' },
];

// Function to get appropriate icon for workout type
const getWorkoutIcon = (workoutName: string): string => {
  const name = workoutName.toLowerCase();
  if (name.includes('push')) return 'arm-flex';
  if (name.includes('pull')) return 'weight-lifter';
  if (name.includes('leg')) return 'run';
  if (name.includes('upper')) return 'dumbbell';
  if (name.includes('lower')) return 'human-handsup';
  if (name.includes('cardio')) return 'heart-pulse';
  if (name.includes('full') || name.includes('body')) return 'human';
  if (name.includes('chest')) return 'arm-flex';
  if (name.includes('back')) return 'weight-lifter';
  if (name.includes('shoulder')) return 'dumbbell';
  if (name.includes('arm')) return 'arm-flex';
  return 'clipboard-text'; // Default icon
};

export const WorkoutReminderCard: React.FC<WorkoutReminderCardProps> = ({
  onReminderCreated,
}) => {
  const { user } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [reminders, setReminders] = useState<WorkoutReminder[]>([]);
  const [settings, setSettings] = useState<WorkoutReminderSettings>({
    enabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    reminderMinutesBefore: 0,
  });
  const [workoutTypes, setWorkoutTypes] = useState<Array<{key: string, label: string, icon: string}>>([]);
  const [workoutPlanName, setWorkoutPlanName] = useState<string>('Your Workout Plan');

  // Form state
  const [selectedWorkout, setSelectedWorkout] = useState('');
  const [customWorkoutName, setCustomWorkoutName] = useState('');
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reminderType, setReminderType] = useState<'recurring' | 'one-time'>('recurring');

  useEffect(() => {
    loadData();
    loadWorkoutTypes();
  }, [user?.id]);

  const loadWorkoutTypes = async () => {
    if (!user?.id) return;
    
    try {
      const types = await WorkoutReminderService.getWorkoutTypes(user.id);
      const planName = await WorkoutReminderService.getWorkoutPlanName(user.id);
      
      // Convert string array to object array with icons
      const typesWithIcons = types.map(type => ({
        key: type.toLowerCase().replace(/\s+/g, '_'),
        label: type,
        icon: getWorkoutIcon(type)
      }));
      
      // Add custom workout option
      typesWithIcons.push({
        key: 'custom',
        label: 'Custom Workout',
        icon: 'clipboard-text'
      });
      
      setWorkoutTypes(typesWithIcons);
      setWorkoutPlanName(planName);
    } catch (error) {
      console.error('Error loading workout types:', error);
      // Fallback to default types
      setWorkoutTypes(DEFAULT_WORKOUT_TYPES);
    }
  };

  const loadData = async () => {
    try {
      const [remindersData, settingsData] = await Promise.all([
        WorkoutReminderService.getReminders(),
        WorkoutReminderService.getSettings(),
      ]);
      setReminders(remindersData);
      setSettings(settingsData);
    } catch (error) {
      console.error('Error loading reminder data:', error);
    }
  };

  const requestPermissions = async () => {
    const granted = await WorkoutReminderService.requestPermissions();
    if (!granted) {
      Alert.alert(
        'Permissions Required',
        'Please enable notifications in your device settings to receive workout reminders.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const handleCreateReminder = async () => {
    if (!selectedWorkout && !customWorkoutName) {
      Alert.alert('Error', 'Please select or enter a workout name');
      return;
    }

    if (reminderType === 'recurring' && selectedDays.length === 0) {
      Alert.alert('Error', 'Please select at least one day for recurring reminders');
      return;
    }

    const hasPermissions = await requestPermissions();
    if (!hasPermissions) return;

    setLoading(true);
    try {
      const workoutName = selectedWorkout === 'custom' 
        ? customWorkoutName 
        : workoutTypes.find(w => w.key === selectedWorkout)?.label || selectedWorkout;

      const timeString = `${selectedTime.getHours().toString().padStart(2, '0')}:${selectedTime.getMinutes().toString().padStart(2, '0')}`;

      await WorkoutReminderService.createReminder(
        workoutName,
        timeString,
        selectedDays,
        reminderType,
        reminderType === 'one-time' ? new Date().toISOString().split('T')[0] : undefined
      );

      // Reset form
      setSelectedWorkout('');
      setCustomWorkoutName('');
      setSelectedTime(new Date());
      setSelectedDays([]);
      setReminderType('recurring');
      setModalVisible(false);

      // Reload data
      await loadData();
      onReminderCreated?.();

      const successMessage = reminderType === 'one-time' 
        ? `Your one-time workout reminder for "${workoutName}" has been set for today!`
        : `Your recurring workout reminder for "${workoutName}" has been set!`;
        
      Alert.alert(
        'Success! 🎉',
        successMessage,
        [{ text: 'Great!' }]
      );
    } catch (error) {
      console.error('Error creating reminder:', error);
      Alert.alert('Error', 'Failed to create workout reminder');
    } finally {
      setLoading(false);
    }
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

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const getNextReminderInfo = () => {
    const activeReminders = reminders.filter(r => r.isActive);
    if (activeReminders.length === 0) return null;

    // Find the next upcoming reminder
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = now.getHours() * 60 + now.getMinutes();

    let nextReminder = null;
    let minDaysUntil = 8; // More than a week

    for (const reminder of activeReminders) {
      const [hours, minutes] = reminder.scheduledTime.split(':').map(Number);
      const reminderTime = hours * 60 + minutes;

      for (const day of reminder.days) {
        const dayMap: { [key: string]: number } = {
          sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
          thursday: 4, friday: 5, saturday: 6
        };
        const reminderDay = dayMap[day.toLowerCase()];
        
        let daysUntil = (reminderDay - currentDay + 7) % 7;
        if (daysUntil === 0 && reminderTime <= currentTime) {
          daysUntil = 7; // Next week
        }

        if (daysUntil < minDaysUntil) {
          minDaysUntil = daysUntil;
          nextReminder = {
            ...reminder,
            nextDay: day,
            daysUntil,
          };
        }
      }
    }

    return nextReminder;
  };

  const nextReminder = getNextReminderInfo();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(255,107,53,0.2)', 'rgba(0,0,0,0.3)']}
        style={styles.card}
      >
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Icon name="bell-ring" size={24} color={colors.primary} />
            <View style={styles.titleTextContainer}>
              <Text style={styles.title}>Workout Reminders</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Icon name="plus" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {reminders.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar-clock" size={32} color={colors.textSecondary} />
            <Text style={styles.emptyText}>No workout reminders set</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to schedule your first workout reminder
            </Text>
          </View>
        ) : (
          <View style={styles.content}>
            {nextReminder && (
              <View style={styles.nextReminderContainer}>
                <Text style={styles.nextReminderLabel}>Next Workout:</Text>
                <Text style={styles.nextReminderText}>
                  {nextReminder.workoutName} • {WorkoutReminderService.formatTime(nextReminder.scheduledTime)}
                </Text>
                <Text style={styles.nextReminderDay}>
                  {nextReminder.daysUntil === 0 ? 'Today' : 
                   nextReminder.daysUntil === 1 ? 'Tomorrow' : 
                   `in ${nextReminder.daysUntil} days`}
                </Text>
              </View>
            )}

            <View style={styles.remindersList}>
              {reminders.slice(0, 2).map((reminder) => (
                <View key={reminder.id} style={styles.reminderItem}>
                  <View style={styles.reminderInfo}>
                    <Text style={styles.reminderName}>{reminder.workoutName}</Text>
                    <Text style={styles.reminderDetails}>
                      {WorkoutReminderService.formatTime(reminder.scheduledTime)} • {WorkoutReminderService.formatDays(reminder.days)}
                    </Text>
                  </View>
                  <View style={styles.reminderActions}>
                    <Switch
                      value={reminder.isActive}
                      onValueChange={() => handleToggleReminder(reminder.id)}
                      trackColor={{ false: 'rgba(255,255,255,0.2)', true: colors.primary }}
                      thumbColor={reminder.isActive ? colors.white : colors.textSecondary}
                      style={styles.switch}
                    />
                    <TouchableOpacity
                      onPress={() => handleDeleteReminder(reminder.id, reminder.workoutName)}
                      style={styles.deleteButton}
                    >
                      <Icon name="delete" size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              
              {reminders.length > 2 && (
                <Text style={styles.moreReminders}>
                  +{reminders.length - 2} more reminders
                </Text>
              )}
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Create Reminder Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Icon name="close" size={24} color={colors.white} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Set Workout Reminder</Text>
            <TouchableOpacity
              onPress={handleCreateReminder}
              disabled={loading}
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            >
              <Text style={[styles.saveButtonText, loading && styles.saveButtonTextDisabled]}>
                {loading ? 'Creating...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Workout Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Workout Type</Text>
              <View style={styles.workoutGrid}>
                {workoutTypes.map((workout) => (
                  <TouchableOpacity
                    key={workout.key}
                    style={[
                      styles.workoutOption,
                      selectedWorkout === workout.key && styles.workoutOptionSelected
                    ]}
                    onPress={() => setSelectedWorkout(workout.key)}
                  >
                    <Icon 
                      name={workout.icon as any} 
                      size={24} 
                      color={selectedWorkout === workout.key ? colors.primary : colors.textSecondary} 
                    />
                    <Text style={[
                      styles.workoutOptionText,
                      selectedWorkout === workout.key && styles.workoutOptionTextSelected
                    ]}>
                      {workout.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedWorkout === 'custom' && (
                <View style={styles.customWorkoutContainer}>
                  <Text style={styles.inputLabel}>Custom Workout Name</Text>
                  <View style={styles.inputContainer}>
                    <Icon name="dumbbell" size={20} color={colors.textSecondary} />
                    <Text
                      style={styles.textInput}
                      onPress={() => {
                        Alert.prompt(
                          'Custom Workout',
                          'Enter your workout name:',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { 
                              text: 'OK', 
                              onPress: (text) => setCustomWorkoutName(text || '') 
                            }
                          ],
                          'plain-text',
                          customWorkoutName
                        );
                      }}
                    >
                      {customWorkoutName || 'Tap to enter workout name'}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Reminder Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reminder Type</Text>
              <View style={styles.reminderTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.reminderTypeButton,
                    reminderType === 'recurring' && styles.reminderTypeButtonSelected
                  ]}
                  onPress={() => setReminderType('recurring')}
                >
                  <Icon 
                    name="repeat" 
                    size={20} 
                    color={reminderType === 'recurring' ? colors.primary : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.reminderTypeText,
                    reminderType === 'recurring' && styles.reminderTypeTextSelected
                  ]}>
                    Recurring
                  </Text>
                  <Text style={styles.reminderTypeDescription}>
                    Set for specific days
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.reminderTypeButton,
                    reminderType === 'one-time' && styles.reminderTypeButtonSelected
                  ]}
                  onPress={() => setReminderType('one-time')}
                >
                  <Icon 
                    name="calendar-today" 
                    size={20} 
                    color={reminderType === 'one-time' ? colors.primary : colors.textSecondary} 
                  />
                  <Text style={[
                    styles.reminderTypeText,
                    reminderType === 'one-time' && styles.reminderTypeTextSelected
                  ]}>
                    One-Time
                  </Text>
                  <Text style={styles.reminderTypeDescription}>
                    Just for today
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Time Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reminder Time</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Icon name="clock-outline" size={20} color={colors.primary} />
                <Text style={styles.timeButtonText}>
                  {WorkoutReminderService.formatTime(
                    `${selectedTime.getHours().toString().padStart(2, '0')}:${selectedTime.getMinutes().toString().padStart(2, '0')}`
                  )}
                </Text>
                <Icon name="chevron-right" size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              {showTimePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  is24Hour={false}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  textColor="white"
                  accentColor={colors.primary}
                  themeVariant="dark"
                  onChange={(event, date) => {
                    setShowTimePicker(Platform.OS === 'ios');
                    if (date) {
                      setSelectedTime(date);
                    }
                  }}
                />
              )}
            </View>

            {/* Days Selection - Only for recurring reminders */}
            {reminderType === 'recurring' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Reminder Days</Text>
              <View style={styles.daysContainer}>
                {DAYS_OF_WEEK.map((day) => (
                  <TouchableOpacity
                    key={day.key}
                    style={[
                      styles.dayButton,
                      selectedDays.includes(day.key) && styles.dayButtonSelected
                    ]}
                    onPress={() => toggleDay(day.key)}
                  >
                    <Text style={[
                      styles.dayButtonText,
                      selectedDays.includes(day.key) && styles.dayButtonTextSelected
                    ]}>
                      {day.short}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.quickDaySelections}>
                <TouchableOpacity
                  style={styles.quickSelectButton}
                  onPress={() => setSelectedDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])}
                >
                  <Text style={styles.quickSelectText}>Weekdays</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickSelectButton}
                  onPress={() => setSelectedDays(['saturday', 'sunday'])}
                >
                  <Text style={styles.quickSelectText}>Weekends</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickSelectButton}
                  onPress={() => setSelectedDays(DAYS_OF_WEEK.map(d => d.key))}
                >
                  <Text style={styles.quickSelectText}>Every Day</Text>
                </TouchableOpacity>
              </View>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flex: 1,
  },
  titleTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    color: colors.white,
    fontWeight: '600',
  },
  planName: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '400',
    marginTop: 2,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,107,53,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.8,
  },
  content: {
    gap: 16,
  },
  nextReminderContainer: {
    backgroundColor: 'rgba(255,107,53,0.15)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,107,53,0.3)',
  },
  nextReminderLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 4,
  },
  nextReminderText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
  },
  nextReminderDay: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  remindersList: {
    gap: 12,
  },
  reminderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    padding: 12,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderName: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '600',
    marginBottom: 2,
  },
  reminderDetails: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reminderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  deleteButton: {
    padding: 4,
  },
  moreReminders: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    color: colors.white,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(255,107,53,0.5)',
  },
  saveButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: 'rgba(255,255,255,0.7)',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
    marginBottom: 16,
  },
  workoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  workoutOption: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  workoutOptionSelected: {
    backgroundColor: 'rgba(255,107,53,0.2)',
    borderColor: colors.primary,
  },
  workoutOptionText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  workoutOptionTextSelected: {
    color: colors.primary,
  },
  customWorkoutContainer: {
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '500',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.white,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  timeButtonText: {
    flex: 1,
    fontSize: 16,
    color: colors.white,
    fontWeight: '500',
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dayButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dayButtonSelected: {
    backgroundColor: 'rgba(255,107,53,0.2)',
    borderColor: colors.primary,
  },
  dayButtonText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dayButtonTextSelected: {
    color: colors.primary,
  },
  quickDaySelections: {
    flexDirection: 'row',
    gap: 8,
  },
  quickSelectButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  quickSelectText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  reminderTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  reminderTypeButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 8,
  },
  reminderTypeButtonSelected: {
    backgroundColor: 'rgba(255,107,53,0.2)',
    borderColor: colors.primary,
  },
  reminderTypeText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  reminderTypeTextSelected: {
    color: colors.primary,
  },
  reminderTypeDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
  },
});
