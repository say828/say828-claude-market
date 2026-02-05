import { logger } from './logger';

// Custom error classes
export class OrchestratorError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'OrchestratorError';
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends OrchestratorError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

export class ValidationError extends OrchestratorError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class AuthError extends OrchestratorError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
  }
}

export class SessionError extends OrchestratorError {
  constructor(message: string) {
    super(message, 'SESSION_ERROR', 400);
  }
}

export class FileSystemError extends OrchestratorError {
  constructor(message: string, details?: unknown) {
    super(message, 'FILESYSTEM_ERROR', 500, details);
  }
}

// Error response formatter
export function formatErrorResponse(error: unknown): {
  error: string;
  code?: string;
  details?: unknown;
} {
  if (error instanceof OrchestratorError) {
    const response: { error: string; code: string; details?: unknown } = {
      error: error.message,
      code: error.code
    };

    // Only include details in development
    if (process.env.NODE_ENV !== 'production' && error.details) {
      response.details = error.details;
    }

    return response;
  }

  if (error instanceof Error) {
    // In development, include stack trace
    if (process.env.NODE_ENV !== 'production') {
      return {
        error: error.message,
        details: { stack: error.stack }
      };
    }
    return { error: error.message };
  }

  return { error: String(error) };
}

// Safe async handler wrapper for HTTP endpoints
export function asyncHandler<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<T | Response> {
  return fn().catch(error => {
    // Log the error with context
    const ctx = context || 'API';
    logger.error(`${ctx} error`, error, {
      context: ctx
    });

    const formatted = formatErrorResponse(error);
    const status = error instanceof OrchestratorError ? error.statusCode : 500;

    return Response.json(formatted, { status });
  });
}

// Safe wrapper for WebSocket message handlers
export function safeWebSocketHandler(
  fn: () => void,
  context?: string
): void {
  try {
    fn();
  } catch (error) {
    const ctx = context || 'WebSocket';
    logger.error(`${ctx} error`, error, {
      context: ctx
    });
  }
}

// Validation helpers
export function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ValidationError(`${fieldName} is required and must be a non-empty string`);
  }
  return value;
}

export function requireBoolean(value: unknown, fieldName: string): boolean {
  if (typeof value !== 'boolean') {
    throw new ValidationError(`${fieldName} is required and must be a boolean`);
  }
  return value;
}

export function requireObject(value: unknown, fieldName: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(`${fieldName} is required and must be an object`);
  }
  return value as Record<string, unknown>;
}
