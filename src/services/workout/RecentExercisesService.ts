import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RecentExercise {
  id: string;
  name: string;
  muscle_groups?: string[];
  equipment_needed?: string[];
}

const STORAGE_KEY_PREFIX = 'recent_exercises:';
const MAX_RECENT = 10;

export class RecentExercisesService {
  private static keyFor(userId?: string | null) {
    return `${STORAGE_KEY_PREFIX}${userId || 'guest'}`;
  }

  static async addRecentExercise(
    userId: string | null | undefined,
    exercise: RecentExercise
  ): Promise<void> {
    try {
      const key = this.keyFor(userId);
      const raw = await AsyncStorage.getItem(key);
      let list: RecentExercise[] = raw ? JSON.parse(raw) : [];

      // Remove existing entry with same id
      list = list.filter((ex) => ex.id !== exercise.id);

      // Add to front
      list.unshift(exercise);

      // Trim to max size
      if (list.length > MAX_RECENT) {
        list = list.slice(0, MAX_RECENT);
      }

      await AsyncStorage.setItem(key, JSON.stringify(list));
    } catch (error) {
      console.warn('[RecentExercisesService] Error adding recent exercise:', error);
    }
  }

  static async getRecentExercises(userId?: string | null): Promise<RecentExercise[]> {
    try {
      const key = this.keyFor(userId);
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return [];
      const list: RecentExercise[] = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (error) {
      console.warn('[RecentExercisesService] Error fetching recent exercises:', error);
      return [];
    }
  }
}

























