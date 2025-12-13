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
        // SEMPRE buscar do servidor primeiro (não confiar em cache após logout/login)
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          cache: 'no-store', // Não usar cache do navegador
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.id) {
            setCurrentUser(data.user);
            // Atualizar cache com dados corretos
            localStorage.setItem('chat_current_user', JSON.stringify({
              user: data.user,
              timestamp: Date.now(),
            }));
          } else {
            // Usuário inválido, limpar cache
            localStorage.removeItem('chat_current_user');
            setCurrentUser(null);
          }
        } else {
          // Não autenticado, limpar cache
          localStorage.removeItem('chat_current_user');
          setCurrentUser(null);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        // Em caso de erro, limpar cache
        localStorage.removeItem('chat_current_user');
        setCurrentUser(null);
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

