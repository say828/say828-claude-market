import { useState, useEffect, useRef } from 'react';

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSession: (path: string) => void;
}

export default function NewSessionModal({ isOpen, onClose, onCreateSession }: NewSessionModalProps) {
  const [path, setPath] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (path.trim()) {
      onCreateSession(path.trim());
      setPath('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#0a0a0a] border border-white/10 rounded-lg w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="p-3 border-b border-white/10 flex items-center justify-between">
          <span className="font-semibold text-white">New Claude Code Session</span>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            ✕
          </button>
        </div>
        <div className="p-4">
          <label className="block text-sm text-gray-400 mb-2">Working Directory</label>
          <input
            ref={inputRef}
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="/path/to/your/project"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-500"
          />
          <p className="text-xs text-gray-500 mt-2">
            Enter the full path to the directory where you want Claude Code to work.
          </p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-white/10 text-gray-400 rounded-lg hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!path.trim()}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                path.trim()
                  ? 'bg-blue-500 hover:bg-blue-600 text-white'
                  : 'bg-white/5 text-gray-500 cursor-not-allowed'
              }`}
            >
              Start Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
