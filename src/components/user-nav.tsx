'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User as UserIcon, Bell, BellOff, Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CreatePost } from '@/components/feed/create-post';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  getPushSubscription,
  requestNotificationPermission,
  registerServiceWorker,
  subscribeToPushNotifications,
  unregisterSubscriptionFromServer,
} from '@/lib/push-notifications';
import { toast } from '@/hooks/use-toast';
import type { User } from '@/lib/data';

export function UserNav() {
  const [user, setUser] = useState<User | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isTogglingNotifications, setIsTogglingNotifications] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch('/api/auth/me');
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, []);

  useEffect(() => {
    if (isPushNotificationSupported()) {
      setIsPushSupported(true);
      setNotificationPermission(getNotificationPermission());
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const subscription = await getPushSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleToggleNotifications = async () => {
    if (isTogglingNotifications) return;

    setIsTogglingNotifications(true);

    try {
      if (isSubscribed) {
        // Disable notifications
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          await subscription.unsubscribe();
        }

        await unregisterSubscriptionFromServer();
        setIsSubscribed(false);
        
        toast({
          title: 'Notificações desativadas',
          description: 'Você pode ativar novamente a qualquer momento',
        });
      } else {
        // Enable notifications
        const permissionResult = await requestNotificationPermission();
        setNotificationPermission(permissionResult);

        if (permissionResult !== 'granted') {
          toast({
            title: 'Permissão negada',
            description: 'Você precisa permitir notificações para receber alertas',
            variant: 'destructive',
          });
          setIsTogglingNotifications(false);
          return;
        }

        const registration = await registerServiceWorker();
        if (!registration) {
          throw new Error('Falha ao registrar Service Worker');
        }

        const vapidResponse = await fetch('/api/push/vapid-key', {
          credentials: 'include',
        });
        if (!vapidResponse.ok) {
          throw new Error('Falha ao obter chave VAPID');
        }
        const { publicKey } = await vapidResponse.json();

        if (!publicKey) {
          throw new Error('Chave VAPID não disponível');
        }

        const subscription = await subscribeToPushNotifications(publicKey);
        if (!subscription) {
          throw new Error('Falha ao inscrever-se em notificações push');
        }

        const response = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(subscription),
        });

        if (!response.ok) {
          const errorData = await response.json();
          if (errorData.code === 'TABLE_NOT_FOUND') {
            throw new Error('Tabela de notificações não encontrada. Por favor, execute a migration no Supabase Dashboard.');
          }
          throw new Error(errorData.error || errorData.details || 'Falha ao registrar subscription no servidor');
        }

        setIsSubscribed(true);
        toast({
          title: 'Notificações ativadas!',
          description: 'Você receberá notificações quando houver novas mensagens ou posts',
        });
      }
    } catch (error: any) {
      console.error('Error toggling notifications:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao alterar notificações',
        variant: 'destructive',
      });
    } finally {
      setIsTogglingNotifications(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      
      // Clear all localStorage cache
      const { clearAllCache } = await import('@/lib/storage/clear-all-cache');
      clearAllCache();
      
      // Clear sessionStorage as well
      sessionStorage.clear();
      
      // Force reload to ensure clean state
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
      // Even if API fails, clear cache and redirect
      const { clearAllCache } = await import('@/lib/storage/clear-all-cache');
      clearAllCache();
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  const getInitials = (name: string) => {
    const names = name.split(' ');
    const initials = names.map((n) => n[0]).join('');
    return initials.slice(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.avatarUrl} alt={user.name} />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.name}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setShowCreatePost(true)}>
              <Plus className="mr-2 h-4 w-4" />
              <span>Nova Publicação</span>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </Link>
            </DropdownMenuItem>
            {isPushSupported && (
              <DropdownMenuItem 
                onClick={handleToggleNotifications}
                disabled={isTogglingNotifications || notificationPermission === 'denied'}
              >
                {isTogglingNotifications ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    <span>{isSubscribed ? 'Desativando...' : 'Ativando...'}</span>
                  </>
                ) : (
                  <>
                    {isSubscribed ? (
                      <>
                        <Bell className="mr-2 h-4 w-4 text-green-500" />
                        <span>Notificações Ativadas</span>
                      </>
                    ) : (
                      <>
                        <BellOff className="mr-2 h-4 w-4" />
                        <span>Ativar Notificações</span>
                      </>
                    )}
                  </>
                )}
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CreatePost
        open={showCreatePost}
        onClose={() => setShowCreatePost(false)}
        onPostCreated={() => {
          setShowCreatePost(false);
          // Refresh the page to show the new post
          window.location.reload();
        }}
      />
    </>
  );
}
