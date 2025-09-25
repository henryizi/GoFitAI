/**
 * Quota Monitor Service
 * Tracks API usage and manages quota limits
 */

class QuotaMonitor {
  constructor() {
    this.dailyQuota = 50; // Free tier daily limit
    this.resetTime = this.getNextResetTime();
    this.currentUsage = 0;
    this.lastReset = new Date();

    // Load from persistent storage if available
    this.loadUsageData();

    console.log('[QUOTA] Monitor initialized');
    console.log('[QUOTA] Daily quota:', this.dailyQuota);
    console.log('[QUOTA] Reset time:', this.resetTime);
  }

  /**
   * Get next reset time (24 hours from now)
   */
  getNextResetTime() {
    const now = new Date();
    const nextReset = new Date(now);
    nextReset.setHours(24, 0, 0, 0); // Next midnight
    return nextReset;
  }

  /**
   * Check if quota is available
   */
  isQuotaAvailable() {
    this.checkAndResetQuota();
    return this.currentUsage < this.dailyQuota;
  }

  /**
   * Get remaining quota
   */
  getRemainingQuota() {
    this.checkAndResetQuota();
    return Math.max(0, this.dailyQuota - this.currentUsage);
  }

  /**
   * Get quota usage percentage
   */
  getUsagePercentage() {
    this.checkAndResetQuota();
    return Math.round((this.currentUsage / this.dailyQuota) * 100);
  }

  /**
   * Check and reset quota if needed
   */
  checkAndResetQuota() {
    const now = new Date();

    if (now >= this.resetTime) {
      console.log('[QUOTA] Resetting daily quota');
      this.currentUsage = 0;
      this.lastReset = now;
      this.resetTime = this.getNextResetTime();
      this.saveUsageData();
    }
  }

  /**
   * Record API usage
   */
  recordUsage() {
    this.currentUsage++;
    this.saveUsageData();

    const remaining = this.getRemainingQuota();
    const percentage = this.getUsagePercentage();

    console.log(`[QUOTA] Usage recorded: ${this.currentUsage}/${this.dailyQuota} (${percentage}%)`);

    if (remaining <= 5) {
      console.warn(`[QUOTA] ⚠️ Low quota remaining: ${remaining} requests`);
    }

    return {
      current: this.currentUsage,
      remaining,
      percentage,
      resetTime: this.resetTime
    };
  }

  /**
   * Get quota status for user response
   */
  getQuotaStatus() {
    return {
      remaining: this.getRemainingQuota(),
      percentage: this.getUsagePercentage(),
      resetTime: this.resetTime.toISOString(),
      dailyLimit: this.dailyQuota
    };
  }

  /**
   * Save usage data to persistent storage
   */
  saveUsageData() {
    try {
      const fs = require('fs').promises;
      const data = {
        currentUsage: this.currentUsage,
        lastReset: this.lastReset.toISOString(),
        resetTime: this.resetTime.toISOString()
      };

      // Save to a file in the data directory
      const dataPath = process.cwd() + '/data/quota-usage.json';
      fs.writeFile(dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('[QUOTA] Failed to save usage data:', error.message);
    }
  }

  /**
   * Load usage data from persistent storage
   */
  loadUsageData() {
    try {
      const fs = require('fs');
      const dataPath = process.cwd() + '/data/quota-usage.json';

      if (fs.existsSync(dataPath)) {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        if (data.lastReset && data.resetTime) {
          this.currentUsage = data.currentUsage || 0;
          this.lastReset = new Date(data.lastReset);

          // If the stored reset time has passed, reset the quota
          if (new Date() >= new Date(data.resetTime)) {
            this.currentUsage = 0;
            this.resetTime = this.getNextResetTime();
          } else {
            this.resetTime = new Date(data.resetTime);
          }

          console.log('[QUOTA] Loaded usage data:', this.currentUsage, 'requests');
        }
      }
    } catch (error) {
      console.warn('[QUOTA] Failed to load usage data:', error.message);
      // Reset to defaults if loading fails
      this.currentUsage = 0;
      this.resetTime = this.getNextResetTime();
    }
  }

  /**
   * Get quota warning message for users
   */
  getQuotaWarning() {
    const remaining = this.getRemainingQuota();
    const percentage = this.getUsagePercentage();

    if (remaining === 0) {
      return {
        type: 'error',
        message: 'Daily API quota exceeded. Using rule-based generation.',
        suggestion: 'Please try again tomorrow or consider upgrading to Gemini Pro.'
      };
    } else if (remaining <= 5) {
      return {
        type: 'warning',
        message: `Only ${remaining} AI requests remaining today (${percentage}% used).`,
        suggestion: 'Consider using the rule-based generation for immediate results.'
      };
    } else if (percentage >= 80) {
      return {
        type: 'info',
        message: `High API usage today: ${percentage}% of daily quota used.`,
        suggestion: 'Rule-based generation is available as an alternative.'
      };
    }

    return null; // No warning needed
  }
}

// Export singleton instance
module.exports = new QuotaMonitor();


