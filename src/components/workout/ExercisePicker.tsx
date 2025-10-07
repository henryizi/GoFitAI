import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
} from 'react-native';
import { Text, Chip, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BlurView } from 'expo-blur';
import { colors } from '../../styles/colors';
import { ExerciseService } from '../../services/workout/ExerciseService';

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
};

const MUSCLE_GROUPS = [
  { label: 'All', value: 'all', icon: 'weight-lifter' },
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
}: ExercisePickerProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('all');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [numberOfSets, setNumberOfSets] = useState('3');

  // Load exercises from the database
  useEffect(() => {
    const loadExercises = async () => {
      setLoading(true);
      try {
        const exerciseList = await ExerciseService.getExercises();
        setExercises(exerciseList as Exercise[]);
      } catch (error) {
        console.error('Error loading exercises:', error);
      } finally {
        setLoading(false);
      }
    };

    if (visible) {
      loadExercises();
    }
  }, [visible]);

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

    // Filter by muscle group
    if (selectedMuscleGroup !== 'all') {
      filtered = filtered.filter(ex => {
        const muscleGroups = ex.muscle_groups || [];
        return muscleGroups.some(mg =>
          mg.toLowerCase().includes(selectedMuscleGroup.toLowerCase())
        );
      });
    }

    return filtered;
  }, [exercises, searchQuery, selectedMuscleGroup, excludeExerciseIds]);

  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setNumberOfSets('3'); // Reset to default
  };

  const handleConfirmExercise = () => {
    if (selectedExercise) {
      const sets = parseInt(numberOfSets, 10);
      if (sets > 0 && sets <= 50) { // Reasonable maximum
        onSelectExercise(selectedExercise, sets);
        // Reset state
        setSelectedExercise(null);
        setSearchQuery('');
        setSelectedMuscleGroup('all');
        setNumberOfSets('3');
      }
    }
  };

  const handleCancelSetPicker = () => {
    setSelectedExercise(null);
    setNumberOfSets('3');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
        
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
          {loading ? (
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
            <ScrollView style={styles.exerciseList} showsVerticalScrollIndicator={false}>
              {filteredExercises.map((exercise) => (
                <TouchableOpacity
                  key={exercise.id}
                  style={styles.exerciseCard}
                  onPress={() => handleSelectExercise(exercise)}
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
                      
                      {exercise.equipment && (
                        <View style={styles.equipmentContainer}>
                          <Icon name="dumbbell" size={14} color={colors.textSecondary} />
                          <Text style={styles.equipmentText}>{exercise.equipment}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={styles.addButton}>
                    <Icon name="plus-circle" size={32} color={colors.primary} />
                  </View>
                </TouchableOpacity>
              ))}
              
              {/* Bottom padding for scrolling */}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}
        </View>
      </View>

      {/* Set Picker Modal */}
      {selectedExercise && (
        <View style={styles.setPickerOverlay}>
          <View style={styles.setPickerCard}>
            <Text style={styles.setPickerTitle}>How many sets?</Text>
            <Text style={styles.setPickerExerciseName}>{selectedExercise.name}</Text>
            
            <View style={styles.setInputContainer}>
              <TextInput
                style={styles.setInput}
                value={numberOfSets}
                onChangeText={setNumberOfSets}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="3"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={styles.setInputLabel}>sets</Text>
            </View>
            
            <Text style={styles.setInputHint}>Enter 1-50 sets</Text>

            <View style={styles.setPickerActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleCancelSetPicker}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmButton}
                onPress={handleConfirmExercise}
              >
                <Text style={styles.confirmButtonText}>Add Exercise</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
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
    paddingHorizontal: 20,
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

