import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { useFoodAnalysis, useWorkoutPlanGeneration, useAIChat, useServerHealth } from '../hooks/useApi';

export default function ApiTestScreen() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const { analyzeFood, loading: foodLoading, error: foodError } = useFoodAnalysis();
  const { generateWorkoutPlan, loading: workoutLoading, error: workoutError } = useWorkoutPlanGeneration();
  const { sendMessage, loading: chatLoading, error: chatError } = useAIChat();
  const { checkHealth, loading: healthLoading, error: healthError, isHealthy } = useServerHealth();

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testServerHealth = async () => {
    addResult('Testing server health...');
    const isHealthy = await checkHealth();
    if (isHealthy) {
      addResult('✅ Server is healthy and connected');
    } else {
      addResult('❌ Server health check failed');
    }
  };

  const testFoodAnalysis = async () => {
    addResult('Testing food analysis...');
    
    // Create a mock image file for testing
    const mockImage = new Blob(['mock image data'], { type: 'image/jpeg' });
    
    try {
      const result = await analyzeFood(mockImage, 'Apple');
      if (result) {
        addResult(`✅ Food analysis successful: ${result.foodName} - ${result.calories} calories`);
      } else {
        addResult('❌ Food analysis failed');
      }
    } catch (error) {
      addResult(`❌ Food analysis error: ${error}`);
    }
  };

  const testWorkoutGeneration = async () => {
    addResult('Testing workout plan generation...');
    
    try {
      const result = await generateWorkoutPlan('test-user', {
        fitnessLevel: 'beginner',
        goals: ['weight_loss'],
        availableTime: 30,
        equipment: ['none']
      });
      
      if (result) {
        addResult(`✅ Workout plan generated with ${result.weekly_schedule?.length || 0} days`);
      } else {
        addResult('❌ Workout plan generation failed');
      }
    } catch (error) {
      addResult(`❌ Workout generation error: ${error}`);
    }
  };

  const testAIChat = async () => {
    addResult('Testing AI chat...');
    
    try {
      const result = await sendMessage('test-plan', 'Hello AI!', { id: 'test-plan' });
      if (result) {
        addResult('✅ AI chat successful');
      } else {
        addResult('❌ AI chat failed');
      }
    } catch (error) {
      addResult(`❌ AI chat error: ${error}`);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    addResult('🚀 Starting API integration tests...');
    
    await testServerHealth();
    await testFoodAnalysis();
    await testWorkoutGeneration();
    await testAIChat();
    
    addResult('🏁 All tests completed!');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>API Integration Test</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={runAllTests}>
          <Text style={styles.buttonText}>Run All Tests</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testServerHealth}>
          <Text style={styles.buttonText}>Test Health</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testFoodAnalysis}>
          <Text style={styles.buttonText}>Test Food Analysis</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testWorkoutGeneration}>
          <Text style={styles.buttonText}>Test Workout</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testAIChat}>
          <Text style={styles.buttonText}>Test Chat</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearResults}>
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statusContainer}>
        <Text style={styles.statusTitle}>Status:</Text>
        <Text style={[styles.statusText, isHealthy ? styles.success : styles.error]}>
          Server: {isHealthy === null ? 'Unknown' : isHealthy ? 'Healthy' : 'Unhealthy'}
        </Text>
        <Text style={styles.statusText}>
          Food Analysis: {foodLoading ? 'Loading...' : foodError ? 'Error' : 'Ready'}
        </Text>
        <Text style={styles.statusText}>
          Workout: {workoutLoading ? 'Loading...' : workoutError ? 'Error' : 'Ready'}
        </Text>
        <Text style={styles.statusText}>
          Chat: {chatLoading ? 'Loading...' : chatError ? 'Error' : 'Ready'}
        </Text>
      </View>

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
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
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  success: {
    color: '#34C759',
  },
  error: {
    color: '#FF3B30',
  },
  resultsContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    minHeight: 200,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultText: {
    fontSize: 12,
    marginBottom: 5,
    color: '#666',
    fontFamily: 'monospace',
  },
});

