import { describe, test, expect } from 'bun:test';
import { formatToolResult, parseCatNOutput, highlightMatches } from '../../utils/toolResultFormatter';

describe('Tool Result Formatter', () => {
  describe('formatToolResult', () => {
    test('handles empty output', () => {
      const result = formatToolResult('Bash', { command: 'ls' }, '');
      expect(result.type).toBe('text');
      expect(result.content).toBe('(empty output)');
      expect(result.metadata?.isEmpty).toBe(true);
    });

    test('formats Bash tool results', () => {
      const input = { command: 'echo "hello"', description: 'Print hello' };
      const output = 'hello';
      const result = formatToolResult('Bash', input, output);

      expect(result.type).toBe('code');
      expect(result.title).toBe('$ echo "hello"');
      expect(result.language).toBe('bash');
      expect(result.content).toBe('hello');
      expect(result.metadata?.command).toBe('echo "hello"');
    });

    test('detects errors in Bash output', () => {
      const input = { command: 'invalid-command' };
      const output = 'bash: invalid-command: command not found';
      const result = formatToolResult('Bash', input, output);

      expect(result.isError).toBe(true);
    });

    test('formats Read tool results', () => {
      const input = { file_path: '/path/to/file.ts' };
      const output = '  1\tconst x = 1;\n  2\tconst y = 2;';
      const result = formatToolResult('Read', input, output);

      expect(result.type).toBe('file');
      expect(result.title).toBe('/path/to/file.ts');
      expect(result.filename).toBe('/path/to/file.ts');
      expect(result.language).toBe('typescript');
      expect(result.metadata?.hasLineNumbers).toBe(true);
    });

    test('formats Edit tool results with diff', () => {
      const input = {
        file_path: '/path/to/file.js',
        old_string: 'const x = 1;',
        new_string: 'const x = 2;',
        replace_all: false
      };
      const output = 'File edited successfully';
      const result = formatToolResult('Edit', input, output);

      expect(result.type).toBe('diff');
      expect(result.filename).toBe('/path/to/file.js');
      expect(result.oldContent).toBe('const x = 1;');
      expect(result.content).toBe('const x = 2;');
      expect(result.metadata?.replaceAll).toBe(false);
    });

    test('formats Write tool results', () => {
      const input = { file_path: '/new/file.py', content: 'print("test")' };
      const output = 'File created';
      const result = formatToolResult('Write', input, output);

      expect(result.type).toBe('file');
      expect(result.filename).toBe('/new/file.py');
      expect(result.language).toBe('python');
    });

    test('formats Grep tool results', () => {
      const input = { pattern: 'error', path: './src', output_mode: 'content' };
      const output = 'src/file1.ts:10:Error occurred\nsrc/file2.ts:25:Error handling';
      const result = formatToolResult('Grep', input, output);

      expect(result.type).toBe('search');
      expect(result.title).toBe('Grep: error');
      expect(result.metadata?.pattern).toBe('error');
      expect(result.metadata?.matches).toBeDefined();
    });

    test('parses Grep content mode output', () => {
      const input = { pattern: 'test', output_mode: 'content' };
      const output = 'file.ts:10:test line\nfile.ts:20:another test';
      const result = formatToolResult('Grep', input, output);

      const matches = result.metadata?.matches as Array<{ file?: string; line?: number; content?: string }>;
      expect(matches).toHaveLength(2);
      expect(matches[0]).toEqual({ file: 'file.ts', line: 10, content: 'test line' });
    });

    test('formats Glob tool results', () => {
      const input = { pattern: '**/*.ts', path: './src' };
      const output = 'src/file1.ts\nsrc/file2.ts\nsrc/file3.ts';
      const result = formatToolResult('Glob', input, output);

      expect(result.type).toBe('search');
      expect(result.title).toBe('Glob: **/*.ts');
      expect(result.metadata?.count).toBe(3);
      expect(result.metadata?.files).toEqual(['src/file1.ts', 'src/file2.ts', 'src/file3.ts']);
    });

    test('formats Task tool results', () => {
      const input = { subagent_type: 'explorer', prompt: 'Find all TODOs' };
      const output = 'Found 5 TODO items';
      const result = formatToolResult('Task', input, output);

      expect(result.type).toBe('text');
      expect(result.title).toBe('Task: explorer');
      expect(result.metadata?.subagentType).toBe('explorer');
      expect(result.metadata?.prompt).toBe('Find all TODOs');
    });

    test('formats WebFetch tool results', () => {
      const input = { url: 'https://api.example.com/data' };
      const output = '{"status": "success"}';
      const result = formatToolResult('WebFetch', input, output);

      expect(result.type).toBe('text');
      expect(result.title).toContain('WebFetch');
      expect(result.metadata?.url).toBe('https://api.example.com/data');
    });

    test('formats WebSearch tool results', () => {
      const input = { query: 'test query' };
      const output = 'Search results...';
      const result = formatToolResult('WebSearch', input, output);

      expect(result.type).toBe('text');
      expect(result.metadata?.query).toBe('test query');
    });

    test('handles unknown tool types', () => {
      const input = { someParam: 'value' };
      const output = 'Some output';
      const result = formatToolResult('UnknownTool', input, output);

      expect(result.type).toBe('text');
      expect(result.title).toBe('UnknownTool');
      expect(result.content).toBe('Some output');
    });
  });

  describe('parseCatNOutput', () => {
    test('parses cat -n style output with line numbers', () => {
      const output = '     1\tFirst line\n     2\tSecond line\n     3\tThird line';
      const result = parseCatNOutput(output);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ lineNumber: 1, content: 'First line' });
      expect(result[1]).toEqual({ lineNumber: 2, content: 'Second line' });
      expect(result[2]).toEqual({ lineNumber: 3, content: 'Third line' });
    });

    test('handles mixed formatted and unformatted lines', () => {
      const output = '     1\tFormatted line\nUnformatted line\n     2\tAnother formatted';
      const result = parseCatNOutput(output);

      expect(result).toHaveLength(3);
      expect(result[0].lineNumber).toBe(1);
      expect(result[1].content).toBe('Unformatted line');
      expect(result[2].lineNumber).toBe(2);
    });

    test('handles empty output', () => {
      const result = parseCatNOutput('');
      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('');
    });

    test('handles lines with varying indentation', () => {
      const output = '  1\tLine one\n    10\tLine ten\n   100\tLine hundred';
      const result = parseCatNOutput(output);

      expect(result).toHaveLength(3);
      expect(result[0].lineNumber).toBe(1);
      expect(result[1].lineNumber).toBe(10);
      expect(result[2].lineNumber).toBe(100);
    });

    test('preserves empty lines', () => {
      const output = '     1\tFirst\n     2\t\n     3\tThird';
      const result = parseCatNOutput(output);

      expect(result).toHaveLength(3);
      expect(result[1].content).toBe('');
    });
  });

  describe('highlightMatches', () => {
    test('highlights simple text matches', () => {
      const result = highlightMatches('Hello world, hello there', 'hello');
      expect(result).toContain('<mark>Hello</mark>');
      expect(result).toContain('<mark>hello</mark>');
    });

    test('highlights regex pattern matches', () => {
      const result = highlightMatches('error123 and error456', 'error\\d+', true);
      expect(result).toContain('<mark>error123</mark>');
      expect(result).toContain('<mark>error456</mark>');
    });

    test('returns original text if pattern is empty', () => {
      const text = 'Original text';
      const result = highlightMatches(text, '');
      expect(result).toBe(text);
    });

    test('handles invalid regex gracefully', () => {
      const text = 'Test text';
      const result = highlightMatches(text, '[invalid(', true);
      expect(result).toBe(text);
    });

    test('escapes special regex characters in non-regex mode', () => {
      const result = highlightMatches('Cost is $100', '$100', false);
      expect(result).toContain('<mark>$100</mark>');
    });

    test('is case insensitive', () => {
      const result = highlightMatches('Test TEST test', 'test');
      expect(result).toContain('<mark>Test</mark>');
      expect(result).toContain('<mark>TEST</mark>');
      expect(result).toContain('<mark>test</mark>');
    });

    test('handles multiple occurrences', () => {
      const result = highlightMatches('one two one three one', 'one');
      const matches = result.match(/<mark>one<\/mark>/g);
      expect(matches).toHaveLength(3);
    });

    test('does not modify text without matches', () => {
      const text = 'No matches here';
      const result = highlightMatches(text, 'xyz');
      expect(result).toBe(text);
    });
  });
});
