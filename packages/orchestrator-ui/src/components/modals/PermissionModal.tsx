import { useState, useEffect, useRef } from 'react';
import { CodeBlock, DiffView } from '../common';
import { getToolColor, getHookIcon, getLanguageFromPath } from '../../utils/tools';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  permission: {
    toolUseId: string;
    toolName: string;
    input: Record<string, unknown>;
  } | null;
  onApprove: (toolUseId: string, feedback?: string) => void;
  onDeny: (toolUseId: string, feedback?: string) => void;
}

export default function PermissionModal({
  isOpen,
  onClose,
  permission,
  onApprove,
  onDeny,
}: PermissionModalProps) {
  const [feedback, setFeedback] = useState('');
  const feedbackRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && feedbackRef.current) {
      feedbackRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    // Reset feedback when modal closes or permission changes
    if (!isOpen || !permission) {
      setFeedback('');
    }
  }, [isOpen, permission]);

  const handleApprove = () => {
    if (permission) {
      onApprove(permission.toolUseId, feedback.trim() || undefined);
      setFeedback('');
    }
  };

  const handleDeny = () => {
    if (permission) {
      onDeny(permission.toolUseId, feedback.trim() || undefined);
      setFeedback('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      e.preventDefault();
      handleApprove();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleDeny();
    }
  };

  if (!isOpen || !permission) return null;

  const { toolName, input } = permission;
  const toolColor = getToolColor(toolName);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0a0a] border border-white/10 rounded-lg w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="p-3 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{getHookIcon(toolName.toLowerCase())}</span>
            <span className="font-semibold text-white">Permission Required</span>
            <span className={`font-mono text-sm ${toolColor}`}>{toolName}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          <ToolInputDisplay toolName={toolName} input={input} />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex-shrink-0">
          {/* Optional feedback */}
          <div className="mb-3">
            <label className="block text-xs text-gray-400 mb-1">
              Optional feedback (modifications, suggestions)
            </label>
            <textarea
              ref={feedbackRef}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g., 'Use -rf flag' or 'Change output path to /tmp'"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500 min-h-[60px] resize-y font-mono"
              onKeyDown={handleKeyDown}
            />
            <p className="text-xs text-gray-500 mt-1">
              Press Cmd+Enter to approve, Escape to deny
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleDeny}
              className="flex-1 px-4 py-2 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors font-medium"
            >
              Deny
            </button>
            <button
              onClick={handleApprove}
              className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
            >
              Approve
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolInputDisplay({ toolName, input }: { toolName: string; input: Record<string, unknown> }) {
  // Bash tool - show command
  if (toolName === 'Bash' && input.command) {
    return (
      <div>
        <div className="text-sm text-gray-400 mb-2">Command to execute:</div>
        <CodeBlock
          code={String(input.command)}
          language="bash"
          showLineNumbers={false}
          maxLines={100}
        />
        {input.description && (
          <div className="mt-3">
            <div className="text-sm text-gray-400 mb-1">Description:</div>
            <div className="text-sm text-gray-300 bg-white/5 rounded-lg px-3 py-2">
              {String(input.description)}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Edit tool - show diff if old_string and new_string are available
  if (toolName === 'Edit' && input.old_string && input.new_string) {
    const filePath = input.file_path ? String(input.file_path) : undefined;
    return (
      <div>
        {filePath && (
          <div className="text-sm text-gray-400 mb-2">
            File: <span className="text-white font-mono">{filePath}</span>
          </div>
        )}
        <div className="text-sm text-gray-400 mb-2">Changes:</div>
        <DiffView
          oldText={String(input.old_string)}
          newText={String(input.new_string)}
          filename={filePath}
          mode="unified"
          contextLines={3}
        />
        {input.replace_all && (
          <div className="mt-2 text-xs text-yellow-400 bg-yellow-500/10 rounded-lg px-3 py-2">
            Note: This will replace ALL occurrences in the file
          </div>
        )}
      </div>
    );
  }

  // Write tool - show file path and content preview
  if (toolName === 'Write' && input.file_path) {
    const filePath = String(input.file_path);
    const content = input.content ? String(input.content) : '';
    const language = getLanguageFromPath(filePath);

    return (
      <div>
        <div className="text-sm text-gray-400 mb-2">
          File: <span className="text-white font-mono">{filePath}</span>
        </div>
        <div className="text-sm text-gray-400 mb-2">Content to write:</div>
        <CodeBlock
          code={content}
          language={language || undefined}
          filename={filePath}
          showLineNumbers={true}
          maxLines={50}
        />
      </div>
    );
  }

  // Read tool - show file path
  if (toolName === 'Read' && input.file_path) {
    return (
      <div>
        <div className="text-sm text-gray-400 mb-2">
          File to read: <span className="text-white font-mono">{String(input.file_path)}</span>
        </div>
        {input.offset && (
          <div className="text-xs text-gray-500 mt-2">
            Offset: {String(input.offset)} lines
          </div>
        )}
        {input.limit && (
          <div className="text-xs text-gray-500 mt-2">
            Limit: {String(input.limit)} lines
          </div>
        )}
      </div>
    );
  }

  // Grep tool - show pattern and options
  if (toolName === 'Grep' && input.pattern) {
    return (
      <div>
        <div className="text-sm text-gray-400 mb-2">Search pattern:</div>
        <CodeBlock
          code={String(input.pattern)}
          language="regex"
          showLineNumbers={false}
        />
        {input.path && (
          <div className="text-sm text-gray-400 mt-3">
            In path: <span className="text-white font-mono">{String(input.path)}</span>
          </div>
        )}
        {input.glob && (
          <div className="text-sm text-gray-400 mt-2">
            File pattern: <span className="text-white font-mono">{String(input.glob)}</span>
          </div>
        )}
      </div>
    );
  }

  // Glob tool - show pattern
  if (toolName === 'Glob' && input.pattern) {
    return (
      <div>
        <div className="text-sm text-gray-400 mb-2">File pattern:</div>
        <CodeBlock
          code={String(input.pattern)}
          language="bash"
          showLineNumbers={false}
        />
        {input.path && (
          <div className="text-sm text-gray-400 mt-3">
            In path: <span className="text-white font-mono">{String(input.path)}</span>
          </div>
        )}
      </div>
    );
  }

  // Default - show JSON input
  return (
    <div>
      <div className="text-sm text-gray-400 mb-2">Tool input:</div>
      <CodeBlock
        code={JSON.stringify(input, null, 2)}
        language="json"
        showLineNumbers={false}
      />
    </div>
  );
}
