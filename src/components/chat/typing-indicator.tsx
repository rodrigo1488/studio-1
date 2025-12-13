'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  roomId: string;
  currentUserId: string;
}

interface TypingUser {
  userId: string;
  userName: string;
  avatarUrl?: string;
}

export function TypingIndicator({ roomId, currentUserId }: TypingIndicatorProps) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);

  useEffect(() => {
    let isMounted = true;
    
    const fetchTypingUsers = async () => {
      try {
        const response = await fetch(`/api/typing/${roomId}`);
        if (response.ok && isMounted) {
          const data = await response.json();
          setTypingUsers(data.typingUsers || []);
        }
      } catch (error) {
        if (isMounted) {
          console.error('Error fetching typing users:', error);
        }
      }
    };

    // Poll every 2 seconds (reduced frequency)
    const interval = setInterval(fetchTypingUsers, 2000);
    fetchTypingUsers();

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [roomId, currentUserId]);

  if (typingUsers.length === 0) {
    return null;
  }

  const names = typingUsers.map((u) => u.userName).join(', ');

  return (
    <div className="px-4 py-2 text-sm text-muted-foreground italic animate-fade-in">
      <span className="inline-flex items-center gap-1">
        <span className="flex gap-1">
          <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1 h-1 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </span>
        <span>{names} {typingUsers.length === 1 ? 'está digitando' : 'estão digitando'}...</span>
      </span>
    </div>
  );
}

