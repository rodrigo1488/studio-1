'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  registerServiceWorker,
  subscribeToPushNotifications,
  registerSubscriptionWithServer,
  getPushSubscription,
} from '@/lib/push-notifications';
import { toast } from '@/hooks/use-toast';

export function PushNotificationSetup() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkSupport();
    checkPermission();
    checkSubscription();
  }, []);

  const checkSupport = () => {
    setIsSupported(isPushNotificationSupported());
  };

  const checkPermission = () => {
    setPermission(getNotificationPermission());
  };

  const checkSubscription = async () => {
    try {
      const subscription = await getPushSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const handleEnableNotifications = async () => {
    if (!isSupported) {
      toast({
        title: 'Não suportado',
        description: 'Seu navegador não suporta notificações push',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Request permission
      const permissionResult = await requestNotificationPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        toast({
          title: 'Permissão negada',
          description: 'Você precisa permitir notificações para receber alertas',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // 2. Register service worker
      const registration = await registerServiceWorker();
      if (!registration) {
        throw new Error('Falha ao registrar Service Worker');
      }

      // 3. Get VAPID public key from server
      const vapidResponse = await fetch('/api/push/vapid-key');
      if (!vapidResponse.ok) {
        throw new Error('Falha ao obter chave VAPID');
      }
      const { publicKey } = await vapidResponse.json();

      if (!publicKey) {
        throw new Error('Chave VAPID não disponível');
      }

      // 4. Subscribe to push
      const subscription = await subscribeToPushNotifications(publicKey);
      if (!subscription) {
        throw new Error('Falha ao inscrever-se em notificações push');
      }

      // 5. Register with server
      const registered = await registerSubscriptionWithServer(subscription);
      if (!registered) {
        throw new Error('Falha ao registrar subscription no servidor');
      }

      setIsSubscribed(true);
      toast({
        title: 'Notificações ativadas!',
        description: 'Você receberá notificações quando houver novas mensagens ou posts',
      });
    } catch (error: any) {
      console.error('Error enabling notifications:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao ativar notificações',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  if (permission === 'granted' && isSubscribed) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Bell className="h-4 w-4 text-green-500" />
        <span>Notificações ativadas</span>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleEnableNotifications}
      disabled={isLoading || permission === 'denied'}
      className="gap-2"
    >
      {isLoading ? (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Ativando...</span>
        </>
      ) : (
        <>
          <BellOff className="h-4 w-4" />
          <span>Ativar Notificações</span>
        </>
      )}
    </Button>
  );
}

