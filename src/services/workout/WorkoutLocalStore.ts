import AsyncStorage from '@react-native-async-storage/async-storage';

interface StoredWorkoutPlan {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  status?: 'active' | 'archived' | 'completed';
  weekly_schedule?: any[];
  weeklySchedule?: any[];
  created_at: string;
  updated_at: string;
}

const keyFor = (userId: string) => `workoutPlans:${userId}`;

export class WorkoutLocalStore {
  static async getPlans(userId: string): Promise<StoredWorkoutPlan[]> {
    try {
      const raw = await AsyncStorage.getItem(keyFor(userId));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  static async savePlans(userId: string, plans: StoredWorkoutPlan[]): Promise<void> {
    await AsyncStorage.setItem(keyFor(userId), JSON.stringify(plans));
  }

  // Temporary compatibility method for cached mobile app code
  static async savePlan(userId: string, plan: StoredWorkoutPlan): Promise<void> {
    console.log('[WorkoutLocalStore] Using compatibility savePlan method - please update to addPlan');
    await this.addPlan(userId, plan);
  }

  static async addPlan(userId: string, plan: StoredWorkoutPlan): Promise<void> {
    try {
      // First get all existing plans
      const existingPlans = await this.getPlans(userId);
      
      // Create a deep copy of the plan to avoid modifying the original
      const planToStore = JSON.parse(JSON.stringify(plan));
      
      // Ensure the plan has all necessary fields
      if (!planToStore.weekly_schedule && planToStore.weeklySchedule) {
        planToStore.weekly_schedule = planToStore.weeklySchedule;
      } else if (!planToStore.weeklySchedule && planToStore.weekly_schedule) {
        planToStore.weeklySchedule = planToStore.weekly_schedule;
  }

      // Ensure both status and is_active are set correctly
      if (planToStore.is_active || planToStore.status === 'active') {
        planToStore.is_active = true;
        planToStore.status = 'active';
        
        // Deactivate all other plans
        existingPlans.forEach(p => {
          if (p.is_active || p.status === 'active') {
            console.log(`[WorkoutLocalStore] Deactivating existing active plan: ${p.id}`);
            p.is_active = false;
            p.status = 'archived';
          }
        });
      }
      
      // Check if this plan already exists
      const existingPlanIndex = existingPlans.findIndex(p => p.id === planToStore.id);
      if (existingPlanIndex >= 0) {
        // Update existing plan
        existingPlans[existingPlanIndex] = planToStore;
      } else {
        // Add new plan
        existingPlans.push(planToStore);
      }
      
      // Save all plans
      await this.savePlans(userId, existingPlans);
      
    } catch (error) {
      console.error('[WorkoutLocalStore] Error adding plan:', error);
      throw error;
    }
  }

  /**
   * Get all plans from all users
   */
  static async getAllPlans(): Promise<StoredWorkoutPlan[]> {
    try {
      // Get all AsyncStorage keys
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Filter for workout plan keys
      const workoutPlanKeys = allKeys.filter(key => key.startsWith('workoutPlans:'));
      
      // Collect all plans
      const allPlans: StoredWorkoutPlan[] = [];
      
      // Check each user's plans
      for (const key of workoutPlanKeys) {
        try {
          const raw = await AsyncStorage.getItem(key);
          if (!raw) continue;
          
          const plans = JSON.parse(raw);
          if (!Array.isArray(plans)) continue;
          
          // Add all plans to the collection
          allPlans.push(...plans);
        } catch (err) {
          console.error(`[WorkoutLocalStore] Error processing ${key}:`, err);
        }
      }
      
      return allPlans;
    } catch (error) {
      console.error('[WorkoutLocalStore] Error getting all plans:', error);
      return [];
    }
  }

  /**
   * Get all user IDs with stored plans
   */
  static async getUsers(): Promise<string[]> {
    try {
      // Get all AsyncStorage keys
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Filter for workout plan keys and extract user IDs
      return allKeys
        .filter(key => key.startsWith('workoutPlans:'))
        .map(key => key.replace('workoutPlans:', ''));
    } catch (error) {
      console.error('[WorkoutLocalStore] Error getting users:', error);
      return [];
    }
  }

  /**
   * Save all plans to storage (global list)
   */
  static async savePlansToStorage(plans: StoredWorkoutPlan[]): Promise<void> {
    try {
      await AsyncStorage.setItem('workout_plans', JSON.stringify(plans));
    } catch (error) {
      console.error('[WorkoutLocalStore] Error saving plans to storage:', error);
    }
  }

  /**
   * Delete a plan from storage
   */
  static async deletePlan(planId: string): Promise<boolean> {
    try {
      console.log(`[WorkoutLocalStore] Deleting plan with ID: ${planId}`);
      
      // Get all stored plans
      const allPlans = await this.getAllPlans();
      
      // Find the plan to delete to get its name
      const planToDelete = allPlans.find((p: StoredWorkoutPlan) => p.id === planId);
      if (!planToDelete) {
        console.log(`[WorkoutLocalStore] Plan with ID ${planId} not found, nothing to delete`);
        return false;
      }
      
      // Find all plans with the same name (case-insensitive)
      const planName = planToDelete.name?.trim().toLowerCase();
      const duplicatePlanIds = allPlans
        .filter((p: StoredWorkoutPlan) => p.name?.trim().toLowerCase() === planName)
        .map((p: StoredWorkoutPlan) => p.id);
      
      if (duplicatePlanIds.length > 1) {
        console.log(`[WorkoutLocalStore] Found ${duplicatePlanIds.length} plans with name "${planToDelete.name}", deleting all of them`);
      }
      
      // Filter out all plans with the same name
      const filteredPlans = allPlans.filter((p: StoredWorkoutPlan) => !duplicatePlanIds.includes(p.id));
      
      // Update all user plan lists
      const users = await this.getUsers();
      for (const userId of users) {
        const userPlans = await this.getPlans(userId);
        const updatedUserPlans = userPlans.filter((p: StoredWorkoutPlan) => !duplicatePlanIds.includes(p.id));
        await this.savePlans(userId, updatedUserPlans);
      }
      
      // Also update the global plans list
      await this.savePlansToStorage(filteredPlans);
      
      console.log(`[WorkoutLocalStore] Successfully deleted ${duplicatePlanIds.length} plans with name "${planToDelete.name}"`);
      return true;
    } catch (error) {
      console.error(`[WorkoutLocalStore] Error deleting plan ${planId}:`, error);
      return false;
    }
  }

  /**
   * Delete plans by name when plan ID is unavailable
   */
  static async deletePlansByName(planNameRaw: string | undefined | null): Promise<boolean> {
    try {
      const normalized = (planNameRaw || '').trim().toLowerCase();
      if (!normalized) {
        console.log('[WorkoutLocalStore] deletePlansByName called with empty name');
        return false;
      }

      console.log(`[WorkoutLocalStore] Deleting plans by name: ${normalized}`);
      const allPlans = await this.getAllPlans();

      const duplicatePlanIds = allPlans
        .filter((p: StoredWorkoutPlan) => (p.name || '').trim().toLowerCase() === normalized)
        .map((p: StoredWorkoutPlan) => p.id);

      if (duplicatePlanIds.length === 0) {
        console.log(`[WorkoutLocalStore] No plans found with name: ${normalized}`);
        return false;
      }

      // Update all user plan lists
      const users = await this.getUsers();
      for (const userId of users) {
        const userPlans = await this.getPlans(userId);
        const updatedUserPlans = userPlans.filter((p: StoredWorkoutPlan) => !duplicatePlanIds.includes(p.id));
        await this.savePlans(userId, updatedUserPlans);
      }

      // Also update the global plans list
      const filteredPlans = allPlans.filter((p: StoredWorkoutPlan) => !duplicatePlanIds.includes(p.id));
      await this.savePlansToStorage(filteredPlans);

      console.log(`[WorkoutLocalStore] Successfully deleted ${duplicatePlanIds.length} plan(s) named "${planNameRaw}"`);
      return true;
    } catch (error) {
      console.error('[WorkoutLocalStore] Error deleting plans by name:', error);
      return false;
    }
  }

  static async updatePlan(userId: string, plan: StoredWorkoutPlan): Promise<void> {
    const plans = await this.getPlans(userId);
    const idx = plans.findIndex(p => p.id === plan.id);
    if (idx !== -1) {
      plans[idx] = plan;
      await this.savePlans(userId, plans);
    }
  }

  /**
   * Clear all workout plans from storage
   */
  static async clearAllPlans(): Promise<boolean> {
    try {
      console.log('[WorkoutLocalStore] Clearing all workout plans');
      
      // Get all AsyncStorage keys
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Filter for workout plan keys
      const workoutPlanKeys = allKeys.filter(key => key.startsWith('workoutPlans:'));
      
      // Remove all workout plans
      for (const key of workoutPlanKeys) {
        try {
          console.log(`[WorkoutLocalStore] Clearing plans for key: ${key}`);
          await AsyncStorage.setItem(key, JSON.stringify([]));
        } catch (err) {
          console.error(`[WorkoutLocalStore] Error clearing ${key}:`, err);
        }
      }
      
      // Also clear the global plans list
      await AsyncStorage.setItem('workout_plans', JSON.stringify([]));
      
      console.log(`[WorkoutLocalStore] Successfully cleared all workout plans from ${workoutPlanKeys.length} users`);
      return true;
    } catch (error) {
      console.error('[WorkoutLocalStore] Error clearing all workout plans:', error);
      return false;
    }
  }
} 