import Header from '../components/Header';
import { acknowledge } from '../api';
import type { SubagentStopContext } from '../api';

interface Props {
  context: SubagentStopContext;
}

export default function SubagentStopView({ context }: Props) {
  const handleAcknowledge = async () => {
    await acknowledge();
  };

  return (
    <div className="min-h-screen p-6">
      {/* Floating orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="max-w-2xl mx-auto">
        <Header
          title="Subagent Completed"
          subtitle={`${context.subagentName} has finished`}
          icon="🤖"
          badge={{ text: 'Subagent Done', variant: 'purple' }}
        />

        {/* Success card */}
        <div className="glass p-8 glow-purple mb-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl glass flex items-center justify-center">
              <span className="text-5xl">🤖</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Subagent Complete</h2>
              <p className="text-purple-300/80 mt-1">
                <span className="font-semibold">{context.subagentName}</span> has finished its task
              </p>
            </div>
          </div>
        </div>

        {/* Result */}
        {context.result && (
          <div className="glass overflow-hidden mb-6">
            <div className="px-5 py-3 border-b border-white/10">
              <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                Result
              </h3>
            </div>
            <pre className="p-5 overflow-x-auto max-h-64 text-white/80 text-sm font-mono">
              {context.result}
            </pre>
          </div>
        )}

        {/* Session info */}
        <div className="glass-subtle p-5 mb-6">
          <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
            Session
          </h3>
          <code className="text-indigo-300 text-sm">{context.sessionId.slice(0, 12)}...</code>
        </div>

        <div className="glass-strong p-6">
          <div className="flex justify-center">
            <button
              onClick={handleAcknowledge}
              className="btn-primary px-10 py-3 min-w-[160px]"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
