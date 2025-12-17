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
    <div className="inline-flex items-center rounded-lg border-2 border-primary/30 bg-background shadow-sm overflow-hidden">
      <button
        onClick={() => onViewModeChange('timeline')}
        className={cn(
          'inline-flex items-center justify-center gap-2 px-4 sm:px-5 h-9 sm:h-10 text-sm sm:text-base font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          viewMode === 'timeline'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
      >
        <List className="h-4 w-4 sm:h-5 sm:w-5" />
        <span>Timeline</span>
      </button>
      <div className="h-5 w-px bg-border" />
      <button
        onClick={() => onViewModeChange('grid')}
        className={cn(
          'inline-flex items-center justify-center gap-2 px-4 sm:px-5 h-9 sm:h-10 text-sm sm:text-base font-medium transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          viewMode === 'grid'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
        )}
      >
        <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5" />
        <span>Grid</span>
      </button>
    </div>
  );
}

