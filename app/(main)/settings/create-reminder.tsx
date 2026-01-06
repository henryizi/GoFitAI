import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { 
  WorkoutReminderService, 
} from '../../../src/services/notifications/WorkoutReminderService';
import { useAuth } from '../../../src/hooks/useAuth';

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

export default function CreateReminderScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [selectedWorkout, setSelectedWorkout] = useState('');
  const [customWorkoutName, setCustomWorkoutName] = useState('');
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reminderType, setReminderType] = useState<'recurring' | 'one-time'>('recurring');
  const [workoutTypes, setWorkoutTypes] = useState<Array<{key: string, label: string, icon: string}>>([]);

  useEffect(() => {
    loadWorkoutTypes();
  }, [user?.id]);

  const loadWorkoutTypes = async () => {
    if (!user?.id) return;
    
    try {
      const types = await WorkoutReminderService.getWorkoutTypes(user.id);
      
      const getWorkoutIcon = (workoutName: string): string => {
        const name = workoutName.toLowerCase();
        if (name.includes('push')) return 'arm-flex';
        if (name.includes('pull')) return 'weight-lifter';
        if (name.includes('leg')) return 'run';
        if (name.includes('upper')) return 'dumbbell';
        if (name.includes('lower')) return 'human-handsup';
        if (name.includes('cardio')) return 'heart-pulse';
        if (name.includes('full') || name.includes('body')) return 'human';
        return 'clipboard-text';
      };
      
      const typesWithIcons = types.map(type => ({
        key: type.toLowerCase().replace(/\s+/g, '_'),
        label: type,
        icon: getWorkoutIcon(type)
      }));
      
      typesWithIcons.push({
        key: 'custom',
        label: 'Custom Workout',
        icon: 'clipboard-text'
      });
      
      setWorkoutTypes(typesWithIcons);
    } catch (error) {
      console.error('Error loading workout types:', error);
      setWorkoutTypes([
        { key: 'push', label: 'Push Day', icon: 'arm-flex' },
        { key: 'pull', label: 'Pull Day', icon: 'weight-lifter' },
        { key: 'legs', label: 'Leg Day', icon: 'run' },
        { key: 'upper', label: 'Upper Body', icon: 'dumbbell' },
        { key: 'lower', label: 'Lower Body', icon: 'human-handsup' },
        { key: 'cardio', label: 'Cardio', icon: 'heart-pulse' },
        { key: 'full_body', label: 'Full Body', icon: 'human' },
        { key: 'custom', label: 'Custom Workout', icon: 'clipboard-text' },
      ]);
    }
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

    const granted = await WorkoutReminderService.requestPermissions();
    if (!granted) {
      Alert.alert(
        'Permissions Required',
        'Please enable notifications in your device settings to receive workout reminders.',
        [{ text: 'OK' }]
      );
      return;
    }

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

      Alert.alert(
        'Success! 🎉',
        reminderType === 'one-time' 
          ? `Your one-time workout reminder for "${workoutName}" has been set for today!`
          : `Your recurring workout reminder for "${workoutName}" has been set!`,
        [{ text: 'Great!', onPress: () => router.replace('/(main)/settings/workout-reminders') }]
      );
    } catch (error) {
      console.error('Error creating reminder:', error);
      Alert.alert('Error', 'Failed to create workout reminder');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Icon name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Workout Reminder</Text>
        <TouchableOpacity
          onPress={handleCreateReminder}
          disabled={loading}
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          activeOpacity={0.8}
        >
          <Text style={[styles.saveButtonText, loading && styles.saveButtonTextDisabled]}>
            {loading ? 'Creating...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter workout name"
                  placeholderTextColor={colors.textSecondary}
                  value={customWorkoutName}
                  onChangeText={setCustomWorkoutName}
                />
              </View>
            </View>
          )}
        </View>

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
        <View style={{ height: insets.bottom + 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    textAlign: 'center',
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
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  saveButtonTextDisabled: {
    color: 'rgba(255,255,255,0.7)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  workoutGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  workoutOption: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  workoutOptionSelected: {
    backgroundColor: 'rgba(255,107,53,0.12)',
    borderColor: colors.primary,
  },
  workoutOptionText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  workoutOptionTextSelected: {
    color: colors.primary,
  },
  customWorkoutContainer: {
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  reminderTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  reminderTypeButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    gap: 8,
  },
  reminderTypeButtonSelected: {
    backgroundColor: 'rgba(255,107,53,0.12)',
    borderColor: colors.primary,
  },
  reminderTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
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
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  timeButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  daysContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  dayButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  dayButtonSelected: {
    backgroundColor: 'rgba(255,107,53,0.12)',
    borderColor: colors.primary,
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
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
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  quickSelectText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});


