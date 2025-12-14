'use client';

import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TemporaryMessageIndicatorProps {
  expiresAt: Date;
  className?: string;
}

export function TemporaryMessageIndicator({ expiresAt, className }: TemporaryMessageIndicatorProps) {
  const timeRemaining = formatDistanceToNow(expiresAt, { 
    addSuffix: true, 
    locale: ptBR 
  });

  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground italic', className)}>
      <Clock className="h-3 w-3" />
      Expira {timeRemaining}
    </span>
  );
}



