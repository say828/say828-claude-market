import { useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import Header from '../components/Header';
import { acknowledge } from '../api';
import type { PostToolContext } from '../api';

interface Props {
  context: PostToolContext;
}

export default function PostToolView({ context }: Props) {
  const outputRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (outputRef.current && context.toolOutput) {
      hljs.highlightElement(outputRef.current);
    }
  }, [context.toolOutput]);

  const handleAcknowledge = async () => {
    await acknowledge();
  };

  return (
    <div className="min-h-screen p-6">
      {/* Floating orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="max-w-3xl mx-auto">
        <Header
          title="Tool Execution Complete"
          subtitle={`${context.toolName} finished`}
          icon={context.success ? '✅' : '❌'}
          badge={{
            text: context.success ? 'Success' : 'Failed',
            variant: context.success ? 'safe' : 'danger'
          }}
        />

        {/* Status card */}
        <div className={`glass p-6 mb-6 ${context.success ? 'glow-green' : 'glow-red'}`}>
          <div className="flex items-center gap-4">
            <span className="text-4xl">{context.success ? '✅' : '❌'}</span>
            <div>
              <h2 className="text-xl font-semibold text-white">
                {context.success ? 'Tool executed successfully' : 'Tool execution failed'}
              </h2>
              <p className={context.success ? 'text-green-300/80' : 'text-red-300/80'}>
                {context.toolName}
              </p>
            </div>
          </div>
        </div>

        {/* Tool Input */}
        <div className="glass overflow-hidden mb-4">
          <div className="px-5 py-3 border-b border-white/10">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
              Input
            </h3>
          </div>
          <pre className="p-5 overflow-x-auto text-sm text-white/70">
            {JSON.stringify(context.toolInput, null, 2)}
          </pre>
        </div>

        {/* Tool Output */}
        {context.toolOutput && (
          <div className="glass overflow-hidden mb-4">
            <div className="px-5 py-3 border-b border-white/10">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Output
              </h3>
            </div>
            <pre className="p-5 overflow-x-auto max-h-72">
              <code ref={outputRef} className="text-sm text-white/80">
                {context.toolOutput}
              </code>
            </pre>
          </div>
        )}

        {/* Error */}
        {context.error && (
          <div className="glass p-5 mb-6 glow-red">
            <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
              Error
            </h3>
            <pre className="text-red-300/90 text-sm whitespace-pre-wrap">{context.error}</pre>
          </div>
        )}

        <div className="glass-strong p-6">
          <div className="flex justify-center">
            <button
              onClick={handleAcknowledge}
              className={`px-10 py-3 min-w-[160px] ${context.success ? 'btn-approve' : 'btn-deny'}`}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
