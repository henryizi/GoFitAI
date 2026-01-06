import React, { useEffect } from 'react';
import { View, StyleSheet, BackHandler } from 'react-native';
import { useTutorial } from '../src/contexts/TutorialContext';
import { MockDashboard } from '../src/components/tutorial/mock-screens/MockDashboard';
import { MockNutrition } from '../src/components/tutorial/mock-screens/MockNutrition';
import { MockLogFood } from '../src/components/tutorial/mock-screens/MockLogFood';
import { MockProgress } from '../src/components/tutorial/mock-screens/MockProgress';
import { MockWorkout } from '../src/components/tutorial/mock-screens/MockWorkout';
import { MockWorkoutPlanCreate } from '../src/components/tutorial/mock-screens/MockWorkoutPlanCreate';
import { MockQuickWorkout } from '../src/components/tutorial/mock-screens/MockQuickWorkout';
import { MockProgressionInsights } from '../src/components/tutorial/mock-screens/MockProgressionInsights';
import { colors } from '../src/styles/colors';
import { useRouter } from 'expo-router';

export default function WalkthroughScreen() {
  const { state } = useTutorial();
  const router = useRouter();

  // Prevent back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      return true; // Disable back button
    });
    return () => backHandler.remove();
  }, []);

  // Redirect if tutorial is not active
  useEffect(() => {
    if (!state.isActive) {
        // router.replace('/(main)/dashboard'); // Or navigate back
    }
  }, [state.isActive]);

  const renderScreen = () => {
    const mockScreen = state.currentStep?.mockScreen;

    switch (mockScreen) {
      case 'dashboard':
        return <MockDashboard />;
      case 'nutrition':
        return <MockNutrition />;
      case 'workout':
        return <MockWorkout />;
      case 'workout_plan_create':
        return <MockWorkoutPlanCreate />;
      case 'quick_workout':
        return <MockQuickWorkout />;
      case 'progression_insights':
        return <MockProgressionInsights />;
      case 'log_food':
        return <MockLogFood />;
      case 'progress':
        return <MockProgress />;
      default:
        return <MockDashboard />;
    }
  };

  return (
    <View style={styles.container}>
      {renderScreen()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});

