import { useState, useEffect, useMemo } from 'react';
import { codeToHtml, bundledLanguages, type Highlighter, createHighlighter } from 'shiki';
import { FILE_EXTENSIONS_TO_LANG } from '@claude-orchestrator/shared';

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  maxLines?: number;
  className?: string;
}

// Cache the highlighter instance
let highlighterInstance: Highlighter | null = null;
let highlighterPromise: Promise<Highlighter> | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (highlighterInstance) {
    return highlighterInstance;
  }

  if (highlighterPromise) {
    return highlighterPromise;
  }

  highlighterPromise = createHighlighter({
    themes: ['github-dark'],
    langs: Object.keys(bundledLanguages),
  }).then((highlighter) => {
    highlighterInstance = highlighter;
    highlighterPromise = null;
    return highlighter;
  });

  return highlighterPromise;
}

function detectLanguageFromFilename(filename: string): string | undefined {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return undefined;
  return FILE_EXTENSIONS_TO_LANG[ext];
}

export function CodeBlock({
  code,
  language,
  filename,
  showLineNumbers = true,
  maxLines = 50,
  className = '',
}: CodeBlockProps) {
  const [highlightedCode, setHighlightedCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Determine language
  const detectedLanguage = useMemo(() => {
    if (language) return language;
    if (filename) return detectLanguageFromFilename(filename);
    return 'plaintext';
  }, [language, filename]);

  // Count lines
  const lineCount = useMemo(() => code.split('\n').length, [code]);
  const shouldShowCollapseButton = lineCount > maxLines;

  // Initialize collapsed state
  useEffect(() => {
    setIsCollapsed(shouldShowCollapseButton);
  }, [shouldShowCollapseButton]);

  // Highlight code
  useEffect(() => {
    let cancelled = false;

    async function highlight() {
      try {
        setIsLoading(true);
        const highlighter = await getHighlighter();

        if (cancelled) return;

        // Check if language is supported
        const supportedLang = highlighter.getLoadedLanguages().includes(detectedLanguage)
          ? detectedLanguage
          : 'plaintext';

        const html = highlighter.codeToHtml(code, {
          lang: supportedLang,
          theme: 'github-dark',
        });

        if (!cancelled) {
          setHighlightedCode(html);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to highlight code:', error);
        if (!cancelled) {
          // Fallback to plain text
          setHighlightedCode(`<pre><code>${escapeHtml(code)}</code></pre>`);
          setIsLoading(false);
        }
      }
    }

    highlight();

    return () => {
      cancelled = true;
    };
  }, [code, detectedLanguage]);

  // Copy to clipboard
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  }

  // Get display code (collapsed or full)
  const displayCode = useMemo(() => {
    if (!isCollapsed || !shouldShowCollapseButton) {
      return code;
    }
    return code.split('\n').slice(0, maxLines).join('\n');
  }, [code, isCollapsed, shouldShowCollapseButton, maxLines]);

  // Generate highlighted HTML for display
  const displayHtml = useMemo(() => {
    if (isCollapsed && shouldShowCollapseButton) {
      // Re-highlight the collapsed code
      return highlightedCode; // Will be updated by useEffect
    }
    return highlightedCode;
  }, [highlightedCode, isCollapsed, shouldShowCollapseButton]);

  // Update highlighted code when collapsed state changes
  useEffect(() => {
    let cancelled = false;

    if (!isLoading) {
      async function rehighlight() {
        try {
          const highlighter = await getHighlighter();
          if (cancelled) return;

          const supportedLang = highlighter.getLoadedLanguages().includes(detectedLanguage)
            ? detectedLanguage
            : 'plaintext';

          const html = highlighter.codeToHtml(displayCode, {
            lang: supportedLang,
            theme: 'github-dark',
          });

          if (!cancelled) {
            setHighlightedCode(html);
          }
        } catch (error) {
          console.error('Failed to re-highlight code:', error);
        }
      }

      rehighlight();
    }

    return () => {
      cancelled = true;
    };
  }, [displayCode, detectedLanguage, isLoading]);

  return (
    <div className={`bg-[#1e1e1e] rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      {filename && (
        <div className="bg-[#2d2d2d] px-3 py-1.5 text-gray-400 text-xs font-mono flex items-center justify-between">
          <span>{filename}</span>
          <span className="text-gray-600">{detectedLanguage}</span>
        </div>
      )}

      {/* Code area */}
      <div className="relative">
        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors z-10"
          title={isCopied ? 'Copied!' : 'Copy code'}
        >
          {isCopied ? (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </span>
          )}
        </button>

        {/* Code content */}
        <div className="p-4 overflow-x-auto font-mono text-sm">
          {isLoading ? (
            <div className="text-gray-400 animate-pulse">Loading syntax highlighting...</div>
          ) : (
            <div
              className={showLineNumbers ? 'code-with-line-numbers' : ''}
              dangerouslySetInnerHTML={{ __html: displayHtml }}
            />
          )}
        </div>

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
                  Show all {lineCount} lines
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

      {/* Custom styles for line numbers */}
      <style>{`
        .code-with-line-numbers pre {
          counter-reset: line;
        }
        .code-with-line-numbers pre code .line::before {
          counter-increment: line;
          content: counter(line);
          display: inline-block;
          width: 3em;
          margin-right: 1rem;
          padding-right: 1rem;
          text-align: right;
          color: #4a5568;
          user-select: none;
          border-right: 1px solid rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
