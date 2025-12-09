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
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
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

