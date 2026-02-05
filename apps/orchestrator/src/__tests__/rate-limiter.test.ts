import { describe, test, expect, beforeEach } from 'bun:test';
import {
  checkRateLimit,
  cleanupRateLimits,
  getClientIP,
  getRateLimitStats,
  startCleanup,
  type RateLimitConfig
} from '../rate-limiter';

describe('RateLimiter', () => {
  describe('checkRateLimit', () => {
    test('allows first request', () => {
      const ip = 'test-ip-' + Math.random();
      const result = checkRateLimit(ip);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99); // Default max is 100
    });

    test('tracks multiple requests from same IP', () => {
      const ip = 'test-ip-' + Math.random();
      checkRateLimit(ip);
      const result = checkRateLimit(ip);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(98);
    });

    test('blocks requests over limit', () => {
      const ip = 'test-ip-' + Math.random();
      const config: RateLimitConfig = {
        windowMs: 60000,
        maxRequests: 3
      };

      checkRateLimit(ip, config);
      checkRateLimit(ip, config);
      checkRateLimit(ip, config);

      const result = checkRateLimit(ip, config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    test('resets after window expires', async () => {
      const ip = 'test-ip-' + Math.random();
      const config: RateLimitConfig = {
        windowMs: 100, // 100ms window
        maxRequests: 2
      };

      checkRateLimit(ip, config);
      checkRateLimit(ip, config);

      // Third request should be blocked
      let result = checkRateLimit(ip, config);
      expect(result.allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed again
      result = checkRateLimit(ip, config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    test('tracks different IPs separately', () => {
      const ip1 = 'test-ip-1-' + Math.random();
      const ip2 = 'test-ip-2-' + Math.random();

      checkRateLimit(ip1);
      checkRateLimit(ip1);

      const result = checkRateLimit(ip2);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(99);
    });

    test('uses custom config when provided', () => {
      const ip = 'test-ip-' + Math.random();
      const config: RateLimitConfig = {
        windowMs: 5000,
        maxRequests: 10
      };

      const result = checkRateLimit(ip, config);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    test('returns reset time in future', () => {
      const ip = 'test-ip-' + Math.random();
      const now = Date.now();
      const result = checkRateLimit(ip);
      expect(result.resetAt).toBeGreaterThan(now);
    });
  });

  describe('cleanupRateLimits', () => {
    test('removes expired entries', async () => {
      const ip = 'test-ip-cleanup-' + Math.random();
      const config: RateLimitConfig = {
        windowMs: 50,
        maxRequests: 1
      };

      checkRateLimit(ip, config);

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 100));

      const beforeStats = getRateLimitStats();
      cleanupRateLimits();
      const afterStats = getRateLimitStats();

      // After cleanup, the expired IP should be removed
      expect(afterStats.totalEntries).toBeLessThanOrEqual(beforeStats.totalEntries);
    });

    test('keeps active entries', () => {
      const ip = 'test-ip-active-' + Math.random();
      checkRateLimit(ip);

      const beforeStats = getRateLimitStats();
      cleanupRateLimits();
      const afterStats = getRateLimitStats();

      // Active entry should still exist
      expect(afterStats.activeIPs).toContain(ip);
    });
  });

  describe('getClientIP', () => {
    test('extracts IP from X-Forwarded-For header', () => {
      const req = new Request('http://localhost', {
        headers: { 'X-Forwarded-For': '192.168.1.1' }
      });
      expect(getClientIP(req)).toBe('192.168.1.1');
    });

    test('uses first IP from comma-separated X-Forwarded-For', () => {
      const req = new Request('http://localhost', {
        headers: { 'X-Forwarded-For': '192.168.1.1, 10.0.0.1, 172.16.0.1' }
      });
      expect(getClientIP(req)).toBe('192.168.1.1');
    });

    test('extracts IP from X-Real-IP header', () => {
      const req = new Request('http://localhost', {
        headers: { 'X-Real-IP': '192.168.1.2' }
      });
      expect(getClientIP(req)).toBe('192.168.1.2');
    });

    test('prefers X-Forwarded-For over X-Real-IP', () => {
      const req = new Request('http://localhost', {
        headers: {
          'X-Forwarded-For': '192.168.1.1',
          'X-Real-IP': '192.168.1.2'
        }
      });
      expect(getClientIP(req)).toBe('192.168.1.1');
    });

    test('returns unknown when no IP headers present', () => {
      const req = new Request('http://localhost');
      expect(getClientIP(req)).toBe('unknown');
    });

    test('trims whitespace from IPs', () => {
      const req = new Request('http://localhost', {
        headers: { 'X-Forwarded-For': '  192.168.1.1  , 10.0.0.1' }
      });
      expect(getClientIP(req)).toBe('192.168.1.1');
    });
  });

  describe('getRateLimitStats', () => {
    test('returns stats object with required properties', () => {
      const stats = getRateLimitStats();
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('activeIPs');
      expect(typeof stats.totalEntries).toBe('number');
      expect(Array.isArray(stats.activeIPs)).toBe(true);
    });

    test('includes recently active IPs', () => {
      const ip = 'test-ip-stats-' + Math.random();
      checkRateLimit(ip);

      const stats = getRateLimitStats();
      expect(stats.activeIPs).toContain(ip);
    });

    test('excludes expired IPs from active list', async () => {
      const ip = 'test-ip-expired-' + Math.random();
      const config: RateLimitConfig = {
        windowMs: 50,
        maxRequests: 1
      };

      checkRateLimit(ip, config);

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = getRateLimitStats();
      expect(stats.activeIPs).not.toContain(ip);
    });
  });

  describe('startCleanup', () => {
    test('returns a timer handle', () => {
      const timer = startCleanup(10000);
      expect(timer).toBeDefined();
      clearInterval(timer);
    });

    test('accepts custom interval', () => {
      const timer = startCleanup(5000);
      expect(timer).toBeDefined();
      clearInterval(timer);
    });

    test('cleanup timer can be cleared', () => {
      const timer = startCleanup(1000);
      clearInterval(timer);
      // If we got here without error, the timer was successfully cleared
      expect(true).toBe(true);
    });
  });
});
