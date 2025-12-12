'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPresenceBadge } from '@/components/ui/user-presence-badge';
import { useUserPresence } from '@/hooks/use-user-presence';
import { cn } from '@/lib/utils';
import type { User } from '@/lib/data';

interface AvatarWithPresenceProps {
  user: User;
  showPresence?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  getInitials?: (name: string) => string;
}

export function AvatarWithPresence({
  user,
  showPresence = true,
  size = 'md',
  className,
  getInitials,
}: AvatarWithPresenceProps) {
  const { presence } = useUserPresence(showPresence ? user.id : null);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const badgeSize = size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md';

  const defaultGetInitials = (name: string) => {
    const names = name.split(' ');
    return names
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className={cn('relative inline-block', className)}>
      <Avatar className={cn(sizeClasses[size], className)}>
        <AvatarImage src={user.avatarUrl} alt={user.name} />
        <AvatarFallback>
          {(getInitials || defaultGetInitials)(user.name)}
        </AvatarFallback>
      </Avatar>
      {showPresence && presence && (
        <UserPresenceBadge status={presence.status} size={badgeSize} />
      )}
    </div>
  );
}

