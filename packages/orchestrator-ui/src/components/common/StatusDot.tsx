import { STATUS_COLORS } from '@claude-orchestrator/shared';
import type { SessionStatus, WebSessionStatus } from '@claude-orchestrator/shared';

type StatusType = SessionStatus | WebSessionStatus;

interface StatusDotProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-3 h-3',
};

export function StatusDot({ status, size = 'md', className = '' }: StatusDotProps) {
  const colorClass = STATUS_COLORS[status] || 'bg-gray-600';
  const sizeClass = SIZE_CLASSES[size];

  return <div className={`rounded-full ${colorClass} ${sizeClass} ${className}`} />;
}
