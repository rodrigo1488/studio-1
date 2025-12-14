/**
 * Pull-to-refresh component
 */

'use client';

import { usePullToRefresh } from '@/lib/hooks/use-pull-to-refresh';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  className?: string;
  threshold?: number;
}

export function PullToRefresh({
  onRefresh,
  children,
  className,
  threshold = 80,
}: PullToRefreshProps) {
  const { handlers, state } = usePullToRefresh({ onRefresh, threshold });

  return (
    <div
      className={cn('relative', className)}
      {...handlers}
    >
      {/* Pull indicator */}
      {state.isPulling && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-50 transition-transform"
          style={{
            transform: `translateY(${Math.min(state.distance, threshold * 1.5)}px)`,
            opacity: Math.min(state.distance / threshold, 1),
          }}
        >
          <div className="flex flex-col items-center gap-2 py-2">
            {state.isRefreshing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Atualizando...</span>
              </>
            ) : state.canRefresh ? (
              <>
                <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span className="text-xs text-muted-foreground">Solte para atualizar</span>
              </>
            ) : (
              <>
                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                <span className="text-xs text-muted-foreground">Puxe para atualizar</span>
              </>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

