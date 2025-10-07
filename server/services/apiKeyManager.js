/**
 * API Key Manager Service
 * Manages multiple API keys and rotates them for better quota management
 */

class APIKeyManager {
  constructor() {
    this.keys = [];
    this.currentKeyIndex = 0;
    this.keyUsage = new Map(); // Track usage per key
    this.keyQuota = 50; // Per key daily quota
    this.keyResetTime = this.getNextResetTime();

    // Load API keys from environment variables
    this.loadAPIKeys();

  }

  /**
   * Load API keys from environment variables
   */
  loadAPIKeys() {
    const primaryKey = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    const backupKeys = process.env.GEMINI_BACKUP_KEYS ? process.env.GEMINI_BACKUP_KEYS.split(',') : [];

    if (primaryKey) {
      this.keys.push(primaryKey.trim());
    }

    backupKeys.forEach(key => {
      const trimmedKey = key.trim();
      if (trimmedKey && !this.keys.includes(trimmedKey)) {
        this.keys.push(trimmedKey);
      }
    });

    if (this.keys.length === 0) {
      console.warn('[API KEY] ⚠️ No API keys found! Please set GEMINI_API_KEY environment variable');
    }
  }

  /**
   * Get next reset time (24 hours from now)
   */
  getNextResetTime() {
    const now = new Date();
    const nextReset = new Date(now);
    nextReset.setHours(24, 0, 0, 0);
    return nextReset;
  }

  /**
   * Check if key quotas need to be reset
   */
  checkAndResetQuotas() {
    const now = new Date();

    if (now >= this.keyResetTime) {
      this.keyUsage.clear();
      this.keyResetTime = this.getNextResetTime();
    }
  }

  /**
   * Get current API key
   */
  getCurrentKey() {
    this.checkAndResetQuotas();

    if (this.keys.length === 0) {
      throw new Error('No API keys available');
    }

    return this.keys[this.currentKeyIndex];
  }

  /**
   * Get next API key (round-robin rotation)
   */
  getNextKey() {
    this.checkAndResetQuotas();

    if (this.keys.length === 0) {
      throw new Error('No API keys available');
    }

    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
    return this.keys[this.currentKeyIndex];
  }

  /**
   * Record API usage for current key
   */
  recordUsage(key = null) {
    const targetKey = key || this.getCurrentKey();
    const currentUsage = this.keyUsage.get(targetKey) || 0;
    this.keyUsage.set(targetKey, currentUsage + 1);

    const remaining = Math.max(0, this.keyQuota - (currentUsage + 1));
    const percentage = Math.round(((currentUsage + 1) / this.keyQuota) * 100);


    if (remaining <= 5) {
      console.warn(`[API KEY] ⚠️ Low quota remaining for key ${this.currentKeyIndex + 1}: ${remaining} requests`);
    }

    return {
      current: currentUsage + 1,
      remaining,
      percentage,
      keyIndex: this.currentKeyIndex
    };
  }

  /**
   * Check if current key has quota available
   */
  hasQuotaAvailable(key = null) {
    const targetKey = key || this.getCurrentKey();
    const currentUsage = this.keyUsage.get(targetKey) || 0;
    return currentUsage < this.keyQuota;
  }

  /**
   * Get key with most available quota
   */
  getBestAvailableKey() {
    this.checkAndResetQuotas();

    let bestKey = null;
    let bestRemaining = -1;
    let bestIndex = -1;

    for (let i = 0; i < this.keys.length; i++) {
      const key = this.keys[i];
      const usage = this.keyUsage.get(key) || 0;
      const remaining = this.keyQuota - usage;

      if (remaining > bestRemaining) {
        bestRemaining = remaining;
        bestKey = key;
        bestIndex = i;
      }
    }

    if (bestKey) {
      this.currentKeyIndex = bestIndex;
    }

    return bestKey;
  }

  /**
   * Get all key statistics
   */
  getKeyStats() {
    this.checkAndResetQuotas();

    const stats = [];

    for (let i = 0; i < this.keys.length; i++) {
      const key = this.keys[i];
      const usage = this.keyUsage.get(key) || 0;
      const remaining = this.keyQuota - usage;

      stats.push({
        keyIndex: i + 1,
        isCurrent: i === this.currentKeyIndex,
        usage,
        remaining,
        percentage: Math.round((usage / this.keyQuota) * 100),
        quota: this.keyQuota
      });
    }

    return {
      keys: stats,
      totalKeys: this.keys.length,
      currentKeyIndex: this.currentKeyIndex,
      nextReset: this.keyResetTime.toISOString()
    };
  }

  /**
   * Add a new API key
   */
  addKey(key) {
    if (!key || this.keys.includes(key)) {
      return false;
    }

    this.keys.push(key);
    return true;
  }

  /**
   * Remove an API key
   */
  removeKey(key) {
    const index = this.keys.indexOf(key);
    if (index === -1) {
      return false;
    }

    this.keys.splice(index, 1);

    if (this.currentKeyIndex >= this.keys.length) {
      this.currentKeyIndex = 0;
    }

    // Clean up usage tracking
    this.keyUsage.delete(key);

    return true;
  }
}

// Export singleton instance
module.exports = new APIKeyManager();


