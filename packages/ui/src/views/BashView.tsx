import { useEffect, useRef } from 'react';
import hljs from 'highlight.js';
import Header from '../components/Header';
import ActionButtons from '../components/ActionButtons';
import type { BashContext } from '../api';

interface Props {
  context: BashContext;
}

const riskConfig = {
  safe: {
    variant: 'safe' as const,
    emoji: '🟢',
    label: 'SAFE',
    message: 'This command appears safe for read-only or local operations.',
    glowClass: 'glow-green'
  },
  caution: {
    variant: 'caution' as const,
    emoji: '🟡',
    label: 'CAUTION',
    message: 'This command modifies files or system state. Proceed with caution.',
    glowClass: ''
  },
  dangerous: {
    variant: 'danger' as const,
    emoji: '🔴',
    label: 'DANGEROUS',
    message: 'This command may cause irreversible changes. Review carefully!',
    glowClass: 'glow-red'
  }
};

export default function BashView({ context }: Props) {
  const codeRef = useRef<HTMLElement>(null);
  const risk = riskConfig[context.riskLevel];

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);
    }
  }, [context.command]);

  return (
    <div className="min-h-screen p-6">
      {/* Floating orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="max-w-3xl mx-auto">
        <Header
          title="Bash Command"
          subtitle="Review and approve the command execution"
          icon="💻"
          badge={{ text: `${risk.emoji} ${risk.label}`, variant: risk.variant }}
        />

        {/* Risk warning */}
        <div className={`glass p-5 mb-6 ${risk.glowClass}`}>
          <div className="flex items-center gap-4">
            <span className="text-3xl">{risk.emoji}</span>
            <p className="text-white/80">{risk.message}</p>
          </div>
        </div>

        {/* Command */}
        <div className="glass overflow-hidden mb-6">
          <div className="px-5 py-3 border-b border-white/10 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
            <span className="text-white/50 text-sm ml-2">Terminal</span>
          </div>
          <pre className="p-5 overflow-x-auto !rounded-none !border-0">
            <code ref={codeRef} className="language-bash text-sm">
              {context.command}
            </code>
          </pre>
        </div>

        {/* Details */}
        <div className="grid gap-4 mb-6">
          {context.description && (
            <div className="glass-subtle p-5">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                Description
              </h3>
              <p className="text-white/90">{context.description}</p>
            </div>
          )}

          <div className="glass-subtle p-5">
            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
              Working Directory
            </h3>
            <code className="text-indigo-300 text-sm">{context.cwd}</code>
          </div>

          {context.timeout && (
            <div className="glass-subtle p-5">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                Timeout
              </h3>
              <span className="text-white/80">{Math.round(context.timeout / 1000)} seconds</span>
            </div>
          )}
        </div>

        <ActionButtons approveLabel="Run Command" denyLabel="Deny" />
      </div>
    </div>
  );
}
