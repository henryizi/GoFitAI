import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Appbar, Card, ActivityIndicator, HelperText, IconButton } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { WorkoutService } from '../../../../../src/services/workout/WorkoutService';
import { Database } from '../../../../../src/types/database';
import { colors } from '../../../../../src/styles/colors';

type ExerciseSet = Database['public']['Tables']['exercise_sets']['Row'] & {
  exercise: Database['public']['Tables']['exercises']['Row'];
};

// Add a type for validation errors
type ValidationErrors = {
  [setId: string]: {
    target_sets?: string;
  }
};

export default function EditSessionScreen() {
  const { sessionId, sessionTitle } = useLocalSearchParams<{ sessionId: string; sessionTitle: string }>();
  const [exerciseSets, setExerciseSets] = useState<ExerciseSet[]>([]);
  const [initialExerciseSets, setInitialExerciseSets] = useState<ExerciseSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newExercise, setNewExercise] = useState({ name: '', sets: '', reps: '', rest: '' });

  const loadSession = async () => {
    if (!sessionId) return;
    setIsLoading(true);
    try {
      const sets = await WorkoutService.getExerciseSetsForSession(sessionId);
      setExerciseSets(sets);
      setInitialExerciseSets(JSON.parse(JSON.stringify(sets))); // Deep copy for original state
    } catch (error) {
      console.error("Failed to load session details:", error);
      Alert.alert("Error", "Could not load session details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const validateSet = (set: ExerciseSet) => {
    const newErrors: ValidationErrors[string] = {};
    if (isNaN(Number(set.target_sets)) || Number(set.target_sets) <= 0) {
      newErrors.target_sets = "Sets must be a positive number.";
    }
    return newErrors;
  };

  const handleSetChange = (setId: string, field: 'target_sets' | 'target_reps' | 'rest_period' | 'name', value: string) => {
    setExerciseSets(currentSets => {
      const newSets = currentSets.map(set => {
        if (set.id === setId) {
          if (field === 'name') {
            return { ...set, exercise: { ...set.exercise, name: value } };
          }
          return { ...set, [field]: value };
        }
        return set;
      });

      // Re-validate the specific set that changed
      const changedSet = newSets.find(s => s.id === setId);
      if (changedSet) {
        const setValidationErrors = validateSet(changedSet);
        setErrors(prevErrors => ({
          ...prevErrors,
          [setId]: setValidationErrors,
        }));
      }

      return newSets;
    });
  };

  const handleSaveChanges = async () => {
    // Check for any validation errors before saving
    let hasErrors = false;
    for (const setId in errors) {
      if (Object.keys(errors[setId]).length > 0) {
        hasErrors = true;
        break;
      }
    }

    if (hasErrors) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Input',
        text2: 'Please fix the errors before saving.',
      });
      return;
    }

    setIsSaving(true);
    try {
      const updates = await Promise.all(
        exerciseSets.map(async (set) => {
          let exerciseId = set.exercise.id;
          const originalSet = initialExerciseSets.find(s => s.id === set.id);

          // If exercise name has changed, find or create the new one
          if (originalSet && originalSet.exercise.name !== set.exercise.name) {
            const newExercise = await WorkoutService.findOrCreateExercise('', set.exercise.name);
            if (newExercise) {
              exerciseId = newExercise.id;
            }
          }

          return {
            id: set.id,
            exercise_id: exerciseId,
            target_sets: Number(set.target_sets),
            target_reps: set.target_reps,
            rest_period: set.rest_period,
          };
        })
      );
      
      const success = await WorkoutService.batchUpdateExerciseSets(updates);
      
      if (success) {
        Toast.show({
          type: 'success',
          text1: 'Session Updated',
          text2: 'Your exercises have been saved.',
        });
        router.back();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Update Failed',
          text2: 'Could not save your changes. Please try again.',
        });
      }
    } catch (error) {
      console.error("Failed to save session changes:", error);
      Toast.show({
        type: 'error',
        text1: 'An Error Occurred',
        text2: 'An unexpected error occurred while saving.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddExercise = async () => {
    if (!newExercise.name.trim() || !newExercise.sets.trim() || !newExercise.reps.trim()) {
      Alert.alert("Invalid Input", "Please fill out all fields for the new exercise.");
      return;
    }
    
    // Logic to add the new exercise will be implemented here
    // For now, we'll just close the modal
    const success = await WorkoutService.addExerciseToSession(
      sessionId, 
      newExercise.name, 
      parseInt(newExercise.sets, 10), 
      newExercise.reps, 
      newExercise.rest
    );

    if (success) {
      Toast.show({
        type: 'success',
        text1: 'Exercise Added',
        text2: 'The new exercise has been added to your session.',
      });
      setIsModalVisible(false);
      setNewExercise({ name: '', sets: '', reps: '', rest: '' });
      loadSession(); // Reload the session to show the new exercise
    } else {
      Toast.show({
        type: 'error',
        text1: 'Add Failed',
        text2: 'Could not add the new exercise. Please try again.',
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating={true} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={sessionTitle || 'Edit Session'} />
        <Appbar.Action icon="plus" onPress={() => setIsModalVisible(true)} />
        <Button onPress={handleSaveChanges} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </Appbar.Header>
      
      <ScrollView contentContainerStyle={styles.content}>
        {exerciseSets.map((set, index) => {
          const setErrors = errors[set.id] || {};
          return (
            <Card key={set.id} style={styles.exerciseCard}>
              <Card.Content>
                <TextInput
                  label={`Exercise ${index + 1} Name`}
                  value={set.exercise.name}
                  onChangeText={(text) => handleSetChange(set.id, 'name', text)}
                  style={styles.input}
                />
                <TextInput
                  label="Sets"
                  value={String(set.target_sets)}
                  onChangeText={(text) => handleSetChange(set.id, 'target_sets', text)}
                  keyboardType="numeric"
                  style={styles.input}
                  error={!!setErrors.target_sets}
                />
                {!!setErrors.target_sets && (
                  <HelperText type="error" visible={!!setErrors.target_sets}>
                    {setErrors.target_sets}
                  </HelperText>
                )}
                <TextInput
                  label="Reps"
                  value={set.target_reps}
                  onChangeText={(text) => handleSetChange(set.id, 'target_reps', text)}
                  style={styles.input}
                />
                <TextInput
                  label="Rest Period"
                  value={set.rest_period}
                  onChangeText={(text) => handleSetChange(set.id, 'rest_period', text)}
                  style={styles.input}
                />
              </Card.Content>
            </Card>
          );
        })}
      </ScrollView>

      <Modal
        visible={isModalVisible}
        onDismiss={() => setIsModalVisible(false)}
        transparent={true}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={styles.modalContainer}
        >
          <ScrollView contentContainerStyle={styles.modalScrollView}>
            <Card style={styles.modalCard}>
              <Card.Title title="Add New Exercise" />
              <Card.Content>
                <TextInput
                  label="New Exercise Name"
                  value={newExercise.name}
                  onChangeText={(text) => setNewExercise({ ...newExercise, name: text })}
                  style={styles.input}
                />
                <TextInput
                  label="Sets"
                  value={newExercise.sets}
                  onChangeText={(text) => setNewExercise({ ...newExercise, sets: text })}
                  keyboardType="numeric"
                  style={styles.input}
                />
                <TextInput
                  label="Reps"
                  value={newExercise.reps}
                  onChangeText={(text) => setNewExercise({ ...newExercise, reps: text })}
                  style={styles.input}
                />
                <TextInput
                  label="Rest Period"
                  value={newExercise.rest}
                  onChangeText={(text) => setNewExercise({ ...newExercise, rest: text })}
                  style={styles.input}
                />
              </Card.Content>
              <Card.Actions>
                <Button onPress={() => setIsModalVisible(false)}>Cancel</Button>
                <Button onPress={handleAddExercise}>Add Exercise</Button>
              </Card.Actions>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
  },
  exerciseCard: {
    marginBottom: 16,
  },
  exerciseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors.text
  },
  input: {
    marginBottom: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalScrollView: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalCard: {
    width: '90%',
  },
}); 