interface Props {
  message: string;
}

export default function ErrorDisplay({ message }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      {/* Floating orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="glass-strong p-8 max-w-md glow-red">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-red-400">Error</h2>
        </div>
        <p className="text-white/80">{message}</p>
      </div>
    </div>
  );
}
