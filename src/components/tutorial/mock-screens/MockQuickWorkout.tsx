import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../../styles/colors';
import { TutorialWrapper } from '../../tutorial/TutorialWrapper';

const { width } = Dimensions.get('window');

export const MockQuickWorkout = () => {
  const insets = useSafeAreaInsets();
  const [completedSets, setCompletedSets] = useState<number[]>([1]);

  const currentExercise = {
    name: "Barbell Squat",
    sets: 3,
    reps: "8-12",
    order: 1
  };

  const toggleSet = (setNumber: number) => {
    if (completedSets.includes(setNumber)) {
      setCompletedSets(completedSets.filter(s => s !== setNumber));
    } else {
      setCompletedSets([...completedSets, setNumber]);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#1a1a1a']}
        style={styles.backgroundGradient}
      >
        {/* Header */}
        <LinearGradient
          colors={['rgba(0,0,0,0.9)', 'rgba(28, 28, 30, 0.85)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.header, { paddingTop: insets.top + 8 }]}
        >
          <TouchableOpacity style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={colors.white} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Quick Workout</Text>
          
          <TouchableOpacity style={styles.finishCheckbox}>
            <Icon name="check" size={20} color={colors.white} />
          </TouchableOpacity>
        </LinearGradient>
        
        {/* Progress Container */}
        <LinearGradient
          colors={['rgba(28, 28, 30, 0.9)', 'rgba(18, 18, 18, 0.8)']}
          style={styles.progressContainer}
        >
          <View style={styles.progressTextContainer}>
            <View style={styles.progressLeftSection}>
              <Text style={styles.progressText}>33% Complete</Text>
              <Text style={styles.progressDetails}>1/3 Exercises</Text>
            </View>
            <View style={styles.progressRightSection}>
              <Icon name="fire" size={20} color={colors.primary} style={styles.fireIcon} />
              <Text style={styles.caloriesText}>120 cal</Text>
            </View>
          </View>
          
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: '33%' }]} />
          </View>
        </LinearGradient>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Exercise Card */}
          <View style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View style={styles.exerciseInfo}>
                <View style={styles.exerciseOrderContainer}>
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.exerciseOrderGradient}
                  >
                    <Text style={styles.exerciseOrder}>{currentExercise.order}</Text>
                  </LinearGradient>
                </View>
                <View>
                  <Text style={styles.exerciseName}>{currentExercise.name}</Text>
                  <Text style={styles.setProgress}>
                    {completedSets.length} of {currentExercise.sets} sets completed
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Table Section */}
          <View style={styles.tableSection}>
            <View style={styles.tableCard}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 0.15 }]}>Set</Text>
                <Text style={[styles.tableHeaderText, { flex: 0.2 }]}>KG</Text>
                <Text style={[styles.tableHeaderText, { flex: 0.2 }]}>Reps</Text>
                <Text style={[styles.tableHeaderText, { flex: 0.2 }]}>RPE</Text>
                <View style={{ flex: 0.25 }} />
              </View>

              {/* Table Rows */}
              {[1, 2, 3].map((setNum) => {
                const isCompleted = completedSets.includes(setNum);
                return (
                  <View key={setNum}>
                    <View style={styles.tableRow}>
                      {/* Set Number */}
                      <View style={[styles.tableCell, { flex: 0.15 }]}>
                        <View style={[styles.setNumberBadge, isCompleted && styles.setNumberBadgeCompleted]}>
                          <Text style={[styles.setNumberText, isCompleted && styles.setNumberTextCompleted]}>{setNum}</Text>
                        </View>
                      </View>

                      {/* Weight */}
                      <View style={[styles.tableCell, { flex: 0.2 }]}>
                        {isCompleted ? (
                          <Text style={styles.completedValue}>100</Text>
                        ) : (
                          <TextInput 
                            style={styles.tableInput} 
                            placeholder="—" 
                            placeholderTextColor={colors.textSecondary}
                            defaultValue="100"
                          />
                        )}
                      </View>

                      {/* Reps */}
                      <View style={[styles.tableCell, { flex: 0.2 }]}>
                        {isCompleted ? (
                          <Text style={styles.completedValue}>10</Text>
                        ) : (
                          <TextInput 
                            style={styles.tableInput} 
                            placeholder="—" 
                            placeholderTextColor={colors.textSecondary}
                            defaultValue="10"
                          />
                        )}
                      </View>

                      {/* RPE */}
                      <View style={[styles.tableCell, { flex: 0.2 }]}>
                        {isCompleted ? (
                          <Text style={styles.completedValue}>8</Text>
                        ) : (
                          <TextInput 
                            style={styles.tableInput} 
                            placeholder="—" 
                            placeholderTextColor={colors.textSecondary}
                          />
                        )}
                      </View>

                      {/* Checkmark/Button */}
                      <View style={[styles.tableCell, { flex: 0.25, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }]}>
                        {isCompleted ? (
                          <TouchableOpacity onPress={() => toggleSet(setNum)}>
                            <View style={styles.completedCheckmark}>
                              <Icon name="check-circle" size={24} color={colors.success} />
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity style={styles.completeButton} onPress={() => toggleSet(setNum)}>
                            <Icon name="check" size={20} color={colors.white} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    
                    {!isCompleted && (
                      <View style={styles.restTimeRow}>
                        <Text style={styles.restTimeText}>1:30</Text>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Add Set Button */}
              <TouchableOpacity style={styles.addSetButton}>
                <Icon name="plus" size={20} color={colors.primary} />
                <Text style={styles.addSetButtonText}>Add Set (1:30)</Text>
              </TouchableOpacity>

              {/* Finish Workout Button - TARGET */}
              <View style={styles.exerciseCompleteActions}>
                <TouchableOpacity style={styles.addExerciseButton}>
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.addExerciseButtonGradient}
                  >
                    <Icon name="plus-circle" size={20} color={colors.white} style={{ marginRight: 8 }} />
                    <Text style={styles.addExerciseButtonText}>Add Exercise</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TutorialWrapper tutorialId="finish-workout-button">
                  <TouchableOpacity style={styles.finishWorkoutButton}>
                    <LinearGradient
                      colors={[colors.success, '#2BAE4A']}
                      style={styles.finishWorkoutButtonGradient}
                    >
                      <Icon name="check-circle" size={20} color={colors.white} style={{ marginRight: 8 }} />
                      <Text style={styles.finishWorkoutButtonText}>Finish Workout</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </TutorialWrapper>
              </View>
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000000' 
  },
  backgroundGradient: { 
    flex: 1 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    flex: 1,
  },
  finishCheckbox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLeftSection: { 
    flex: 1 
  },
  progressRightSection: { 
    alignItems: 'flex-end' 
  },
  progressText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: colors.primary 
  },
  progressDetails: { 
    fontSize: 14, 
    color: colors.textSecondary 
  },
  fireIcon: { 
    marginBottom: 4 
  },
  caloriesText: { 
    fontSize: 14, 
    color: colors.textSecondary 
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  scrollView: { 
    flex: 1 
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 140,
  },
  exerciseCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseOrderContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    overflow: 'hidden',
  },
  exerciseOrderGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseOrder: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '700',
  },
  exerciseName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.white,
  },
  setProgress: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  tableSection: {
    marginBottom: 20,
  },
  tableCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  tableHeaderText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 8,
  },
  tableCell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumberBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  setNumberBadgeCompleted: {
    backgroundColor: colors.primary,
  },
  setNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  setNumberTextCompleted: {
    color: colors.white,
  },
  tableInput: {
    width: 50,
    height: 36,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
    textAlign: 'center',
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  completedValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  completeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  completedCheckmark: {
    marginRight: 6,
  },
  restTimeRow: {
    alignItems: 'center',
    marginBottom: 12,
    marginTop: -4,
  },
  restTimeText: {
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 20,
  },
  addSetButtonText: {
    color: colors.primary,
    fontWeight: '600',
    marginLeft: 8,
  },
  exerciseCompleteActions: {
    marginTop: 8,
    gap: 12,
  },
  addExerciseButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addExerciseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  addExerciseButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  finishWorkoutButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  finishWorkoutButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  finishWorkoutButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
});
