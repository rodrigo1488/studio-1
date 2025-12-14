'use client';

import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageEditIndicatorProps {
  className?: string;
}

export function MessageEditIndicator({ className }: MessageEditIndicatorProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-muted-foreground italic', className)}>
      <Pencil className="h-3 w-3" />
      Editado
    </span>
  );
}

