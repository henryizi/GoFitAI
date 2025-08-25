import React, { useCallback, useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useAuth } from '../../../src/hooks/useAuth';
import { WorkoutHistoryService } from '../../../src/services/workout/WorkoutHistoryService';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { supabase } from '../../../src/services/supabase/client';

// Colors to match the app theme
const colors = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  background: '#121212',
  surface: '#1C1C1E',
  surfaceLight: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: 'rgba(235, 235, 245, 0.6)',
  border: 'rgba(84, 84, 88, 0.6)',
  borderLight: 'rgba(84, 84, 88, 0.2)',
};

export default function DebugHistoryScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dbInfo, setDbInfo] = useState<any>({});
  const insets = useSafeAreaInsets();

  const loadDebugInfo = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // Get completed sessions
      const sessions = await WorkoutHistoryService.getCompletedSessions(user.id);
      
      // Get exercise sets
      let exerciseSets: any[] = [];
      if (sessions.length > 0) {
        const { data: sets } = await supabase
          .from('exercise_sets')
          .select('*')
          .in('session_id', sessions.map(s => s.id));
        exerciseSets = sets || [];
      }
      
      // Get exercise logs
      let exerciseLogs: any[] = [];
      if (exerciseSets.length > 0) {
        const { data: logs } = await supabase
          .from('exercise_logs')
          .select('*')
          .in('set_id', exerciseSets.map(s => s.id));
        exerciseLogs = logs || [];
      }
      
      setDbInfo({
        sessions,
        exerciseSets,
        exerciseLogs
      });
    } catch (error) {
      console.error('Error loading debug info:', error);
      Alert.alert('Error', 'Failed to load debug info');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const createTestData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      // 1. Create a mock workout session
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          plan_id: 'c4d7e9f0-7f8d-4e6b-9e2c-3a1b5c8d7e9f', // Mock plan ID
          user_id: user.id,
          status: 'completed',
          day_number: 1,
          week_number: 1,
          completed_at: new Date().toISOString(),
        })
        .select();
        
      if (sessionError || !sessionData || !sessionData[0]) {
        console.error('Error creating test session:', sessionError);
        Alert.alert('Error', 'Failed to create test session');
        setLoading(false);
        return;
      }
      
      const sessionId = sessionData[0].id;
      
      // 2. Create exercise sets for the session
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('exercises')
        .select('id')
        .limit(3);
        
      if (exerciseError || !exerciseData || exerciseData.length === 0) {
        console.error('Error getting exercises:', exerciseError);
        Alert.alert('Error', 'Failed to get exercises');
        setLoading(false);
        return;
      }
      
      const exerciseIds = exerciseData.map(ex => ex.id);
      
      // 3. Create sets for each exercise
      const sets: Array<{
        session_id: string;
        exercise_id: string;
        order_in_session: number;
        target_sets: number;
        target_reps: string;
        rest_period: string;
        progression_scheme: string;
      }> = [];
      
      for (let i = 0; i < exerciseIds.length; i++) {
        sets.push({
          session_id: sessionId,
          exercise_id: exerciseIds[i],
          order_in_session: i + 1,
          target_sets: 3,
          target_reps: '8-12',
          rest_period: '90s',
          progression_scheme: 'double_progression',
        });
      }
      
      const { data: setsData, error: setsError } = await supabase
        .from('exercise_sets')
        .insert(sets)
        .select();
        
      if (setsError || !setsData) {
        console.error('Error creating exercise sets:', setsError);
        Alert.alert('Error', 'Failed to create exercise sets');
        setLoading(false);
        return;
      }
      
      // 4. Create logs for each set
      const logs: Array<{
        set_id: string;
        actual_reps: number;
        actual_weight: number;
        completed_at: string;
      }> = [];
      
      for (const set of setsData) {
        // Create 3 logs per set (to represent 3 working sets)
        for (let i = 0; i < 3; i++) {
          logs.push({
            set_id: set.id,
            actual_reps: 10,
            actual_weight: 50 + (i * 5), // Increasing weight each set
            completed_at: new Date().toISOString(),
          });
        }
      }
      
      const { data: logsData, error: logsError } = await supabase
        .from('exercise_logs')
        .insert(logs);
        
      if (logsError) {
        console.error('Error creating exercise logs:', logsError);
        Alert.alert('Error', 'Failed to create exercise logs');
        setLoading(false);
        return;
      }
      
      Alert.alert('Success', 'Test workout data created successfully');
      loadDebugInfo();
      
    } catch (error) {
      console.error('Error creating test data:', error);
      Alert.alert('Error', 'Failed to create test data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, loadDebugInfo]);

  useEffect(() => {
    loadDebugInfo();
  }, [loadDebugInfo]);

  const formatCount = (count: number) => {
    return count.toString().padStart(3, '0');
  };

  const renderDebugSection = (title: string, items: any[], keyField: string, extraFields: string[] = []) => {
    if (!items || items.length === 0) {
      return (
        <View style={styles.debugSection}>
          <Text style={styles.sectionTitle}>{title}</Text>
          <Text style={styles.emptyText}>No data found</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.debugSection}>
        <Text style={styles.sectionTitle}>{title} ({items.length})</Text>
        {items.map((item, index) => (
          <View key={`${keyField}-${item[keyField]}`} style={styles.debugItem}>
            <Text style={styles.debugItemTitle}>#{formatCount(index + 1)} - {item[keyField]}</Text>
            {extraFields.map(field => (
              <Text key={field} style={styles.debugItemDetail}>
                {field}: {item[field] || 'N/A'}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#000000', '#121212']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Icon name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Workout Debug</Text>
          <View style={{ width: 40 }} />
        </View>
        
        {/* Debug Info */}
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.buttonContainer}>
            <Button 
              mode="contained" 
              onPress={loadDebugInfo}
              style={styles.button}
              labelStyle={styles.buttonLabel}
              disabled={loading}
            >
              Refresh Data
            </Button>
            <Button 
              mode="contained" 
              onPress={createTestData}
              style={[styles.button, styles.buttonSecondary]}
              labelStyle={styles.buttonLabel}
              disabled={loading}
            >
              Create Test Data
            </Button>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading debug info...</Text>
            </View>
          ) : (
            <>
              {renderDebugSection('Sessions', dbInfo.sessions || [], 'id', ['completed_at', 'status'])}
              {renderDebugSection('Exercise Sets', dbInfo.exerciseSets || [], 'id', ['session_id', 'exercise_id'])}
              {renderDebugSection('Exercise Logs', dbInfo.exerciseLogs || [], 'id', ['set_id', 'actual_reps', 'actual_weight'])}
            </>
          )}
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  buttonContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  button: {
    flex: 1,
    marginRight: 10,
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: '#555',
    marginLeft: 10,
    marginRight: 0,
  },
  buttonLabel: {
    color: colors.text,
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  loadingText: {
    color: colors.text,
    marginTop: 10,
    fontSize: 16,
  },
  debugSection: {
    marginBottom: 24,
    backgroundColor: 'rgba(30, 30, 30, 0.5)',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 12,
  },
  emptyText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  debugItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  debugItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  debugItemDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
}); 