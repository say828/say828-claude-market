import { useState, useEffect } from 'react';

interface Plugin {
  id: string;
  name: string;
  marketplace: string;
  version: string;
  description: string;
  author?: {
    name: string;
    email?: string;
    url?: string;
  };
  homepage?: string;
  repository?: string;
  license?: string;
  keywords?: string[];
  installPath: string;
  installedAt: string;
  lastUpdated: string;
  enabled: boolean;
  hooks?: PluginHook[];
  commands?: PluginCommand[];
}

interface PluginHook {
  event: string;
  matcher?: string;
  command: string;
  timeout?: number;
}

interface PluginCommand {
  name: string;
  description?: string;
  command: string;
}

interface PluginStats {
  total: number;
  enabled: number;
  withHooks: number;
  withCommands: number;
}

export default function PluginsView() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [stats, setStats] = useState<PluginStats>({
    total: 0,
    enabled: 0,
    withHooks: 0,
    withCommands: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlugins();
    loadStats();
  }, []);

  const loadPlugins = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/plugins');
      const data = await response.json();
      setPlugins(data.plugins || []);
      setError(null);
    } catch (err) {
      setError('Failed to load plugins');
      console.error('Failed to load plugins:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/plugin-stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to load plugin stats:', err);
    }
  };

  const formatDate = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getEventBadgeColor = (event: string) => {
    if (event.includes('Permission')) return 'bg-yellow-500/20 text-yellow-400';
    if (event.includes('Stop')) return 'bg-red-500/20 text-red-400';
    if (event.includes('PreToolUse')) return 'bg-blue-500/20 text-blue-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">🔌</div>
          <div className="text-xl font-semibold">Loading plugins...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <div className="text-xl font-semibold text-red-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Plugin List */}
      <div className="w-96 border-r border-white/10 flex flex-col">
        {/* Header & Stats */}
        <div className="p-4 border-b border-white/10">
          <h2 className="text-xl font-semibold mb-4">Installed Plugins</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="stat-card">
              <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
              <div className="text-xs text-gray-500">Total</div>
            </div>
            <div className="stat-card">
              <div className="text-2xl font-bold text-green-400">{stats.enabled}</div>
              <div className="text-xs text-gray-500">Enabled</div>
            </div>
            <div className="stat-card">
              <div className="text-2xl font-bold text-purple-400">{stats.withHooks}</div>
              <div className="text-xs text-gray-500">With Hooks</div>
            </div>
            <div className="stat-card">
              <div className="text-2xl font-bold text-yellow-400">{stats.withCommands}</div>
              <div className="text-xs text-gray-500">With Commands</div>
            </div>
          </div>
        </div>

        {/* Plugin List */}
        <div className="flex-1 overflow-y-auto">
          {plugins.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <div className="text-3xl mb-2">📦</div>
              <div>No plugins installed</div>
              <div className="text-xs mt-1">
                Install plugins using the Claude Code CLI
              </div>
            </div>
          ) : (
            plugins.map((plugin) => (
              <div
                key={plugin.id}
                onClick={() => setSelectedPlugin(plugin)}
                className={`p-4 border-b border-white/5 cursor-pointer transition-colors ${
                  selectedPlugin?.id === plugin.id
                    ? 'bg-white/10'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{plugin.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {plugin.marketplace}
                    </div>
                    {plugin.description && (
                      <div className="text-xs text-gray-400 mt-1 line-clamp-2">
                        {plugin.description}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                        v{plugin.version}
                      </span>
                      {plugin.hooks && plugin.hooks.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">
                          {plugin.hooks.length} hooks
                        </span>
                      )}
                      {plugin.commands && plugin.commands.length > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
                          {plugin.commands.length} cmds
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full ml-2 ${
                      plugin.enabled ? 'bg-green-400' : 'bg-gray-600'
                    }`}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Plugin Details */}
      <div className="flex-1 overflow-y-auto">
        {selectedPlugin ? (
          <div className="p-6">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-2xl font-bold">{selectedPlugin.name}</h1>
                  <div className="text-sm text-gray-500 mt-1">
                    {selectedPlugin.marketplace} · v{selectedPlugin.version}
                  </div>
                </div>
                <div
                  className={`px-3 py-1 rounded text-sm ${
                    selectedPlugin.enabled
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {selectedPlugin.enabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>

              {selectedPlugin.description && (
                <p className="text-gray-300 mt-4">{selectedPlugin.description}</p>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                {selectedPlugin.author && (
                  <div>
                    <div className="text-xs text-gray-500">Author</div>
                    <div className="text-sm mt-1">
                      {selectedPlugin.author.url ? (
                        <a
                          href={selectedPlugin.author.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline"
                        >
                          {selectedPlugin.author.name}
                        </a>
                      ) : (
                        selectedPlugin.author.name
                      )}
                    </div>
                  </div>
                )}
                {selectedPlugin.license && (
                  <div>
                    <div className="text-xs text-gray-500">License</div>
                    <div className="text-sm mt-1">{selectedPlugin.license}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-gray-500">Installed</div>
                  <div className="text-sm mt-1">{formatDate(selectedPlugin.installedAt)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Last Updated</div>
                  <div className="text-sm mt-1">{formatDate(selectedPlugin.lastUpdated)}</div>
                </div>
              </div>

              {/* Links */}
              <div className="flex gap-2 mt-4">
                {selectedPlugin.repository && (
                  <a
                    href={selectedPlugin.repository}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-sm transition-colors"
                  >
                    📦 Repository
                  </a>
                )}
                {selectedPlugin.homepage && (
                  <a
                    href={selectedPlugin.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-sm transition-colors"
                  >
                    🏠 Homepage
                  </a>
                )}
              </div>

              {/* Keywords */}
              {selectedPlugin.keywords && selectedPlugin.keywords.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-gray-500 mb-2">Keywords</div>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlugin.keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="px-2 py-1 rounded bg-white/5 text-xs"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Hooks */}
            {selectedPlugin.hooks && selectedPlugin.hooks.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3">Hooks ({selectedPlugin.hooks.length})</h2>
                <div className="space-y-2">
                  {selectedPlugin.hooks.map((hook, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${getEventBadgeColor(hook.event)}`}>
                          {hook.event}
                        </span>
                        {hook.matcher && (
                          <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-gray-300">
                            {hook.matcher}
                          </span>
                        )}
                        {hook.timeout && (
                          <span className="text-xs text-gray-500">
                            {hook.timeout}s timeout
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-mono bg-black/30 p-2 rounded">
                        {hook.command}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Commands */}
            {selectedPlugin.commands && selectedPlugin.commands.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-3">Commands ({selectedPlugin.commands.length})</h2>
                <div className="space-y-2">
                  {selectedPlugin.commands.map((command, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-white/5 border border-white/10"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <code className="text-sm font-mono text-blue-400">
                            {command.name}
                          </code>
                          {command.description && (
                            <div className="text-sm text-gray-400 mt-1">
                              {command.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Install Path */}
            <div className="mt-6 p-3 rounded-lg bg-black/30 border border-white/10">
              <div className="text-xs text-gray-500 mb-1">Install Path</div>
              <code className="text-xs font-mono text-gray-300 break-all">
                {selectedPlugin.installPath}
              </code>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">👈</div>
              <div className="text-xl">Select a plugin</div>
              <div className="text-sm mt-2">
                Choose a plugin from the sidebar to view details
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
