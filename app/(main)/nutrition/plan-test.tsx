import { router } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Surface, Appbar, ActivityIndicator } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../../src/hooks/useAuth';
import { NutritionService } from '../../../src/services/nutrition/NutritionService';
import { colors } from '../../../src/styles/colors';
import { theme } from '../../../src/styles/theme';

const PlanTestScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<'untested' | 'connected' | 'disconnected'>('untested');
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [message, ...prev]);
  };

  const testApiConnection = async () => {
    setIsLoading(true);
    addResult('Testing API connection...');
    try {
      const isConnected = await NutritionService.testConnection();
      if (isConnected) {
        addResult('✅ API connection successful');
        setApiStatus('connected');
      } else {
        addResult('❌ API connection failed');
        setApiStatus('disconnected');
      }
    } catch (error) {
      addResult(`❌ Error testing API: ${error instanceof Error ? error.message : String(error)}`);
      setApiStatus('disconnected');
    }
    setIsLoading(false);
  };

  const createSimplePlan = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to test');
      return;
    }
    
    setIsLoading(true);
    addResult('Creating test nutrition plan...');
    
    try {
      const plan = await NutritionService.generateNutritionPlan(user.id, {
        goal: 'fat_loss',
        dietaryPreferences: ['vegetarian'],
        intolerances: []
      });
      
      if (plan && plan.id) {
        addResult(`✅ Plan created successfully with ID: ${plan.id}`);
        Alert.alert(
          'Success!',
          `Plan created with ID: ${plan.id}`,
          [
            { text: 'View Plan', onPress: () => router.push(`/(main)/nutrition/plan?planId=${plan.id}`) },
            { text: 'OK', style: 'cancel' }
          ]
        );
      } else {
        addResult('❌ Plan creation returned invalid data');
      }
    } catch (error) {
      addResult(`❌ Error creating plan: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    setIsLoading(false);
  };

  const checkNetworkStatus = async () => {
    setIsLoading(true);
    addResult('Checking network status...');
    
    try {
      // Check if we're online
      const netInfo = { isConnected: true }; // Replace with actual NetInfo if available
      
      addResult(`Network connected: ${netInfo.isConnected ? 'Yes' : 'No'}`);
      
      // Try to fetch a public URL as a control test
      try {
        addResult('Testing public internet connection...');
        const publicResponse = await fetch('https://www.google.com');
        addResult(`Public internet: ${publicResponse.status === 200 ? 'Connected' : 'Error'}`);
      } catch (error) {
        addResult(`Public internet error: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Try with explicit timeout
      try {
        addResult('Testing API with timeout...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const apiResponse = await fetch('http://192.168.0.114:4000/api/test', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        const text = await apiResponse.text();
        addResult(`API response: ${text}`);
      } catch (error) {
        if (error.name === 'AbortError') {
          addResult('❌ API request timed out after 5 seconds');
        } else {
          addResult(`❌ API error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    } catch (error) {
      addResult(`Network check error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    setIsLoading(false);
  };

  // Run connection test on mount
  useEffect(() => {
    testApiConnection();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      
      <Appbar.Header style={styles.header}>
        <Appbar.BackAction onPress={() => router.push('/(main)/nutrition')} />
        <Appbar.Content title="Nutrition Plan Test" />
      </Appbar.Header>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Surface style={styles.card} elevation={2}>
          <Text style={styles.title}>API Connection Test</Text>
          <Text style={styles.subtitle}>Current Status:</Text>
          
          <View style={styles.statusContainer}>
            {apiStatus === 'untested' && <Text>Not yet tested</Text>}
            {apiStatus === 'connected' && (
              <Text style={styles.successText}>✅ Connected to API</Text>
            )}
            {apiStatus === 'disconnected' && (
              <Text style={styles.errorText}>❌ Disconnected from API</Text>
            )}
          </View>
          
          <Button 
            mode="contained"
            onPress={testApiConnection}
            disabled={isLoading}
          >
            Test Connection
          </Button>
          
          <View style={{ marginTop: 10 }}>
            <Button 
              mode="outlined"
              onPress={async () => {
                setIsLoading(true);
                addResult('Directly testing API endpoint...');
                try {
                  const response = await fetch('http://192.168.0.114:4000/api/test');
                  const text = await response.text();
                  addResult(`Direct test response: ${text}`);
                } catch (error) {
                  addResult(`Direct test error: ${error instanceof Error ? error.message : String(error)}`);
                }
                setIsLoading(false);
              }}
              disabled={isLoading}
            >
              Direct API Test
            </Button>
          </View>
          
          <View style={{ marginTop: 10 }}>
            <Button 
              mode="outlined"
              onPress={checkNetworkStatus}
              disabled={isLoading}
            >
              Check Network Status
            </Button>
          </View>
          
          <View style={{ marginTop: 10 }}>
            <Button 
              mode="outlined"
              onPress={async () => {
                setIsLoading(true);
                addResult('Testing simple server on port 5000...');
                try {
                  const response = await fetch('http://192.168.0.114:5000/');
                  const data = await response.json() as { status?: string };
                  addResult(`Test server response: ${JSON.stringify(data)}`);
                  if (data.status === 'ok') {
                    addResult('✅ Test server connection successful!');
                  }
                } catch (error) {
                  addResult(`❌ Test server error: ${error instanceof Error ? error.message : String(error)}`);
                }
                setIsLoading(false);
              }}
              disabled={isLoading}
            >
              Test Simple Server
            </Button>
          </View>
        </Surface>
        
        <Surface style={styles.card} elevation={2}>
          <Text style={styles.title}>Create Test Plan</Text>
          <Text style={styles.subtitle}>Creates a simple fat loss plan</Text>
          
          <Button
            mode="contained"
            onPress={createSimplePlan}
            disabled={isLoading || apiStatus !== 'connected'}
            style={styles.button}
          >
            Create Test Plan
          </Button>
        </Surface>
        
        <Surface style={styles.card} elevation={2}>
          <Text style={styles.title}>Results Log</Text>
          
          {isLoading && (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="small" />
              <Text style={styles.loaderText}>Processing request...</Text>
            </View>
          )}
          
          <View style={styles.logContainer}>
            {results.length > 0 ? (
              results.map((result, index) => (
                <Text key={index} style={styles.logItem}>{result}</Text>
              ))
            ) : (
              <Text style={styles.placeholderText}>No results yet</Text>
            )}
          </View>
        </Surface>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.surface,
    elevation: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
  },
  card: {
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontFamily: 'Montserrat',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontFamily: 'Poppins',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.15,
    color: colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  button: {
    marginTop: theme.spacing.md,
  },
  successText: {
    color: colors.success,
    fontWeight: '600',
  },
  errorText: {
    color: colors.error,
    fontWeight: '600',
  },
  logContainer: {
    marginTop: theme.spacing.md,
  },
  logItem: {
    padding: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    fontSize: 14,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    padding: theme.spacing.md,
  },
  loaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  loaderText: {
    marginLeft: theme.spacing.sm,
    color: colors.textSecondary,
  },
});

export default PlanTestScreen; 