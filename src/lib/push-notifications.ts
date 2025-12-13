/**
 * Push Notifications Utilities
 * Handles registration and management of push notifications
 */

export interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Check if browser supports push notifications
 */
export function isPushNotificationSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Check current notification permission
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Este navegador não suporta notificações');
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    throw new Error('Permissão de notificações foi negada. Por favor, habilite nas configurações do navegador.');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker não suportado');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[Push Notifications] Service Worker registrado:', registration);
    return registration;
  } catch (error) {
    console.error('[Push Notifications] Erro ao registrar Service Worker:', error);
    return null;
  }
}

/**
 * Get push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    return null;
  }

  const key = subscription.getKey('p256dh');
  const auth = subscription.getKey('auth');

  if (!key || !auth) {
    return null;
  }

  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: btoa(String.fromCharCode(...new Uint8Array(key))),
      auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
    },
  };
}

/**
 * Subscribe to push notifications
 * Requires VAPID public key from server
 */
export async function subscribeToPushNotifications(
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  try {
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      console.log('[Push Notifications] Já inscrito');
      return await getPushSubscription();
    }

    // Convert VAPID key to Uint8Array
    const vapidKey = urlBase64ToUint8Array(vapidPublicKey);

    // Subscribe
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    });

    console.log('[Push Notifications] Inscrito com sucesso:', subscription);

    const key = subscription.getKey('p256dh');
    const auth = subscription.getKey('auth');

    if (!key || !auth) {
      throw new Error('Chaves de subscription não disponíveis');
    }

    return {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: btoa(String.fromCharCode(...new Uint8Array(key))),
        auth: btoa(String.fromCharCode(...new Uint8Array(auth))),
      },
    };
  } catch (error) {
    console.error('[Push Notifications] Erro ao inscrever:', error);
    throw error;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return true;
    }

    const result = await subscription.unsubscribe();
    console.log('[Push Notifications] Desinscrito:', result);
    return result;
  } catch (error) {
    console.error('[Push Notifications] Erro ao desinscrever:', error);
    return false;
  }
}

/**
 * Convert VAPID key from base64 URL to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Register push subscription with server
 */
export async function registerSubscriptionWithServer(
  subscription: PushSubscription
): Promise<boolean> {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });

    if (!response.ok) {
      throw new Error('Erro ao registrar subscription no servidor');
    }

    console.log('[Push Notifications] Subscription registrado no servidor');
    return true;
  } catch (error) {
    console.error('[Push Notifications] Erro ao registrar subscription:', error);
    return false;
  }
}

/**
 * Unregister subscription from server
 */
export async function unregisterSubscriptionFromServer(): Promise<boolean> {
  try {
    const response = await fetch('/api/push/unsubscribe', {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Erro ao desregistrar subscription no servidor');
    }

    console.log('[Push Notifications] Subscription desregistrado do servidor');
    return true;
  } catch (error) {
    console.error('[Push Notifications] Erro ao desregistrar subscription:', error);
    return false;
  }
}

