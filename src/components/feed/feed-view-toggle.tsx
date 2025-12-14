'use client';

import { LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'timeline' | 'grid';

interface FeedViewToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function FeedViewToggle({ viewMode, onViewModeChange }: FeedViewToggleProps) {
  const isGridMode = viewMode === 'grid';
  
  const handleToggle = () => {
    onViewModeChange(isGridMode ? 'timeline' : 'grid');
  };

  return (
    <button
      onClick={handleToggle}
      className={cn(
        'inline-flex items-center justify-center h-9 w-9 rounded-lg border-2 transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isGridMode
          ? 'border-primary/30 bg-primary text-primary-foreground shadow-sm'
          : 'border-primary/30 bg-background text-muted-foreground hover:text-foreground hover:bg-muted/50'
      )}
      title={isGridMode ? 'Modo Grid' : 'Ativar Grid'}
    >
      <LayoutGrid className="h-4 w-4" />
    </button>
  );
}

