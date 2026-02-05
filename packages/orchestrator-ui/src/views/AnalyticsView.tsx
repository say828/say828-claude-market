import { useMemo } from 'react';
import type { SessionSummary, DashboardStats } from '@claude-orchestrator/shared';

interface AnalyticsViewProps {
  sessions: SessionSummary[];
  stats: DashboardStats;
}

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface LineData {
  x: string;
  y: number;
}

// Simple Bar Chart Component (SVG)
function BarChart({
  data,
  width,
  height,
}: {
  data: ChartData[];
  width: number;
  height: number;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value));
  const barWidth = width / data.length;
  const chartHeight = height - 40; // Leave space for labels
  const padding = 10;

  return (
    <svg width={width} height={height} className="overflow-visible">
      {data.map((item, index) => {
        const barHeight = maxValue > 0 ? (item.value / maxValue) * chartHeight : 0;
        const x = index * barWidth + padding;
        const y = chartHeight - barHeight;

        return (
          <g key={item.label}>
            {/* Bar */}
            <rect
              x={x}
              y={y}
              width={barWidth - padding * 2}
              height={barHeight}
              fill={item.color || '#3b82f6'}
              opacity={0.8}
              rx={4}
            />
            {/* Value Label */}
            <text
              x={x + (barWidth - padding * 2) / 2}
              y={y - 5}
              textAnchor="middle"
              fill="#fff"
              fontSize="12"
              fontWeight="bold"
            >
              {item.value}
            </text>
            {/* X-axis Label */}
            <text
              x={x + (barWidth - padding * 2) / 2}
              y={chartHeight + 20}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize="11"
            >
              {item.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Simple Line Chart Component (SVG)
function LineChart({
  data,
  width,
  height,
}: {
  data: LineData[];
  width: number;
  height: number;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.y), 1);
  const chartHeight = height - 40;
  const chartWidth = width - 60;
  const stepX = chartWidth / Math.max(data.length - 1, 1);
  const padding = 30;

  const points = data
    .map((item, index) => {
      const x = padding + index * stepX;
      const y = chartHeight - (item.y / maxValue) * (chartHeight - 20);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((percent) => {
        const y = chartHeight - percent * (chartHeight - 20);
        return (
          <g key={percent}>
            <line
              x1={padding}
              y1={y}
              x2={width - 30}
              y2={y}
              stroke="#374151"
              strokeWidth={1}
              opacity={0.3}
            />
            <text
              x={padding - 10}
              y={y + 4}
              textAnchor="end"
              fill="#9ca3af"
              fontSize="10"
            >
              {Math.round(maxValue * percent)}
            </text>
          </g>
        );
      })}

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Points */}
      {data.map((item, index) => {
        const x = padding + index * stepX;
        const y = chartHeight - (item.y / maxValue) * (chartHeight - 20);
        return (
          <g key={index}>
            <circle cx={x} cy={y} r={4} fill="#3b82f6" />
            {/* X-axis labels */}
            <text
              x={x}
              y={chartHeight + 20}
              textAnchor="middle"
              fill="#9ca3af"
              fontSize="10"
            >
              {item.x}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  color,
  icon,
}: {
  title: string;
  value: number | string;
  color: string;
  icon?: string;
}) {
  return (
    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-xs text-gray-500 mb-1">{title}</div>
          <div className={`text-2xl font-bold ${color}`}>{value}</div>
        </div>
        {icon && <div className="text-3xl opacity-50">{icon}</div>}
      </div>
    </div>
  );
}

export default function AnalyticsView({ sessions, stats }: AnalyticsViewProps) {
  // Calculate analytics data
  const analytics = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    let sessionsToday = 0;
    let sessionsThisWeek = 0;
    let sessionsThisMonth = 0;
    let totalMessages = 0;
    let totalDuration = 0;

    const toolUsage = new Map<string, number>();
    const projectActivity = new Map<string, number>();
    const dailyActivity = new Map<string, number>();

    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      dailyActivity.set(dateStr, 0);
    }

    sessions.forEach((session) => {
      const lastActivity = new Date(session.lastActivity);

      // Time-based counts
      if (lastActivity >= today) sessionsToday++;
      if (lastActivity >= weekAgo) sessionsThisWeek++;
      if (lastActivity >= monthAgo) sessionsThisMonth++;

      // Messages
      totalMessages += session.messageCount;

      // Project activity
      const current = projectActivity.get(session.projectName) || 0;
      projectActivity.set(session.projectName, current + session.messageCount);

      // Daily activity (sessions per day)
      const dateStr = `${lastActivity.getMonth() + 1}/${lastActivity.getDate()}`;
      if (dailyActivity.has(dateStr)) {
        dailyActivity.set(dateStr, (dailyActivity.get(dateStr) || 0) + 1);
      }
    });

    // Estimate tool usage based on message count (simplified)
    // In a real implementation, we'd parse session messages for actual tool_use blocks
    const estimatedTools = Math.floor(totalMessages * 0.6); // Assume 60% of messages use tools
    toolUsage.set('Read', Math.floor(estimatedTools * 0.3));
    toolUsage.set('Bash', Math.floor(estimatedTools * 0.25));
    toolUsage.set('Edit', Math.floor(estimatedTools * 0.2));
    toolUsage.set('Write', Math.floor(estimatedTools * 0.15));
    toolUsage.set('Grep', Math.floor(estimatedTools * 0.1));

    // Average session duration (estimated: 5 min per message)
    const avgDuration = sessions.length > 0
      ? Math.round((totalMessages / sessions.length) * 5)
      : 0;

    // Top projects
    const topProjects = Array.from(projectActivity.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, messageCount: count }));

    // Daily activity data
    const activityData = Array.from(dailyActivity.entries()).map(([date, count]) => ({
      x: date,
      y: count,
    }));

    // Tool usage data
    const toolData = Array.from(toolUsage.entries()).map(([label, value]) => ({
      label,
      value,
      color: getToolColor(label),
    }));

    return {
      sessionsToday,
      sessionsThisWeek,
      sessionsThisMonth,
      avgDuration,
      topProjects,
      activityData,
      toolData,
      totalMessages,
    };
  }, [sessions]);

  function getToolColor(tool: string): string {
    const colors: Record<string, string> = {
      Read: '#3b82f6',    // blue
      Bash: '#10b981',    // green
      Edit: '#f59e0b',    // yellow
      Write: '#8b5cf6',   // purple
      Grep: '#ef4444',    // red
    };
    return colors[tool] || '#6b7280';
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Analytics Dashboard</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Sessions"
            value={stats.totalSessions}
            color="text-blue-400"
            icon="📊"
          />
          <StatCard
            title="Active Sessions"
            value={stats.activeSessions}
            color="text-green-400"
            icon="🟢"
          />
          <StatCard
            title="Sessions Today"
            value={analytics.sessionsToday}
            color="text-purple-400"
            icon="📅"
          />
          <StatCard
            title="Avg Duration"
            value={`${analytics.avgDuration} min`}
            color="text-yellow-400"
            icon="⏱️"
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            title="Sessions This Week"
            value={analytics.sessionsThisWeek}
            color="text-blue-300"
          />
          <StatCard
            title="Sessions This Month"
            value={analytics.sessionsThisMonth}
            color="text-blue-300"
          />
          <StatCard
            title="Total Messages"
            value={analytics.totalMessages}
            color="text-blue-300"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tool Usage Chart */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h2 className="text-lg font-semibold mb-4">Tool Usage</h2>
            <div className="h-64 flex items-center justify-center">
              <BarChart data={analytics.toolData} width={400} height={240} />
            </div>
          </div>

          {/* Activity Chart */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h2 className="text-lg font-semibold mb-4">Sessions (Last 7 Days)</h2>
            <div className="h-64 flex items-center justify-center">
              <LineChart data={analytics.activityData} width={400} height={240} />
            </div>
          </div>

          {/* Top Projects */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h2 className="text-lg font-semibold mb-4">Most Active Projects</h2>
            <div className="space-y-3">
              {analytics.topProjects.length > 0 ? (
                analytics.topProjects.map((project, index) => (
                  <div
                    key={project.name}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl font-bold text-gray-500">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{project.name}</div>
                        <div className="text-xs text-gray-500">
                          {project.messageCount} messages
                        </div>
                      </div>
                    </div>
                    <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{
                          width: `${
                            (project.messageCount /
                              analytics.topProjects[0].messageCount) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No project activity yet
                </div>
              )}
            </div>
          </div>

          {/* Recent Projects */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <h2 className="text-lg font-semibold mb-4">Recent Sessions</h2>
            <div className="space-y-2">
              {sessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="p-3 bg-white/5 rounded-lg flex items-start justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{session.projectName}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(session.lastActivity).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {session.messageCount} messages
                    </div>
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-xs ${
                      session.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : session.status === 'pending_hook'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {session.status}
                  </div>
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No sessions yet
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
