import { useState, useEffect, useRef } from 'react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Array<{ id: string; projectName: string }>;
  onSelectSession: (id: string) => void;
  onNewSession: () => void;
  onNavigate: (tab: 'sessions' | 'plugins' | 'settings') => void;
  onSlashCommand: (cmd: string) => void;
  onToggleTheme?: () => void;
  onClearNotifications?: () => void;
}

interface Command {
  id: string;
  label: string;
  category: 'Sessions' | 'Navigation' | 'Actions' | 'Commands';
  shortcut?: string;
  action: () => void;
}

export function CommandPalette({
  isOpen,
  onClose,
  sessions,
  onSelectSession,
  onNewSession,
  onNavigate,
  onSlashCommand,
  onToggleTheme,
  onClearNotifications,
}: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build command list
  const commands: Command[] = [
    // Session commands
    ...sessions.map((session) => ({
      id: `session-${session.id}`,
      label: `Switch to ${session.projectName}`,
      category: 'Sessions' as const,
      action: () => {
        onSelectSession(session.id);
        onClose();
      },
    })),
    {
      id: 'new-session',
      label: 'New Session',
      category: 'Sessions',
      shortcut: 'Ctrl+N',
      action: () => {
        onNewSession();
        onClose();
      },
    },
    // Navigation
    {
      id: 'nav-sessions',
      label: 'Go to Sessions',
      category: 'Navigation',
      shortcut: '1',
      action: () => {
        onNavigate('sessions');
        onClose();
      },
    },
    {
      id: 'nav-plugins',
      label: 'Go to Plugins',
      category: 'Navigation',
      shortcut: '2',
      action: () => {
        onNavigate('plugins');
        onClose();
      },
    },
    {
      id: 'nav-settings',
      label: 'Go to Settings',
      category: 'Navigation',
      shortcut: '3',
      action: () => {
        onNavigate('settings');
        onClose();
      },
    },
    // Actions
    ...(onToggleTheme
      ? [{
          id: 'toggle-theme',
          label: 'Toggle Theme',
          category: 'Actions' as const,
          action: () => {
            onToggleTheme();
            onClose();
          },
        }]
      : []),
    ...(onClearNotifications
      ? [{
          id: 'clear-notifications',
          label: 'Clear Notifications',
          category: 'Actions' as const,
          action: () => {
            onClearNotifications();
            onClose();
          },
        }]
      : []),
    // Slash commands
    {
      id: 'cmd-help',
      label: '/help - Show help',
      category: 'Commands',
      action: () => {
        onSlashCommand('/help');
        onClose();
      },
    },
    {
      id: 'cmd-clear',
      label: '/clear - Clear conversation',
      category: 'Commands',
      action: () => {
        onSlashCommand('/clear');
        onClose();
      },
    },
    {
      id: 'cmd-cost',
      label: '/cost - Show costs',
      category: 'Commands',
      action: () => {
        onSlashCommand('/cost');
        onClose();
      },
    },
    {
      id: 'cmd-compact',
      label: '/compact - Toggle compact mode',
      category: 'Commands',
      action: () => {
        onSlashCommand('/compact');
        onClose();
      },
    },
    {
      id: 'cmd-config',
      label: '/config - View configuration',
      category: 'Commands',
      action: () => {
        onSlashCommand('/config');
        onClose();
      },
    },
    {
      id: 'cmd-model',
      label: '/model - Change model',
      category: 'Commands',
      action: () => {
        onSlashCommand('/model');
        onClose();
      },
    },
    {
      id: 'cmd-memory',
      label: '/memory - Edit memory',
      category: 'Commands',
      action: () => {
        onSlashCommand('/memory');
        onClose();
      },
    },
    {
      id: 'cmd-permissions',
      label: '/permissions - View permissions',
      category: 'Commands',
      action: () => {
        onSlashCommand('/permissions');
        onClose();
      },
    },
    {
      id: 'cmd-status',
      label: '/status - Show status',
      category: 'Commands',
      action: () => {
        onSlashCommand('/status');
        onClose();
      },
    },
    {
      id: 'cmd-review',
      label: '/review - Review changes',
      category: 'Commands',
      action: () => {
        onSlashCommand('/review');
        onClose();
      },
    },
  ];

  // Filter commands based on search
  const filteredCommands = search
    ? commands.filter((cmd) =>
        cmd.label.toLowerCase().includes(search.toLowerCase())
      )
    : commands;

  // Group commands by category
  const groupedCommands: Record<string, Command[]> = {};
  filteredCommands.forEach((cmd) => {
    if (!groupedCommands[cmd.category]) {
      groupedCommands[cmd.category] = [];
    }
    groupedCommands[cmd.category].push(cmd);
  });

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredCommands.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedElement = listRef.current.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  let currentIndex = 0;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 pt-20"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1a] border border-white/10 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="p-3 border-b border-white/10">
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands..."
            className="bg-white/5 border-none w-full px-4 py-3 text-white placeholder-gray-500 focus:outline-none rounded"
          />
        </div>

        {/* Command List */}
        <div ref={listRef} className="max-h-96 overflow-y-auto">
          {Object.keys(groupedCommands).length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              No commands found
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, cmds]) => (
              <div key={category}>
                {/* Category Header */}
                <div className="text-xs text-gray-500 uppercase px-4 py-2 bg-white/5 sticky top-0">
                  {category}
                </div>
                {/* Commands */}
                {cmds.map((cmd) => {
                  const itemIndex = currentIndex++;
                  return (
                    <div
                      key={cmd.id}
                      data-index={itemIndex}
                      onClick={() => cmd.action()}
                      className={`px-4 py-2 cursor-pointer transition-colors flex items-center justify-between ${
                        selectedIndex === itemIndex
                          ? 'bg-white/10'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <span className="text-white text-sm">{cmd.label}</span>
                      {cmd.shortcut && (
                        <span className="text-xs text-gray-500 font-mono">
                          {cmd.shortcut}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/10 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
