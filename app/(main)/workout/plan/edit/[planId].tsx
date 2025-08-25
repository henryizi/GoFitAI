import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Appbar, Card, IconButton, ActivityIndicator, HelperText, Paragraph } from 'react-native-paper';
import { useLocalSearchParams, router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { WorkoutService } from '../../../../../src/services/workout/WorkoutService';
import { Database } from '../../../../../src/types/database';
import { colors } from '../../../../../src/styles/colors';

type WorkoutPlan = Database['public']['Tables']['workout_plans']['Row'];
type TrainingLevel = 'beginner' | 'intermediate' | 'advanced';
type WorkoutSession = Database['public']['Tables']['workout_sessions']['Row'] & {
  training_splits: Database['public']['Tables']['training_splits']['Row'] | null;
};

export default function EditPlanScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Editable fields
  const [name, setName] = useState('');
  const [trainingLevel, setTrainingLevel] = useState<TrainingLevel>('beginner');
  const [fatLossGoal, setFatLossGoal] = useState('');
  const [muscleGainGoal, setMuscleGainGoal] = useState('');

  useEffect(() => {
    const loadPlan = async () => {
      if (!planId) return;
      setIsLoading(true);
      try {
        const planData = await WorkoutService.getPlanById(planId);
        setPlan(planData);
        
        // Populate state from fetched data
        if (planData) {
          setName(planData.name || '');
          setTrainingLevel(planData.training_level as TrainingLevel);
          setFatLossGoal(String(planData.goal_fat_loss || ''));
          setMuscleGainGoal(String(planData.goal_muscle_gain || ''));
          const sessionData = await WorkoutService.getSessionsForPlan(planData.id);
          setSessions(sessionData);
        }
      } catch (error) {
        console.error("Failed to load plan details:", error);
        Alert.alert("Error", "Could not load plan details.");
      } finally {
        setIsLoading(false);
      }
    };
    loadPlan();
  }, [planId]);

  const handleSaveChanges = async () => {
    if (!planId || !name.trim()) {
      Alert.alert("Invalid Input", "Plan name cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      const updatedPlan = await WorkoutService.updatePlanDetails(planId, { name });
      if (updatedPlan) {
        Toast.show({
          type: 'success',
          text1: 'Plan Updated',
          text2: 'Your changes have been saved successfully.',
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
      console.error("Failed to save plan changes:", error);
      Toast.show({
        type: 'error',
        text1: 'An Error Occurred',
        text2: 'An unexpected error occurred while saving.',
      });
    } finally {
      setIsSaving(false);
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
        <Appbar.Content title="Edit Plan" />
      </Appbar.Header>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.nameContainer}>
          <TextInput
            label="Plan Name"
            value={name}
            onChangeText={setName}
            style={styles.nameInput}
            right={<TextInput.Icon icon="pencil" />}
          />
        </View>
        
        <Text variant="titleLarge" style={styles.sectionTitle}>Plan Details</Text>
        <Card style={styles.detailsCard}>
          <Card.Content>
            <Paragraph>Training Level: {plan?.training_level}</Paragraph>
            <Paragraph>Fat Loss Goal: {plan?.goal_fat_loss}/5</Paragraph>
            <Paragraph>Muscle Gain Goal: {plan?.goal_muscle_gain}/5</Paragraph>
          </Card.Content>
        </Card>
        
        <Text variant="titleLarge" style={styles.sectionTitle}>Workout Sessions</Text>
        {sessions.map((session) => (
          <Card key={session.id} style={styles.sessionCard}>
            <Card.Content>
              <View style={styles.sessionHeader}>
                <Text style={styles.sessionTitle}>{session.training_splits?.name || 'Workout Day'}</Text>
                <IconButton
                  icon="pencil"
                  size={20}
                  onPress={() => router.push({
                    pathname: `/(main)/workout/session/edit/${session.id}`,
                    params: { sessionTitle: session.training_splits?.name || 'Edit Session' }
                  })}
                />
              </View>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <Button 
          mode="contained" 
          onPress={handleSaveChanges} 
          style={styles.saveButton}
          loading={isSaving}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 16,
    paddingBottom: 100, // Add padding to the bottom
  },
  nameContainer: {
    marginBottom: 24,
  },
  nameInput: {
    fontSize: 24, // Larger font size for the name
  },
  sectionTitle: {
    marginBottom: 12,
    marginTop: 16,
    color: colors.text,
  },
  detailsCard: {
    marginBottom: 24,
  },
  input: {
    marginBottom: 4, // Reduced margin to accommodate helper text
  },
  sessionCard: {
    marginBottom: 12,
    backgroundColor: colors.surface,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text
  },
  footer: {
    padding: 16,
    backgroundColor: colors.background,
  },
  saveButton: {
    paddingVertical: 8,
  }
}); 