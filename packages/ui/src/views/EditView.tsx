import { useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import Header from '../components/Header';
import ActionButtons from '../components/ActionButtons';
import type { EditContext } from '../api';

interface Props {
  context: EditContext;
}

function getLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    ts: 'typescript', tsx: 'typescript', js: 'javascript', jsx: 'javascript',
    py: 'python', rb: 'ruby', go: 'go', rs: 'rust', java: 'java', kt: 'kotlin',
    swift: 'swift', cpp: 'cpp', c: 'c', h: 'c', cs: 'csharp', php: 'php',
    sh: 'bash', bash: 'bash', zsh: 'bash', yml: 'yaml', yaml: 'yaml',
    json: 'json', md: 'markdown', html: 'html', css: 'css', scss: 'scss',
    sql: 'sql', graphql: 'graphql', dockerfile: 'dockerfile', toml: 'toml',
    ini: 'ini', xml: 'xml'
  };
  return langMap[ext] || 'plaintext';
}

export default function EditView({ context }: Props) {
  const oldRef = useRef<HTMLElement>(null);
  const newRef = useRef<HTMLElement>(null);
  const language = getLanguage(context.filePath);

  useEffect(() => {
    if (oldRef.current) hljs.highlightElement(oldRef.current);
    if (newRef.current) hljs.highlightElement(newRef.current);
  }, [context]);

  const fileName = context.filePath.split('/').pop();

  return (
    <div className="min-h-screen p-6">
      {/* Floating orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="max-w-7xl mx-auto">
        <Header
          title={context.isNew ? 'New File' : 'File Edit'}
          subtitle={context.filePath}
          icon={context.isNew ? '📄' : '✏️'}
          badge={{ text: context.toolName, variant: context.isNew ? 'safe' : 'primary' }}
        />

        {context.isNew ? (
          /* New file - single panel */
          <div className="glass overflow-hidden glow-green">
            <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-green-400 font-medium">+ New File</span>
              <span className="text-white/50 text-sm">{fileName}</span>
            </div>
            <pre className="p-5 overflow-x-auto max-h-[65vh] !rounded-none !border-0">
              <code ref={newRef} className={`language-${language} text-sm`}>
                {context.newContent}
              </code>
            </pre>
          </div>
        ) : (
          /* Edit - side by side */
          <div className="grid grid-cols-2 gap-4">
            {/* Old content */}
            <div className="glass overflow-hidden">
              <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-red-400 font-medium">- Original</span>
                <span className="text-white/50 text-sm truncate">{fileName}</span>
              </div>
              <pre className="p-5 overflow-x-auto max-h-[60vh] !rounded-none !border-0">
                <code ref={oldRef} className={`language-${language} text-sm`}>
                  {context.oldContent || '(empty)'}
                </code>
              </pre>
            </div>

            {/* New content */}
            <div className="glass overflow-hidden glow-green">
              <div className="px-5 py-3 border-b border-white/10 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-green-400 font-medium">+ Modified</span>
                <span className="text-white/50 text-sm truncate">{fileName}</span>
              </div>
              <pre className="p-5 overflow-x-auto max-h-[60vh] !rounded-none !border-0">
                <code ref={newRef} className={`language-${language} text-sm`}>
                  {context.newContent}
                </code>
              </pre>
            </div>
          </div>
        )}

        <ActionButtons approveLabel="Apply Changes" denyLabel="Reject" />
      </div>
    </div>
  );
}
