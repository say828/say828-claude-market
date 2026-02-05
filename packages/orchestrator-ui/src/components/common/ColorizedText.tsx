import { useMemo } from 'react';
import { parseAnsi } from '../../utils/ansi';

interface ColorizedTextProps {
  text: string;
  className?: string;
}

export function ColorizedText({ text, className }: ColorizedTextProps) {
  const segments = useMemo(() => parseAnsi(text), [text]);

  return (
    <span className={className}>
      {segments.map((segment, idx) => (
        <span key={idx} style={segment.style}>
          {segment.text}
        </span>
      ))}
    </span>
  );
}
