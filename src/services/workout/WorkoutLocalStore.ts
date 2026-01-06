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
const activeKeyFor = (userId: string) => `activeWorkoutPlan:${userId}`;

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

  static async setActivePlanId(userId: string, planId: string): Promise<void> {
    await AsyncStorage.setItem(activeKeyFor(userId), planId);
  }

  static async getActivePlanId(userId: string): Promise<string | null> {
    return await AsyncStorage.getItem(activeKeyFor(userId));
  }

  static async clearActivePlanId(userId: string): Promise<void> {
    await AsyncStorage.removeItem(activeKeyFor(userId));
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
   * Save all plans to global storage (consolidated method)
   */
  static async savePlansToStorage(plans: StoredWorkoutPlan[]): Promise<void> {
    try {
      await AsyncStorage.setItem('workout_plans', JSON.stringify(plans));
      console.log(`[WorkoutLocalStore] Saved ${plans.length} plans to global storage`);
    } catch (error) {
      console.error('[WorkoutLocalStore] Error saving plans to storage:', error);
    }
  }

  /**
   * @deprecated Use savePlansToStorage instead
   */
  static async saveAllPlans(plans: StoredWorkoutPlan[]): Promise<void> {
    console.warn('[WorkoutLocalStore] saveAllPlans is deprecated, use savePlansToStorage');
    return this.savePlansToStorage(plans);
  }

  /**
   * Delete a plan from storage by ID (improved version)
   */
  static async deletePlan(planId: string, userId?: string): Promise<boolean> {
    try {
      console.log(`[WorkoutLocalStore] Deleting plan with ID: ${planId} for user: ${userId || 'all users'}`);
      
      let success = false;
      
      if (userId) {
        // Delete from specific user's storage
        const userPlans = await this.getPlans(userId);
        const planExists = userPlans.some(p => p.id === planId);
        
        if (planExists) {
          const updatedPlans = userPlans.filter(p => p.id !== planId);
          await this.savePlans(userId, updatedPlans);
          console.log(`[WorkoutLocalStore] Deleted plan ${planId} from user ${userId} storage`);
          success = true;
        } else {
          console.log(`[WorkoutLocalStore] Plan ${planId} not found in user ${userId} storage`);
        }
      } else {
        // Delete from all users (legacy behavior)
        const users = await this.getUsers();
        for (const uid of users) {
          const userPlans = await this.getPlans(uid);
          const planExists = userPlans.some(p => p.id === planId);
          
          if (planExists) {
            const updatedPlans = userPlans.filter(p => p.id !== planId);
            await this.savePlans(uid, updatedPlans);
            console.log(`[WorkoutLocalStore] Deleted plan ${planId} from user ${uid} storage`);
            success = true;
          }
        }
      }
      
      // Also remove from global storage if it exists
      try {
        const globalPlans = await this.getAllPlans();
        const globalPlanExists = globalPlans.some(p => p.id === planId);
        
        if (globalPlanExists) {
          const updatedGlobalPlans = globalPlans.filter(p => p.id !== planId);
          await this.savePlansToStorage(updatedGlobalPlans);
          console.log(`[WorkoutLocalStore] Deleted plan ${planId} from global storage`);
          success = true;
        }
      } catch (globalError) {
        console.warn('[WorkoutLocalStore] Failed to update global storage (non-critical):', globalError);
      }
      
      if (success) {
        console.log(`[WorkoutLocalStore] Successfully deleted plan ${planId}`);
      } else {
        console.log(`[WorkoutLocalStore] Plan ${planId} was not found in any storage`);
      }
      
      return success;
    } catch (error) {
      console.error(`[WorkoutLocalStore] Error deleting plan ${planId}:`, error);
      return false;
    }
  }

  /**
   * Delete plans by name when plan ID is unavailable (improved version)
   */
  static async deletePlansByName(planNameRaw: string | undefined | null, userId?: string): Promise<boolean> {
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

      // Update user plan lists
      if (userId) {
        // Delete from specific user only
        const userPlans = await this.getPlans(userId);
        const updatedUserPlans = userPlans.filter((p: StoredWorkoutPlan) => !duplicatePlanIds.includes(p.id));
        await this.savePlans(userId, updatedUserPlans);
        console.log(`[WorkoutLocalStore] Deleted plans with name "${planNameRaw}" from user ${userId}`);
      } else {
        // Delete from all users (legacy behavior)
        const users = await this.getUsers();
        for (const uid of users) {
          const userPlans = await this.getPlans(uid);
          const updatedUserPlans = userPlans.filter((p: StoredWorkoutPlan) => !duplicatePlanIds.includes(p.id));
          await this.savePlans(uid, updatedUserPlans);
        }
        console.log(`[WorkoutLocalStore] Deleted plans with name "${planNameRaw}" from all users`);
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
   * Synchronize user storage with global storage to ensure consistency
   */
  static async syncUserStorage(userId: string): Promise<void> {
    try {
      console.log(`[WorkoutLocalStore] Syncing storage for user: ${userId}`);
      
      // Get user's plans
      const userPlans = await this.getPlans(userId);
      
      // Get all plans from global storage
      const globalPlans = await this.getAllPlans();
      
      // Remove user's plans from global storage and re-add current user plans
      const otherUsersPlans = globalPlans.filter(p => p.user_id !== userId);
      const syncedGlobalPlans = [...otherUsersPlans, ...userPlans];
      
      // Update global storage
      await this.savePlansToStorage(syncedGlobalPlans);
      
      console.log(`[WorkoutLocalStore] Synced ${userPlans.length} plans for user ${userId}`);
    } catch (error) {
      console.error('[WorkoutLocalStore] Error syncing user storage:', error);
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