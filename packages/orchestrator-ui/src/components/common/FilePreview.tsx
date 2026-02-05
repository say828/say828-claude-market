import { useState, useMemo } from 'react';
import { CodeBlock } from './CodeBlock';
import { parseCatNOutput } from '../../utils/toolResultFormatter';

interface FilePreviewProps {
  content: string;
  filename?: string;
  lineNumbers?: boolean;
  maxLines?: number;
  highlightLines?: number[];
  startLine?: number;
  className?: string;
}

/**
 * File icon based on extension
 */
function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  const iconMap: Record<string, string> = {
    js: '📜',
    jsx: '⚛️',
    ts: '📘',
    tsx: '⚛️',
    py: '🐍',
    rb: '💎',
    go: '🔵',
    rs: '🦀',
    java: '☕',
    c: '⚙️',
    cpp: '⚙️',
    cs: '#️⃣',
    php: '🐘',
    swift: '🔶',
    kt: '🟣',
    sh: '🐚',
    bash: '🐚',
    md: '📝',
    json: '📊',
    yaml: '📋',
    yml: '📋',
    html: '🌐',
    css: '🎨',
    sql: '🗄️',
    dockerfile: '🐳',
  };

  return iconMap[ext || ''] || '📄';
}

/**
 * FilePreview component with line numbers, collapsing, and syntax highlighting
 */
export function FilePreview({
  content,
  filename,
  lineNumbers = true,
  maxLines = 100,
  highlightLines = [],
  startLine = 1,
  className = '',
}: FilePreviewProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Parse content - detect if it's cat -n style output
  const { lines, hasCatNFormat } = useMemo(() => {
    const catNLines = parseCatNOutput(content);
    const isCatN = catNLines.length > 0 && catNLines[0].lineNumber > 0;

    if (isCatN) {
      return {
        lines: catNLines,
        hasCatNFormat: true,
      };
    }

    // Regular content
    const regularLines = content.split('\n').map((line, idx) => ({
      lineNumber: startLine + idx,
      content: line,
    }));

    return {
      lines: regularLines,
      hasCatNFormat: false,
    };
  }, [content, startLine]);

  const totalLines = lines.length;
  const shouldShowCollapseButton = totalLines > maxLines;

  // Initialize collapsed state
  useMemo(() => {
    if (shouldShowCollapseButton && !isCollapsed) {
      setIsCollapsed(true);
    }
  }, [shouldShowCollapseButton, isCollapsed]);

  // Get display lines (collapsed or full)
  const displayLines = useMemo(() => {
    if (!isCollapsed || !shouldShowCollapseButton) {
      return lines;
    }
    return lines.slice(0, maxLines);
  }, [lines, isCollapsed, shouldShowCollapseButton, maxLines]);

  // Reconstruct content for CodeBlock
  const displayContent = useMemo(() => {
    return displayLines.map((line) => line.content).join('\n');
  }, [displayLines]);

  return (
    <div className={`bg-[#1e1e1e] rounded-lg overflow-hidden ${className}`}>
      {/* Header with filename and icon */}
      {filename && (
        <div className="bg-[#2d2d2d] px-3 py-2 text-gray-300 text-sm font-mono flex items-center gap-2 border-b border-white/10">
          <span className="text-lg">{getFileIcon(filename)}</span>
          <span className="flex-1">{filename}</span>
          {totalLines > 0 && (
            <span className="text-gray-500 text-xs">
              {totalLines} {totalLines === 1 ? 'line' : 'lines'}
            </span>
          )}
        </div>
      )}

      {/* Code content using CodeBlock */}
      <div className="relative">
        {highlightLines.length > 0 ? (
          // Custom rendering with highlight support
          <div className="p-4 overflow-x-auto font-mono text-sm">
            {displayLines.map((line, idx) => {
              const isHighlighted = highlightLines.includes(line.lineNumber);
              return (
                <div
                  key={idx}
                  className={`flex ${isHighlighted ? 'bg-yellow-500/20 border-l-2 border-yellow-500' : ''}`}
                >
                  {lineNumbers && (
                    <span className="text-gray-600 select-none min-w-[3rem] text-right pr-4 pl-2">
                      {line.lineNumber}
                    </span>
                  )}
                  <pre className="flex-1 text-gray-300 whitespace-pre-wrap break-all">
                    {line.content || ' '}
                  </pre>
                </div>
              );
            })}
          </div>
        ) : (
          // Use CodeBlock for syntax highlighting
          <CodeBlock
            code={displayContent}
            filename={filename}
            showLineNumbers={lineNumbers && !hasCatNFormat}
            maxLines={Number.MAX_SAFE_INTEGER} // We handle collapsing ourselves
            className="rounded-none"
          />
        )}

        {/* Collapse toggle */}
        {shouldShowCollapseButton && (
          <div className="border-t border-white/10 bg-[#2d2d2d] px-3 py-2 flex justify-center">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-gray-400 hover:text-gray-300 text-xs font-medium flex items-center gap-2 transition-colors"
            >
              {isCollapsed ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Show all {totalLines} lines ({totalLines - maxLines} more)
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Show less
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
