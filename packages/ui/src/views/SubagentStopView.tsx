import { useState, useMemo, useEffect, useRef } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import Header from '../components/Header';
import type { SubagentStopContext } from '../api';

interface Props {
  context: SubagentStopContext;
}

// Claude Code transcript content block types
interface TextBlock {
  type: 'text';
  text: string;
}

interface ToolUseBlock {
  type: 'tool_use';
  id?: string;
  name: string;
  input: Record<string, unknown>;
}

type ContentBlock = TextBlock | ToolUseBlock;

interface TranscriptMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

function parseTranscript(transcript: string): TranscriptMessage[] {
  try {
    const data = JSON.parse(transcript);
    if (Array.isArray(data)) {
      return data.filter((item: any) =>
        item.role === 'user' || item.role === 'assistant'
      ) as TranscriptMessage[];
    }
    return [];
  } catch {
    return [];
  }
}

function getTextContent(content: string | ContentBlock[]): string {
  if (typeof content === 'string') {
    return content;
  }
  return content
    .filter((block): block is TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('\n');
}

function getToolUses(content: string | ContentBlock[]): ToolUseBlock[] {
  if (typeof content === 'string') return [];
  return content.filter((block): block is ToolUseBlock => block.type === 'tool_use');
}

function formatToolSummary(name: string, input: Record<string, unknown>): string {
  if (name === 'Bash' && input.command) return String(input.command);
  if (name === 'Read' && input.file_path) return String(input.file_path);
  if ((name === 'Write' || name === 'Edit') && input.file_path) return String(input.file_path);
  if (name === 'Grep' && input.pattern) return `"${input.pattern}"${input.path ? ` in ${input.path}` : ''}`;
  if (name === 'Glob' && input.pattern) return `"${input.pattern}"`;
  if (name === 'Task' && input.description) return String(input.description);
  return '';
}

export default function SubagentStopView({ context }: Props) {
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [completedAction, setCompletedAction] = useState<'acknowledge' | 'continue'>('acknowledge');
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const transcriptRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => {
    if (!context.transcript) return [];
    return parseTranscript(context.transcript);
  }, [context.transcript]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
    document.querySelectorAll('.assistant-text pre code').forEach((block) => {
      hljs.highlightElement(block as HTMLElement);
    });
  }, [messages]);

  const toggleTool = (id: string) => {
    setExpandedTools(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAcknowledge = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/stop-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'acknowledge' })
      });
      if (res.ok) {
        setCompletedAction('acknowledge');
        setIsComplete(true);
        setTimeout(() => { try { window.close(); } catch {} }, 500);
      }
    } catch (err) {
      console.error('Failed to acknowledge:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContinue = async () => {
    if (!prompt.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/stop-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'continue', prompt })
      });
      if (res.ok) {
        setCompletedAction('continue');
        setIsComplete(true);
        setTimeout(() => { try { window.close(); } catch {} }, 500);
      }
    } catch (err) {
      console.error('Failed to continue:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="glass p-12 text-center max-w-md">
          <div className="text-6xl mb-4">
            {completedAction === 'continue' ? '🚀' : '✅'}
          </div>
          <h2 className="text-2xl font-bold text-heading mb-2">
            {completedAction === 'continue' ? 'Prompt Sent' : 'Session Ended'}
          </h2>
          <p className="text-muted">
            You can close this tab and return to Claude Code.
          </p>
        </div>
      </div>
    );
  }

  const renderMessage = (msg: TranscriptMessage, idx: number) => {
    const textContent = getTextContent(msg.content);
    const toolUses = getToolUses(msg.content);
    const isUser = msg.role === 'user';

    return (
      <div key={idx} className="mb-4">
        {isUser && textContent && (
          <div className="flex items-start gap-2">
            <span className="text-cyan-400 font-bold select-none">❯</span>
            <span className="text-gray-200">{textContent}</span>
          </div>
        )}

        {!isUser && textContent && (
          <div
            className="assistant-text markdown-content [&_*]:!text-white [&_p]:!text-white [&_li]:!text-white"
            dangerouslySetInnerHTML={{ __html: marked(textContent) as string }}
          />
        )}

        {toolUses.map((tool, toolIdx) => {
          const toolId = `${idx}-${toolIdx}`;
          const isExpanded = expandedTools.has(toolId);
          const summary = formatToolSummary(tool.name, tool.input);

          return (
            <div key={toolIdx} className="my-2">
              <button
                onClick={() => toggleTool(toolId)}
                className="flex items-center gap-2 text-sm hover:bg-white/5 rounded px-2 py-1 -ml-2 transition-colors w-full text-left group"
              >
                <span className="text-yellow-500">●</span>
                <span className="text-yellow-400 font-medium">{tool.name}</span>
                {summary && (
                  <>
                    <span className="text-gray-600">(</span>
                    <span className="text-gray-400 font-mono text-xs truncate max-w-md">{summary}</span>
                    <span className="text-gray-600">)</span>
                  </>
                )}
                <span className="text-gray-700 text-xs ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                  {isExpanded ? '▼' : '▶'}
                </span>
              </button>

              {isExpanded && (
                <div className="ml-4 mt-1 p-3 bg-black/40 rounded border-l-2 border-yellow-500/30 overflow-x-auto">
                  <pre className="text-xs text-gray-500 font-mono whitespace-pre-wrap">
                    {JSON.stringify(tool.input, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen p-6">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="max-w-4xl mx-auto">
        <Header
          title="Subagent Completed"
          subtitle={context.subagentName ? `${context.subagentName} has finished` : 'Task completed'}
          icon="🤖"
          badge={{ text: 'Done', variant: 'safe' }}
        />

        {/* Session Transcript */}
        {messages.length > 0 && (
          <div className="glass mb-6 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 bg-black/40 border-b border-white/10">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-gray-500 ml-2 font-mono">subagent transcript</span>
              <span className="text-xs text-gray-700 ml-auto font-mono">{messages.length} msgs</span>
            </div>
            <div
              ref={transcriptRef}
              className="bg-[#0d1117] p-5 max-h-[60vh] overflow-y-auto font-mono text-sm leading-relaxed"
            >
              {messages.map(renderMessage)}
            </div>
          </div>
        )}

        {/* Result if no transcript */}
        {messages.length === 0 && context.result && (
          <div className="glass overflow-hidden mb-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-black/40 border-b border-white/10">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-gray-500 ml-2 font-mono">result</span>
            </div>
            <pre className="bg-[#0d1117] p-5 overflow-x-auto max-h-64 text-white text-sm font-mono">
              {context.result}
            </pre>
          </div>
        )}

        {/* No content fallback */}
        {messages.length === 0 && !context.result && (
          <div className="glass-subtle p-8 mb-6 text-center">
            <div className="text-4xl mb-3">🤖</div>
            <p className="text-muted">Subagent completed without output</p>
          </div>
        )}

        {/* Continue with prompt */}
        <div className="glass p-6 mb-6">
          <h3 className="text-lg font-semibold text-heading mb-3">Continue Working</h3>
          <p className="text-sm text-muted mb-4">
            Enter a follow-up prompt to continue the conversation
          </p>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter your follow-up request..."
            rows={3}
            className="w-full px-4 py-3 rounded-lg resize-none mb-4"
          />
          <div className="flex gap-3">
            <button
              onClick={handleContinue}
              disabled={isSubmitting || !prompt.trim()}
              className={`btn-primary px-6 py-2 flex-1 ${isSubmitting || !prompt.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Sending...' : 'Continue'}
            </button>
            <button
              onClick={handleAcknowledge}
              disabled={isSubmitting}
              className={`btn-approve px-6 py-2 ${isSubmitting ? 'opacity-50' : ''}`}
            >
              Done
            </button>
          </div>
        </div>

        {/* Subagent name footer */}
        <div className="text-center text-xs text-muted font-mono">
          {context.subagentName || 'Subagent'}
        </div>
      </div>
    </div>
  );
}
