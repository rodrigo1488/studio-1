'use client';

import { useEffect, useState } from 'react';
import { CallProvider } from '@/contexts/call-context';
import { CallNotification } from './call-notification';
import type { User } from '@/lib/data';

export function CallProviderWrapper({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        // Try cache first
        const cached = localStorage.getItem('chat_current_user');
        if (cached) {
          try {
            const data = JSON.parse(cached);
            const age = Date.now() - data.timestamp;
            if (age < 30 * 60 * 1000) { // 30 minutes
              setCurrentUser(data.user);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            // Invalid cache, fetch fresh
          }
        }
        
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
          // Cache user
          localStorage.setItem('chat_current_user', JSON.stringify({
            user: data.user,
            timestamp: Date.now(),
          }));
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, []);

  if (isLoading) {
    return <>{children}</>;
  }

  return (
    <CallProvider currentUser={currentUser}>
      {children}
      <CallNotification />
    </CallProvider>
  );
}

