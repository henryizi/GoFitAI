import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Text, Button, Chip, Card, TextInput as PaperInput, SegmentedButtons } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/hooks/useAuth';
import { ExerciseService } from '../../../src/services/workout/ExerciseService';
import { WorkoutService } from '../../../src/services/workout/WorkoutService';

// Modern Dark Design System
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  background: '#121212',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
  card: 'rgba(28, 28, 30, 0.95)',
  border: 'rgba(84, 84, 88, 0.6)',
};

const muscleGroups = [
  'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Full Body'
];

const trainingLevels = [
  { value: 'beginner', label: 'Beginner', icon: 'baby-buggy' },
  { value: 'intermediate', label: 'Intermediate', icon: 'account' },
  { value: 'advanced', label: 'Advanced', icon: 'arm-flex' }
];

const daysPerWeekOptions = [
  { value: 1, label: '1 Day', description: 'Focus on recovery' },
  { value: 2, label: '2 Days', description: 'Maintenance training' },
  { value: 3, label: '3 Days', description: 'Perfect for beginners' },
  { value: 4, label: '4 Days', description: 'Balanced approach' },
  { value: 5, label: '5 Days', description: 'Most popular' },
  { value: 6, label: '6 Days', description: 'Advanced training' },
  { value: 7, label: '7 Days', description: 'Everyday training' }
];

const sessionTimeOptions = [
  { value: 30, label: '30 min', description: 'Quick sessions' },
  { value: 45, label: '45 min', description: 'Standard sessions' },
  { value: 60, label: '60 min', description: 'Full workouts' },
  { value: 90, label: '90 min', description: 'Extended sessions' }
];

interface Exercise {
  id: string;
  name: string;
  category: string;
  difficulty: string;
  muscle_groups: string[];
  equipment_needed: string[];
  description: string;
}

interface WorkoutExercise {
  exercise: Exercise;
  sets: number;
  reps: string;
  rest: string;
}

interface WorkoutDay {
  day: string;
  focus: string;
  exercises: WorkoutExercise[];
}

interface PlanSetup {
  name: string;
  description: string;
  trainingLevel: string;
  daysPerWeek: number;
  sessionTime: number;
}

export default function CustomBuilderScreen() {
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();

  // Tab bar height is 60px + bottom safe area (matches the layout tabBarStyle height)
  const tabBarHeight = 60 + insets.bottom;
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [debouncedSearchText, setDebouncedSearchText] = useState('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>([]);
  const [planSetup, setPlanSetup] = useState<PlanSetup>({
    name: '',
    description: '',
    trainingLevel: 'intermediate',
    daysPerWeek: 4,
    sessionTime: 60
  });
  const [isLoading, setIsLoading] = useState(false);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingDayName, setEditingDayName] = useState<string>('');
  const [step, setStep] = useState(1); // 1: Plan Setup, 2: Day Selection, 3: Exercise Assignment, 4: Review

  // Optimized day data computation - remove console.logs and simplify
  const dayData = useMemo(() => {
    // Use actual workout days if they exist
    if (workoutDays.length > 0) {
      return workoutDays.map((workoutDay) => ({
        dayName: workoutDay.day,
        day: workoutDay,
        isSelected: selectedDay === workoutDay.day,
        isEditing: editingDay === workoutDay.day,
        exerciseCount: workoutDay.exercises?.length || 0
      }));
    }

    // Create placeholders if no workout days exist
    return Array.from({ length: planSetup.daysPerWeek }, (_, index) => {
      const dayName = `Day ${index + 1}`;
      return {
        dayName,
        day: {
          day: dayName,
          focus: dayName,
          exercises: []
        },
        isSelected: selectedDay === dayName,
        isEditing: editingDay === dayName,
        exerciseCount: 0
      };
    });
  }, [planSetup.daysPerWeek, workoutDays, selectedDay, editingDay]);

  // Memoized progress calculation to avoid recalculation on every render
  const progressInfo = useMemo(() => ({
    configuredDays: workoutDays.length,
    totalDays: planSetup.daysPerWeek,
    progressPercentage: (workoutDays.length / planSetup.daysPerWeek) * 100,
    totalExercises: workoutDays.reduce((total, day) => total + day.exercises.length, 0)
  }), [workoutDays, planSetup.daysPerWeek]);


  useEffect(() => {
    loadExercises();
  }, []);

  // Debounce the search text to avoid recomputing filters on every keystroke
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearchText(searchText), 200);
    return () => clearTimeout(handle);
  }, [searchText]);

  // Initialize and manage workout days when daysPerWeek changes
  useEffect(() => {
    // Only run if daysPerWeek is valid
    if (planSetup.daysPerWeek <= 0) return;
    
    setWorkoutDays(prevDays => {
      // If we already have the correct number of days, don't update
      if (prevDays.length === planSetup.daysPerWeek) {
        return prevDays;
      }
      
      if (prevDays.length === 0) {
        // Initialize workout days if none exist
        const initialDays = Array.from({ length: planSetup.daysPerWeek }, (_, index) => {
          const dayName = `Day ${index + 1}`;
          return {
            day: dayName,
            focus: dayName,
            exercises: []
          };
        });
        
        // Auto-select the first day
        if (!selectedDay) {
          setSelectedDay('Day 1');
        }
        
        return initialDays;
      } else if (prevDays.length < planSetup.daysPerWeek) {
        // Add more days
        const additionalDays = Array.from({ length: planSetup.daysPerWeek - prevDays.length }, (_, index) => {
          const dayName = `Day ${prevDays.length + index + 1}`;
          return {
            day: dayName,
            focus: dayName,
            exercises: []
          };
        });
        return [...prevDays, ...additionalDays];
      } else {
        // Remove excess days
        const trimmedDays = prevDays.slice(0, planSetup.daysPerWeek);
        
        // If selected day was removed, select the first day
        const removedDays = prevDays.slice(planSetup.daysPerWeek);
        const wasSelectedDayRemoved = removedDays.some(day => day.day === selectedDay);
        if (wasSelectedDayRemoved && trimmedDays.length > 0) {
          setSelectedDay(trimmedDays[0].day);
        }
        
        return trimmedDays;
      }
    });
  }, [planSetup.daysPerWeek, selectedDay, setSelectedDay]);

  // Ensure selectedDay is set when entering step 2
  useEffect(() => {
    if (step === 2 && !selectedDay && workoutDays.length > 0) {
      setSelectedDay(workoutDays[0].day);
    }
  }, [step, selectedDay, workoutDays]);

  const loadExercises = async () => {
    setIsLoading(true);
    try {
      const allExercises = await ExerciseService.getExercises();
      setExercises(allExercises);
    } catch (error) {
      console.error('Error loading exercises:', error);
      Alert.alert('Error', 'Failed to load exercises');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredExercises = useMemo(() => {
    if (exercises.length === 0) return [];

    const lowerMuscleGroup = selectedMuscleGroup.toLowerCase();
    const lowerSearchText = debouncedSearchText.toLowerCase();

    return exercises.filter(exercise => {
      const matchesMuscleGroup = !selectedMuscleGroup ||
        (exercise.muscle_groups?.some(group => (group || '').toLowerCase().includes(lowerMuscleGroup)) ?? false);
      const nameText = (exercise.name ?? '').toLowerCase();
      const descText = (exercise.description ?? '').toLowerCase();
      const matchesSearch = !debouncedSearchText ||
        nameText.includes(lowerSearchText) ||
        descText.includes(lowerSearchText);
      return matchesMuscleGroup && matchesSearch;
    });
  }, [exercises, selectedMuscleGroup, debouncedSearchText]);

  const updatePlanSetup = (field: keyof PlanSetup, value: any) => {
    setPlanSetup(prev => ({ ...prev, [field]: value }));
  };




  const addExerciseToDay = useCallback((day: string, exercise: Exercise) => {
    setWorkoutDays(prevDays => {
      const existingDay = prevDays.find(d => d.day === day);

      if (existingDay) {
        // Day exists, just add exercise to it
        const newExercise: WorkoutExercise = {
          exercise,
          sets: 3,
          reps: '10-12',
          rest: '60s'
        };

        return prevDays.map(d =>
          d.day === day
            ? { ...d, exercises: [...d.exercises, newExercise] }
            : d
        );
      } else {
        // Day doesn't exist, create it
        const newExercise: WorkoutExercise = {
          exercise,
          sets: 3,
          reps: '10-12',
          rest: '60s'
        };

        return [...prevDays, {
          day,
          focus: day,
          exercises: [newExercise]
        }];
      }
    });
  }, []);

  const removeExerciseFromDay = useCallback((dayName: string, exerciseId: string) => {
    setWorkoutDays(prev => {
      const dayIndex = prev.findIndex(day => day.day === dayName);
      if (dayIndex === -1) return prev;

      const newDays = [...prev];
      newDays[dayIndex] = {
        ...newDays[dayIndex],
        exercises: newDays[dayIndex].exercises.filter(ex => ex.exercise.id !== exerciseId)
      };

      return newDays;
    });
  }, []);

  const updateExerciseDetails = useCallback((dayName: string, exerciseId: string, updates: Partial<WorkoutExercise>) => {
    setWorkoutDays(prev => {
      const dayIndex = prev.findIndex(day => day.day === dayName);
      if (dayIndex === -1) return prev;

      const newDays = [...prev];
      newDays[dayIndex] = {
        ...newDays[dayIndex],
        exercises: newDays[dayIndex].exercises.map(ex =>
          ex.exercise.id === exerciseId ? { ...ex, ...updates } : ex
        )
      };

      return newDays;
    });
  }, []);

  const startEditingDay = (dayName: string) => {
    setEditingDay(dayName);
    setEditingDayName(dayName);
  };

  const saveDayName = () => {
    if (editingDay && editingDayName.trim()) {
      updateDayName(editingDay, editingDayName.trim());
    }
    
    setEditingDay(null);
    setEditingDayName('');
  };

  const cancelEditingDay = () => {
    setEditingDay(null);
    setEditingDayName('');
  };

  const updateDayName = useCallback((oldDayName: string, newDayName: string) => {
    if (oldDayName === newDayName) return;

    // Use functional updates to avoid stale closures
    setWorkoutDays(prev => {
      const hasMatchingDay = prev.some(day => day.day === oldDayName);
      if (!hasMatchingDay) return prev;
      
      return prev.map(day => 
        day.day === oldDayName ? { ...day, day: newDayName, focus: newDayName } : day
      );
    });

    // Update selectedDay if it matches the old name
    setSelectedDay(current => current === oldDayName ? newDayName : current);

    // Update editing state to reflect the new name
    setEditingDayName(newDayName);
  }, []);

  const createWorkoutPlan = async () => {
    if (!user || !profile) {
      Alert.alert('Error', 'User profile not available');
      return;
    }

    if (!planSetup.name.trim()) {
      Alert.alert('Error', 'Please enter a plan name');
      return;
    }

    if (workoutDays.length === 0) {
      Alert.alert('Error', 'Please add at least one workout day');
      return;
    }

    if (workoutDays.length !== planSetup.daysPerWeek) {
      Alert.alert('Error', `Please configure exactly ${planSetup.daysPerWeek} training day${planSetup.daysPerWeek === 1 ? '' : 's'}`);
      return;
    }

    setIsLoading(true);
    try {
      const plan = await WorkoutService.createCustomPlan({
        userId: user.id,
        name: planSetup.name,
        description: planSetup.description,
        workoutDays,
        trainingLevel: planSetup.trainingLevel,
        primaryGoal: profile.primary_goal || 'general_fitness',
        daysPerWeek: planSetup.daysPerWeek,
        sessionTime: planSetup.sessionTime
      });

      if (plan) {
        Alert.alert('Success', `&quot;${planSetup.name}&quot; created successfully!`, [
          {
            text: 'View Plan',
            onPress: () => router.replace({
              pathname: '/(main)/workout/plan/[planId]',
              params: { planId: String((plan as any).id), planObject: JSON.stringify(plan) }
            }),
          },
        ]);
      } else {
        Alert.alert('Error', 'Failed to create workout plan');
      }
    } catch (error) {
      console.error('Error creating plan:', error);
      Alert.alert('Error', 'Failed to create workout plan');
    } finally {
      setIsLoading(false);
    }
  };

  const keyExtractor = useCallback((item: Exercise) => item.id, []);

  const renderExerciseRow = useCallback(({ item }: { item: Exercise }) => (
    <ExerciseListItem
      exercise={item}
      onPress={() => addExerciseToDay(selectedDay, item)}
    />
  ), [addExerciseToDay, selectedDay]);

  // Memoized day selection handler to prevent unnecessary re-renders
  const handleDaySelection = useCallback((dayName: string) => {
    // Use functional update to avoid dependency on selectedDay
    setSelectedDay(prevDay => {
      // Only update if the day is actually different
      if (prevDay !== dayName) {
        return dayName;
      }
      return prevDay;
    });
  }, []);


  // Step 1: Plan Setup
  if (step === 1) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />

        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Custom Workout Builder</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={[styles.content, { paddingBottom: tabBarHeight }]}>
          <Text style={styles.stepTitle}>Step 1: Plan Setup</Text>

          <Card style={styles.setupCard} theme={{ colors: { surface: colors.card } }}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <PaperInput
              label="Plan Name"
              value={planSetup.name}
              onChangeText={(value) => updatePlanSetup('name', value)}
              style={styles.textInput}
              theme={{ colors: { primary: colors.primary, background: colors.surface } }}
              textColor={colors.text}
            />

            <PaperInput
              label="Description (Optional)"
              value={planSetup.description}
              onChangeText={(value) => updatePlanSetup('description', value)}
              style={styles.textInput}
              theme={{ colors: { primary: colors.primary, background: colors.surface } }}
              textColor={colors.text}
              multiline
              numberOfLines={3}
            />
          </Card>

          <Card style={styles.setupCard} theme={{ colors: { surface: colors.card } }}>
            <Text style={styles.sectionTitle}>Training Configuration</Text>

            <Text style={styles.label}>Training Level</Text>
            <SegmentedButtons
              value={planSetup.trainingLevel}
              onValueChange={(value) => updatePlanSetup('trainingLevel', value)}
              buttons={trainingLevels.map(level => ({
                value: level.value,
                label: level.label,
                icon: level.icon,
                style: {
                  backgroundColor: planSetup.trainingLevel === level.value ? colors.primary : colors.surface,
                }
              }))}
              style={styles.segmentedButtons}
            />

            <Text style={styles.label}>Days Per Week</Text>
            <View style={styles.optionGrid}>
              {daysPerWeekOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => updatePlanSetup('daysPerWeek', option.value)}
                  style={[
                    styles.optionCard,
                    planSetup.daysPerWeek === option.value && styles.selectedOptionCard
                  ]}
                >
                  <Text style={[
                    styles.optionLabel,
                    planSetup.daysPerWeek === option.value && styles.selectedOptionLabel
                  ]}>{option.label}</Text>
                  <Text style={[
                    styles.optionDescription,
                    planSetup.daysPerWeek === option.value && styles.selectedOptionDescription
                  ]}>{option.description}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Session Duration</Text>
            <View style={styles.optionGrid}>
              {sessionTimeOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => updatePlanSetup('sessionTime', option.value)}
                  style={[
                    styles.optionCard,
                    planSetup.sessionTime === option.value && styles.selectedOptionCard
                  ]}
                >
                  <Text style={[
                    styles.optionLabel,
                    planSetup.sessionTime === option.value && styles.selectedOptionLabel
                  ]}>{option.label}</Text>
                  <Text style={[
                    styles.optionDescription,
                    planSetup.sessionTime === option.value && styles.selectedOptionDescription
                  ]}>{option.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, tabBarHeight) }]}>
          <Button
            mode="contained"
            onPress={() => setStep(2)}
            disabled={!planSetup.name.trim()}
            style={styles.nextButton}
            contentStyle={styles.nextButtonContent}
          >
            <Text>Next: Day Selection</Text>
          </Button>
        </View>
      </View>
    );
  }

  // Step 2: Day Selection & Add Exercises (Combined with fixed day selection)
  if (step === 2) {

    return (
      <View style={styles.container}>
        <StatusBar style="light" />

        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => setStep(1)}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Build Your Workout</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <Text style={styles.stepTitle}>Step 2 of 3: Choose Days & Add Exercises</Text>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading exercises...</Text>
            </View>
          ) : !selectedDay ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Setting up your workout days...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredExercises}
              keyExtractor={keyExtractor}
              renderItem={renderExerciseRow}
              contentContainerStyle={styles.scrollViewContent}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={10}
              removeClippedSubviews
              keyboardShouldPersistTaps="handled"
            ListHeaderComponent={(
              <>
                {/* Fixed Day Selection Section */}
                <View style={styles.fixedDaySection}>
                  <Card style={styles.compactSetupCard} theme={{ colors: { surface: colors.card } }}>
                    <View style={styles.compactSectionHeader}>
                      <View style={styles.compactSectionHeaderContent}>
                        <Icon name="calendar-clock" size={20} color={colors.primary} />
                        <Text style={[styles.sectionTitle, { fontSize: 18, marginBottom: 8 }]}>Choose Your Training Days</Text>
                      </View>
                      <Text style={[styles.setupDescription, { fontSize: 12, marginBottom: 12 }]}>Choose and customize your training days. You can rename days and see their progress as you build your plan.</Text>
                    </View>

                    <View style={styles.daySelectionContainer}>
                      {dayData.map((dayInfo) => (
                        <WorkoutDayCard
                          key={dayInfo.dayName}
                          dayName={dayInfo.dayName}
                          day={dayInfo.day}
                          isSelected={dayInfo.isSelected}
                          isEditing={dayInfo.isEditing}
                          exerciseCount={dayInfo.exerciseCount}
                          editingDayName={editingDayName}
                          onStartEditing={startEditingDay}
                          onSaveEditing={saveDayName}
                          onCancelEditing={cancelEditingDay}
                          onChangeEditingName={setEditingDayName}
                          onSelectDay={handleDaySelection}
                        />
                      ))}
                    </View>

                    {/* Progress Summary */}
                    <View style={styles.progressSummary}>
                      <Text style={styles.progressSummaryText}>{progressInfo.configuredDays} of {progressInfo.totalDays} day{progressInfo.totalDays === 1 ? '' : 's'} configured</Text>
                      <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progressInfo.progressPercentage}%` }]} />
                      </View>
                    </View>
                  </Card>
                </View>

                {/* Exercise Search and Filters */}
                {selectedDay && (
                  <Card style={styles.exerciseCard} theme={{ colors: { surface: colors.card } }}>
                    <Text style={styles.sectionTitle}>Add Exercises to {selectedDay}</Text>

                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search exercises..."
                      placeholderTextColor={colors.textSecondary}
                      value={searchText}
                      onChangeText={setSearchText}
                    />

                    <View style={styles.muscleGroupContainer}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.muscleGroupScroll}>
                        {muscleGroups.map(group => (
                          <Chip
                            key={group}
                            selected={selectedMuscleGroup === group}
                            onPress={() => setSelectedMuscleGroup(selectedMuscleGroup === group ? '' : group)}
                            style={[styles.muscleGroupChip, selectedMuscleGroup === group && styles.selectedMuscleGroupChip]}
                            textStyle={[styles.muscleGroupText, selectedMuscleGroup === group && styles.selectedMuscleGroupText]}
                          >
                            {group}
                          </Chip>
                        ))}
                      </ScrollView>
                    </View>

                    {isLoading && (
                      <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
                    )}
                  </Card>
                )}

                {/* Current Day Exercises */}
                {selectedDay && workoutDays.find(d => d.day === selectedDay)?.exercises.length > 0 && (
                  <Card style={styles.currentDayCard} theme={{ colors: { surface: colors.card } }}>
                    <Text style={styles.sectionTitle}>Exercises in {selectedDay}</Text>
                    <View style={styles.currentDayExerciseList}>
                      {workoutDays.find(d => d.day === selectedDay)?.exercises.map((workoutExercise, index) => (
                        <View key={index} style={styles.exerciseInDayItem}>
                          <View style={styles.exerciseInDayContent}>
                            <View style={styles.exerciseInDayInfo}>
                              <Text style={styles.exerciseName}>{workoutExercise.exercise.name}</Text>
                              <Text style={styles.exerciseDescription}>{workoutExercise.exercise.description}</Text>
                            </View>
                            <TouchableOpacity onPress={() => removeExerciseFromDay(selectedDay, workoutExercise.exercise.id)} style={styles.removeButton}>
                              <Icon name="delete" size={20} color={colors.error} />
                            </TouchableOpacity>
                          </View>

                          <View style={styles.exerciseDetailsContainer}>
                            <PaperInput
                              label="Sets"
                              value={workoutExercise.sets.toString()}
                              onChangeText={(value) => updateExerciseDetails(selectedDay, workoutExercise.exercise.id, { sets: parseInt(value) || 1 })}
                              style={styles.detailInput}
                              theme={{ colors: { primary: colors.primary, background: colors.surface } }}
                              textColor={colors.text}
                              keyboardType="numeric"
                            />
                            <PaperInput
                              label="Reps"
                              value={workoutExercise.reps}
                              onChangeText={(value) => updateExerciseDetails(selectedDay, workoutExercise.exercise.id, { reps: value })}
                              style={styles.detailInput}
                              theme={{ colors: { primary: colors.primary, background: colors.surface } }}
                              textColor={colors.text}
                            />
                            <PaperInput
                              label="Rest"
                              value={workoutExercise.rest}
                              onChangeText={(value) => updateExerciseDetails(selectedDay, workoutExercise.exercise.id, { rest: value })}
                              style={styles.detailInput}
                              theme={{ colors: { primary: colors.primary, background: colors.surface } }}
                              textColor={colors.text}
                            />
                          </View>
                        </View>
                      ))}
                    </View>
                  </Card>
                )}

                {/* Step Progress */}
                <View style={styles.progressSummary}>
                  <Text style={styles.progressSummaryText}>Step {step} of {3}: Building your {planSetup.daysPerWeek}-day plan</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
                  </View>
                </View>
              </>
            )}
          />
          )}
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, tabBarHeight) }]}>
          <Button
            mode="contained"
            onPress={() => setStep(3)}
            disabled={workoutDays.length !== planSetup.daysPerWeek}
            style={styles.nextButton}
            contentStyle={styles.nextButtonContent}
          >
            <Text>Next: Review & Create</Text>
          </Button>
        </View>
      </View>
    );
  }



  // Step 3: Review & Create
  if (step === 3) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />

        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => setStep(2)}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review & Create</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={[styles.content, { paddingBottom: tabBarHeight }]}>
          <Text style={styles.stepTitle}>Step 3: Review Your Custom Plan</Text>

          <Card style={styles.planSummary} theme={{ colors: { surface: colors.surface } }}>
            <Text style={styles.planTitle}>{planSetup.name}</Text>
            {planSetup.description && (
              <Text style={styles.planDescription}>{planSetup.description}</Text>
            )}
            <Text style={styles.planDetails}>
              {progressInfo.totalDays} training days • {planSetup.trainingLevel} level
            </Text>
            <Text style={styles.planDetails}>
              {planSetup.sessionTime} minutes per session
            </Text>
            <Text style={styles.planDetails}>
              {progressInfo.totalExercises} total exercises
            </Text>
          </Card>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.finalWorkoutList}>
            {workoutDays.map((day) => (
              <Card key={day.day} style={styles.dayCard} theme={{ colors: { surface: colors.card } }}>
                <Text style={styles.dayTitle}>{day.day}</Text>
                {day.exercises.map((workoutExercise, index) => (
                  <View key={index} style={styles.exerciseItem}>
                    <Text style={styles.exerciseName}>{workoutExercise.exercise.name}</Text>
                    <Text style={styles.exerciseDetails}>
                      {workoutExercise.sets} sets × {workoutExercise.reps} ({workoutExercise.rest} rest)
                    </Text>
                  </View>
                ))}
              </Card>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, tabBarHeight) }]}>
          <Button
            mode="contained"
            onPress={createWorkoutPlan}
            disabled={isLoading}
            style={styles.createButton}
            contentStyle={styles.createButtonContent}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Icon name="check" size={20} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Create &quot;{planSetup.name}&quot;</Text>
              </>
            )}
          </Button>
        </View>
      </View>
    );
  }


  return null;
}

// Memoized WorkoutDayCard component moved outside main component for better performance
const ExerciseListItem = React.memo(({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) => {
  // Component definition with display name
  ExerciseListItem.displayName = 'ExerciseListItem';
  return (
    <TouchableOpacity onPress={onPress} style={styles.exerciseItemCard}>
      <Text style={styles.exerciseName}>{exercise.name}</Text>
      <Text style={styles.exerciseDescription}>{exercise.description}</Text>
      <View style={styles.exerciseTags}>
        <Chip style={styles.chip} textStyle={styles.chipText}>
          {exercise.difficulty}
        </Chip>
        {exercise.muscle_groups.slice(0, 2).map(group => (
          <Chip key={group} style={styles.chip} textStyle={styles.chipText}>
            {group}
          </Chip>
        ))}
      </View>
    </TouchableOpacity>
  );
});

interface WorkoutDayCardProps {
  dayName: string;
  isSelected: boolean;
  isEditing: boolean;
  exerciseCount: number;
  editingDayName: string;
  onStartEditing: () => void;
  onSaveEditing: () => void;
  onCancelEditing: () => void;
  onChangeEditingName: () => void;
  onSelectDay: () => void;
}

const WorkoutDayCard = React.memo<WorkoutDayCardProps>(({
  dayName,
  isSelected,
  isEditing,
  exerciseCount,
  editingDayName,
  onStartEditing,
  onSaveEditing,
  onCancelEditing,
  onChangeEditingName,
  onSelectDay
}) => {
  const handleStartEditing = useCallback(() => onStartEditing(), [onStartEditing]);
  const handleSaveDay = useCallback(() => onSaveEditing(), [onSaveEditing]);
  const handleSelectDay = useCallback(() => onSelectDay(), [onSelectDay]);

  // Component definition with display name
  WorkoutDayCard.displayName = 'WorkoutDayCard';

  // Memoize expensive calculations
  const cardStyle = useMemo(() => [
    styles.daySelectionCard,
    isSelected && styles.selectedDayCard,
    exerciseCount > 0 && styles.completedDayCard
  ], [isSelected, exerciseCount]);

  const gradientStyle = useMemo(() => ({
    backgroundColor: isSelected
      ? '#FF6B35'
      : exerciseCount > 0
      ? '#34C759'
      : colors.card
  }), [isSelected, exerciseCount]);

  const iconName = useMemo(() => {
    if (isSelected) return "calendar-check";
    if (exerciseCount > 0) return "calendar-check-outline";
    return "calendar-outline";
  }, [isSelected, exerciseCount]);

  const iconColor = useMemo(() =>
    isSelected || exerciseCount > 0 ? "#FFFFFF" : colors.textSecondary,
    [isSelected, exerciseCount]
  );

  if (isEditing) {
    return (
      <View style={styles.daySelectionWrapper}>
        <View style={styles.editingDayCard}>
          {/* Modern Card Container */}
          <View style={styles.editDayCard}>
            {/* Header Section */}
            <View style={styles.editDayHeader}>
              {/* Back Button */}
              <TouchableOpacity
                onPress={onCancelEditing}
                style={styles.editDayBackButton}
              >
                <Icon name="arrow-left" size={24} color={colors.primary} />
              </TouchableOpacity>

              {/* Center Content */}
              <View style={styles.editDayHeaderCenter}>
                <View style={styles.editDayIcon}>
                  <Icon name="pencil-outline" size={20} color={colors.primary} />
                </View>
                <Text style={styles.editDayTitle}>Customize Day Name</Text>
              </View>
            </View>

            {/* Input Section */}
            <View style={styles.editDayInputContainer}>
              <PaperInput
                value={editingDayName}
                onChangeText={onChangeEditingName}
                style={styles.editDayInput}
                theme={{
                  colors: {
                    primary: colors.primary,
                    background: colors.surface,
                    outline: 'transparent'
                  }
                }}
                textColor={colors.text}
                placeholder="e.g., Push Day, Leg Day, Cardio..."
                placeholderTextColor={colors.textSecondary}
                autoFocus
                onSubmitEditing={handleSaveDay}
                returnKeyType="done"
                multiline={false}
                maxLength={20}
                mode="outlined"
                outlineColor={colors.primary}
                activeOutlineColor={colors.primary}
              />
            </View>

            {/* Actions Section */}
            <View style={styles.editDayActions}>
              <TouchableOpacity
                onPress={handleSaveDay}
                style={styles.editDayConfirmButton}
                activeOpacity={0.8}
              >
                <Text style={styles.editDayConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.daySelectionWrapper}>
      <TouchableOpacity
        onPress={handleSelectDay}
        style={cardStyle}
        activeOpacity={0.6}
      >
        <View
          style={[
            styles.cardGradient,
            gradientStyle
          ]}
        >
          <View style={styles.daySelectionHeader}>
            <View style={styles.dayHeaderLeft}>
              <Icon
                name={iconName}
                size={22}
                color={iconColor}
              />
              <Text style={[
                styles.daySelectionTitle,
                isSelected && styles.selectedDayTitle
              ]}>{dayName}</Text>
            </View>

            <TouchableOpacity
              onPress={handleStartEditing}
              style={[
                styles.editDayButton,
                isSelected && styles.editDayButtonSelected
              ]}
            >
              <Icon name="pencil" size={14} color={iconColor} />
            </TouchableOpacity>
          </View>

          <View style={styles.daySelectionContent}>
            <View style={styles.exerciseCountContainer}>
              <Icon
                name="dumbbell"
                size={16}
                color={isSelected ? "#FFFFFF" : exerciseCount > 0 ? "#FFFFFF" : colors.textSecondary}
              />
              <Text style={[
                styles.daySelectionSubtitle,
                isSelected && styles.selectedDaySubtitle
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit>
                {exerciseCount} exercises
              </Text>
            </View>

            {exerciseCount > 0 && (
              <View style={styles.progressIndicator}>
                <Text style={styles.progressText}>Ready to train</Text>
                <Icon name="check-circle" size={14} color="#FFFFFF" />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 0,
  },
  stepScrollView: {
    flex: 1,
  },
  stepTitle: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muscleGroupContainer: {
    marginBottom: 20,
  },
  muscleGroupScroll: {
    flexDirection: 'row',
    gap: 8,
  },
  muscleGroupChip: {
    backgroundColor: colors.surface,
  },
  selectedMuscleGroupChip: {
    backgroundColor: colors.primary,
  },
  muscleGroupText: {
    color: '#FFFFFF',
  },
  selectedMuscleGroupText: {
    color: '#FFFFFF',
  },
  exerciseCard: {
    backgroundColor: colors.card,
    marginBottom: 8,
    borderRadius: 12,
  },
  exerciseCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  selectedExercise: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderColor: colors.primary,
    borderWidth: 1,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  exerciseDescription: {
    color: '#E0E0E0',
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.9,
  },
  exerciseTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: colors.border,
    marginRight: 4,
    marginBottom: 4,
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  selectedContainer: {
    marginBottom: 20,
  },
  selectedTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  selectedCard: {
    backgroundColor: colors.surface,
    marginBottom: 8,
    borderRadius: 8,
  },
  selectedExerciseContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  loader: {
    marginTop: 40,
  },
  exerciseList: {
    flex: 1,
    minHeight: 200,
  },
  flatListHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  dayButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  dayButton: {
    margin: 2,
  },
  dayButtonContent: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  workoutDaysContainer: {
    marginTop: 20,
  },
  dayCard: {
    backgroundColor: colors.card,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
  },
  dayTitle: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  exerciseItem: {
    marginBottom: 8,
  },
  exerciseDetails: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  planSummary: {
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  planTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  planDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  planDetails: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 4,
  },
  finalWorkoutList: {
    flex: 1,
  },
  // Plan Setup Styles
  setupCard: {
    backgroundColor: colors.card,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  compactSetupCard: {
    backgroundColor: colors.card,
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
  },
  sectionTitle: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  setupDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  textInput: {
    marginBottom: 16,
  },
  segmentedButtons: {
    marginBottom: 20,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  optionCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    margin: 4,
    width: '45%',
    alignItems: 'center',
  },
  selectedOptionCard: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primaryDark,
  },
  optionLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  selectedOptionLabel: {
    color: '#FFFFFF',
  },
  optionDescription: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  selectedOptionDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  dayConfigCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayNumber: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  addDayButton: {
    backgroundColor: 'transparent',
    borderColor: colors.primary,
    marginTop: 12,
  },
  addDayButtonContent: {
    paddingVertical: 8,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
  },
  summaryTitle: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  summaryItem: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 4,
  },
  summaryCount: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // New Day Selection Styles
  daySelectionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  daySelectionWrapper: {
    width: '48%',
    marginBottom: 8,
    flex: 1,
    minWidth: 140,
  },
  daySelectionCard: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 60,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
    overflow: 'hidden',
  },
  cardGradient: {
    width: '100%',
    height: '100%',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDayCard: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  daySelectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 0.3,
  },
  editDayHeaderTitle: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  editDayHelperText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  selectedDayTitle: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
    letterSpacing: 0.8,
  },
  daySelectionSubtitle: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedDaySubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  daySelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  editDayButton: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  editingDayCard: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderWidth: 2,
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    paddingBottom: 16,
  },
  // New modern modal styles
  editDayCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },

  editDayHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 16,
  },

  editDayBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },

  editDayHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    marginLeft: -40, // Offset to center the content despite the back button
  },

  editDayIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  editDayTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },

  editDaySubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  editDayInputContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },

  editDayInput: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    fontSize: 16,
    fontWeight: '600',
    width: 160,
    maxWidth: 160,
    minWidth: 160,
    alignSelf: 'center',
    textAlign: 'center',
  },

  editDayActions: {
    alignItems: 'center',
  },

  editDayConfirmButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  editDayConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Exercise Selection Styles
  exerciseItemCard: {
    backgroundColor: colors.card,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  currentDayCard: {
    backgroundColor: colors.card,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
  exerciseInDayItem: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  exerciseInDayContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  exerciseInDayInfo: {
    flex: 1,
  },
  removeButton: {
    padding: 4,
    marginLeft: 8,
  },
  exerciseDetailsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  detailInput: {
    flex: 1,
    marginBottom: 0,
  },

  // Review Styles
  

  footer: {
    padding: 20,
    backgroundColor: colors.surface,
  },
  nextButton: {
    backgroundColor: colors.primary,
  },
  nextButtonContent: {
    paddingVertical: 12,
  },
  createButton: {
    backgroundColor: colors.success,
  },
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },

  // Enhanced Day Selection Styles
  sectionHeader: {
    marginBottom: 24,
  },
  compactSectionHeader: {
    marginBottom: 12,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  compactSectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressSummary: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  progressSummaryText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  
  completedDayCard: {
    borderColor: colors.success,
    shadowColor: colors.success,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  dayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  daySelectionContent: {
    alignItems: 'center',
    width: '100%',
  },
  
  exerciseCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
    minWidth: 0,
    flexShrink: 1,
  },
  progressIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
    marginRight: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cancelEditButton: {
    backgroundColor: colors.error,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: colors.error,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  saveEditButton: {
    backgroundColor: colors.success,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: colors.success,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  confirmEditText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  editDayButtonSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  scrollableExerciseSection: {
    flex: 1,
    marginTop: 8,
  },
  fixedDaySection: {
    marginBottom: 8,
  },
  mainScrollView: {
    flex: 1,
    marginTop: 8,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  currentDayExerciseList: {
    minHeight: 100,
  },
  backButton: {
    borderColor: colors.primary,
  },
  backButtonContent: {
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
});