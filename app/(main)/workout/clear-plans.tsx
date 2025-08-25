import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { WorkoutService } from '../../../src/services/workout/WorkoutService';
import { LinearGradient } from 'expo-linear-gradient';
import { mockWorkoutPlansStore } from '../../../src/mock-data';

// Modern Dark Design System
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  background: '#121212',
  surface: '#1C1C1E',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
};

export default function ClearPlansScreen() {
  const [isClearing, setIsClearing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleClearPlans = async () => {
    Alert.alert(
      'Clear All Workout Plans',
      'Are you sure you want to delete all workout plans? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete All', 
          style: 'destructive', 
          onPress: async () => {
            setIsClearing(true);
            try {
              // Clear all workout plans
              const result = await WorkoutService.clearAllWorkoutPlans();
              
              // Force reload of the mock store to ensure it's empty
              mockWorkoutPlansStore.plans = [];
              
              setIsClearing(false);
              setIsComplete(true);
              
              if (result) {
                Alert.alert(
                  'Success', 
                  'All workout plans have been deleted.',
                  [
                    { 
                      text: 'OK', 
                      onPress: () => {
                        // Navigate back to the plans screen with a refresh param to force reload
                        router.replace({
                          pathname: '/(main)/workout/plans',
                          params: { refresh: Date.now().toString() }
                        });
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('Error', 'Failed to delete workout plans.');
              }
            } catch (error) {
              console.error('Error clearing plans:', error);
              setIsClearing(false);
              Alert.alert('Error', 'An unexpected error occurred.');
            }
          }
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.content}>
        <Text style={styles.title}>Clear Workout Plans</Text>
        <Text style={styles.description}>
          This will delete all workout plans from the app. This action cannot be undone.
        </Text>
        
        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={handleClearPlans}
          disabled={isClearing}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.button}
          >
            <Text style={styles.buttonText}>
              {isClearing ? 'Deleting...' : 'Delete All Workout Plans'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
        
        {isComplete && (
          <Text style={styles.completeText}>
            All workout plans have been deleted.
          </Text>
        )}
        
        <Button
          mode="text"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          Go Back
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  button: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  completeText: {
    color: colors.primary,
    fontSize: 16,
    marginBottom: 24,
  },
  backButton: {
    marginTop: 16,
  },
}); 