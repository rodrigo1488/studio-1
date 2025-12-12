'use client';

import { cn } from '@/lib/utils';
import type { PresenceStatus } from '@/lib/supabase/presence';

interface UserPresenceBadgeProps {
  status: PresenceStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UserPresenceBadge({ status, size = 'md', className }: UserPresenceBadgeProps) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    away: 'bg-yellow-500',
  };

  return (
    <span
      className={cn(
        'absolute bottom-0 right-0 rounded-full border-2 border-background',
        sizeClasses[size],
        statusColors[status],
        status === 'online' && 'animate-pulse',
        className
      )}
      aria-label={`Status: ${status}`}
    />
  );
}

