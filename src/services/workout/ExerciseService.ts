import { supabase } from '../supabase/client';
import { Database } from '../../types/database';

type Exercise = Database['public']['Tables']['exercises']['Row'];

interface ExerciseFilters {
  category?: 'compound' | 'isolation' | 'accessory';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  muscleGroups?: string[];
  equipment?: string[];
}

export class ExerciseService {
  // Cache for exercises to avoid repeated database calls
  private static exercisesCache: Exercise[] | null = null;
  private static cacheTimestamp: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get all exercises with optional filtering
   * Optimized to only fetch necessary fields and use caching
   */
  static async getExercises(filters?: ExerciseFilters, useCache: boolean = true): Promise<Exercise[]> {
    try {
      // Return cached data if available and fresh
      if (useCache && this.exercisesCache && (Date.now() - this.cacheTimestamp) < this.CACHE_DURATION) {
        // Apply filters to cached data if needed
        if (filters) {
          return this.applyFiltersToCached(this.exercisesCache, filters);
        }
        return this.exercisesCache;
      }

      // Only select fields needed for the picker/list view
      let query = supabase
        .from('exercises')
        .select('id, name, category, muscle_groups, equipment_needed, difficulty, is_custom');

      if (filters) {
        if (filters.category) {
          query = query.eq('category', filters.category);
        }
        if (filters.difficulty) {
          query = query.eq('difficulty', filters.difficulty);
        }
        if (filters.muscleGroups && filters.muscleGroups.length > 0) {
          query = query.contains('muscle_groups', filters.muscleGroups);
        }
        if (filters.equipment && filters.equipment.length > 0) {
          query = query.contains('equipment_needed', filters.equipment);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      
      const exercises = data || [];
      
      // Cache the results if no filters applied (full list)
      if (useCache && !filters) {
        this.exercisesCache = exercises as Exercise[];
        this.cacheTimestamp = Date.now();
      }
      
      return exercises as Exercise[];
    } catch (error) {
      console.error('Error fetching exercises:', error);
      return [];
    }
  }

  /**
   * Apply filters to cached exercise data
   */
  private static applyFiltersToCached(exercises: Exercise[], filters: ExerciseFilters): Exercise[] {
    let filtered = [...exercises];

    if (filters.category) {
      filtered = filtered.filter(ex => ex.category === filters.category);
    }
    if (filters.difficulty) {
      filtered = filtered.filter(ex => ex.difficulty === filters.difficulty);
    }
    if (filters.muscleGroups && filters.muscleGroups.length > 0) {
      filtered = filtered.filter(ex => 
        ex.muscle_groups && filters.muscleGroups!.some(mg => ex.muscle_groups?.includes(mg))
      );
    }
    if (filters.equipment && filters.equipment.length > 0) {
      filtered = filtered.filter(ex => 
        ex.equipment_needed && filters.equipment!.some(eq => ex.equipment_needed?.includes(eq))
      );
    }

    return filtered;
  }

  /**
   * Clear the exercises cache (useful when exercises are updated)
   */
  static clearCache(): void {
    this.exercisesCache = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Get exercises by muscle group
   */
  static async getExercisesByMuscleGroup(muscleGroup: string): Promise<Exercise[]> {
    return this.getExercises({ muscleGroups: [muscleGroup] });
  }

  /**
   * Get exercises suitable for a specific training level
   */
  static async getExercisesByLevel(level: 'beginner' | 'intermediate' | 'advanced'): Promise<Exercise[]> {
    // For beginners, only show beginner exercises
    // For intermediate, show beginner and intermediate
    // For advanced, show all
    const difficulties = level === 'beginner' ? ['beginner'] :
                       level === 'intermediate' ? ['beginner', 'intermediate'] :
                       ['beginner', 'intermediate', 'advanced'];

    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .in('difficulty', difficulties);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching exercises by level:', error);
      return [];
    }
  }

  /**
   * Search exercises by name or description
   */
  static async searchExercises(searchTerm: string): Promise<Exercise[]> {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching exercises:', error);
      return [];
    }
  }

  /**
   * Get recommended exercises based on muscle groups and training level
   */
  static async getRecommendedExercises(
    muscleGroups: string[],
    trainingLevel: 'beginner' | 'intermediate' | 'advanced',
    limit: number = 3
  ): Promise<Exercise[]> {
    try {
      // Get exercises matching the criteria
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .contains('muscle_groups', muscleGroups)
        .lte('rpe_recommendation', trainingLevel === 'beginner' ? 7 : 9)
        .order('rpe_recommendation', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting recommended exercises:', error);
      return [];
    }
  }

  /**
   * Create a custom exercise
   */
  static async createCustomExercise(
    exercise: Omit<Exercise, 'id' | 'is_custom'>
  ): Promise<Exercise | null> {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          ...exercise,
          is_custom: true
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating custom exercise:', error);
      return null;
    }
  }

  /**
   * Get all available equipment
   */
  static async getAvailableEquipment(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('equipment_needed');

      if (error) throw error;

      // Flatten and deduplicate equipment arrays
      const equipment = new Set<string>();
      data?.forEach(item => {
        item.equipment_needed?.forEach((eq: string) => equipment.add(eq));
      });

      return Array.from(equipment).sort();
    } catch (error) {
      console.error('Error fetching available equipment:', error);
      return [];
    }
  }

  /**
   * Get all muscle groups
   */
  static async getAvailableMuscleGroups(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('muscle_groups');

      if (error) throw error;

      // Flatten and deduplicate muscle group arrays
      const muscleGroups = new Set<string>();
      data?.forEach(item => {
        item.muscle_groups?.forEach((mg: string) => muscleGroups.add(mg));
      });

      return Array.from(muscleGroups).sort();
    } catch (error) {
      console.error('Error fetching available muscle groups:', error);
      return [];
    }
  }
} 