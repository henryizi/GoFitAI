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
  'Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core', 'Cardio', 'Full Body'
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
  // Timing-based parameters for cardio exercises
  duration?: number; // in seconds
  restSeconds?: number; // in seconds
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

// Helper function to check if an exercise is cardio-based
const isCardioExercise = (exercise: Exercise): boolean => {
  const cardioCategories = ['cardio', 'cardiovascular'];
  const cardioMuscleGroups = ['cardio', 'cardiovascular', 'full body'];
  const cardioKeywords = ['jump', 'burpee', 'running', 'sprint', 'hiit', 'interval', 'rope', 'mountain', 'climber', 
                          'jack', 'knee', 'kicker', 'bound', 'crawl', 'star', 'battle', 'swing', 'slam', 'shuttle', 
                          'fartlek', 'swimming', 'dance', 'dancing', 'step', 'stair', 'climb', 'cardio'];
  
  // Check category
  if (cardioCategories.some(cat => exercise.category?.toLowerCase().includes(cat))) {
    return true;
  }
  
  // Check muscle groups
  if (exercise.muscle_groups?.some(mg => 
    cardioMuscleGroups.some(cardio => mg.toLowerCase().includes(cardio))
  )) {
    return true;
  }
  
  // Check exercise name for cardio keywords
  if (cardioKeywords.some(keyword => 
    exercise.name?.toLowerCase().includes(keyword)
  )) {
    return true;
  }
  
  return false;
};

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
  const [step, setStep] = useState(1);
  
 // 1: Plan Setup, 2: Day Selection, 3: Exercise Assignment, 4: Review

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
        (exercise.muscle_groups?.some(group => (group || '').toLowerCase().includes(lowerMuscleGroup)) ?? false) ||
        (selectedMuscleGroup.toLowerCase() === 'cardio' && isCardioExercise(exercise));
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
        const isCardio = isCardioExercise(exercise);
        const newExercise: WorkoutExercise = isCardio ? {
          exercise,
          sets: 1, // Default to 1 for cardio (not really used)
          reps: '30s', // Display duration as reps for compatibility
          rest: '30s',
          duration: 30, // 30 seconds default
          restSeconds: 30 // 30 seconds rest default
        } : {
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
        const isCardio = isCardioExercise(exercise);
        const newExercise: WorkoutExercise = isCardio ? {
          exercise,
          sets: 1, // Default to 1 for cardio (not really used)
          reps: '30s', // Display duration as reps for compatibility
          rest: '30s',
          duration: 30, // 30 seconds default
          restSeconds: 30 // 30 seconds rest default
        } : {
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

        {/* Modern Header with Gradient */}
        <View style={[styles.modernHeader, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.modernBackButton}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.modernHeaderContent}>
            <Text style={styles.modernHeaderTitle}>Workout Builder</Text>
            <Text style={styles.modernHeaderSubtitle}>Step 1 of 3 • Plan Setup</Text>
          </View>
          <View style={styles.modernHeaderProgress}>
            <Text style={styles.progressText}>33%</Text>
          </View>
        </View>

        <ScrollView 
          style={styles.modernContent} 
          contentContainerStyle={styles.modernScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Card style={styles.setupCard} theme={{ colors: { surface: colors.card } }}>
            <View style={styles.modernSectionHeader}>
              <Icon name="information-outline" size={24} color={colors.primary} />
              <Text style={styles.sectionHeaderTitle}>Basic Information</Text>
            </View>

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
            <View style={styles.modernSectionHeader}>
              <Icon name="dumbbell" size={24} color={colors.primary} />
              <Text style={styles.sectionHeaderTitle}>Training Configuration</Text>
            </View>

            <Text style={styles.modernLabel}>Training Level</Text>
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

            <Text style={styles.modernLabel}>Days Per Week</Text>
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
            <Text style={styles.nextButtonText}>Next: Day Selection</Text>
          </Button>
        </View>
      </View>
    );
  }

  // Step 2: Modern Day Builder with New Layout
  if (step === 2) {

    return (
      <View style={styles.container}>
        <StatusBar style="light" />

        {/* Modern Header with Gradient */}
        <View style={[styles.modernHeader, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => setStep(1)} style={styles.modernBackButton}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.modernHeaderContent}>
            <Text style={styles.modernHeaderTitle}>Workout Builder</Text>
            <Text style={styles.modernHeaderSubtitle}>Step 2 of 3 • Configure Days & Exercises</Text>
          </View>
          <View style={styles.modernHeaderProgress}>
            <Text style={styles.progressText}>67%</Text>
          </View>
        </View>

        <ScrollView 
          style={styles.modernContent} 
          contentContainerStyle={styles.modernScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress Banner */}
          <View style={styles.progressBanner}>
            <View style={styles.progressBannerContent}>
              <View style={styles.progressCircle}>
                <Text style={styles.progressCircleText}>2</Text>
              </View>
              <View style={styles.progressBannerText}>
                <Text style={styles.progressBannerTitle}>Configure Your Training Days</Text>
                <Text style={styles.progressBannerSubtitle}>
                  {progressInfo.configuredDays} of {progressInfo.totalDays} days ready • {progressInfo.totalExercises} exercises added
                </Text>
              </View>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressInfo.progressPercentage}%` }]} />
              </View>
            </View>
          </View>

          {/* Day Selection Grid */}
          <View style={styles.dayGridSection}>
            <View style={styles.modernSectionHeader}>
              <Icon name="calendar-multiple" size={24} color={colors.primary} />
              <Text style={styles.sectionHeaderTitle}>Training Days</Text>
            </View>
            
            <View style={styles.dayGrid}>
              {dayData.map((dayInfo) => (
                <TouchableOpacity
                  key={dayInfo.dayName}
                  onPress={() => handleDaySelection(dayInfo.dayName)}
                  style={[
                    styles.modernDayCard,
                    dayInfo.isSelected && styles.modernDayCardSelected,
                    selectedDay === dayInfo.dayName && styles.modernDayCardActive
                  ]}
                >
                  <View style={styles.modernDayCardHeader}>
                    <View style={[
                      styles.modernDayIndicator,
                      dayInfo.isSelected && styles.modernDayIndicatorSelected
                    ]}>
                      {dayInfo.isSelected ? (
                        <Icon name="check" size={16} color="#FFFFFF" />
                      ) : (
                        <Text style={styles.modernDayIndicatorText}>
                          {dayInfo.dayName.charAt(0)}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity 
                      onPress={() => startEditingDay(dayInfo.dayName)}
                      style={styles.modernDayEditButton}
                    >
                      <Icon name="pencil" size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  
                  {dayInfo.isEditing ? (
                    <View style={styles.modernDayEditContainer}>
                      <TextInput
                        style={styles.modernDayEditInput}
                        value={editingDayName}
                        onChangeText={setEditingDayName}
                        autoFocus
                        selectTextOnFocus
                      />
                      <View style={styles.modernDayEditActions}>
                        <TouchableOpacity onPress={saveDayName} style={styles.modernDayEditSave}>
                          <Icon name="check" size={12} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={cancelEditingDay} style={styles.modernDayEditCancel}>
                          <Icon name="close" size={12} color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text style={[
                        styles.modernDayName,
                        dayInfo.isSelected && styles.modernDayNameSelected
                      ]}>
                        {dayInfo.dayName}
                      </Text>
                      <Text style={styles.modernDayExerciseCount}>
                        {dayInfo.exerciseCount} exercise{dayInfo.exerciseCount !== 1 ? 's' : ''}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Selected Day Content */}
          {selectedDay && (
            <View style={styles.selectedDaySection}>
              <View style={styles.selectedDayHeader}>
                <View style={styles.selectedDayTitleContainer}>
                  <Icon name="dumbbell" size={24} color={colors.primary} />
                  <Text style={styles.modernSelectedDayTitle}>Building {selectedDay}</Text>
                </View>
                <View style={styles.selectedDayStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {workoutDays.find(d => d.day === selectedDay)?.exercises.length || 0}
                    </Text>
                    <Text style={styles.statLabel}>Exercises</Text>
                  </View>
                </View>
              </View>

              {/* Exercise Search */}
              <View style={styles.exerciseSearchContainer}>
                <View style={styles.searchInputContainer}>
                  <Icon name="magnify" size={20} color={colors.textSecondary} style={styles.searchIcon} />
                  <TextInput
                    style={styles.modernSearchInput}
                    placeholder="Search exercises by name or muscle..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchText}
                    onChangeText={setSearchText}
                  />
                  {searchText.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchText('')} style={styles.clearSearchButton}>
                      <Icon name="close-circle" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Muscle Group Filter Pills */}
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.muscleGroupScrollContainer}
                  contentContainerStyle={styles.muscleGroupScrollContent}
                >
                  <TouchableOpacity 
                    onPress={() => setSelectedMuscleGroup('')}
                    style={[
                      styles.modernMuscleGroupPill,
                      selectedMuscleGroup === '' && styles.modernMuscleGroupPillSelected
                    ]}
                  >
                    <Text style={[
                      styles.modernMuscleGroupText,
                      selectedMuscleGroup === '' && styles.modernMuscleGroupTextSelected
                    ]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {muscleGroups.map(group => (
                    <TouchableOpacity
                      key={group}
                      onPress={() => setSelectedMuscleGroup(selectedMuscleGroup === group ? '' : group)}
                      style={[
                        styles.modernMuscleGroupPill,
                        selectedMuscleGroup === group && styles.modernMuscleGroupPillSelected
                      ]}
                    >
                      <Text style={[
                        styles.modernMuscleGroupText,
                        selectedMuscleGroup === group && styles.modernMuscleGroupTextSelected
                      ]}>
                        {group}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Current Exercises in Day */}
              {workoutDays.find(d => d.day === selectedDay)?.exercises.length > 0 && (
                <View style={styles.currentExercisesSection}>
                  <Text style={styles.currentExercisesTitle}>Current Exercises</Text>
                  <View style={styles.currentExercisesList}>
                    {workoutDays.find(d => d.day === selectedDay)?.exercises.map((workoutExercise, index) => (
                      <View key={index} style={styles.modernCurrentExerciseCard}>
                        <View style={styles.modernCurrentExerciseHeader}>
                          <View style={styles.modernCurrentExerciseInfo}>
                            <Text style={styles.modernCurrentExerciseName}>
                              {workoutExercise.exercise.name}
                            </Text>
                            <Text style={styles.modernCurrentExerciseMuscle}>
                              {workoutExercise.exercise.muscle_groups?.join(', ')}
                            </Text>
                          </View>
                          <TouchableOpacity 
                            onPress={() => removeExerciseFromDay(selectedDay, workoutExercise.exercise.id)}
                            style={styles.modernRemoveButton}
                          >
                            <Icon name="trash-can" size={16} color={colors.error} />
                          </TouchableOpacity>
                        </View>
                        
                        <View style={styles.modernExerciseDetails}>
                          {isCardioExercise(workoutExercise.exercise) ? (
                            // Cardio exercises: show timing-based parameters
                            <>
                              <View style={styles.modernDetailInput}>
                                <Text style={styles.modernDetailLabel}>Duration</Text>
                                <TextInput
                                  style={styles.modernDetailTextInput}
                                  value={workoutExercise.duration?.toString() || '30'}
                                  onChangeText={(value) => updateExerciseDetails(selectedDay, workoutExercise.exercise.id, { 
                                    duration: parseInt(value) || 30,
                                    reps: `${parseInt(value) || 30}s` // Keep reps in sync for compatibility
                                  })}
                                  keyboardType="numeric"
                                  placeholder="seconds"
                                />
                              </View>
                              <View style={styles.modernDetailInput}>
                                <Text style={styles.modernDetailLabel}>Rest</Text>
                                <TextInput
                                  style={styles.modernDetailTextInput}
                                  value={workoutExercise.restSeconds?.toString() || '30'}
                                  onChangeText={(value) => updateExerciseDetails(selectedDay, workoutExercise.exercise.id, { 
                                    restSeconds: parseInt(value) || 30,
                                    rest: `${parseInt(value) || 30}s` // Keep rest in sync for compatibility
                                  })}
                                  keyboardType="numeric"
                                  placeholder="seconds"
                                />
                              </View>
                            </>
                          ) : (
                            // Strength exercises: show traditional sets/reps parameters
                            <>
                              <View style={styles.modernDetailInput}>
                                <Text style={styles.modernDetailLabel}>Sets</Text>
                                <TextInput
                                  style={styles.modernDetailTextInput}
                                  value={workoutExercise.sets.toString()}
                                  onChangeText={(value) => updateExerciseDetails(selectedDay, workoutExercise.exercise.id, { sets: parseInt(value) || 1 })}
                                  keyboardType="numeric"
                                />
                              </View>
                              <View style={styles.modernDetailInput}>
                                <Text style={styles.modernDetailLabel}>Reps</Text>
                                <TextInput
                                  style={styles.modernDetailTextInput}
                                  value={workoutExercise.reps}
                                  onChangeText={(value) => updateExerciseDetails(selectedDay, workoutExercise.exercise.id, { reps: value })}
                                />
                              </View>
                              <View style={styles.modernDetailInput}>
                                <Text style={styles.modernDetailLabel}>Rest</Text>
                                <TextInput
                                  style={styles.modernDetailTextInput}
                                  value={workoutExercise.rest}
                                  onChangeText={(value) => updateExerciseDetails(selectedDay, workoutExercise.exercise.id, { rest: value })}
                                />
                              </View>
                            </>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Available Exercises */}
              {isLoading ? (
                <View style={styles.modernLoadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.modernLoadingText}>Loading exercises...</Text>
                </View>
              ) : (
                filteredExercises.length > 0 && (
                  <View style={styles.availableExercisesSection}>
                    <Text style={styles.availableExercisesTitle}>
                      Available Exercises ({filteredExercises.length})
                    </Text>
                    <View style={styles.availableExercisesList}>
                      {filteredExercises.map((exercise) => (
                        <TouchableOpacity
                          key={exercise.id}
                          onPress={() => addExerciseToDay(selectedDay, exercise)}
                          style={styles.modernAvailableExerciseCard}
                        >
                          <View style={styles.modernAvailableExerciseContent}>
                            <View style={styles.modernAvailableExerciseInfo}>
                              <Text style={styles.modernAvailableExerciseName}>
                                {exercise.name}
                              </Text>
                              <Text style={styles.modernAvailableExerciseMuscle}>
                                {exercise.muscle_groups?.join(', ')}
                              </Text>
                              {exercise.description && (
                                <Text style={styles.modernAvailableExerciseDescription} numberOfLines={2}>
                                  {exercise.description}
                                </Text>
                              )}
                            </View>
                            <View style={styles.modernAddButton}>
                              <Icon name="plus" size={20} color={colors.primary} />
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )
              )}
            </View>
          )}

          {/* Empty State */}
          {!selectedDay && (
            <View style={styles.emptyStateContainer}>
              <Icon name="calendar-plus" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyStateTitle}>Select a Training Day</Text>
              <Text style={styles.emptyStateSubtitle}>
                Choose a day above to start adding exercises and building your workout plan.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Modern Footer */}
        <View style={[styles.modernFooter, { paddingBottom: Math.max(insets.bottom, tabBarHeight) }]}>
          <View style={styles.modernFooterContent}>
            <View style={styles.modernFooterStats}>
              <Text style={styles.modernFooterStatsText}>
                {progressInfo.configuredDays}/{progressInfo.totalDays} days configured
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setStep(3)}
              disabled={workoutDays.length !== planSetup.daysPerWeek}
              style={[
                styles.modernNextButton,
                workoutDays.length !== planSetup.daysPerWeek && styles.modernNextButtonDisabled
              ]}
            >
              <Text style={[
                styles.modernNextButtonText,
                workoutDays.length !== planSetup.daysPerWeek && styles.modernNextButtonTextDisabled
              ]}>
                Continue to Review
              </Text>
              <Icon 
                name="arrow-right" 
                size={20} 
                color={workoutDays.length === planSetup.daysPerWeek ? "#FFFFFF" : colors.textSecondary} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }



  // Step 3: Review & Create
  if (step === 3) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />

        {/* Modern Header with Gradient */}
        <View style={[styles.modernHeader, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => setStep(2)} style={styles.modernBackButton}>
            <Icon name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.modernHeaderContent}>
            <Text style={styles.modernHeaderTitle}>Workout Builder</Text>
            <Text style={styles.modernHeaderSubtitle}>Step 3 of 3 • Review & Create</Text>
          </View>
          <View style={styles.modernHeaderProgress}>
            <Text style={styles.progressText}>100%</Text>
          </View>
        </View>

        <ScrollView 
          style={styles.modernContent} 
          contentContainerStyle={styles.modernScrollContent}
          showsVerticalScrollIndicator={false}
        >
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
              {progressInfo.totalExercises} total exercises
            </Text>
          </Card>

          <View style={styles.finalWorkoutList}>
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
          </View>
        </ScrollView>
        
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


  // Fallback: if no step matches, show step 1
  // Fallback for unexpected step values
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Custom Workout Builder</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={[styles.content, { paddingBottom: tabBarHeight }]}>
        <Text style={[styles.stepTitle, { textAlign: 'center', marginTop: 50 }]}>
          Something went wrong
        </Text>
        <Text style={[styles.sectionTitle, { textAlign: 'center', marginBottom: 30 }]}>
          Please try again
        </Text>
        <Button 
          mode="contained" 
          onPress={() => setStep(1)}
          style={[styles.modernNextButton, { marginBottom: 10 }]}
        >
          Start Over
        </Button>
        <Button 
          mode="outlined" 
          onPress={() => router.back()}
          style={styles.modernBackButton}
          labelStyle={{ color: colors.text }}
        >
          Go Back
        </Button>
      </View>
    </View>
  );
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
  onChangeEditingName: (text: string) => void;
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
  modernLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 20,
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
  nextButtonText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
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
  exerciseLoadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },

  // Modern Step 2 Styles
  modernHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modernBackButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modernHeaderContent: {
    flex: 1,
    marginLeft: 16,
  },
  modernHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  modernHeaderSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 2,
  },
  modernHeaderProgress: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  modernContent: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modernScrollContent: {
    paddingBottom: 100,
  },
  progressBanner: {
    backgroundColor: colors.surface,
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  progressBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  progressCircleText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  progressBannerText: {
    flex: 1,
  },
  progressBannerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  progressBannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
  },
  progressBarContainer: {
    width: '100%',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  dayGridSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  modernSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 12,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  modernDayCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  modernDayCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}10`,
  },
  modernDayCardActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
    shadowColor: colors.primary,
    shadowOpacity: 0.2,
  },
  modernDayCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modernDayIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernDayIndicatorSelected: {
    backgroundColor: colors.primary,
  },
  modernDayIndicatorText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  modernDayEditButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modernDayEditContainer: {
    width: '100%',
  },
  modernDayEditInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  modernDayEditActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modernDayEditSave: {
    flex: 1,
    backgroundColor: `${colors.primary}20`,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    marginRight: 4,
  },
  modernDayEditCancel: {
    flex: 1,
    backgroundColor: `${colors.textSecondary}20`,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    marginLeft: 4,
  },
  modernDayName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modernDayNameSelected: {
    color: colors.primary,
  },
  modernDayExerciseCount: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  selectedDaySection: {
    marginHorizontal: 16,
  },
  selectedDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedDayTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modernSelectedDayTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 12,
  },
  selectedDayStats: {
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  exerciseSearchContainer: {
    marginBottom: 24,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 12,
  },
  modernSearchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    padding: 0,
  },
  clearSearchButton: {
    padding: 4,
  },
  muscleGroupScrollContainer: {
    height: 50,
  },
  muscleGroupScrollContent: {
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  modernMuscleGroupPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modernMuscleGroupPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modernMuscleGroupText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  modernMuscleGroupTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  currentExercisesSection: {
    marginBottom: 24,
  },
  currentExercisesTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  currentExercisesList: {
    gap: 12,
  },
  modernCurrentExerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  modernCurrentExerciseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modernCurrentExerciseInfo: {
    flex: 1,
    marginRight: 12,
  },
  modernCurrentExerciseName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modernCurrentExerciseMuscle: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  modernRemoveButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: `${colors.error}20`,
  },
  modernExerciseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modernDetailInput: {
    flex: 1,
    alignItems: 'center',
  },
  modernDetailLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  modernDetailTextInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 60,
  },
  modernLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  modernLoadingText: {
    color: colors.textSecondary,
    fontSize: 16,
    marginTop: 12,
  },
  availableExercisesSection: {
    marginBottom: 24,
  },
  availableExercisesTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  availableExercisesList: {
    gap: 8,
  },
  modernAvailableExerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modernAvailableExerciseContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernAvailableExerciseInfo: {
    flex: 1,
    marginRight: 12,
  },
  modernAvailableExerciseName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  modernAvailableExerciseMuscle: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  modernAvailableExerciseDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 18,
  },
  modernAddButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyStateTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  modernFooter: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  modernFooterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernFooterStats: {
    flex: 1,
  },
  modernFooterStatsText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  modernNextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  modernNextButtonDisabled: {
    backgroundColor: colors.border,
    shadowOpacity: 0.1,
  },
  modernNextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  modernNextButtonTextDisabled: {
    color: colors.textSecondary,
  },
});