import { useState, useCallback } from 'react';
import { apiService, ApiResponse } from '../api';

// Hook for food analysis
export const useFoodAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeFood = useCallback(async (foodImage: File | Blob, foodDescription?: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.analyzeFood({ foodImage, foodDescription });
      
      if (!result.success) {
        setError(result.error || 'Food analysis failed');
        return null;
      }

      return result.data;
    } catch (err: any) {
      setError(err.message || 'Food analysis failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    analyzeFood,
    loading,
    error,
  };
};

// Hook for workout plan generation
export const useWorkoutPlanGeneration = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateWorkoutPlan = useCallback(async (
    userId: string,
    preferences: {
      fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
      goals: string[];
      availableTime: number;
      equipment: string[];
    }
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.generateWorkoutPlan({ userId, preferences });
      
      if (!result.success) {
        setError(result.error || 'Workout plan generation failed');
        return null;
      }

      return result.data;
    } catch (err: any) {
      setError(err.message || 'Workout plan generation failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    generateWorkoutPlan,
    loading,
    error,
  };
};

// Hook for AI chat
export const useAIChat = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (
    planId: string,
    message: string,
    currentPlan: { id: string; [key: string]: any }
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.sendChatMessage({ planId, message, currentPlan });
      
      if (!result.success) {
        setError(result.error || 'Chat failed');
        return null;
      }

      return result.data;
    } catch (err: any) {
      setError(err.message || 'Chat failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    sendMessage,
    loading,
    error,
  };
};

// Hook for server health check
export const useServerHealth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiService.healthCheck();
      
      if (!result.success) {
        setError(result.error || 'Health check failed');
        setIsHealthy(false);
        return false;
      }

      setIsHealthy(true);
      return true;
    } catch (err: any) {
      setError(err.message || 'Health check failed');
      setIsHealthy(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    checkHealth,
    loading,
    error,
    isHealthy,
  };
};

