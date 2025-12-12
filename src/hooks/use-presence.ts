'use client';

import { useEffect, useState, useCallback } from 'react';
import type { PresenceStatus } from '@/lib/supabase/presence';

export function usePresence(userId: string | null) {
  const [status, setStatus] = useState<PresenceStatus>('offline');
  const [isUpdating, setIsUpdating] = useState(false);

  const updatePresence = useCallback(
    async (newStatus: PresenceStatus) => {
      if (!userId || isUpdating) return;

      setIsUpdating(true);
      try {
        const response = await fetch('/api/presence/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });

        if (response.ok) {
          const data = await response.json();
          setStatus(data.presence.status);
        }
      } catch (error) {
        console.error('Error updating presence:', error);
      } finally {
        setIsUpdating(false);
      }
    },
    [userId, isUpdating]
  );

  useEffect(() => {
    if (!userId) return;

    // Set online when component mounts
    updatePresence('online');

    // Set offline when component unmounts or page becomes hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away');
      } else {
        updatePresence('online');
      }
    };

    const handleBeforeUnload = () => {
      // Use sendBeacon for more reliable offline status
      navigator.sendBeacon(
        '/api/presence/update',
        JSON.stringify({ status: 'offline' })
      );
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Update presence every 30 seconds to keep it fresh
    const interval = setInterval(() => {
      if (!document.hidden) {
        updatePresence('online');
      }
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(interval);
      updatePresence('offline');
    };
  }, [userId, updatePresence]);

  return { status, updatePresence };
}

