import { useState, useMemo } from 'react';
import { formatToolResult, highlightMatches } from '../../utils/toolResultFormatter';
import { CodeBlock } from './CodeBlock';
import { DiffView } from './DiffView';
import { FilePreview } from './FilePreview';
import { ColorizedText } from './ColorizedText';

interface ToolResultDisplayProps {
  toolName: string;
  input: Record<string, unknown>;
  output: string;
  isError?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
  className?: string;
}

/**
 * Search results view with highlighted matches
 */
function SearchResultsView({
  content,
  pattern,
  matches,
  outputMode,
}: {
  content: string;
  pattern: string;
  matches: Array<{ file?: string; line?: number; content?: string }>;
  outputMode: string;
}) {
  if (matches.length === 0) {
    return (
      <div className="p-4 text-gray-400 text-sm italic">
        No matches found for pattern: {pattern}
      </div>
    );
  }

  return (
    <div className="divide-y divide-white/10">
      {outputMode === 'content' ? (
        // Show full match content
        matches.map((match, idx) => (
          <div key={idx} className="p-3 hover:bg-white/5 transition-colors">
            {match.file && (
              <div className="text-gray-400 text-xs mb-1">
                <span className="text-blue-400">{match.file}</span>
                {match.line && <span className="text-gray-600">:{match.line}</span>}
              </div>
            )}
            {match.content && (
              <pre
                className="text-gray-300 text-sm font-mono whitespace-pre-wrap"
                dangerouslySetInnerHTML={{
                  __html: highlightMatches(match.content, pattern, true),
                }}
              />
            )}
          </div>
        ))
      ) : outputMode === 'count' ? (
        // Show file counts
        matches.map((match, idx) => (
          <div key={idx} className="p-2 flex items-center justify-between hover:bg-white/5 transition-colors">
            <span className="text-gray-300 text-sm font-mono">{match.file}</span>
            <span className="text-blue-400 text-xs font-medium bg-blue-500/20 px-2 py-0.5 rounded">
              {match.line} {match.line === 1 ? 'match' : 'matches'}
            </span>
          </div>
        ))
      ) : (
        // Show file list
        matches.map((match, idx) => (
          <div key={idx} className="p-2 hover:bg-white/5 transition-colors">
            <span className="text-gray-300 text-sm font-mono">{match.file}</span>
          </div>
        ))
      )}
    </div>
  );
}

/**
 * Smart tool result display component
 */
export function ToolResultDisplay({
  toolName,
  input,
  output,
  isError = false,
  expanded = true,
  onToggleExpand,
  className = '',
}: ToolResultDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(expanded);

  // Format the tool result
  const formatted = useMemo(
    () => formatToolResult(toolName, input, output),
    [toolName, input, output]
  );

  // Override error state if formatter detected it
  const hasError = isError || formatted.isError || false;

  // Handle expand/collapse
  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const currentExpanded = onToggleExpand !== undefined ? expanded : isExpanded;

  return (
    <div className={`bg-[#1e1e1e] rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div
        className={`px-3 py-2 flex items-center justify-between cursor-pointer select-none ${
          hasError ? 'bg-red-900/30' : 'bg-[#2d2d2d]'
        } border-b border-white/10`}
        onClick={handleToggle}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Tool name badge */}
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${
              hasError ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            {toolName}
          </span>

          {/* Title */}
          {formatted.title && (
            <span className="text-gray-300 text-sm font-mono truncate">{formatted.title}</span>
          )}
        </div>

        {/* Expand/collapse button */}
        <button
          className="p-1 hover:bg-white/10 rounded transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
        >
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${currentExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Content */}
      {currentExpanded && (
        <div className="relative">
          {/* Error indicator */}
          {hasError && (
            <div className="px-3 py-2 bg-red-900/20 text-red-400 text-xs font-medium flex items-center gap-2 border-b border-red-500/30">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Error detected in output
            </div>
          )}

          {/* Render based on type */}
          {formatted.type === 'diff' && formatted.oldContent ? (
            <DiffView
              oldText={formatted.oldContent}
              newText={formatted.content}
              filename={formatted.filename}
              className="rounded-none"
            />
          ) : formatted.type === 'file' ? (
            <FilePreview
              content={formatted.content}
              filename={formatted.filename}
              lineNumbers={true}
              className="rounded-none"
            />
          ) : formatted.type === 'code' ? (
            <CodeBlock
              code={formatted.content}
              language={formatted.language}
              filename={formatted.filename}
              showLineNumbers={true}
              className="rounded-none"
            />
          ) : formatted.type === 'search' ? (
            <div className="bg-[#1e1e1e]">
              <SearchResultsView
                content={formatted.content}
                pattern={(formatted.metadata?.pattern as string) || ''}
                matches={(formatted.metadata?.matches as Array<{ file?: string; line?: number; content?: string }>) || []}
                outputMode={(formatted.metadata?.outputMode as string) || 'files_with_matches'}
              />
            </div>
          ) : (
            // Text output with ANSI color support
            <div className="p-4 overflow-x-auto">
              <pre className="text-gray-300 text-sm font-mono whitespace-pre-wrap">
                <ColorizedText text={formatted.content} />
              </pre>
            </div>
          )}

          {/* Metadata footer (optional) */}
          {formatted.metadata && Object.keys(formatted.metadata).length > 0 && (
            <details className="border-t border-white/10 bg-[#2d2d2d]">
              <summary className="px-3 py-2 text-gray-400 text-xs font-medium cursor-pointer hover:bg-white/5 transition-colors">
                Metadata
              </summary>
              <div className="px-3 py-2 text-gray-400 text-xs font-mono">
                <pre className="whitespace-pre-wrap">
                  {JSON.stringify(formatted.metadata, null, 2)}
                </pre>
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
