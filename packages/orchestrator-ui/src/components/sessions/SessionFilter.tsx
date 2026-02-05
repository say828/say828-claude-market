import { useState } from 'react';
import type { SessionSummary } from '@claude-orchestrator/shared';

export interface SessionFilter {
  search: string;
  status: 'all' | 'active' | 'idle' | 'pending_hook';
  project?: string;
  branch?: string;
  dateRange?: 'today' | 'week' | 'month' | 'all';
}

interface SessionFilterProps {
  onFilterChange: (filter: SessionFilter) => void;
  projects: string[];
  branches: string[];
}

export function SessionFilter({ onFilterChange, projects, branches }: SessionFilterProps) {
  const [filter, setFilter] = useState<SessionFilter>({
    search: '',
    status: 'all',
    dateRange: 'all',
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const updateFilter = (updates: Partial<SessionFilter>) => {
    const newFilter = { ...filter, ...updates };
    setFilter(newFilter);
    onFilterChange(newFilter);
  };

  const clearFilters = () => {
    const defaultFilter: SessionFilter = {
      search: '',
      status: 'all',
      project: undefined,
      branch: undefined,
      dateRange: 'all',
    };
    setFilter(defaultFilter);
    onFilterChange(defaultFilter);
  };

  const activeFilterCount = [
    filter.search,
    filter.status !== 'all',
    filter.project,
    filter.branch,
    filter.dateRange !== 'all',
  ].filter(Boolean).length;

  return (
    <div className="p-2 border-b border-white/10 flex-shrink-0 space-y-2">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={filter.search}
          onChange={(e) => updateFilter({ search: e.target.value })}
          placeholder="Search projects..."
          className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        {filter.search && (
          <button
            onClick={() => updateFilter({ search: '' })}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            title="Clear search"
          >
            <span className="material-icons text-sm">close</span>
          </button>
        )}
      </div>

      {/* Main Filters Row */}
      <div className="flex gap-2">
        {/* Status Dropdown */}
        <select
          value={filter.status}
          onChange={(e) => updateFilter({ status: e.target.value as SessionFilter['status'] })}
          className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="idle">Idle</option>
          <option value="pending_hook">Pending Hook</option>
        </select>

        {/* Date Range Dropdown */}
        <select
          value={filter.dateRange || 'all'}
          onChange={(e) => updateFilter({ dateRange: e.target.value as SessionFilter['dateRange'] })}
          className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
        >
          <span className="material-icons text-sm">
            {showAdvanced ? 'expand_less' : 'expand_more'}
          </span>
          Advanced Filters
        </button>

        {/* Active Filter Count + Clear Button */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs text-gray-500 hover:text-white flex items-center gap-1"
          >
            <span className="bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">
              {activeFilterCount}
            </span>
            Clear
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="space-y-2 pt-2 border-t border-white/10">
          {/* Project Filter */}
          {projects.length > 0 && (
            <select
              value={filter.project || ''}
              onChange={(e) => updateFilter({ project: e.target.value || undefined })}
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Projects</option>
              {projects.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          )}

          {/* Branch Filter */}
          {branches.length > 0 && (
            <select
              value={filter.branch || ''}
              onChange={(e) => updateFilter({ branch: e.target.value || undefined })}
              className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch} value={branch}>
                  ⎇ {branch}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to filter sessions based on filter criteria
export function filterSessions(sessions: SessionSummary[], filter: SessionFilter): SessionSummary[] {
  return sessions.filter((session) => {
    // Search filter (project name)
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      if (!session.projectName.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Status filter
    if (filter.status !== 'all' && session.status !== filter.status) {
      return false;
    }

    // Project filter
    if (filter.project && session.projectName !== filter.project) {
      return false;
    }

    // Branch filter
    if (filter.branch) {
      if (!session.gitBranch || session.gitBranch !== filter.branch) {
        return false;
      }
    }

    // Date range filter
    if (filter.dateRange && filter.dateRange !== 'all') {
      const now = new Date();
      const lastActivity = new Date(session.lastActivity);
      const diffMs = now.getTime() - lastActivity.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      const diffDays = diffHours / 24;

      switch (filter.dateRange) {
        case 'today':
          if (diffDays > 1) return false;
          break;
        case 'week':
          if (diffDays > 7) return false;
          break;
        case 'month':
          if (diffDays > 30) return false;
          break;
      }
    }

    return true;
  });
}
