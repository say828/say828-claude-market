/**
 * Authentication middleware for Claude Orchestrator
 *
 * Token-based authentication (optional, enabled via environment variable)
 * Environment variable: ORCHESTRATOR_TOKEN
 * If set, all requests must include this token
 */

/**
 * Check if authentication is enabled
 */
export function isAuthEnabled(): boolean {
  return !!process.env.ORCHESTRATOR_TOKEN;
}

/**
 * Validate a token against the configured token
 */
export function validateToken(token: string | null): boolean {
  if (!isAuthEnabled()) return true;
  if (!token) return false;
  return token === process.env.ORCHESTRATOR_TOKEN;
}

/**
 * Extract token from request
 * Checks in order:
 * 1. Authorization header: Bearer <token>
 * 2. Query parameter: ?token=<token>
 * 3. Cookie: orchestrator_token=<token>
 */
export function getTokenFromRequest(req: Request): string | null {
  const url = new URL(req.url);

  // Check Authorization header (Bearer token)
  const authHeader = req.headers.get('Authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      return match[1];
    }
  }

  // Check query parameter
  const queryToken = url.searchParams.get('token');
  if (queryToken) {
    return queryToken;
  }

  // Check cookie
  const cookieHeader = req.headers.get('Cookie');
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map(c => c.trim());
    for (const cookie of cookies) {
      const [name, value] = cookie.split('=');
      if (name === 'orchestrator_token' && value) {
        return decodeURIComponent(value);
      }
    }
  }

  return null;
}

/**
 * Middleware-style function for Bun.serve
 * Returns 401 Response if auth fails, null if OK
 */
export function requireAuth(req: Request): Response | null {
  if (!isAuthEnabled()) {
    return null; // Auth not enabled, allow all
  }

  const token = getTokenFromRequest(req);
  if (validateToken(token)) {
    return null; // Auth successful
  }

  // Auth failed
  return new Response(JSON.stringify({
    error: 'Unauthorized',
    message: 'Valid authentication token required'
  }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': 'Bearer realm="Claude Orchestrator"'
    }
  });
}

/**
 * Check if WebSocket upgrade request is authenticated
 */
export function validateWebSocketAuth(req: Request): boolean {
  if (!isAuthEnabled()) {
    return true; // Auth not enabled, allow all
  }

  const token = getTokenFromRequest(req);
  return validateToken(token);
}
