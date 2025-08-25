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
  /**
   * Get all exercises with optional filtering
   */
  static async getExercises(filters?: ExerciseFilters): Promise<Exercise[]> {
    try {
      let query = supabase
        .from('exercises')
        .select('*');

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
      return data || [];
    } catch (error) {
      console.error('Error fetching exercises:', error);
      return [];
    }
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