import { useState, useEffect, useRef } from 'react';
import { useSessionTemplates, SessionTemplate } from '../../hooks/useSessionTemplates';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (path: string) => void;
}

type SortBy = 'lastUsed' | 'name' | 'created';

export default function TemplateModal({ isOpen, onClose, onSelectTemplate }: TemplateModalProps) {
  const { templates, addTemplate, updateTemplate, deleteTemplate, recordUsage } = useSessionTemplates();
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPath, setEditPath] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('lastUsed');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isOpen]);

  const handleAddTemplate = () => {
    if (newName.trim() && newPath.trim()) {
      addTemplate(newName.trim(), newPath.trim());
      setNewName('');
      setNewPath('');
    }
  };

  const handleStartEdit = (template: SessionTemplate) => {
    setEditingId(template.id);
    setEditName(template.name);
    setEditPath(template.path);
  };

  const handleSaveEdit = () => {
    if (editingId && editName.trim() && editPath.trim()) {
      updateTemplate(editingId, { name: editName.trim(), path: editPath.trim() });
      setEditingId(null);
      setEditName('');
      setEditPath('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditPath('');
  };

  const handleSelectTemplate = (template: SessionTemplate) => {
    recordUsage(template.id);
    onSelectTemplate(template.path);
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm('Delete this template?')) {
      deleteTemplate(id);
      if (editingId === id) {
        handleCancelEdit();
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: 'add' | 'edit') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (action === 'add') {
        handleAddTemplate();
      } else {
        handleSaveEdit();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (action === 'edit') {
        handleCancelEdit();
      } else {
        onClose();
      }
    }
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.path.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sortedTemplates = [...filteredTemplates].sort((a, b) => {
    if (sortBy === 'lastUsed') {
      if (!a.lastUsed && !b.lastUsed) return 0;
      if (!a.lastUsed) return 1;
      if (!b.lastUsed) return -1;
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    } else if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#0a0a0a] border border-white/10 rounded-lg w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-3 border-b border-white/10 flex items-center justify-between">
          <span className="font-semibold text-white">Session Templates</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {/* Search and Sort */}
        <div className="p-4 border-b border-white/10 space-y-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="lastUsed">Last Used</option>
              <option value="name">Name</option>
              <option value="created">Created</option>
            </select>
          </div>
        </div>

        {/* Template List */}
        <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
          {sortedTemplates.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              {searchQuery ? 'No templates match your search' : 'No templates saved yet'}
            </div>
          ) : (
            sortedTemplates.map(template => (
              <div
                key={template.id}
                className="bg-white/5 hover:bg-white/10 rounded-lg p-3 transition-colors"
              >
                {editingId === template.id ? (
                  // Edit mode
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, 'edit')}
                      placeholder="Template name"
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={editPath}
                      onChange={(e) => setEditPath(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, 'edit')}
                      placeholder="Project path"
                      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={!editName.trim() || !editPath.trim()}
                        className={`flex-1 px-3 py-1 rounded text-xs font-medium transition-colors ${
                          editName.trim() && editPath.trim()
                            ? 'bg-blue-500 hover:bg-blue-600 text-white'
                            : 'bg-white/5 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 px-3 py-1 border border-white/10 text-gray-400 rounded text-xs hover:bg-white/5 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div>
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white text-sm">{template.name}</div>
                        <div className="text-xs text-gray-400 truncate">{template.path}</div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button
                          onClick={() => handleStartEdit(template)}
                          className="p-1 text-gray-400 hover:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {template.lastUsed && (
                      <div className="text-xs text-gray-500 mb-2">
                        Last used: {new Date(template.lastUsed).toLocaleString()}
                      </div>
                    )}
                    <button
                      onClick={() => handleSelectTemplate(template)}
                      className="w-full px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded font-medium transition-colors"
                    >
                      Use Template
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add Template Form */}
        <div className="p-4 border-t border-white/10 space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Add New Template</div>
          <input
            ref={nameInputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'add')}
            placeholder="Template name (e.g., My Project)"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500"
          />
          <input
            type="text"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, 'add')}
            placeholder="/path/to/project"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500"
          />
          <button
            onClick={handleAddTemplate}
            disabled={!newName.trim() || !newPath.trim()}
            className={`w-full px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              newName.trim() && newPath.trim()
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-white/5 text-gray-500 cursor-not-allowed'
            }`}
          >
            <span className="text-lg">+</span>
            Add Template
          </button>
        </div>
      </div>
    </div>
  );
}
