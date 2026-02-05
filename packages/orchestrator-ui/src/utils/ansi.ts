import { ANSI_COLORS, ANSI_BG_COLORS } from '@claude-orchestrator/shared';

export interface AnsiStyle {
  color?: string;
  backgroundColor?: string;
  fontWeight?: 'bold';
  opacity?: number;
  fontStyle?: 'italic';
  textDecoration?: 'underline' | 'line-through';
}

export function parseAnsiCodes(codes: number[]): AnsiStyle {
  let style: AnsiStyle = {};

  for (const code of codes) {
    if (code === 0) {
      style = {};
    } else if (code === 1) {
      style.fontWeight = 'bold';
    } else if (code === 2) {
      style.opacity = 0.7;
    } else if (code === 3) {
      style.fontStyle = 'italic';
    } else if (code === 4) {
      style.textDecoration = 'underline';
    } else if (code === 9) {
      style.textDecoration = 'line-through';
    } else if (ANSI_COLORS[code]) {
      style.color = ANSI_COLORS[code];
    } else if (ANSI_BG_COLORS[code]) {
      style.backgroundColor = ANSI_BG_COLORS[code];
    }
  }

  return style;
}

export interface AnsiSegment {
  text: string;
  style: AnsiStyle;
}

export function parseAnsi(text: string): AnsiSegment[] {
  const segments: AnsiSegment[] = [];
  // eslint-disable-next-line no-control-regex
  const ansiRegex = /\x1b\[([0-9;]*)m/g;
  let lastIndex = 0;
  let currentStyle: AnsiStyle = {};
  let match;

  while ((match = ansiRegex.exec(text)) !== null) {
    // Add text before this escape sequence
    if (match.index > lastIndex) {
      const segment = text.slice(lastIndex, match.index);
      if (segment) {
        segments.push({ text: segment, style: { ...currentStyle } });
      }
    }

    // Parse the escape codes
    const codes = match[1].split(';').map(Number);
    currentStyle = { ...currentStyle, ...parseAnsiCodes(codes) };
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    const segment = text.slice(lastIndex);
    if (segment) {
      segments.push({ text: segment, style: { ...currentStyle } });
    }
  }

  return segments.length > 0 ? segments : [{ text, style: {} }];
}
