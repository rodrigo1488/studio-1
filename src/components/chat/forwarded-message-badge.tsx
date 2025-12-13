'use client';

import { Forward } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ForwardedMessageBadgeProps {
  isOwnMessage?: boolean;
  className?: string;
}

export function ForwardedMessageBadge({ isOwnMessage = false, className }: ForwardedMessageBadgeProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium mb-2 border',
        isOwnMessage
          ? 'bg-white/20 text-white/90 border-white/30 backdrop-blur-sm'
          : 'bg-muted/80 text-muted-foreground border-border/50',
        className
      )}
    >
      <Forward className={cn(
        'h-3 w-3',
        isOwnMessage ? 'text-white/90' : 'text-muted-foreground'
      )} />
      <span className="font-semibold">Encaminhado</span>
    </div>
  );
}

