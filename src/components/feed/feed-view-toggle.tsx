'use client';

import { Button } from '@/components/ui/button';
import { LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'timeline' | 'grid';

interface FeedViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function FeedViewToggle({ viewMode, onViewModeChange }: FeedViewToggleProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-pressed={viewMode === 'grid'}
      aria-label={viewMode === 'grid' ? 'Desativar visualização em grid' : 'Ativar visualização em grid'}
      className={cn(
        'h-9 w-9 sm:h-10 sm:w-10 rounded-full border border-primary/30 shadow-sm',
        viewMode === 'grid'
          ? 'bg-primary text-primary-foreground'
          : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
      )}
      onClick={() => onViewModeChange(viewMode === 'grid' ? 'timeline' : 'grid')}
    >
      {viewMode === 'grid' ? (
        <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5" />
      ) : (
        <List className="h-4 w-4 sm:h-5 sm:w-5" />
      )}
    </Button>
  );
}

