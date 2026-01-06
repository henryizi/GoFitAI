import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Dimensions,
} from 'react-native';
import { Text, Chip, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';
import { colors } from '../../styles/colors';
import { ExerciseService } from '../../services/workout/ExerciseService';
import { RecentExercisesService, RecentExercise } from '../../services/workout/RecentExercisesService';

const { width, height } = Dimensions.get('window');

type Exercise = {
  id: string;
  name: string;
  muscle_groups?: string[];
  equipment?: string;
  difficulty?: string;
};

type ExercisePickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise, sets?: number) => void;
  excludeExerciseIds?: string[]; // Already added exercises
  userId?: string | null;
  preloadedExercises?: Exercise[]; // Preloaded exercises for instant display
  preloadedRecentExercises?: RecentExercise[]; // Preloaded recent exercises for instant display
};

const MUSCLE_GROUPS = [
  { label: 'All', value: 'all', icon: 'weight-lifter' },
  { label: 'Recently Logged', value: 'recent', icon: 'clock-outline' },
  { label: 'Chest', value: 'chest', icon: 'human' },
  { label: 'Back', value: 'back', icon: 'human-handsup' },
  { label: 'Shoulders', value: 'shoulders', icon: 'hand-back-left' },
  { label: 'Arms', value: 'arms', icon: 'arm-flex' },
  { label: 'Legs', value: 'legs', icon: 'run' },
  { label: 'Core', value: 'core', icon: 'ab-testing' },
  { label: 'Cardio', value: 'cardio', icon: 'heart-pulse' },
];

export default function ExercisePicker({
  visible,
  onClose,
  onSelectExercise,
  excludeExerciseIds = [],
  userId,
  preloadedExercises,
  preloadedRecentExercises,
}: ExercisePickerProps) {
  // Initialize with preloaded exercises immediately
  const [exercises, setExercises] = useState<Exercise[]>(preloadedExercises || []);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('all');
  const [recentExercises, setRecentExercises] = useState<RecentExercise[]>(preloadedRecentExercises || []);

  // Update exercises and recent exercises when preloaded props change (immediate sync)
  useEffect(() => {
    if (preloadedExercises && preloadedExercises.length > 0) {
      setExercises(preloadedExercises);
      setLoading(false); // Ensure no loading state if preloaded
    }
    if (preloadedRecentExercises && preloadedRecentExercises.length > 0) {
      setRecentExercises(preloadedRecentExercises);
    }
  }, [preloadedExercises, preloadedRecentExercises]);

  // Load exercises from the database with caching (only if not preloaded)
  useEffect(() => {
    const loadExercises = async () => {
      // If we already have exercises (preloaded or cached), no need to show loading or refetch
      if (exercises.length > 0 || (preloadedExercises && preloadedExercises.length > 0)) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Use cached version if available (faster)
        const exerciseList = await ExerciseService.getExercises(undefined, true);
        setExercises(exerciseList as Exercise[]);
      } catch (error) {
        console.error('Error loading exercises:', error);
      } finally {
        setLoading(false);
      }
    };

    // Only load if visible and we don't have preloaded exercises
    if (visible && (!preloadedExercises || preloadedExercises.length === 0) && exercises.length === 0) {
      loadExercises();
    } else if (preloadedExercises && preloadedExercises.length > 0) {
      // If preloaded, ensure no loading state
      setLoading(false);
    }
  }, [visible, exercises.length, preloadedExercises]);

  // Load recently logged exercises (only if not preloaded, non-blocking)
  useEffect(() => {
    const loadRecent = async () => {
      // Skip if we already have preloaded recent exercises
      if (preloadedRecentExercises && preloadedRecentExercises.length > 0) return;
      if (!visible || !userId) return;
      // Load in background, don't block UI
      RecentExercisesService.getRecentExercises(userId)
        .then(recents => setRecentExercises(recents))
        .catch(err => console.warn('[ExercisePicker] Error loading recent exercises:', err));
    };

    loadRecent();
  }, [visible, userId, preloadedRecentExercises]);

  // Helper function to normalize muscle group names for better filtering
  const normalizeMuscleGroup = (muscleGroup: string): string => {
    const normalized = muscleGroup.toLowerCase().trim();
    
    // Check for shoulder-related terms first (more specific matching)
    // Include all deltoid variations: front delt, side delt, rear delt
    const shoulderTerms = [
      'shoulder', 'shoulders', 'delt', 'deltoid', 'delts',
      'shoulder - front', 'shoulder - back', 'shoulder - side',
      'front delt', 'side delt', 'rear delt', 'anterior delt', 'posterior delt', 'lateral delt',
      'rotator cuff', 'rotator cuff - front', 'rotator cuff - back'
    ];
    
    if (shoulderTerms.some(term => normalized.includes(term))) {
      return 'shoulders';
    }
    
    // Map other muscle group naming conventions to standard categories
    const muscleGroupMappings: { [key: string]: string[] } = {
      'chest': ['chest', 'pectoral', 'pec', 'pectoralis'],
      'back': [
        'back', 'lat', 'latissimus', 'rhomboid', 'trap', 'traps', 'trapezius',
        'erector spinae', 'spinal erector'
      ],
      'arms': [
        'arm', 'arms', 'bicep', 'biceps', 'tricep', 'triceps',
        'forearm', 'forearms', 'forearm - inner', 'forearm - outer',
        'brachialis', 'brachioradialis', 'flexor', 'extensor'
      ],
      'legs': [
        'leg', 'legs', 'quad', 'quadriceps', 'hamstring', 'hamstrings',
        'glute', 'glutes', 'gluteus', 'calf', 'calves', 'gastrocnemius', 'soleus',
        'thigh', 'thigh - inner', 'thigh - outer', 'adductor', 'abductor',
        'vastus', 'rectus femoris', 'biceps femoris', 'semitendinosus', 'semimembranosus'
      ],
      'core': [
        'core', 'ab', 'abs', 'abdominal', 'oblique', 'obliques',
        'lower back', 'spine', 'transverse abdominis', 'rectus abdominis',
        'internal oblique', 'external oblique', 'serratus'
      ],
      'cardio': ['cardio', 'cardiovascular', 'aerobic', 'hiit', 'full body']
    };

    // Find which category this muscle group belongs to
    for (const [category, variations] of Object.entries(muscleGroupMappings)) {
      if (variations.some(variation => normalized.includes(variation))) {
        return category;
      }
    }

    return normalized;
  };

  // Filter exercises based on search and muscle group
  const filteredExercises = useMemo(() => {
    let filtered = exercises;

    // Exclude already added exercises
    if (excludeExerciseIds.length > 0) {
      filtered = filtered.filter(ex => !excludeExerciseIds.includes(ex.id));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ex =>
        ex.name.toLowerCase().includes(query) ||
        ex.equipment?.toLowerCase().includes(query)
      );
    }

    // Filter by muscle group with improved matching
    if (selectedMuscleGroup !== 'all') {
      const beforeFilterCount = filtered.length;
      
      // Special handling for "Recently Logged" filter
      if (selectedMuscleGroup === 'recent') {
        const recentExerciseIds = new Set(recentExercises.map(ex => ex.id));
        filtered = filtered.filter(ex => recentExerciseIds.has(ex.id));
      } else {
        // Regular muscle group filtering
        filtered = filtered.filter(ex => {
          const muscleGroups = ex.muscle_groups || [];
          
          // Skip exercises with placeholder or empty muscle groups
          if (muscleGroups.length === 0 || 
              muscleGroups.some(mg => mg.toLowerCase().includes('new') || mg.trim() === '')) {
            return false;
          }

          const matches = muscleGroups.some(mg => {
            const normalizedMuscleGroup = normalizeMuscleGroup(mg);
            const selectedCategory = selectedMuscleGroup.toLowerCase();
            
            // Use normalized muscle group for proper matching
            return normalizedMuscleGroup === selectedCategory;
          });

          return matches;
        });
      }
    }

    return filtered;
  }, [exercises, searchQuery, selectedMuscleGroup, excludeExerciseIds, recentExercises]);

  // When user taps an exercise, immediately add it with a single starting set.
  // The logging screen will let them add as many additional sets as they want.
  const handleSelectExercise = useCallback((exercise: Exercise) => {
    onSelectExercise(exercise, 1);
    // Reset filters and close picker
    setSearchQuery('');
    setSelectedMuscleGroup('all');
    onClose();
  }, [onSelectExercise, onClose]);

  // Memoized exercise card component for better performance
  const ExerciseCard = memo(({ exercise, onSelect }: { exercise: Exercise; onSelect: (exercise: Exercise) => void }) => (
    <TouchableOpacity
      style={styles.exerciseCard}
      onPress={() => onSelect(exercise)}
      activeOpacity={0.7}
    >
      <View style={styles.exerciseInfo}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        
        <View style={styles.exerciseDetails}>
          {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
            <View style={styles.muscleGroupBadges}>
              {exercise.muscle_groups.slice(0, 2).map((muscle, idx) => (
                <View key={idx} style={styles.muscleBadge}>
                  <Text style={styles.muscleBadgeText}>{muscle}</Text>
                </View>
              ))}
              {exercise.muscle_groups.length > 2 && (
                <View style={styles.muscleBadge}>
                  <Text style={styles.muscleBadgeText}>
                    +{exercise.muscle_groups.length - 2}
                  </Text>
                </View>
              )}
            </View>
          )}
          
          {exercise.equipment_needed && exercise.equipment_needed.length > 0 && (
            <View style={styles.equipmentContainer}>
              <Icon name="dumbbell" size={14} color={colors.textSecondary} />
              <Text style={styles.equipmentText}>
                {exercise.equipment_needed.slice(0, 2).join(', ')}
                {exercise.equipment_needed.length > 2 && ' +'}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.addButton}>
        <Icon name="plus-circle" size={32} color={colors.primary} />
      </View>
    </TouchableOpacity>
  ));

  const renderExercise = useCallback(({ item }: { item: Exercise }) => (
    <ExerciseCard exercise={item} onSelect={handleSelectExercise} />
  ), [handleSelectExercise]);

  const keyExtractor = useCallback((item: Exercise) => item.id, []);

  if (!visible) return null;

  return (
    <Modal
      visible={true}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
      hardwareAccelerated={true}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1}
          onPress={onClose}
        />
        
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Icon name="dumbbell" size={24} color={colors.primary} />
              <Text style={styles.headerTitle}>Add Exercise</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Muscle Group Filters */}
          <View style={styles.filterWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterContainer}
            >
              {MUSCLE_GROUPS.map(group => (
                <Chip
                  key={group.value}
                  selected={selectedMuscleGroup === group.value}
                  onPress={() => setSelectedMuscleGroup(group.value)}
                  style={[
                    styles.filterChip,
                    selectedMuscleGroup === group.value && styles.filterChipSelected,
                  ]}
                  textStyle={[
                    styles.filterChipText,
                    selectedMuscleGroup === group.value && styles.filterChipTextSelected,
                  ]}
                  icon={group.icon}
                >
                  {group.label}
                </Chip>
              ))}
            </ScrollView>
          </View>

          {/* Exercise List */}
          {loading && (!preloadedExercises || preloadedExercises.length === 0) && exercises.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading exercises...</Text>
            </View>
          ) : filteredExercises.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="dumbbell" size={64} color={colors.textSecondary} />
              <Text style={styles.emptyText}>No exercises found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery ? 'Try a different search term' : 'Adjust your filters'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredExercises}
              renderItem={renderExercise}
              keyExtractor={keyExtractor}
              style={styles.exerciseList}
              contentContainerStyle={styles.exerciseListContent}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={50}
              initialNumToRender={15}
              windowSize={10}
              getItemLayout={(_, index) => ({
                length: 80, // Approximate height of exercise card
                offset: 80 * index,
                index,
              })}
            />
          )}
        </View>
      </View>

      {/* No set-count modal – user will decide sets directly on the logging screen */}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: colors.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.85,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchIcon: {
    marginRight: -4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    padding: 0,
  },
  filterWrapper: {
    paddingVertical: 16,
  },
  filterContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    marginRight: 8,
  },
  filterChipSelected: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  filterChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  exerciseList: {
    flex: 1,
  },
  exerciseListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  recentSection: {
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  recentList: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginRight: 8,
  },
  recentChipText: {
    marginLeft: 6,
    fontSize: 13,
    color: colors.text,
    maxWidth: 140,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseInfo: {
    flex: 1,
    marginRight: 12,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  exerciseDetails: {
    gap: 8,
  },
  muscleGroupBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  muscleBadge: {
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  muscleBadgeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  equipmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  equipmentText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  addButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  setPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  setPickerCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    gap: 20,
  },
  setPickerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  setPickerExerciseName: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  setInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  setInput: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    width: 100,
    height: 80,
  },
  setInputLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  setInputHint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: -8,
  },
  setPickerActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

