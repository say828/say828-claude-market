import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { isAuthEnabled, validateToken, getTokenFromRequest, requireAuth, validateWebSocketAuth } from '../auth';

describe('Auth', () => {
  let originalToken: string | undefined;

  beforeEach(() => {
    // Save original token
    originalToken = process.env.ORCHESTRATOR_TOKEN;
  });

  afterEach(() => {
    // Restore original token
    if (originalToken !== undefined) {
      process.env.ORCHESTRATOR_TOKEN = originalToken;
    } else {
      delete process.env.ORCHESTRATOR_TOKEN;
    }
  });

  describe('isAuthEnabled', () => {
    test('returns false when token is not set', () => {
      delete process.env.ORCHESTRATOR_TOKEN;
      expect(isAuthEnabled()).toBe(false);
    });

    test('returns true when token is set', () => {
      process.env.ORCHESTRATOR_TOKEN = 'test-token';
      expect(isAuthEnabled()).toBe(true);
    });

    test('returns false when token is empty string', () => {
      process.env.ORCHESTRATOR_TOKEN = '';
      expect(isAuthEnabled()).toBe(false);
    });
  });

  describe('validateToken', () => {
    test('returns true when auth is disabled', () => {
      delete process.env.ORCHESTRATOR_TOKEN;
      expect(validateToken(null)).toBe(true);
      expect(validateToken('any-token')).toBe(true);
    });

    test('validates correct token', () => {
      process.env.ORCHESTRATOR_TOKEN = 'test-token';
      expect(validateToken('test-token')).toBe(true);
    });

    test('rejects invalid token', () => {
      process.env.ORCHESTRATOR_TOKEN = 'test-token';
      expect(validateToken('wrong-token')).toBe(false);
    });

    test('rejects null token when auth is enabled', () => {
      process.env.ORCHESTRATOR_TOKEN = 'test-token';
      expect(validateToken(null)).toBe(false);
    });

    test('rejects empty string token when auth is enabled', () => {
      process.env.ORCHESTRATOR_TOKEN = 'test-token';
      expect(validateToken('')).toBe(false);
    });
  });

  describe('getTokenFromRequest', () => {
    test('extracts token from Authorization header', () => {
      const req = new Request('http://localhost', {
        headers: { 'Authorization': 'Bearer test-token' }
      });
      expect(getTokenFromRequest(req)).toBe('test-token');
    });

    test('handles Bearer keyword case insensitively', () => {
      const req = new Request('http://localhost', {
        headers: { 'Authorization': 'bearer test-token' }
      });
      expect(getTokenFromRequest(req)).toBe('test-token');
    });

    test('extracts token from query parameter', () => {
      const req = new Request('http://localhost?token=test-token');
      expect(getTokenFromRequest(req)).toBe('test-token');
    });

    test('extracts token from cookie', () => {
      const req = new Request('http://localhost', {
        headers: { 'Cookie': 'orchestrator_token=test-token' }
      });
      expect(getTokenFromRequest(req)).toBe('test-token');
    });

    test('handles multiple cookies', () => {
      const req = new Request('http://localhost', {
        headers: { 'Cookie': 'other_cookie=value; orchestrator_token=test-token; another=value' }
      });
      expect(getTokenFromRequest(req)).toBe('test-token');
    });

    test('decodes URL-encoded cookie value', () => {
      const req = new Request('http://localhost', {
        headers: { 'Cookie': 'orchestrator_token=test%20token' }
      });
      expect(getTokenFromRequest(req)).toBe('test token');
    });

    test('returns null when no token found', () => {
      const req = new Request('http://localhost');
      expect(getTokenFromRequest(req)).toBe(null);
    });

    test('prefers Authorization header over query parameter', () => {
      const req = new Request('http://localhost?token=query-token', {
        headers: { 'Authorization': 'Bearer header-token' }
      });
      expect(getTokenFromRequest(req)).toBe('header-token');
    });

    test('prefers query parameter over cookie', () => {
      const req = new Request('http://localhost?token=query-token', {
        headers: { 'Cookie': 'orchestrator_token=cookie-token' }
      });
      expect(getTokenFromRequest(req)).toBe('query-token');
    });
  });

  describe('requireAuth', () => {
    test('returns null when auth is disabled', () => {
      delete process.env.ORCHESTRATOR_TOKEN;
      const req = new Request('http://localhost');
      expect(requireAuth(req)).toBe(null);
    });

    test('returns null when valid token provided', () => {
      process.env.ORCHESTRATOR_TOKEN = 'test-token';
      const req = new Request('http://localhost', {
        headers: { 'Authorization': 'Bearer test-token' }
      });
      expect(requireAuth(req)).toBe(null);
    });

    test('returns 401 response when auth enabled but no token', () => {
      process.env.ORCHESTRATOR_TOKEN = 'test-token';
      const req = new Request('http://localhost');
      const response = requireAuth(req);
      expect(response).not.toBe(null);
      expect(response?.status).toBe(401);
    });

    test('returns 401 response when invalid token provided', () => {
      process.env.ORCHESTRATOR_TOKEN = 'test-token';
      const req = new Request('http://localhost', {
        headers: { 'Authorization': 'Bearer wrong-token' }
      });
      const response = requireAuth(req);
      expect(response).not.toBe(null);
      expect(response?.status).toBe(401);
    });

    test('401 response includes WWW-Authenticate header', async () => {
      process.env.ORCHESTRATOR_TOKEN = 'test-token';
      const req = new Request('http://localhost');
      const response = requireAuth(req);
      expect(response?.headers.get('WWW-Authenticate')).toContain('Bearer');
    });

    test('401 response includes JSON error message', async () => {
      process.env.ORCHESTRATOR_TOKEN = 'test-token';
      const req = new Request('http://localhost');
      const response = requireAuth(req);
      const body = await response?.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('validateWebSocketAuth', () => {
    test('returns true when auth is disabled', () => {
      delete process.env.ORCHESTRATOR_TOKEN;
      const req = new Request('http://localhost');
      expect(validateWebSocketAuth(req)).toBe(true);
    });

    test('returns true when valid token provided', () => {
      process.env.ORCHESTRATOR_TOKEN = 'test-token';
      const req = new Request('http://localhost?token=test-token');
      expect(validateWebSocketAuth(req)).toBe(true);
    });

    test('returns false when auth enabled but no token', () => {
      process.env.ORCHESTRATOR_TOKEN = 'test-token';
      const req = new Request('http://localhost');
      expect(validateWebSocketAuth(req)).toBe(false);
    });

    test('returns false when invalid token provided', () => {
      process.env.ORCHESTRATOR_TOKEN = 'test-token';
      const req = new Request('http://localhost?token=wrong-token');
      expect(validateWebSocketAuth(req)).toBe(false);
    });
  });
});
