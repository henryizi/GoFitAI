import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Button, Alert } from 'react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { supabase } from '../../src/services/supabase/client';
import { ProgressService } from '../../src/services/progressService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mockMetricsStore } from '../../src/mock-data';

export default function DebugAuthScreen() {
  const { user, session, profile, isLoading } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [metricsData, setMetricsData] = useState<any[]>([]);

  useEffect(() => {
    loadDebugInfo();
  }, [user]);

  const loadDebugInfo = async () => {
    try {
      // Get current auth state
      const authInfo = {
        hasSupabase: !!supabase,
        isLoading,
        hasUser: !!user,
        hasSession: !!session,
        hasProfile: !!profile,
        userId: user?.id || 'NO_USER_ID',
        userEmail: user?.email || 'NO_EMAIL',
        profileData: profile || 'NO_PROFILE',
        // Environment variable status
        envUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
        envKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'MISSING',
        // Authentication bypass status
        authBypass: !supabase ? 'ACTIVE (USING MOCK DATA)' : 'DISABLED (PROPER AUTH)'
      };

      // Get stored mock data
      await mockMetricsStore.loadFromStorage();
      const mockData = mockMetricsStore.metrics;

      // Try to get user's real metrics
      let realMetrics = [];
      if (user) {
        realMetrics = await ProgressService.getDailyMetrics(user.id);
      }

      setDebugInfo(authInfo);
      setMetricsData({
        mockData,
        realMetrics,
        mockDataCount: mockData.length,
        realMetricsCount: realMetrics.length
      });

    } catch (error) {
      console.error('Debug info error:', error);
      setDebugInfo({ error: error.message });
    }
  };

  const clearMockData = async () => {
    try {
      // Clear all mock data from AsyncStorage
      await AsyncStorage.removeItem('mockMetricsStore');
      await AsyncStorage.removeItem('mockWorkoutPlansStore');
      await AsyncStorage.removeItem('progressCache');
      
      // Reset in-memory mock data
      mockMetricsStore.metrics = [];
      
      Alert.alert('Success', 'All mock data cleared! Please restart the app to see your real data.');
      loadDebugInfo();
    } catch (error) {
      Alert.alert('Error', 'Failed to clear mock data');
      console.error('Clear mock data error:', error);
    }
  };

  const checkDatabaseConnection = async () => {
    try {
      if (!supabase) {
        Alert.alert('Error', 'Supabase not initialized');
        return;
      }

      console.log('Testing Supabase connection...');
      
      // Test 1: Basic connection
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (profileError) {
        console.error('Profile query error:', profileError);
        Alert.alert('Database Error - Profiles', `Cannot connect: ${profileError.message}`);
        return;
      }

      // Test 2: Check daily_user_metrics table
      const { data: metrics, error: metricsError } = await supabase
        .from('daily_user_metrics')
        .select('*')
        .limit(5);

      if (metricsError) {
        console.error('Metrics query error:', metricsError);
        Alert.alert('Database Error - Metrics', `Metrics table issue: ${metricsError.message}`);
        return;
      }

      // Test 3: Check current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        Alert.alert('Auth Error', `Cannot get user: ${userError.message}`);
        return;
      }

      const summary = `✅ Database Connected Successfully!
      
Profiles: ${profiles?.length || 0} found
Metrics: ${metrics?.length || 0} found  
Current User: ${user?.id || 'None'}
Supabase URL: ${process.env.EXPO_PUBLIC_SUPABASE_URL?.substring(0, 30)}...`;

      Alert.alert('Connection Test Results', summary);
      
    } catch (error) {
      console.error('Database test failed:', error);
      Alert.alert('Error', `Database test failed: ${error.message}`);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🔍 Authentication Debug</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Auth State</Text>
        <Text style={styles.info}>Loading: {debugInfo.isLoading ? 'Yes' : 'No'}</Text>
        <Text style={styles.info}>Supabase: {debugInfo.hasSupabase ? 'Connected' : 'Missing'}</Text>
        <Text style={styles.info}>User: {debugInfo.hasUser ? 'Logged In' : 'Not Logged In'}</Text>
        <Text style={styles.info}>Session: {debugInfo.hasSession ? 'Active' : 'None'}</Text>
        <Text style={styles.info}>Profile: {debugInfo.hasProfile ? 'Loaded' : 'Missing'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Environment & Authentication</Text>
        <Text style={styles.info}>Supabase URL: {debugInfo.envUrl}</Text>
        <Text style={styles.info}>Supabase Key: {debugInfo.envKey}</Text>
        <Text style={[styles.info, { color: debugInfo.authBypass?.includes('ACTIVE') ? 'red' : 'green' }]}>
          Auth Status: {debugInfo.authBypass}
        </Text>
        {debugInfo.authBypass?.includes('ACTIVE') && (
          <Text style={[styles.info, { color: 'red', fontWeight: 'bold' }]}>
            ⚠️ You are using MOCK DATA, not your real data!
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Details</Text>
        <Text style={styles.info}>User ID: {debugInfo.userId}</Text>
        <Text style={styles.info}>Email: {debugInfo.userEmail}</Text>
        <Text style={styles.code}>{JSON.stringify(debugInfo.profileData, null, 2)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Metrics Data</Text>
        <Text style={styles.info}>Mock Data Count: {metricsData.mockDataCount || 0}</Text>
        <Text style={styles.info}>Real Metrics Count: {metricsData.realMetricsCount || 0}</Text>
        
        <Text style={styles.subtitle}>Mock Data Preview:</Text>
        <Text style={styles.code}>
          {JSON.stringify(metricsData.mockData?.slice(0, 2), null, 2)}
        </Text>
        
        <Text style={styles.subtitle}>Real Metrics Preview:</Text>
        <Text style={styles.code}>
          {JSON.stringify(metricsData.realMetrics?.slice(0, 2), null, 2)}
        </Text>
      </View>

      <View style={styles.buttons}>
        <Button title="Refresh Debug Info" onPress={loadDebugInfo} />
        <Button title="Test Database Connection" onPress={checkDatabaseConnection} />
        <Button title="Clear Mock Data" onPress={clearMockData} color="red" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    color: '#666',
  },
  info: {
    fontSize: 14,
    marginBottom: 5,
    color: '#555',
  },
  code: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#f0f0f0',
    padding: 10,
    marginTop: 5,
    borderRadius: 4,
  },
  buttons: {
    gap: 10,
    marginTop: 20,
  },
});
