import { describe, test, expect } from 'bun:test';
import { parseAnsiCodes, parseAnsi, type AnsiStyle } from '../../utils/ansi';

describe('ANSI Parser', () => {
  describe('parseAnsiCodes', () => {
    test('returns empty style for reset code (0)', () => {
      const style = parseAnsiCodes([0]);
      expect(style).toEqual({});
    });

    test('parses bold code (1)', () => {
      const style = parseAnsiCodes([1]);
      expect(style.fontWeight).toBe('bold');
    });

    test('parses dim/faint code (2)', () => {
      const style = parseAnsiCodes([2]);
      expect(style.opacity).toBe(0.7);
    });

    test('parses italic code (3)', () => {
      const style = parseAnsiCodes([3]);
      expect(style.fontStyle).toBe('italic');
    });

    test('parses underline code (4)', () => {
      const style = parseAnsiCodes([4]);
      expect(style.textDecoration).toBe('underline');
    });

    test('parses strikethrough code (9)', () => {
      const style = parseAnsiCodes([9]);
      expect(style.textDecoration).toBe('line-through');
    });

    test('parses multiple codes', () => {
      const style = parseAnsiCodes([1, 3, 4]);
      expect(style.fontWeight).toBe('bold');
      expect(style.fontStyle).toBe('italic');
      expect(style.textDecoration).toBe('underline');
    });

    test('reset code clears all styles', () => {
      const style = parseAnsiCodes([1, 3, 0]);
      expect(style).toEqual({});
    });
  });

  describe('parseAnsi', () => {
    test('parses plain text without ANSI codes', () => {
      const segments = parseAnsi('Hello World');
      expect(segments.length).toBe(1);
      expect(segments[0].text).toBe('Hello World');
      expect(segments[0].style).toEqual({});
    });

    test('parses text with single ANSI code', () => {
      const segments = parseAnsi('\x1b[1mBold Text\x1b[0m');
      expect(segments.length).toBe(1);
      expect(segments[0].text).toBe('Bold Text');
      expect(segments[0].style.fontWeight).toBe('bold');
    });

    test('parses multiple segments with different styles', () => {
      const text = 'Normal \x1b[1mBold\x1b[0m Normal \x1b[3mItalic\x1b[0m';
      const segments = parseAnsi(text);

      expect(segments.length).toBe(4);
      expect(segments[0].text).toBe('Normal ');
      expect(segments[0].style).toEqual({});

      expect(segments[1].text).toBe('Bold');
      expect(segments[1].style.fontWeight).toBe('bold');

      expect(segments[2].text).toBe(' Normal ');

      expect(segments[3].text).toBe('Italic');
      expect(segments[3].style.fontStyle).toBe('italic');
    });

    test('handles empty string', () => {
      const segments = parseAnsi('');
      expect(segments.length).toBe(1);
      expect(segments[0].text).toBe('');
    });

    test('handles only ANSI codes without text', () => {
      const segments = parseAnsi('\x1b[1m\x1b[0m');
      // When there are only ANSI codes with no actual text, parseAnsi returns the fallback
      expect(segments.length).toBeGreaterThanOrEqual(1);
    });

    test('preserves style until reset', () => {
      const text = '\x1b[1mBold text continues\x1b[0m';
      const segments = parseAnsi(text);
      expect(segments.length).toBe(1);
      expect(segments[0].text).toBe('Bold text continues');
      expect(segments[0].style.fontWeight).toBe('bold');
    });

    test('handles multiple semicolon-separated codes', () => {
      const text = '\x1b[1;3;4mBold Italic Underline\x1b[0m';
      const segments = parseAnsi(text);
      expect(segments.length).toBe(1);
      expect(segments[0].style.fontWeight).toBe('bold');
      expect(segments[0].style.fontStyle).toBe('italic');
      expect(segments[0].style.textDecoration).toBe('underline');
    });

    test('handles text before and after ANSI codes', () => {
      const text = 'Start \x1b[1mMiddle\x1b[0m End';
      const segments = parseAnsi(text);
      expect(segments.length).toBe(3);
      expect(segments[0].text).toBe('Start ');
      expect(segments[1].text).toBe('Middle');
      expect(segments[2].text).toBe(' End');
    });

    test('handles consecutive ANSI codes', () => {
      const text = '\x1b[1m\x1b[3mBold and Italic\x1b[0m';
      const segments = parseAnsi(text);
      expect(segments[0].style.fontWeight).toBe('bold');
      expect(segments[0].style.fontStyle).toBe('italic');
    });

    test('returns single segment with text if no codes', () => {
      const text = 'No codes here';
      const segments = parseAnsi(text);
      expect(segments).toEqual([{ text: 'No codes here', style: {} }]);
    });
  });
});
