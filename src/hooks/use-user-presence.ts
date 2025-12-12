'use client';

import { useEffect, useState } from 'react';
import type { PresenceStatus, UserPresence } from '@/lib/supabase/presence';

export function useUserPresence(userId: string | null) {
  const [presence, setPresence] = useState<UserPresence | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchPresence = async () => {
      try {
        const response = await fetch(`/api/presence/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setPresence({
            ...data.presence,
            lastSeen: new Date(data.presence.lastSeen),
            updatedAt: new Date(data.presence.updatedAt),
          });
        }
      } catch (error) {
        console.error('Error fetching presence:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPresence();

    // Subscribe to real-time updates
    const supabase = require('@/lib/supabase/client').createClient();
    const channel = supabase
      .channel(`presence:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          if (payload.new) {
            setPresence({
              id: payload.new.id,
              userId: payload.new.user_id,
              status: payload.new.status as PresenceStatus,
              lastSeen: new Date(payload.new.last_seen),
              updatedAt: new Date(payload.new.updated_at),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { presence, isLoading };
}

