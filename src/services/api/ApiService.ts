import { environment } from '../../config/environment';

// API timeout configuration
const DEFAULT_TIMEOUT = 240000; // 4 minutes for AI processing
const CHAT_TIMEOUT = 60000; // 1 minute for chat

// Error types
export interface ApiError {
  success: false;
  error: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Food analysis types
export interface FoodAnalysisRequest {
  foodImage: File | Blob;
  foodDescription?: string;
}

export interface FoodAnalysisResponse {
  success: true;
  data: {
    foodName: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    confidence: 'high' | 'medium' | 'low';
    assumptions?: string;
  };
  message: string;
}

// Workout plan types
export interface WorkoutPlanRequest {
  userId: string;
  preferences: {
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
    goals: string[];
    availableTime: number;
    equipment: string[];
  };
}

export interface WorkoutPlanResponse {
  success: true;
  workoutPlan: {
    weekly_schedule: Array<{
      day: string;
      focus: string;
      exercises: Array<{
        name: string;
        sets: number;
        reps: string;
        restBetweenSets: string;
      }>;
    }>;
  };
}

// Chat types
export interface ChatRequest {
  planId: string;
  message: string;
  currentPlan: {
    id: string;
    [key: string]: any;
  };
}

export interface ChatResponse {
  success: true;
  message: string;
  newPlan?: {
    id: string;
    modified_from_original: boolean;
    modified_at: string;
  };
}

class ApiService {
  private baseUrl: string;
  private timeout: number;

  constructor() {
    this.baseUrl = environment.apiUrl;
    this.timeout = DEFAULT_TIMEOUT;
  }

  private async fetchWithTimeout(
    endpoint: string,
    options: RequestInit = {},
    customTimeout?: number
  ): Promise<Response> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = customTimeout || this.timeout;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeout / 1000} seconds`);
      }
      throw error;
    }
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }
      
      console.error(`[API] Error ${response.status}:`, errorData);
      return {
        success: false,
        error: errorData.error || errorData.message || `HTTP ${response.status}`,
        details: errorData,
      };
    }

    try {
      const data = await response.json();
      return {
        success: true,
        data,
        message: data.message,
      };
    } catch (error) {
      console.error('[API] Failed to parse JSON response:', error);
      return {
        success: false,
        error: 'Invalid response format',
      };
    }
  }

  // Food Analysis
  async analyzeFood(request: FoodAnalysisRequest): Promise<ApiResponse<FoodAnalysisResponse['data']>> {
    try {
      console.log('[API] Analyzing food...');
      
      const formData = new FormData();
      formData.append('foodImage', request.foodImage);
      if (request.foodDescription) {
        formData.append('foodDescription', request.foodDescription);
      }

      const response = await this.fetchWithTimeout('/api/analyze-food', {
        method: 'POST',
        body: formData,
      });

      return this.handleResponse<FoodAnalysisResponse['data']>(response);
    } catch (error: any) {
      console.error('[API] Food analysis error:', error);
      return {
        success: false,
        error: error.message || 'Food analysis failed',
      };
    }
  }

  // Workout Plan Generation
  async generateWorkoutPlan(request: WorkoutPlanRequest): Promise<ApiResponse<WorkoutPlanResponse['workoutPlan']>> {
    try {
      console.log('[API] Generating workout plan...');
      
      const response = await this.fetchWithTimeout('/api/generate-workout-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      return this.handleResponse<WorkoutPlanResponse['workoutPlan']>(response);
    } catch (error: any) {
      console.error('[API] Workout plan generation error:', error);
      return {
        success: false,
        error: error.message || 'Workout plan generation failed',
      };
    }
  }

  // AI Chat
  async sendChatMessage(request: ChatRequest): Promise<ApiResponse<ChatResponse>> {
    try {
      console.log('[API] Sending chat message...');
      
      const response = await this.fetchWithTimeout('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      }, CHAT_TIMEOUT);

      return this.handleResponse<ChatResponse>(response);
    } catch (error: any) {
      console.error('[API] Chat error:', error);
      return {
        success: false,
        error: error.message || 'Chat failed',
      };
    }
  }

  // Health Check
  async healthCheck(): Promise<ApiResponse<any>> {
    try {
      console.log('[API] Checking server health...');
      
      const response = await this.fetchWithTimeout('/api/health', {
        method: 'GET',
      }, 10000); // 10 second timeout for health check

      return this.handleResponse(response);
    } catch (error: any) {
      console.error('[API] Health check error:', error);
      return {
        success: false,
        error: error.message || 'Health check failed',
      };
    }
  }

  // Test Connection
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.healthCheck();
      return result.success;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;

