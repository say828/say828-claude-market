import { useState, useEffect } from 'react';

interface ClaudeSettings {
  [key: string]: unknown;
}

interface CustomCommand {
  name: string;
  path: string;
  content: string;
}

interface CustomHook {
  name: string;
  path: string;
  content: string;
}

interface ClaudeMdContent {
  exists: boolean;
  content: string;
  path: string;
}

interface ConfigPaths {
  claudeDir: string;
  settings: string;
  settingsLocal: string;
  claudeMd: string;
  commands: string;
  hooks: string;
}

export default function SettingsView() {
  const [settings, setSettings] = useState<ClaudeSettings>({});
  const [settingsLocal, setSettingsLocal] = useState<ClaudeSettings>({});
  const [commands, setCommands] = useState<CustomCommand[]>([]);
  const [hooks, setHooks] = useState<CustomHook[]>([]);
  const [claudeMd, setClaudeMd] = useState<ClaudeMdContent>({ exists: false, content: '', path: '' });
  const [configPaths, setConfigPaths] = useState<ConfigPaths | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'local' | 'commands' | 'hooks' | 'claudemd'>('settings');
  const [editingSettings, setEditingSettings] = useState(false);
  const [editingLocal, setEditingLocal] = useState(false);
  const [editingClaudeMd, setEditingClaudeMd] = useState(false);
  const [settingsJson, setSettingsJson] = useState('');
  const [localJson, setLocalJson] = useState('');
  const [claudeMdText, setClaudeMdText] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    loadAllConfig();
  }, []);

  const loadAllConfig = async () => {
    try {
      setLoading(true);
      const [configRes, pathsRes] = await Promise.all([
        fetch('/api/config'),
        fetch('/api/config-paths')
      ]);

      const config = await configRes.json();
      const paths = await pathsRes.json();

      setSettings(config.settings || {});
      setSettingsLocal(config.settingsLocal || {});
      setCommands(config.commands || []);
      setHooks(config.hooks || []);
      setClaudeMd(config.claudeMd || { exists: false, content: '', path: '' });
      setConfigPaths(paths);

      setSettingsJson(JSON.stringify(config.settings || {}, null, 2));
      setLocalJson(JSON.stringify(config.settingsLocal || {}, null, 2));
      setClaudeMdText(config.claudeMd?.content || '');
    } catch (err) {
      setError(`Failed to load config: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaveStatus('saving');
      setError('');
      const parsed = JSON.parse(settingsJson);
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });

      if (!res.ok) {
        throw new Error('Failed to save settings');
      }

      setSettings(parsed);
      setEditingSettings(false);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setError(`Failed to save settings: ${err}`);
      setSaveStatus('error');
    }
  };

  const saveLocalSettings = async () => {
    try {
      setSaveStatus('saving');
      setError('');
      const parsed = JSON.parse(localJson);
      const res = await fetch('/api/settings-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });

      if (!res.ok) {
        throw new Error('Failed to save local settings');
      }

      setSettingsLocal(parsed);
      setEditingLocal(false);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setError(`Failed to save local settings: ${err}`);
      setSaveStatus('error');
    }
  };

  const saveClaudeMd = async () => {
    try {
      setSaveStatus('saving');
      setError('');
      const res = await fetch('/api/claude-md', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: claudeMdText })
      });

      if (!res.ok) {
        throw new Error('Failed to save CLAUDE.md');
      }

      setClaudeMd({ ...claudeMd, content: claudeMdText, exists: true });
      setEditingClaudeMd(false);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setError(`Failed to save CLAUDE.md: ${err}`);
      setSaveStatus('error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">⚙️</div>
          <div className="text-xl font-semibold">Loading Configuration...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Claude Code Configuration</h1>
          <p className="text-gray-400 text-sm">
            Manage your Claude Code settings, commands, hooks, and global instructions
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/40 rounded-lg">
            <div className="font-semibold text-red-400">Error</div>
            <div className="text-sm text-red-300 mt-1">{error}</div>
          </div>
        )}

        {/* Save Status */}
        {saveStatus === 'success' && (
          <div className="mb-4 p-4 bg-green-500/20 border border-green-500/40 rounded-lg">
            <div className="text-green-400">Saved successfully!</div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/10">
          {[
            { id: 'settings', label: 'Settings', icon: '⚙️' },
            { id: 'local', label: 'Local Settings', icon: '📍' },
            { id: 'commands', label: 'Commands', icon: '⌨️', count: commands.length },
            { id: 'hooks', label: 'Hooks', icon: '🪝', count: hooks.length },
            { id: 'claudemd', label: 'CLAUDE.md', icon: '📝' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-white/10 border-b-2 border-blue-400'
                  : 'hover:bg-white/5'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 px-2 py-0.5 bg-white/10 rounded text-xs">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Config Paths */}
        {configPaths && (
          <div className="mb-6 p-4 bg-white/5 rounded-lg">
            <div className="text-xs font-semibold text-gray-400 mb-2">Configuration Directory</div>
            <div className="text-xs font-mono text-gray-300">{configPaths.claudeDir}</div>
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-white/5 rounded-lg p-6">
          {activeTab === 'settings' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Settings (settings.json)</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Main Claude Code settings - synced across machines
                  </p>
                </div>
                {!editingSettings ? (
                  <button
                    onClick={() => setEditingSettings(true)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingSettings(false);
                        setSettingsJson(JSON.stringify(settings, null, 2));
                      }}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveSettings}
                      disabled={saveStatus === 'saving'}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {saveStatus === 'saving' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
              {editingSettings ? (
                <textarea
                  value={settingsJson}
                  onChange={(e) => setSettingsJson(e.target.value)}
                  className="w-full h-96 p-4 bg-black/40 border border-white/10 rounded-lg font-mono text-sm"
                  spellCheck={false}
                />
              ) : (
                <pre className="w-full h-96 p-4 bg-black/40 border border-white/10 rounded-lg font-mono text-sm overflow-auto">
                  {settingsJson}
                </pre>
              )}
            </div>
          )}

          {activeTab === 'local' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold">Local Settings (settings.local.json)</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Machine-specific settings - not synced
                  </p>
                </div>
                {!editingLocal ? (
                  <button
                    onClick={() => setEditingLocal(true)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingLocal(false);
                        setLocalJson(JSON.stringify(settingsLocal, null, 2));
                      }}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveLocalSettings}
                      disabled={saveStatus === 'saving'}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {saveStatus === 'saving' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
              {editingLocal ? (
                <textarea
                  value={localJson}
                  onChange={(e) => setLocalJson(e.target.value)}
                  className="w-full h-96 p-4 bg-black/40 border border-white/10 rounded-lg font-mono text-sm"
                  spellCheck={false}
                />
              ) : (
                <pre className="w-full h-96 p-4 bg-black/40 border border-white/10 rounded-lg font-mono text-sm overflow-auto">
                  {localJson}
                </pre>
              )}
            </div>
          )}

          {activeTab === 'commands' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Custom Commands</h2>
              <p className="text-sm text-gray-400 mb-4">
                Custom slash commands from ~/.claude/commands/
              </p>
              {commands.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">📭</div>
                  <div>No custom commands found</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {commands.map((cmd) => (
                    <div key={cmd.name} className="p-4 bg-black/40 border border-white/10 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-lg">/{cmd.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{cmd.path}</div>
                      </div>
                      <pre className="text-xs overflow-x-auto mt-2 p-2 bg-black/40 rounded">
                        {cmd.content}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'hooks' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Custom Hooks</h2>
              <p className="text-sm text-gray-400 mb-4">
                Custom hooks from ~/.claude/hooks/
              </p>
              {hooks.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">📭</div>
                  <div>No custom hooks found</div>
                </div>
              ) : (
                <div className="space-y-4">
                  {hooks.map((hook) => (
                    <div key={hook.name} className="p-4 bg-black/40 border border-white/10 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-lg">{hook.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{hook.path}</div>
                      </div>
                      <pre className="text-xs overflow-x-auto mt-2 p-2 bg-black/40 rounded">
                        {hook.content}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'claudemd' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold">CLAUDE.md</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Global instructions for all Claude Code sessions
                  </p>
                  {claudeMd.path && (
                    <p className="text-xs text-gray-500 mt-1 font-mono">{claudeMd.path}</p>
                  )}
                </div>
                {!editingClaudeMd ? (
                  <button
                    onClick={() => setEditingClaudeMd(true)}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                  >
                    {claudeMd.exists ? 'Edit' : 'Create'}
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingClaudeMd(false);
                        setClaudeMdText(claudeMd.content);
                      }}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveClaudeMd}
                      disabled={saveStatus === 'saving'}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {saveStatus === 'saving' ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
              {editingClaudeMd ? (
                <textarea
                  value={claudeMdText}
                  onChange={(e) => setClaudeMdText(e.target.value)}
                  placeholder="# Global Instructions for Claude Code&#10;&#10;Write your instructions here..."
                  className="w-full h-96 p-4 bg-black/40 border border-white/10 rounded-lg font-mono text-sm"
                  spellCheck={false}
                />
              ) : claudeMd.exists ? (
                <pre className="w-full h-96 p-4 bg-black/40 border border-white/10 rounded-lg font-mono text-sm overflow-auto whitespace-pre-wrap">
                  {claudeMd.content}
                </pre>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">📝</div>
                  <div>CLAUDE.md does not exist yet</div>
                  <div className="text-sm mt-2">Click "Create" to add global instructions</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
