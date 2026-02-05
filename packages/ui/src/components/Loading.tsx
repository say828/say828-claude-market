export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      {/* Floating orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />

      <div className="glass-strong p-12 flex flex-col items-center gap-6">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-white/10" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin" />
        </div>
        <p className="text-white/60 font-medium">Loading...</p>
      </div>
    </div>
  );
}
