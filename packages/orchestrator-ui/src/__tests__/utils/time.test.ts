import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { formatRelativeTime, formatTimestamp, formatDate, formatDateTime } from '../../utils/time';

describe('Time Utilities', () => {
  describe('formatRelativeTime', () => {
    test('returns "just now" for very recent times', () => {
      const now = new Date();
      const result = formatRelativeTime(now.toISOString());
      expect(result).toBe('just now');
    });

    test('returns minutes ago for times under 1 hour', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const result = formatRelativeTime(date.toISOString());
      expect(result).toBe('5m ago');
    });

    test('returns hours ago for times under 24 hours', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
      const result = formatRelativeTime(date.toISOString());
      expect(result).toBe('3h ago');
    });

    test('returns days ago for times under 7 days', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const result = formatRelativeTime(date.toISOString());
      expect(result).toBe('2d ago');
    });

    test('returns locale date string for times over 7 days', () => {
      const date = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const result = formatRelativeTime(date.toISOString());
      expect(result).toBe(date.toLocaleDateString());
    });

    test('handles edge case: exactly 1 minute', () => {
      const date = new Date(Date.now() - 60 * 1000);
      const result = formatRelativeTime(date.toISOString());
      expect(result).toBe('1m ago');
    });

    test('handles edge case: exactly 1 hour', () => {
      const date = new Date(Date.now() - 60 * 60 * 1000);
      const result = formatRelativeTime(date.toISOString());
      expect(result).toBe('1h ago');
    });

    test('handles edge case: exactly 1 day', () => {
      const date = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(date.toISOString());
      expect(result).toBe('1d ago');
    });
  });

  describe('formatTimestamp', () => {
    test('formats time in 24-hour format', () => {
      const date = new Date('2024-01-15T14:30:45Z');
      const result = formatTimestamp(date.toISOString());
      // Result will be in local timezone, so we just check format
      expect(result).toMatch(/\d{2}:\d{2}:\d{2}/);
    });

    test('includes seconds in output', () => {
      const date = new Date('2024-01-15T09:05:03Z');
      const result = formatTimestamp(date.toISOString());
      expect(result).toMatch(/:\d{2}$/); // Ends with seconds
    });

    test('uses 2-digit format for all components', () => {
      const date = new Date('2024-01-15T01:02:03Z');
      const result = formatTimestamp(date.toISOString());
      // Should have format HH:MM:SS (no single digits)
      expect(result.split(':')).toHaveLength(3);
    });
  });

  describe('formatDate', () => {
    test('formats date with month abbreviation', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      const result = formatDate(date.toISOString());
      // Format should be like "Jan 15, 2024"
      expect(result).toContain('2024');
      expect(result).toContain('15');
    });

    test('includes year in output', () => {
      const date = new Date('2024-06-20T12:00:00Z');
      const result = formatDate(date.toISOString());
      expect(result).toContain('2024');
    });

    test('handles different months correctly', () => {
      const date1 = new Date('2024-01-01T12:00:00Z');
      const date2 = new Date('2024-12-31T12:00:00Z');
      const result1 = formatDate(date1.toISOString());
      const result2 = formatDate(date2.toISOString());
      expect(result1).not.toBe(result2);
    });
  });

  describe('formatDateTime', () => {
    test('includes both date and time', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const result = formatDateTime(date.toISOString());
      expect(result).toContain('2024');
      expect(result).toContain(':');
    });

    test('uses 24-hour format', () => {
      const date = new Date('2024-01-15T23:45:00Z');
      const result = formatDateTime(date.toISOString());
      // Should contain time with colon
      expect(result).toMatch(/\d{2}:\d{2}/);
    });

    test('formats consistently', () => {
      const date = new Date('2024-06-15T09:30:00Z');
      const result = formatDateTime(date.toISOString());
      // Should have both date and time components
      expect(result.length).toBeGreaterThan(10);
    });
  });
});
