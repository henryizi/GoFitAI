import { supabase } from './supabase/client';
import { PhotoStorageService } from './storage/photoStorage';
import { Database } from '../types/database';
import { environment } from '../config/environment';
import { mockMetrics, mockPrediction, mockMetricsStore } from '../mock-data';

// Resolve API base URL at call time (Railway/env only)
const resolveApiBaseUrl = (): string => {
  const candidates = [
    environment.apiUrl,
    'https://gofitai-production.up.railway.app',
  ].filter(Boolean) as string[];
  const chosen = candidates[0];
  if (__DEV__) {
    console.log('[ProgressService] Resolved API base URL:', chosen);
  }
  return chosen;
};

type ProgressEntry = Database['public']['Tables']['progress_entries']['Row'];
type DailyMetric = Database['public']['Tables']['daily_user_metrics']['Row'];

export class ProgressService {
  private static async fetchWithBaseFallback(path: string, init?: RequestInit): Promise<{ base: string; response: Response }> {
    const bases = [
      environment.apiUrl,
      'https://gofitai-production.up.railway.app',
    ].filter(Boolean) as string[];

    let lastError: unknown = null;
    for (const base of bases) {
      const url = `${base}${path.startsWith('/') ? '' : '/'}${path}`;
      try {
        if (__DEV__) console.log('[ProgressService] Trying base:', base, '→', url);
        const response = await fetch(url, init);
        // Consider any network-level success a success path; status handling is done by callers
        return { base, response };
      } catch (err) {
        lastError = err;
        if (__DEV__) console.warn('[ProgressService] Fetch failed on base', base, err);
        continue;
      }
    }
    throw lastError ?? new Error('Network request failed');
  }
  /**
   * Create or update a progress entry for a specific date.
   */
  static async createOrUpdateProgressEntry(
    userId: string,
    date: string,
    weight: number | null,
    frontPhotoUri?: string,
    backPhotoUri?: string
  ): Promise<ProgressEntry | null> {
    try {
      const existingEntry = await this.getProgressEntryForDate(userId, date);

      let frontPhotoId = existingEntry?.front_photo_id;
      if (frontPhotoUri) {
        const result = await PhotoStorageService.uploadPhoto(userId, 'front', frontPhotoUri);
        if (result.success) frontPhotoId = result.photo?.id;
      }

      let backPhotoId = existingEntry?.back_photo_id;
      if (backPhotoUri) {
        const result = await PhotoStorageService.uploadPhoto(userId, 'back', backPhotoUri);
        if (result.success) backPhotoId = result.photo?.id;
      }

      const { data, error } = await supabase
        .from('progress_entries')
        .upsert(
          {
            id: existingEntry?.id,
            user_id: userId,
            date,
            weight_kg: weight,
            front_photo_id: frontPhotoId,
            back_photo_id: backPhotoId,
          },
          { onConflict: 'user_id, date' }
        )
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating/updating progress entry:', error);
      return null;
    }
  }

  /**
   * Get all progress entries for a user.
   */
  static async getProgressEntries(userId: string): Promise<ProgressEntry[]> {
    try {
      const { data, error } = await supabase
        .from('progress_entries')
        .select(`
          *,
          front_photo:body_photos!progress_entries_front_photo_id_fkey(*),
          back_photo:body_photos!progress_entries_back_photo_id_fkey(*)
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching progress entries:', error);
      return [];
    }
  }

  /**
   * Get a single progress entry for a specific date.
   */
  static async getProgressEntryForDate(userId: string, date: string): Promise<ProgressEntry | null> {
    try {
      const { data, error } = await supabase
        .from('progress_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .single();

      if (error && error.code !== 'PGRST116') { // Ignore 'No rows found' error
        throw error;
      }
      return data;
    } catch (error) {
      console.error('Error fetching progress entry for date:', error);
      return null;
    }
  }

  static async predictProgress(userId: string): Promise<any> {
    const { response } = await ProgressService.fetchWithBaseFallback('/api/predict-progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to predict progress.');
    }
    return response.json();
  }

  static async getLatestPrediction(userId: string): Promise<any | null> {
    try {
      console.log('Using mock prediction data');
      return mockPrediction;
    } catch (error) {
      console.error('Error fetching latest prediction:', error);
      return null;
    }
  }

  static async getDailyMetrics(userId: string): Promise<any[]> {
    try {
      console.log('Fetching daily metrics from database for user:', userId);
      
      // Only use Supabase if it's properly configured
      if (!supabase) {
        console.warn('Supabase not configured, returning empty metrics');
        return [];
      }

      // Try to fetch from real database first
      try {
        const { data, error } = await supabase
          .from('daily_user_metrics')
          .select('*')
          .eq('user_id', userId)
          .order('metric_date', { ascending: true });

        if (error) {
          console.error('Error fetching from database:', error);
          // For authenticated users, don't fall back to mock data
          console.log('Database error for authenticated user - returning empty array instead of mock data');
          return [];
        }

        if (data && data.length > 0) {
          console.log('Found metrics in database:', data.length, 'entries:', data);
          return data;
        } else {
          console.log('No metrics found in database for user:', userId, '- user needs to log their first metrics');
          return [];
        }
      } catch (dbError) {
        console.error('Database fetch failed for authenticated user:', dbError);
        // For real users, return empty array instead of mock data
        return [];
      }

    } catch (error) {
      console.error('Error fetching daily metrics:', error);
      return [];
    }
  }

  static async analyzeBehavior(userId: string): Promise<{ success: boolean; insight?: any; message?: string }> {
    const { response } = await ProgressService.fetchWithBaseFallback('/api/analyze-behavior', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to analyze behavior.');
    }
    return response.json();
  }

  static async generateMotivationalMessage(userId: string, triggerEvent: string): Promise<{ success: boolean; message?: any }> {
    const { response } = await ProgressService.fetchWithBaseFallback('/api/generate-motivational-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, triggerEvent }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to get motivational message.');
    }
    return response.json();
  }

  /**
   * Get progress photos for a user
   */
  static async getProgressPhotos(userId: string): Promise<any[]> {
    try {
      console.log('Fetching progress photos for user:', userId);
      
      // Get all progress entries with their associated photos
      const { data, error } = await supabase
        .from('progress_entries')
        .select(`
          id,
          date,
          weight_kg,
          front_photo:body_photos!progress_entries_front_photo_id_fkey(
            id,
            photo_type,
            photo_url,
            storage_path,
            uploaded_at,
            is_analyzed,
            analysis_status
          ),
          back_photo:body_photos!progress_entries_back_photo_id_fkey(
            id,
            photo_type,
            photo_url,
            storage_path,
            uploaded_at,
            is_analyzed,
            analysis_status
          )
        `)
        .eq('user_id', userId)
        .not('front_photo_id', 'is', null)
        .or('back_photo_id.not.is.null')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching progress photos:', error);
        throw error;
      }

      console.log('Fetched progress photos:', data);
      return data || [];
    } catch (error) {
      console.error('Error fetching progress photos:', error);
      return [];
    }
  }

  /**
   * Add a new weight entry to daily_user_metrics table
   */
  static async addWeightEntry(data: {
    user_id: string;
    weight_kg: number;
    metric_date: string;
    notes?: string | null;
    body_fat_percentage?: number | null;
  }) {
    try {
      console.log('Adding weight entry to database:', data);
      
      // Send to the real database via API with base fallback
      const { response } = await ProgressService.fetchWithBaseFallback('/api/log-daily-metric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: data.user_id,
          metricDate: data.metric_date,
          metrics: {
            weight_kg: data.weight_kg,
            notes: data.notes,
            ...(data.body_fat_percentage !== undefined && data.body_fat_percentage !== null && { body_fat_percentage: data.body_fat_percentage })
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save weight entry.');
      }

      const result = await response.json();
      console.log('Weight entry saved successfully:', result);
      
      // Also add to mock store for immediate UI feedback
      const newEntry = {
        id: `metric-${Date.now()}`,
        user_id: data.user_id,
        metric_date: data.metric_date,
        weight_kg: data.weight_kg,
        trend_weight_kg: data.weight_kg,
        sleep_hours: 7,
        stress_level: 3,
        activity_calories: 0,
        notes: data.notes || null,
        body_fat_percentage: data.body_fat_percentage || null,
        created_at: new Date().toISOString()
      };
      
      console.log('[ProgressService] Adding to mock store:', newEntry);
      mockMetricsStore.metrics.unshift(newEntry);
      console.log('[ProgressService] Mock store now has:', mockMetricsStore.metrics.length, 'entries');
      
      // Save to storage
      await mockMetricsStore.saveToStorage();
      
      return newEntry;
    } catch (error) {
      console.error('Error adding weight entry:', error);
      throw error;
    }
  }
} 