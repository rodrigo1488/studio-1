/**
 * Hook for pull-to-refresh functionality
 */

import { useRef, useState, useCallback } from 'react';

interface PullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number; // Distance in pixels to trigger refresh
  resistance?: number; // Resistance factor (0-1) for pull beyond threshold
}

interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  distance: number;
  canRefresh: boolean;
}

const DEFAULT_THRESHOLD = 80;
const DEFAULT_RESISTANCE = 0.5;

export function usePullToRefresh(options: PullToRefreshOptions) {
  const { onRefresh, threshold = DEFAULT_THRESHOLD, resistance = DEFAULT_RESISTANCE } = options;
  const touchStartRef = useRef<{ y: number; scrollTop: number } | null>(null);
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    distance: 0,
    canRefresh: false,
  });

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, scrollElement: HTMLElement) => {
      // Only trigger if at top of scroll
      if (scrollElement.scrollTop > 0) return;

      const touch = e.touches[0];
      touchStartRef.current = {
        y: touch.clientY,
        scrollTop: scrollElement.scrollTop,
      };
      setState((prev) => ({ ...prev, isPulling: true }));
    },
    []
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent, scrollElement: HTMLElement) => {
      if (!touchStartRef.current || scrollElement.scrollTop > 0) return;

      const touch = e.touches[0];
      const deltaY = touch.clientY - touchStartRef.current.y;

      // Only allow downward pull
      if (deltaY > 0) {
        const distance = deltaY > threshold 
          ? threshold + (deltaY - threshold) * resistance 
          : deltaY;
        
        setState({
          isPulling: true,
          isRefreshing: false,
          distance,
          canRefresh: distance >= threshold,
        });
      }
    },
    [threshold, resistance]
  );

  const handleTouchEnd = useCallback(
    async (e: React.TouchEvent) => {
      if (!touchStartRef.current) return;

      const canRefresh = state.distance >= threshold;

      if (canRefresh) {
        setState((prev) => ({ ...prev, isRefreshing: true, isPulling: false }));
        try {
          await onRefresh();
        } catch (error) {
          console.error('Error refreshing:', error);
        } finally {
          setState({
            isPulling: false,
            isRefreshing: false,
            distance: 0,
            canRefresh: false,
          });
        }
      } else {
        setState({
          isPulling: false,
          isRefreshing: false,
          distance: 0,
          canRefresh: false,
        });
      }

      touchStartRef.current = null;
    },
    [onRefresh, threshold, state.distance]
  );

  return {
    handlers: {
      onTouchStart: (e: React.TouchEvent) => {
        const scrollElement = e.currentTarget as HTMLElement;
        handleTouchStart(e, scrollElement);
      },
      onTouchMove: (e: React.TouchEvent) => {
        const scrollElement = e.currentTarget as HTMLElement;
        handleTouchMove(e, scrollElement);
      },
      onTouchEnd: handleTouchEnd,
    },
    state,
  };
}

