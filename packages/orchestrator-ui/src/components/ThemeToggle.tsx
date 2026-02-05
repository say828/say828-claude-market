import { useTheme } from '../context';

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      {/* Quick toggle button */}
      <button
        onClick={toggleTheme}
        className="p-1.5 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white"
        title={`Current: ${theme} (${resolvedTheme}). Click to toggle.`}
      >
        <span className="material-icons text-xl">
          {resolvedTheme === 'dark' ? 'light_mode' : 'dark_mode'}
        </span>
      </button>

      {/* Theme selector dropdown */}
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value as 'dark' | 'light' | 'system')}
        className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500"
        title="Theme mode"
      >
        <option value="dark">Dark</option>
        <option value="light">Light</option>
        <option value="system">System</option>
      </select>
    </div>
  );
}
