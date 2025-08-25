import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator, Card, Appbar } from 'react-native-paper';
import { useAuth } from '../../../src/hooks/useAuth';
import { supabase } from '../../../src/services/supabase/client';
import { WorkoutService } from '../../../src/services/workout/WorkoutService';
import { Database } from '../../../src/types/database';
import { colors } from '../../../src/styles/colors';
import { router, useFocusEffect } from 'expo-router';
import { track as analyticsTrack } from '../../../src/services/analytics/analytics';

export type WorkoutSession = Database['public']['Tables']['workout_sessions']['Row'];

// Utility function to check if a string is a valid UUID
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export default function StartTrainingScreen() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchSessions = async () => {
      setLoading(true);
      if (!supabase) {
        setSessions([]);
        setLoading(false);
        return;
      }
      
      try {
      const activePlan = await WorkoutService.getActivePlan(user.id);
        
        if (!activePlan || !activePlan.id) {
          console.warn(`[StartTraining] No active plan found or missing ID`);
          setSessions([]);
          setLoading(false);
          return;
        }
        
        if (!isValidUUID(activePlan.id)) {
          console.warn(`[StartTraining] Invalid UUID format for plan ID: ${activePlan.id}, skipping database query`);
        setSessions([]);
        setLoading(false);
        return;
      }
        
      const { data, error } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('plan_id', activePlan.id)
        .eq('status', 'pending')
        .order('day_number');
          
        if (error) {
          console.error('[StartTraining] Error fetching sessions:', error);
        } else if (data) {
          setSessions(data as WorkoutSession[]);
        }
      } catch (error) {
        console.error('[StartTraining] Exception in fetchSessions:', error);
      } finally {
      setLoading(false);
      }
    };
    fetchSessions();
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      router.setParams?.({});
      return () => {};
    }, [])
  );

  useEffect(() => {
    analyticsTrack('screen_view', { screen: 'start_training' });
  }, []);

  React.useLayoutEffect(() => {
    // If screen is in a stack with Paper Appbar, add an action
  }, []);

  const renderItem = ({ item }: { item: WorkoutSession }) => (
    <TouchableOpacity onPress={() => router.push(`/(main)/workout/session/${item.id}`)}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Week {item.week_number} - Day {item.day_number}</Text>
          <Text style={styles.cardSubtitle}>{item.status === 'pending' ? 'Ready to start' : item.status}</Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator animating={true} color={colors.primary} />
      </View>
    );
  }

  if (sessions.length === 0) {
    return (
      <View style={styles.centered}>
        <Text>No pending sessions found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16 },
  card: { marginBottom: 12 },
  cardTitle: { fontWeight: 'bold' },
  cardSubtitle: { opacity: 0.7 },
}); 