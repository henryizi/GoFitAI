import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  Alert,
  Dimensions,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { router } from 'expo-router';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../../src/hooks/useAuth';
import { ExerciseService } from '../../../src/services/workout/ExerciseService';
import { WorkoutService } from '../../../src/services/workout/WorkoutService';
import { WorkoutLocalStore } from '../../../src/services/workout/WorkoutLocalStore';
import { track as analyticsTrack } from '../../../src/services/analytics/analytics';
import { calculateWorkoutCalories, adjustCaloriesForUserProfile } from '../../../src/utils/calorieCalculation';

const { width, height } = Dimensions.get('window');

// Modern, premium colors
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  accent: '#FF8F65',
  background: '#121212',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  textTertiary: 'rgba(235, 235, 245, 0.3)',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF453A',
  card: 'rgba(28, 28, 30, 0.8)',
  border: 'rgba(84, 84, 88, 0.6)',
  white: '#FFFFFF',
  dark: '#121212',
};

interface Exercise {
  id: string;
  name: string;
  category: string;
  muscle_groups: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  equipment_needed: string[];
  description?: string;
  form_tips?: string[];
  animation_url?: string;
}

interface WorkoutDay {
  name: string;
  exercises: {
    exerciseId: string;
    exerciseName: string;
    sets: number;
    reps: string;
    rest: string;
    notes?: string;
  }[];
}

interface CustomWorkoutPlan {
  name: string;
  description: string;
  trainingLevel: 'beginner' | 'intermediate' | 'advanced';
  daysPerWeek: number;
  estimatedTime: string;
  workoutDays: WorkoutDay[];
}

const MUSCLE_GROUPS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 
  'quadriceps', 'hamstrings', 'glutes', 'core', 'legs', 'obliques'
];

const EQUIPMENT_OPTIONS = [
  'bodyweight', 'dumbbells', 'barbell', 'kettlebell', 'resistance bands', 
  'cable machine', 'machine', 'smith machine', 'pull-up bar', 'bench'
];

const TRAINING_LEVELS = [
  { id: 'beginner', name: 'Beginner', description: '0-1 years experience' },
  { id: 'intermediate', name: 'Intermediate', description: '1-3 years experience' },
  { id: 'advanced', name: 'Advanced', description: '3+ years experience' }
];

export default function CustomWorkoutBuilder() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  
  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [workoutPlan, setWorkoutPlan] = useState<CustomWorkoutPlan>({
    name: '',
    description: '',
    trainingLevel: 'intermediate',
    daysPerWeek: 4,
    estimatedTime: '60',
    workoutDays: []
  });
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const steps = [
    'Plan Setup',
    'Training Frequency',
    'Training Days',
    'Exercise Selection',
    'Review & Save'
  ];

  // Load exercises on component mount
  useEffect(() => {
    loadExercises();
    analyticsTrack('custom_workout_builder_opened', { user_id: user?.id });
  }, []);

  // Helper function to get related muscle groups for broader categories
  const getRelatedMuscleGroups = (muscleGroup: string): string[] => {
    const muscleGroupLower = muscleGroup.toLowerCase();
    
    const muscleGroupMap: Record<string, string[]> = {
      'back': ['back', 'lat', 'trap', 'traps', 'upper back', 'lower back', 'rotator cuff - back', 'shoulder - back'],
      'chest': ['chest', 'upper chest', 'lower chest'],
      'shoulders': ['shoulders', 'shoulder - front', 'shoulder - side', 'shoulder - back', 'rotator cuff - front', 'rotator cuff - back'],
      'biceps': ['biceps', 'bicep'],
      'triceps': ['triceps', 'tricep'],
      'legs': ['legs', 'quad', 'quadriceps', 'hamstring', 'hamstrings', 'glute', 'glutes', 'calf', 'calves'],
      'quadriceps': ['quad', 'quadriceps', 'thigh - inner', 'thigh - outer'],
      'hamstrings': ['hamstring', 'hamstrings'],
      'glutes': ['glute', 'glutes'],
      'core': ['core', 'abdominal', 'oblique', 'obliques'],
      'obliques': ['oblique', 'obliques']
    };
    
    return muscleGroupMap[muscleGroupLower] || [muscleGroupLower];
  };

  // Memoized filtering for better performance
  const filteredExercises = useMemo(() => {
    if (!exercises.length) return [];
    
    let filtered = exercises;
    const searchQueryLower = searchQuery.toLowerCase();
    const selectedMuscleGroupsLower = selectedMuscleGroups.map(mg => mg.toLowerCase());
    const selectedEquipmentLower = selectedEquipment.map(eq => eq.toLowerCase());

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(exercise => {
        const nameLower = exercise.name.toLowerCase();
        const muscleGroupsLower = exercise.muscle_groups.map(mg => mg.toLowerCase());
        
        return nameLower.includes(searchQueryLower) ||
               muscleGroupsLower.some(mg => mg.includes(searchQueryLower));
      });
    }

    // Muscle groups filter - with support for related muscle groups
    if (selectedMuscleGroupsLower.length > 0) {
      // Expand selected muscle groups to include related ones
      const allRelatedMuscleGroups = new Set<string>();
      selectedMuscleGroupsLower.forEach(selectedGroup => {
        const related = getRelatedMuscleGroups(selectedGroup);
        related.forEach(mg => allRelatedMuscleGroups.add(mg.toLowerCase()));
      });
      
      filtered = filtered.filter(exercise =>
        exercise.muscle_groups.some(mg => allRelatedMuscleGroups.has(mg.toLowerCase()))
      );
    }

    // Equipment filter - optimized with Set lookup
    if (selectedEquipmentLower.length > 0) {
      const equipmentSet = new Set(selectedEquipmentLower);
      filtered = filtered.filter(exercise => {
        const exerciseEquipmentLower = exercise.equipment_needed.map(eq => eq.toLowerCase());
        return exerciseEquipmentLower.some(eq => equipmentSet.has(eq)) ||
               exerciseEquipmentLower.includes('bodyweight');
      });
    }

    return filtered;
  }, [exercises, searchQuery, selectedMuscleGroups, selectedEquipment]);

  // Initialize workout days when daysPerWeek changes
  useEffect(() => {
    if (workoutPlan.daysPerWeek !== workoutPlan.workoutDays.length) {
      const newDays: WorkoutDay[] = [];
      
      for (let i = 0; i < workoutPlan.daysPerWeek; i++) {
        newDays.push({
          name: workoutPlan.workoutDays[i]?.name || '',
          exercises: workoutPlan.workoutDays[i]?.exercises || []
        });
      }
      
      setWorkoutPlan(prev => ({ ...prev, workoutDays: newDays }));
    }
  }, [workoutPlan.daysPerWeek]);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    try {
      const exerciseData = await ExerciseService.getExercises();
      setExercises(exerciseData);
    } catch (error) {
      console.error('Error loading exercises:', error);
      Alert.alert('Error', 'Failed to load exercise library. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Optimized muscle group selection handler
  const toggleMuscleGroup = useCallback((muscle: string) => {
    setSelectedMuscleGroups(prev => 
      prev.includes(muscle) 
        ? prev.filter(m => m !== muscle)
        : [...prev, muscle]
    );
  }, []);

  // Optimized equipment selection handler
  const toggleEquipment = useCallback((equipment: string) => {
    setSelectedEquipment(prev => 
      prev.includes(equipment) 
        ? prev.filter(e => e !== equipment)
        : [...prev, equipment]
    );
  }, []);

  const addExerciseToDay = (exercise: Exercise) => {
    const newExercise = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      sets: 3,
      reps: '8-12',
      rest: '60s',
      notes: ''
    };

    setWorkoutPlan(prev => ({
      ...prev,
      workoutDays: prev.workoutDays.map((day, index) => 
        index === currentDayIndex 
          ? { ...day, exercises: [...day.exercises, newExercise] }
          : day
      )
    }));

    analyticsTrack('exercise_added_to_custom_plan', { 
      user_id: user?.id, 
      exercise_name: exercise.name,
      day_index: currentDayIndex 
    });
  };

  const removeExerciseFromDay = (exerciseIndex: number) => {
    setWorkoutPlan(prev => ({
      ...prev,
      workoutDays: prev.workoutDays.map((day, index) => 
        index === currentDayIndex 
          ? { ...day, exercises: day.exercises.filter((_, i) => i !== exerciseIndex) }
          : day
      )
    }));
  };

  const updateExerciseInDay = (exerciseIndex: number, field: string, value: string | number) => {
    setWorkoutPlan(prev => ({
      ...prev,
      workoutDays: prev.workoutDays.map((day, index) => 
        index === currentDayIndex 
          ? { 
              ...day, 
              exercises: day.exercises.map((ex, i) => 
                i === exerciseIndex ? { ...ex, [field]: value } : ex
              )
            }
          : day
      )
    }));
  };

  // Calculate calories for a workout day
  const calculateDayCalories = (day: WorkoutDay) => {
    if (day.exercises.length === 0) return 0;
    
    const exerciseList = day.exercises.map(ex => ({
      name: ex.exerciseName,
      sets: ex.sets,
      reps: ex.reps
    }));
    
    // Calculate base calories (assuming 70kg user weight as default)
    const { totalCalories } = calculateWorkoutCalories(exerciseList, 70);
    
    // Adjust based on training level (using as proxy for fitness level)
    const fitnessLevel = workoutPlan.trainingLevel === 'Beginner' ? 'beginner' 
                        : workoutPlan.trainingLevel === 'Intermediate' ? 'intermediate' 
                        : 'advanced';
    
    const adjustedCalories = adjustCaloriesForUserProfile(totalCalories, {
      fitnessLevel: fitnessLevel,
      intensity: 'moderate' // Default to moderate intensity
    });
    
    return adjustedCalories;
  };

  const saveCustomPlan = async () => {
    if (!workoutPlan.name.trim()) {
      Alert.alert('Error', 'Please enter a plan name.');
      return;
    }

    if (workoutPlan.workoutDays.some(day => day.exercises.length === 0)) {
      Alert.alert('Error', 'Each training day must have at least one exercise.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert custom plan to the format expected by the app
      const planData = {
        id: `custom-${Date.now()}`,
        user_id: user?.id || 'guest',
        name: workoutPlan.name,
        description: workoutPlan.description || `Custom ${workoutPlan.daysPerWeek}-day workout plan`,
        training_level: workoutPlan.trainingLevel,
        mesocycle_length_weeks: 4,
        current_week: 1,
        status: 'archived' as const,
        goal_fat_loss: 2,
        goal_muscle_gain: 3,
        estimated_time_per_session: `${workoutPlan.estimatedTime} min`,
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        weeklySchedule: workoutPlan.workoutDays.map((day, index) => ({
          dayName: day.name,
          dayNumber: index + 1,
          estimatedCaloriesBurned: calculateDayCalories(day), // Add calorie calculation for each day
          exercises: day.exercises.map(ex => ({
            name: ex.exerciseName,
            sets: ex.sets,
            reps: ex.reps,
            rest: ex.rest,
            notes: ex.notes || '',
            muscleGroups: exercises.find(e => e.id === ex.exerciseId)?.muscle_groups || []
          }))
        }))
      };

      // Save to local storage
      if (user?.id) {
        await WorkoutLocalStore.savePlan(user.id, planData);
      }

      analyticsTrack('custom_workout_plan_created', { 
        user_id: user?.id, 
        plan_name: workoutPlan.name,
        days_per_week: workoutPlan.daysPerWeek,
        total_exercises: workoutPlan.workoutDays.reduce((total, day) => total + day.exercises.length, 0)
      });

      Alert.alert(
        'Success!',
        'Your custom workout plan has been created. Do you want to activate it now?',
        [
          {
            text: 'Keep Current Plan',
            style: 'cancel',
            onPress: () => router.replace('/workout/plans')
          },
          {
            text: 'Activate New Plan',
            onPress: async () => {
              try {
                // Activate the new plan
                const activatedPlan = { ...planData, status: 'active', is_active: true };
                if (user?.id) {
                  await WorkoutLocalStore.savePlan(user.id, activatedPlan);
                }
                router.replace('/workout/plans');
              } catch (error) {
                console.error('Error activating plan:', error);
                Alert.alert('Error', 'Plan created but failed to activate. You can activate it from the plans list.');
                router.replace('/workout/plans');
              }
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error saving custom plan:', error);
      Alert.alert('Error', 'Failed to save your workout plan. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {steps.map((step, index) => (
        <View key={index} style={styles.stepItem}>
          <View style={[
            styles.stepCircle,
            index <= currentStep && styles.stepCircleActive
          ]}>
            <Text style={[
              styles.stepNumber,
              index <= currentStep && styles.stepNumberActive
            ]}>
              {index + 1}
            </Text>
          </View>
          <Text style={[
            styles.stepText,
            index === currentStep && styles.stepTextActive
          ]}>
            {step}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderPlanSetup = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Plan Setup</Text>
      <Text style={styles.stepDescription}>
        Let's start by setting up the basics of your workout plan.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Plan Name *</Text>
        <TextInput
          style={styles.textInput}
          value={workoutPlan.name}
          onChangeText={(text) => setWorkoutPlan(prev => ({ ...prev, name: text }))}
          placeholder="e.g., My Push Pull Legs Split"
          placeholderTextColor={colors.textTertiary}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Description (Optional)</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={workoutPlan.description}
          onChangeText={(text) => setWorkoutPlan(prev => ({ ...prev, description: text }))}
          placeholder="Describe your workout plan..."
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Training Level</Text>
        <View style={styles.optionGrid}>
          {TRAINING_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.id}
              style={[
                styles.optionCard,
                workoutPlan.trainingLevel === level.id && styles.optionCardSelected
              ]}
              onPress={() => setWorkoutPlan(prev => ({ ...prev, trainingLevel: level.id as any }))}
            >
              <Text style={[
                styles.optionTitle,
                workoutPlan.trainingLevel === level.id && styles.optionTitleSelected
              ]}>
                {level.name}
              </Text>
              <Text style={[
                styles.optionDescription,
                workoutPlan.trainingLevel === level.id && styles.optionDescriptionSelected
              ]}>
                {level.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>


      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Estimated Time Per Session (minutes)</Text>
        <TextInput
          style={styles.textInput}
          value={workoutPlan.estimatedTime}
          onChangeText={(text) => setWorkoutPlan(prev => ({ ...prev, estimatedTime: text }))}
          placeholder="60"
          placeholderTextColor={colors.textTertiary}
          keyboardType="numeric"
        />
      </View>
    </View>
  );

  const renderTrainingFrequency = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Training Frequency</Text>
      <Text style={styles.stepDescription}>
        How many days per week do you want to train? Choose between 1-7 days based on your schedule and goals.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Training Days Per Week</Text>
        <View style={styles.frequencyGrid}>
          {[1, 2, 3, 4, 5, 6, 7].map((days) => (
            <TouchableOpacity
              key={days}
              style={[
                styles.frequencyOption,
                workoutPlan.daysPerWeek === days && styles.frequencyOptionSelected
              ]}
              onPress={() => setWorkoutPlan(prev => ({ ...prev, daysPerWeek: days }))}
            >
              <Text style={[
                styles.frequencyNumber,
                workoutPlan.daysPerWeek === days && styles.frequencyNumberSelected
              ]}>
                {days}
              </Text>
              <Text style={[
                styles.frequencyLabel,
                workoutPlan.daysPerWeek === days && styles.frequencyLabelSelected
              ]}>
                {days === 1 ? 'day' : 'days'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.frequencyInfo}>
        <Text style={styles.frequencyInfoTitle}>
          {workoutPlan.daysPerWeek === 1 && "Perfect for beginners or maintenance"}
          {workoutPlan.daysPerWeek === 2 && "Great for beginners or busy schedules"}
          {workoutPlan.daysPerWeek === 3 && "Ideal for building strength and muscle"}
          {workoutPlan.daysPerWeek === 4 && "Excellent for muscle growth and fat loss"}
          {workoutPlan.daysPerWeek === 5 && "Advanced training for serious results"}
          {workoutPlan.daysPerWeek === 6 && "High-volume training for experienced lifters"}
          {workoutPlan.daysPerWeek === 7 && "Elite-level training - ensure proper recovery"}
        </Text>
        <Text style={styles.frequencyInfoDesc}>
          {workoutPlan.daysPerWeek <= 2 && "Focus on full-body compound movements"}
          {workoutPlan.daysPerWeek === 3 && "Perfect for upper/lower or push/pull/legs splits"}
          {workoutPlan.daysPerWeek === 4 && "Great for upper/lower or body part splits"}
          {workoutPlan.daysPerWeek >= 5 && "Allows for detailed muscle group specialization"}
        </Text>
      </View>
    </View>
  );

  const renderTrainingDays = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Training Days</Text>
      <Text style={styles.stepDescription}>
        Customize the name and focus of each training day.
      </Text>

      <View style={styles.daysList}>
        {workoutPlan.workoutDays.map((day, index) => (
          <View key={index} style={styles.dayCard}>
            <Text style={styles.dayNumber}>Day {index + 1}</Text>
            <View style={styles.dayNameContainer}>
              <TextInput
                style={styles.dayNameInput}
                value={day.name}
                onChangeText={(text) => {
                  setWorkoutPlan(prev => ({
                    ...prev,
                    workoutDays: prev.workoutDays.map((d, i) => 
                      i === index ? { ...d, name: text } : d
                    )
                  }));
                }}
                placeholder={`Day ${index + 1}`}
                placeholderTextColor={colors.textTertiary}
                returnKeyType="done"
              />
              <Icon name="pencil" size={16} color={colors.textTertiary} />
            </View>
            <Text style={styles.exerciseCount}>
              {day.exercises.length} exercises
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderExerciseSelection = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Exercise Selection</Text>
      <Text style={styles.stepDescription}>
        Add exercises to {workoutPlan.workoutDays[currentDayIndex]?.name || `Day ${currentDayIndex + 1}`}
      </Text>

      {/* Day Navigation */}
      <View style={styles.dayNavigation}>
        {workoutPlan.workoutDays.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayNavItem,
              currentDayIndex === index && styles.dayNavItemActive
            ]}
            onPress={() => setCurrentDayIndex(index)}
          >
            <Text style={[
              styles.dayNavText,
              currentDayIndex === index && styles.dayNavTextActive
            ]}>
              {day.name}
            </Text>
            <Text style={styles.dayNavCount}>{day.exercises.length}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Current Day Exercises */}
      <View style={styles.currentDayExercises}>
        <Text style={styles.sectionTitle}>Current Exercises</Text>
        {workoutPlan.workoutDays[currentDayIndex]?.exercises.map((exercise, index) => (
          <View key={index} style={styles.exerciseItem}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
              <TouchableOpacity
                onPress={() => removeExerciseFromDay(index)}
                style={styles.removeButton}
              >
                <Icon name="close" size={20} color={colors.error} />
              </TouchableOpacity>
            </View>
            <View style={styles.exerciseParams}>
              <View style={styles.paramItem}>
                <Text style={styles.paramLabel}>Sets</Text>
                <TextInput
                  style={styles.paramInput}
                  value={exercise.sets.toString()}
                  onChangeText={(text) => updateExerciseInDay(index, 'sets', parseInt(text) || 1)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.paramItem}>
                <Text style={styles.paramLabel}>Reps</Text>
                <TextInput
                  style={styles.paramInput}
                  value={exercise.reps}
                  onChangeText={(text) => updateExerciseInDay(index, 'reps', text)}
                  placeholder="8-12"
                />
              </View>
              <View style={styles.paramItem}>
                <Text style={styles.paramLabel}>Rest</Text>
                <TextInput
                  style={styles.paramInput}
                  value={exercise.rest}
                  onChangeText={(text) => updateExerciseInDay(index, 'rest', text)}
                  placeholder="60s"
                />
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Exercise Library */}
      <View style={styles.exerciseLibrary}>
        <Text style={styles.sectionTitle}>Exercise Library</Text>
        
        {/* Search and Filters */}
        <View style={styles.searchContainer}>
          <Icon name="magnify" size={20} color={colors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search exercises..."
            placeholderTextColor={colors.textTertiary}
          />
        </View>

        {/* Muscle Group Filters */}
        <Text style={styles.filterLabel}>Muscle Groups</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {MUSCLE_GROUPS.map((muscle) => (
            <TouchableOpacity
              key={muscle}
              style={[
                styles.filterChip,
                selectedMuscleGroups.includes(muscle) && styles.filterChipSelected
              ]}
              onPress={() => toggleMuscleGroup(muscle)}
            >
              <Text style={[
                styles.filterChipText,
                selectedMuscleGroups.includes(muscle) && styles.filterChipTextSelected
              ]}>
                {muscle}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Equipment Filters */}
        <Text style={styles.filterLabel}>Equipment</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {EQUIPMENT_OPTIONS.map((equipment) => (
            <TouchableOpacity
              key={equipment}
              style={[
                styles.filterChip,
                selectedEquipment.includes(equipment) && styles.filterChipSelected
              ]}
              onPress={() => toggleEquipment(equipment)}
            >
              <Text style={[
                styles.filterChipText,
                selectedEquipment.includes(equipment) && styles.filterChipTextSelected
              ]}>
                {equipment}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Exercise List */}
        <ScrollView style={styles.exerciseList}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
          ) : (
            filteredExercises.map((exercise) => (
              <TouchableOpacity
                key={exercise.id}
                style={styles.exerciseLibraryItem}
                onPress={() => addExerciseToDay(exercise)}
              >
                <View style={styles.exerciseInfo}>
                  <Text style={styles.exerciseLibraryName}>{exercise.name}</Text>
                  <Text style={styles.exerciseMuscles}>
                    {exercise.muscle_groups?.join(', ') || 'N/A'}
                  </Text>
                  <Text style={styles.exerciseDifficulty}>
                    {exercise.difficulty} • {exercise.equipment_needed?.join(', ') || 'N/A'}
                  </Text>
                </View>
                <Icon name="plus" size={24} color={colors.primary} />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );

  const renderReview = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Review & Save</Text>
      <Text style={styles.stepDescription}>
        Review your custom workout plan before saving.
      </Text>

      <View style={styles.reviewCard}>
        <Text style={styles.reviewTitle}>{workoutPlan.name}</Text>
        {workoutPlan.description && (
          <Text style={styles.reviewDescription}>{workoutPlan.description}</Text>
        )}
        <View style={styles.reviewStats}>
          <View style={styles.reviewStat}>
            <Text style={styles.reviewStatValue}>{workoutPlan.daysPerWeek}</Text>
            <Text style={styles.reviewStatLabel}>Days/Week</Text>
          </View>
          <View style={styles.reviewStat}>
            <Text style={styles.reviewStatValue}>{workoutPlan.estimatedTime}</Text>
            <Text style={styles.reviewStatLabel}>Minutes</Text>
          </View>
          <View style={styles.reviewStat}>
            <Text style={styles.reviewStatValue}>
              {workoutPlan.workoutDays.reduce((total, day) => total + day.exercises.length, 0)}
            </Text>
            <Text style={styles.reviewStatLabel}>Exercises</Text>
          </View>
          <View style={styles.reviewStat}>
            <Text style={styles.reviewStatValue}>
              {Math.round(workoutPlan.workoutDays.reduce((total, day) => total + calculateDayCalories(day), 0) / workoutPlan.daysPerWeek)}
            </Text>
            <Text style={styles.reviewStatLabel}>Avg Calories</Text>
          </View>
        </View>
      </View>

      <View style={styles.reviewDays}>
        {workoutPlan.workoutDays.map((day, index) => (
          <View key={index} style={styles.reviewDay}>
            <View style={styles.reviewDayHeader}>
              <Text style={styles.reviewDayName}>{day.name}</Text>
              <Text style={styles.reviewDayCalories}>~{calculateDayCalories(day)} cal</Text>
            </View>
            <Text style={styles.reviewDayExercises}>
              {day.exercises?.map(ex => ex.exerciseName).join(' • ') || 'No exercises added'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: return renderPlanSetup();
      case 1: return renderTrainingFrequency();
      case 2: return renderTrainingDays();
      case 3: return renderExerciseSelection();
      case 4: return renderReview();
      default: return renderPlanSetup();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" backgroundColor={colors.background} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Build Your Own</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content */}
      <View style={styles.contentWrapper}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderStepContent()}
        </ScrollView>
      </View>

      {/* Navigation Buttons */}
      <View style={[styles.navigation, { 
        paddingBottom: Math.max(5, insets.bottom),
        marginBottom: 40
      }]}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setCurrentStep(prev => prev - 1)}
          >
            <Text style={styles.navButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <View style={styles.navButtonSpacer} />
        
        {currentStep < steps.length - 1 ? (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonPrimary]}
            onPress={() => setCurrentStep(prev => prev + 1)}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.saveButtonGradient}
            >
              <Text style={styles.navButtonPrimaryText}>Next</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonPrimary]}
            onPress={saveCustomPlan}
            disabled={isSubmitting}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.saveButtonGradient}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.navButtonPrimaryText}>Save Plan</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  headerRight: {
    width: 40,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  stepNumberActive: {
    color: colors.white,
  },
  stepText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  stepTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  contentWrapper: {
    flex: 1,
    maxHeight: '65%', // Limit the content area height to make the grey frame shorter
  },
  content: {
    flex: 1,
  },
  stepContent: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  optionGrid: {
    gap: 12,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionCardSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  optionTitleSelected: {
    color: colors.primary,
  },
  optionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  optionDescriptionSelected: {
    color: colors.textSecondary,
  },
  numberSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  numberOption: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  numberOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  numberText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  numberTextSelected: {
    color: colors.primary,
  },
  daysList: {
    gap: 12,
  },
  dayCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    width: 50,
  },
  dayNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
  },
  dayNameInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    padding: 0,
  },
  exerciseCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dayNavigation: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 8,
  },
  dayNavItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayNavItemActive: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}20`,
  },
  dayNavText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  dayNavTextActive: {
    color: colors.primary,
  },
  dayNavCount: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  currentDayExercises: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 16,
  },
  exerciseItem: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  removeButton: {
    padding: 4,
  },
  exerciseParams: {
    flexDirection: 'row',
    gap: 12,
  },
  paramItem: {
    flex: 1,
  },
  paramLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  paramInput: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
  },
  exerciseLibrary: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: colors.text,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  filterContainer: {
    marginBottom: 16,
  },
  filterChip: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  filterChipTextSelected: {
    color: colors.white,
  },
  exerciseList: {
    maxHeight: 400,
  },
  loader: {
    padding: 40,
  },
  exerciseLibraryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseLibraryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  exerciseMuscles: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  exerciseDifficulty: {
    fontSize: 12,
    color: colors.textTertiary,
    textTransform: 'capitalize',
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  reviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  reviewDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  reviewStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  reviewStat: {
    alignItems: 'center',
  },
  reviewStatValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  reviewStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reviewDays: {
    gap: 16,
  },
  reviewDay: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  reviewDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewDayName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  reviewDayCalories: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.accent,
  },
  reviewDayExercises: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  navigation: {
    flexDirection: 'row',
    padding: 10,
    paddingTop: 10,
    paddingBottom: 5,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  navButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  navButtonPrimary: {
    overflow: 'hidden',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  navButtonPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  navButtonSpacer: {
    flex: 1,
  },
  saveButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frequencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  frequencyOption: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  frequencyOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  frequencyNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  frequencyNumberSelected: {
    color: colors.white,
  },
  frequencyLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  frequencyLabelSelected: {
    color: colors.white,
  },
  frequencyInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  frequencyInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  frequencyInfoDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
