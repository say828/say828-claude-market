import { describe, test, expect } from 'bun:test';
import {
  OrchestratorError,
  NotFoundError,
  ValidationError,
  SessionError,
  FileSystemError,
  formatErrorResponse,
  requireString,
  requireBoolean,
  requireObject
} from '../error-handler';

describe('Error Classes', () => {
  test('OrchestratorError should have correct properties', () => {
    const error = new OrchestratorError('Test error', 'TEST_ERROR', 500, { foo: 'bar' });
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.statusCode).toBe(500);
    expect(error.details).toEqual({ foo: 'bar' });
    expect(error.name).toBe('OrchestratorError');
  });

  test('NotFoundError should have 404 status', () => {
    const error = new NotFoundError('Resource');
    expect(error.message).toBe('Resource not found');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.statusCode).toBe(404);
  });

  test('ValidationError should have 400 status', () => {
    const error = new ValidationError('Invalid input', { field: 'email' });
    expect(error.message).toBe('Invalid input');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ field: 'email' });
  });

  test('SessionError should have 400 status', () => {
    const error = new SessionError('Session expired');
    expect(error.message).toBe('Session expired');
    expect(error.code).toBe('SESSION_ERROR');
    expect(error.statusCode).toBe(400);
  });

  test('FileSystemError should have 500 status', () => {
    const error = new FileSystemError('File not found', { path: '/test' });
    expect(error.message).toBe('File not found');
    expect(error.code).toBe('FILESYSTEM_ERROR');
    expect(error.statusCode).toBe(500);
  });
});

describe('formatErrorResponse', () => {
  test('should format OrchestratorError correctly', () => {
    const error = new OrchestratorError('Test error', 'TEST_ERROR', 500, { detail: 'info' });
    const formatted = formatErrorResponse(error);
    expect(formatted.error).toBe('Test error');
    expect(formatted.code).toBe('TEST_ERROR');
    // Details are included in dev, excluded in production
    if (process.env.NODE_ENV === 'production') {
      expect(formatted.details).toBeUndefined();
    } else {
      expect(formatted.details).toBeDefined();
    }
  });

  test('should format standard Error correctly', () => {
    const error = new Error('Standard error');
    const formatted = formatErrorResponse(error);
    expect(formatted.error).toBe('Standard error');
    expect(formatted.code).toBeUndefined();
  });

  test('should format string error correctly', () => {
    const formatted = formatErrorResponse('String error');
    expect(formatted.error).toBe('String error');
  });
});

describe('Validation Helpers', () => {
  test('requireString should validate strings', () => {
    expect(requireString('test', 'field')).toBe('test');
    expect(() => requireString('', 'field')).toThrow(ValidationError);
    expect(() => requireString(null, 'field')).toThrow(ValidationError);
    expect(() => requireString(undefined, 'field')).toThrow(ValidationError);
    expect(() => requireString(123, 'field')).toThrow(ValidationError);
  });

  test('requireBoolean should validate booleans', () => {
    expect(requireBoolean(true, 'field')).toBe(true);
    expect(requireBoolean(false, 'field')).toBe(false);
    expect(() => requireBoolean('true', 'field')).toThrow(ValidationError);
    expect(() => requireBoolean(1, 'field')).toThrow(ValidationError);
    expect(() => requireBoolean(null, 'field')).toThrow(ValidationError);
  });

  test('requireObject should validate objects', () => {
    const obj = { key: 'value' };
    expect(requireObject(obj, 'field')).toEqual(obj);
    expect(() => requireObject(null, 'field')).toThrow(ValidationError);
    expect(() => requireObject([], 'field')).toThrow(ValidationError);
    expect(() => requireObject('object', 'field')).toThrow(ValidationError);
  });
});
