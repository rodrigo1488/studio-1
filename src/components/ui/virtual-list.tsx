/**
 * Virtual scrolling list component for performance
 * Only renders visible items
 */

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number | ((item: T, index: number) => number);
  containerHeight: number;
  overscan?: number; // Number of items to render outside viewport
  className?: string;
  onScroll?: (scrollTop: number) => void;
}

export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 3,
  className,
  onScroll,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const getItemHeight = (item: T, index: number): number => {
    return typeof itemHeight === 'function' ? itemHeight(item, index) : itemHeight;
  };

  // Calculate total height
  const totalHeight = useMemo(() => {
    return items.reduce((sum, item, index) => sum + getItemHeight(item, index), 0);
  }, [items, itemHeight]);

  // Calculate visible range
  const { startIndex, endIndex, offsetY } = useMemo(() => {
    let currentTop = 0;
    let start = 0;
    let end = 0;

    // Find start index
    for (let i = 0; i < items.length; i++) {
      const height = getItemHeight(items[i], i);
      if (currentTop + height > scrollTop) {
        start = Math.max(0, i - overscan);
        break;
      }
      currentTop += height;
    }

    // Find end index
    let currentBottom = currentTop;
    for (let i = start; i < items.length; i++) {
      const height = getItemHeight(items[i], i);
      currentBottom += height;
      if (currentBottom > scrollTop + containerHeight) {
        end = Math.min(items.length, i + overscan + 1);
        break;
      }
    }

    if (end === 0) {
      end = items.length;
    }

    // Calculate offset for items before start
    let offset = 0;
    for (let i = 0; i < start; i++) {
      offset += getItemHeight(items[i], i);
    }

    return { startIndex: start, endIndex: end, offsetY: offset };
  }, [items, scrollTop, containerHeight, overscan, itemHeight]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  };

  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            return (
              <div key={actualIndex} style={{ height: getItemHeight(item, actualIndex) }}>
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

