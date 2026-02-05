/**
 * Rate limiting for Claude Orchestrator
 *
 * IP-based rate limiting with configurable windows and limits
 */

export interface RateLimitConfig {
  windowMs: number;      // Time window in ms (default: 60000 = 1 minute)
  maxRequests: number;   // Max requests per window (default: 100)
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Simple in-memory store
const requestCounts = new Map<string, RateLimitEntry>();

// Default configuration
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60000,    // 1 minute
  maxRequests: 100    // 100 requests per minute
};

/**
 * Check if a request should be rate limited
 * @param ip Client IP address
 * @param config Optional rate limit configuration
 * @returns Rate limit result with allowed status, remaining requests, and reset time
 */
export function checkRateLimit(ip: string, config?: RateLimitConfig): RateLimitResult {
  const cfg = config || DEFAULT_CONFIG;
  const now = Date.now();

  let entry = requestCounts.get(ip);

  // If no entry or window expired, create new entry
  if (!entry || now >= entry.resetAt) {
    entry = {
      count: 1,
      resetAt: now + cfg.windowMs
    };
    requestCounts.set(ip, entry);

    return {
      allowed: true,
      remaining: cfg.maxRequests - 1,
      resetAt: entry.resetAt
    };
  }

  // Increment count
  entry.count++;

  // Check if over limit
  if (entry.count > cfg.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt
    };
  }

  return {
    allowed: true,
    remaining: cfg.maxRequests - entry.count,
    resetAt: entry.resetAt
  };
}

/**
 * Clean up expired rate limit entries
 * Should be called periodically to prevent memory leaks
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  const toDelete: string[] = [];

  for (const [ip, entry] of requestCounts.entries()) {
    if (now >= entry.resetAt) {
      toDelete.push(ip);
    }
  }

  for (const ip of toDelete) {
    requestCounts.delete(ip);
  }
}

/**
 * Get client IP from request
 * Checks X-Forwarded-For header first (for proxies), then falls back to socket address
 */
export function getClientIP(req: Request): string {
  // Check X-Forwarded-For header (proxy/load balancer)
  const forwardedFor = req.headers.get('X-Forwarded-For');
  if (forwardedFor) {
    // X-Forwarded-For can be a comma-separated list, take the first one
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    if (ips.length > 0 && ips[0]) {
      return ips[0];
    }
  }

  // Check X-Real-IP header (nginx)
  const realIP = req.headers.get('X-Real-IP');
  if (realIP) {
    return realIP;
  }

  // Note: Bun doesn't expose socket info in Request object yet
  // For now, return a default value. In production, this would need
  // to be handled at the server level or with a reverse proxy
  return 'unknown';
}

/**
 * Start periodic cleanup of expired rate limit entries
 * @param intervalMs Cleanup interval in milliseconds (default: 60000 = 1 minute)
 * @returns Timer handle that can be used to stop cleanup
 */
export function startCleanup(intervalMs: number = 60000): Timer {
  return setInterval(cleanupRateLimits, intervalMs);
}

/**
 * Get current rate limit stats (for monitoring/debugging)
 */
export function getRateLimitStats(): {
  totalEntries: number;
  activeIPs: string[];
} {
  const now = Date.now();
  const activeIPs: string[] = [];

  for (const [ip, entry] of requestCounts.entries()) {
    if (now < entry.resetAt) {
      activeIPs.push(ip);
    }
  }

  return {
    totalEntries: requestCounts.size,
    activeIPs
  };
}
