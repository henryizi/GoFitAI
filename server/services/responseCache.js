/**
 * Response Cache Service
 * Caches API responses to reduce quota usage and improve performance
 */

class ResponseCache {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 100; // Maximum number of cached entries
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes default timeout

    console.log('[CACHE] Response cache initialized');
    console.log('[CACHE] Max cache size:', this.maxCacheSize);
    console.log('[CACHE] Default timeout:', this.cacheTimeout / 1000 / 60, 'minutes');
  }

  /**
   * Generate cache key from request parameters
   */
  generateCacheKey(type, params) {
    const keyData = { type, ...params };
    return JSON.stringify(keyData, Object.keys(keyData).sort());
  }

  /**
   * Create cache entry
   */
  createCacheEntry(data, timeout = null) {
    return {
      data,
      timestamp: Date.now(),
      timeout: timeout || this.cacheTimeout
    };
  }

  /**
   * Check if cache entry is valid
   */
  isCacheValid(entry) {
    return entry && (Date.now() - entry.timestamp) < entry.timeout;
  }

  /**
   * Get cached response
   */
  get(type, params) {
    const key = this.generateCacheKey(type, params);
    const entry = this.cache.get(key);

    if (this.isCacheValid(entry)) {
      console.log(`[CACHE] ✅ Hit for ${type}:`, key.substring(0, 50) + '...');
      return entry.data;
    } else if (entry) {
      console.log(`[CACHE] ❌ Expired for ${type}:`, key.substring(0, 50) + '...');
      this.cache.delete(key);
    } else {
      console.log(`[CACHE] ⭕ Miss for ${type}:`, key.substring(0, 50) + '...');
    }

    return null;
  }

  /**
   * Set cached response
   */
  set(type, params, data, timeout = null) {
    const key = this.generateCacheKey(type, params);

    // Check cache size limit
    if (this.cache.size >= this.maxCacheSize) {
      this.evictOldestEntry();
    }

    const entry = this.createCacheEntry(data, timeout);
    this.cache.set(key, entry);

    console.log(`[CACHE] ✅ Set for ${type}:`, key.substring(0, 50) + '...');
    console.log(`[CACHE] Current size: ${this.cache.size}/${this.maxCacheSize}`);
  }

  /**
   * Evict oldest cache entry
   */
  evictOldestEntry() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      console.log(`[CACHE] 🗑️ Evicted oldest entry:`, oldestKey.substring(0, 50) + '...');
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`[CACHE] 🧹 Cleared ${size} cache entries`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const entry of this.cache.values()) {
      if (this.isCacheValid(entry)) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      total: this.cache.size,
      valid: validEntries,
      expired: expiredEntries,
      hitRate: this.hitRate || 0,
      sizeLimit: this.maxCacheSize
    };
  }

  /**
   * Get cache key for workout plans
   */
  getWorkoutCacheKey(profile, preferences) {
    return this.generateCacheKey('workout', {
      goal: profile.primary_goal,
      level: profile.training_level,
      frequency: preferences?.workout_frequency || 5,
      age: profile.age,
      gender: profile.gender
    });
  }

  /**
   * Get cache key for recipes
   */
  getRecipeCacheKey(mealType, targets, ingredients, strict = false) {
    return this.generateCacheKey('recipe', {
      mealType,
      calories: targets.calories,
      protein: targets.protein,
      carbs: targets.carbs,
      fat: targets.fat,
      ingredients: ingredients.sort().join(','),
      strict
    });
  }
}

// Export singleton instance
module.exports = new ResponseCache();


