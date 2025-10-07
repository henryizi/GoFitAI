/**
 * Rate Limiter Service
 * Prevents quota exhaustion by limiting requests per time window
 */

class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.windowMs = 60 * 1000; // 1 minute window
    this.maxRequests = 5; // Max requests per window per IP
    this.aiRequests = new Map(); // Track AI requests separately
    this.maxAIRequests = 10; // Max AI requests per hour

  }

  /**
   * Clean up old entries
   */
  cleanup() {
    const now = Date.now();

    // Clean request map
    for (const [key, requests] of this.requests) {
      if (now - requests.timestamp > this.windowMs) {
        this.requests.delete(key);
      }
    }

    // Clean AI requests map (hourly window)
    const hourlyWindow = 60 * 60 * 1000; // 1 hour
    for (const [key, requests] of this.aiRequests) {
      if (now - requests.timestamp > hourlyWindow) {
        this.aiRequests.delete(key);
      }
    }
  }

  /**
   * Get client identifier
   */
  getClientId(req) {
    // Use IP address as client identifier
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  /**
   * Check if request is allowed
   */
  isAllowed(req) {
    this.cleanup();

    const clientId = this.getClientId(req);
    const now = Date.now();

    // Check general request limit
    const requestEntry = this.requests.get(clientId);
    if (!requestEntry) {
      this.requests.set(clientId, { count: 1, timestamp: now });
      return true;
    }

    if (now - requestEntry.timestamp < this.windowMs) {
      if (requestEntry.count >= this.maxRequests) {
        return false;
      }
      requestEntry.count++;
    } else {
      requestEntry.count = 1;
      requestEntry.timestamp = now;
    }

    return true;
  }

  /**
   * Check if AI request is allowed
   */
  isAIAllowed(req) {
    this.cleanup();

    const clientId = this.getClientId(req);
    const now = Date.now();
    const hourlyWindow = 60 * 60 * 1000; // 1 hour

    // Check AI request limit
    const aiEntry = this.aiRequests.get(clientId);
    if (!aiEntry) {
      this.aiRequests.set(clientId, { count: 1, timestamp: now });
      return true;
    }

    if (now - aiEntry.timestamp < hourlyWindow) {
      if (aiEntry.count >= this.maxAIRequests) {
        return false;
      }
      aiEntry.count++;
    } else {
      aiEntry.count = 1;
      aiEntry.timestamp = now;
    }

    return true;
  }

  /**
   * Get rate limit status for client
   */
  getStatus(req) {
    this.cleanup();

    const clientId = this.getClientId(req);
    const now = Date.now();
    const hourlyWindow = 60 * 60 * 1000;

    const requestEntry = this.requests.get(clientId);
    const aiEntry = this.aiRequests.get(clientId);

    return {
      clientId,
      general: {
        remaining: requestEntry ?
          Math.max(0, this.maxRequests - requestEntry.count) :
          this.maxRequests,
        resetTime: requestEntry ?
          new Date(requestEntry.timestamp + this.windowMs) :
          new Date(now + this.windowMs)
      },
      ai: {
        remaining: aiEntry ?
          Math.max(0, this.maxAIRequests - aiEntry.count) :
          this.maxAIRequests,
        resetTime: aiEntry ?
          new Date(aiEntry.timestamp + hourlyWindow) :
          new Date(now + hourlyWindow)
      }
    };
  }

  /**
   * Get rate limit headers for response
   */
  getHeaders(req) {
    const status = this.getStatus(req);

    return {
      'X-RateLimit-Limit': this.maxRequests,
      'X-RateLimit-Remaining': status.general.remaining,
      'X-RateLimit-Reset': Math.floor(status.general.resetTime.getTime() / 1000),
      'X-RateLimit-AI-Limit': this.maxAIRequests,
      'X-RateLimit-AI-Remaining': status.ai.remaining,
      'X-RateLimit-AI-Reset': Math.floor(status.ai.resetTime.getTime() / 1000)
    };
  }

  /**
   * Create rate limit error response
   */
  createErrorResponse(req) {
    const status = this.getStatus(req);
    const resetIn = Math.ceil((status.general.resetTime.getTime() - Date.now()) / 1000);

    return {
      success: false,
      error: 'Rate limit exceeded',
      message: `Too many requests. Try again in ${resetIn} seconds.`,
      retryAfter: resetIn,
      limits: {
        general: {
          limit: this.maxRequests,
          remaining: status.general.remaining,
          resetIn
        },
        ai: {
          limit: this.maxAIRequests,
          remaining: status.ai.remaining,
          resetIn: Math.ceil((status.ai.resetTime.getTime() - Date.now()) / 1000)
        }
      }
    };
  }
}

// Export singleton instance
module.exports = new RateLimiter();


