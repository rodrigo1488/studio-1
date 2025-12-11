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
    <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
      <Button
        variant={viewMode === 'timeline' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('timeline')}
        className={cn(
          'flex-1',
          viewMode === 'timeline' && 'bg-background shadow-sm'
        )}
      >
        <List className="h-4 w-4 mr-2" />
        Timeline
      </Button>
      <Button
        variant={viewMode === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('grid')}
        className={cn(
          'flex-1',
          viewMode === 'grid' && 'bg-background shadow-sm'
        )}
      >
        <LayoutGrid className="h-4 w-4 mr-2" />
        Grid
      </Button>
    </div>
  );
}

