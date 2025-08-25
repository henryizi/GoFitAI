import { supabase } from './supabase/client';
import { NutritionService } from './nutrition/NutritionService'; // Assuming API_URL is exported from here

const API_URL = NutritionService.API_URL;

export class AnalysisService {
  static async startAnalysis(
    userId: string,
    frontPhotoUrl: string,
    backPhotoUrl: string
  ): Promise<any> {
    const response = await fetch(`${API_URL}/api/analyze-body`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, frontPhotoUrl, backPhotoUrl }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to start analysis.');
    }
    return response.json();
  }

  static async getLatestAnalysis(userId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('body_analysis')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching latest analysis:', error);
      throw error;
    }
    return data;
  }

  static async getAnalysisById(analysisId: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('body_analysis')
      .select('*')
      .eq('id', analysisId)
      .single();

    if (error) {
      console.error('Error fetching analysis by ID:', error);
      throw error;
    }
    return data;
  }
} 