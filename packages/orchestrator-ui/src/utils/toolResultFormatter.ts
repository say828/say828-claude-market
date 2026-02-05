/**
 * Tool result formatting utilities for Claude Orchestrator UI
 * Formats different tool outputs into structured data for rendering
 */

export interface FormattedToolResult {
  type: 'code' | 'diff' | 'text' | 'file' | 'search';
  title?: string;
  language?: string;
  filename?: string;
  content: string;
  oldContent?: string;  // For diffs
  isError?: boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Detect if output contains error indicators
 */
function detectError(output: string): boolean {
  const errorPatterns = [
    /^error:/im,
    /^fatal:/im,
    /^bash:.*command not found/im,
    /^sh:.*command not found/im,
    /permission denied/im,
    /^traceback \(most recent call last\)/im,
    /^exception/im,
    /^\w+error:/im, // TypeError, ValueError, etc.
  ];

  return errorPatterns.some((pattern) => pattern.test(output));
}

/**
 * Extract language from file extension
 */
function getLanguageFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  const extensionMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    swift: 'swift',
    kt: 'kotlin',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    fish: 'fish',
    md: 'markdown',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    xml: 'xml',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sql: 'sql',
    dockerfile: 'dockerfile',
  };

  return extensionMap[ext || ''] || 'plaintext';
}

/**
 * Format Bash tool results
 */
function formatBashResult(input: Record<string, unknown>, output: string): FormattedToolResult {
  const command = input.command as string || '';
  const isError = detectError(output);

  return {
    type: 'code',
    title: `$ ${command}`,
    language: 'bash',
    content: output,
    isError,
    metadata: {
      command,
      description: input.description,
      timeout: input.timeout,
    },
  };
}

/**
 * Format Read tool results
 */
function formatReadResult(input: Record<string, unknown>, output: string): FormattedToolResult {
  const filePath = input.file_path as string || '';
  const filename = filePath.split('/').pop() || filePath;
  const language = getLanguageFromExtension(filename);

  // Check if it's a cat -n style output with line numbers
  const hasLineNumbers = /^\s+\d+\t/.test(output);

  return {
    type: 'file',
    title: filePath,
    filename: filePath,
    language,
    content: output,
    metadata: {
      filePath,
      offset: input.offset,
      limit: input.limit,
      hasLineNumbers,
    },
  };
}

/**
 * Format Edit/Write tool results
 */
function formatEditResult(input: Record<string, unknown>, output: string): FormattedToolResult {
  const filePath = input.file_path as string || '';
  const filename = filePath.split('/').pop() || filePath;
  const oldString = input.old_string as string || '';
  const newString = input.new_string as string || '';

  // If we have old_string and new_string, format as diff
  if (oldString && newString) {
    return {
      type: 'diff',
      title: filePath,
      filename: filePath,
      language: getLanguageFromExtension(filename),
      content: newString,
      oldContent: oldString,
      metadata: {
        filePath,
        replaceAll: input.replace_all,
      },
    };
  }

  // For Write tool or edits without old/new strings
  return {
    type: 'file',
    title: filePath,
    filename: filePath,
    language: getLanguageFromExtension(filename),
    content: output,
    metadata: {
      filePath,
      operation: oldString ? 'edit' : 'write',
    },
  };
}

/**
 * Format Grep tool results
 */
function formatGrepResult(input: Record<string, unknown>, output: string): FormattedToolResult {
  const pattern = input.pattern as string || '';
  const path = input.path as string || '.';
  const outputMode = input.output_mode as string || 'files_with_matches';

  // Parse search results
  const lines = output.trim().split('\n');
  const matches: Array<{ file?: string; line?: number; content?: string }> = [];

  if (outputMode === 'content') {
    // Format: file:line:content or just content
    lines.forEach((line) => {
      const match = line.match(/^(.+?):(\d+):(.*)$/);
      if (match) {
        matches.push({
          file: match[1],
          line: parseInt(match[2], 10),
          content: match[3],
        });
      } else {
        matches.push({ content: line });
      }
    });
  } else if (outputMode === 'count') {
    // Format: file:count
    lines.forEach((line) => {
      const match = line.match(/^(.+?):(\d+)$/);
      if (match) {
        matches.push({
          file: match[1],
          line: parseInt(match[2], 10),
        });
      }
    });
  } else {
    // files_with_matches: just file paths
    lines.forEach((line) => {
      if (line.trim()) {
        matches.push({ file: line });
      }
    });
  }

  return {
    type: 'search',
    title: `Grep: ${pattern}`,
    content: output,
    metadata: {
      pattern,
      path,
      outputMode,
      matches,
      glob: input.glob,
      type: input.type,
    },
  };
}

/**
 * Format Glob tool results
 */
function formatGlobResult(input: Record<string, unknown>, output: string): FormattedToolResult {
  const pattern = input.pattern as string || '';
  const path = input.path as string || '.';

  const files = output.trim().split('\n').filter(Boolean);

  return {
    type: 'search',
    title: `Glob: ${pattern}`,
    content: output,
    metadata: {
      pattern,
      path,
      files,
      count: files.length,
    },
  };
}

/**
 * Format Task tool results
 */
function formatTaskResult(input: Record<string, unknown>, output: string): FormattedToolResult {
  const subagentType = input.subagent_type as string || 'default';
  const prompt = input.prompt as string || '';

  return {
    type: 'text',
    title: `Task: ${subagentType}`,
    content: output,
    metadata: {
      subagentType,
      prompt,
    },
  };
}

/**
 * Format WebFetch/WebSearch tool results
 */
function formatWebResult(toolName: string, input: Record<string, unknown>, output: string): FormattedToolResult {
  const url = input.url as string || input.query as string || '';

  return {
    type: 'text',
    title: `${toolName}: ${url}`,
    content: output,
    metadata: {
      url,
      query: input.query,
    },
  };
}

/**
 * Main formatter function that dispatches to tool-specific formatters
 */
export function formatToolResult(
  toolName: string,
  input: Record<string, unknown>,
  output: string
): FormattedToolResult {
  // Handle empty output
  if (!output || output.trim() === '') {
    return {
      type: 'text',
      title: toolName,
      content: '(empty output)',
      metadata: { isEmpty: true },
    };
  }

  // Dispatch to tool-specific formatter
  switch (toolName) {
    case 'Bash':
      return formatBashResult(input, output);

    case 'Read':
      return formatReadResult(input, output);

    case 'Edit':
    case 'Write':
      return formatEditResult(input, output);

    case 'Grep':
      return formatGrepResult(input, output);

    case 'Glob':
      return formatGlobResult(input, output);

    case 'Task':
      return formatTaskResult(input, output);

    case 'WebFetch':
    case 'WebSearch':
      return formatWebResult(toolName, input, output);

    default:
      // Generic text output for unknown tools
      return {
        type: 'text',
        title: toolName,
        content: output,
        metadata: { input },
      };
  }
}

/**
 * Parse cat -n style output (line numbers followed by tab)
 * Returns { lineNumber, content } pairs
 */
export function parseCatNOutput(output: string): Array<{ lineNumber: number; content: string }> {
  const lines = output.split('\n');
  const parsed: Array<{ lineNumber: number; content: string }> = [];

  for (const line of lines) {
    const match = line.match(/^\s*(\d+)\t(.*)$/);
    if (match) {
      parsed.push({
        lineNumber: parseInt(match[1], 10),
        content: match[2],
      });
    } else {
      // If line doesn't match pattern, include it as-is
      parsed.push({
        lineNumber: parsed.length + 1,
        content: line,
      });
    }
  }

  return parsed;
}

/**
 * Highlight matches in search results
 */
export function highlightMatches(text: string, pattern: string, isRegex = false): string {
  if (!pattern) return text;

  try {
    const regex = isRegex ? new RegExp(pattern, 'gi') : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return text.replace(regex, (match) => `<mark>${match}</mark>`);
  } catch (error) {
    // If regex fails, return original text
    return text;
  }
}
