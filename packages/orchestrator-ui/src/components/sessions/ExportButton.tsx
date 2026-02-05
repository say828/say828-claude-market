import { useState, useRef, useEffect } from 'react';
import type { DisplayMessage } from '@claude-orchestrator/shared';

interface ExportButtonProps {
  messages: DisplayMessage[];
  sessionInfo: {
    projectName: string;
    cwd: string;
    gitBranch?: string;
  };
  className?: string;
}

export function ExportButton({ messages, sessionInfo, className = '' }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  function formatMarkdown(): string {
    const { projectName, cwd, gitBranch } = sessionInfo;
    const exportDate = new Date().toISOString();

    let md = `# Session: ${projectName}\n`;
    md += `- Working Directory: ${cwd}\n`;
    if (gitBranch) {
      md += `- Branch: ${gitBranch}\n`;
    }
    md += `- Exported: ${exportDate}\n\n`;
    md += `## Conversation\n\n`;

    for (const message of messages) {
      if (message.role === 'user') {
        md += `### User\n${message.content}\n\n`;
      } else if (message.role === 'assistant') {
        // Add assistant content if present
        if (message.content && !message.toolUse) {
          md += `### Assistant\n${message.content}\n\n`;
        }

        // Add tool use
        if (message.toolUse) {
          md += `#### Tool: ${message.toolUse.name}\n`;

          // Determine language for syntax highlighting
          const language = getLanguageForTool(message.toolUse.name);
          const toolInput = formatToolInputForMarkdown(message.toolUse.input);

          md += '```' + language + '\n';
          md += toolInput + '\n';
          md += '```\n\n';

          // Add tool result if present
          if (message.toolResult) {
            md += '**Result:**\n';
            if (message.toolResult.isError) {
              md += '```error\n';
            } else {
              md += '```\n';
            }
            md += message.toolResult.content + '\n';
            md += '```\n\n';
          }
        }
      } else if (message.role === 'system') {
        md += `_System: ${message.content}_\n\n`;
      }
    }

    return md;
  }

  function formatJSON(): string {
    const exportData = {
      session: sessionInfo,
      exportedAt: new Date().toISOString(),
      messages: messages.map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp,
        toolUse: msg.toolUse,
        toolResult: msg.toolResult,
      })),
    };

    return JSON.stringify(exportData, null, 2);
  }

  function getLanguageForTool(toolName: string): string {
    switch (toolName.toLowerCase()) {
      case 'bash':
        return 'bash';
      case 'edit':
      case 'write':
        return 'typescript';
      case 'read':
        return 'text';
      case 'grep':
      case 'glob':
        return 'text';
      default:
        return 'json';
    }
  }

  function formatToolInputForMarkdown(input: Record<string, unknown>): string {
    // Handle common tool inputs
    if (input.command) {
      return String(input.command);
    }
    if (input.file_path) {
      let result = String(input.file_path);
      if (input.content) {
        result += '\n\n' + String(input.content);
      }
      if (input.old_string && input.new_string) {
        result += `\n\n--- Old:\n${input.old_string}\n\n+++ New:\n${input.new_string}`;
      }
      return result;
    }
    if (input.pattern) {
      return `Pattern: ${input.pattern}${input.path ? `\nPath: ${input.path}` : ''}`;
    }
    // Fallback to JSON
    return JSON.stringify(input, null, 2);
  }

  function downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportMarkdown() {
    const markdown = formatMarkdown();
    const filename = `${sessionInfo.projectName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.md`;
    downloadFile(markdown, filename, 'text/markdown');
    setIsOpen(false);
  }

  function handleExportJSON() {
    const json = formatJSON();
    const filename = `${sessionInfo.projectName.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    downloadFile(json, filename, 'application/json');
    setIsOpen(false);
  }

  async function handleCopyToClipboard() {
    const markdown = formatMarkdown();
    try {
      await navigator.clipboard.writeText(markdown);
      setShowCopyFeedback(true);
      setTimeout(() => setShowCopyFeedback(false), 2000);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 text-xs bg-white/5 hover:bg-white/10 rounded transition-colors text-gray-300 flex items-center gap-1"
        title="Export session"
      >
        <span className="material-icons text-sm">download</span>
        Export
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 bg-[#1a1a1a] border border-white/10 rounded shadow-lg z-50 min-w-[180px]">
          <button
            onClick={handleExportMarkdown}
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2 transition-colors"
          >
            <span className="material-icons text-sm">description</span>
            Export as Markdown
          </button>
          <button
            onClick={handleExportJSON}
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2 transition-colors"
          >
            <span className="material-icons text-sm">code</span>
            Export as JSON
          </button>
          <button
            onClick={handleCopyToClipboard}
            className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-white/10 flex items-center gap-2 transition-colors border-t border-white/10"
          >
            <span className="material-icons text-sm">content_copy</span>
            Copy to Clipboard
          </button>
        </div>
      )}

      {showCopyFeedback && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50 flex items-center gap-2">
          <span className="material-icons text-sm">check_circle</span>
          Copied to clipboard!
        </div>
      )}
    </div>
  );
}
