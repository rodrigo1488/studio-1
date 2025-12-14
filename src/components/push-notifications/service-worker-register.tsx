'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/push-notifications';

/**
 * Component to automatically register service worker on app load
 * This ensures push notifications work even if user hasn't explicitly enabled them yet
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    // Only register if service workers are supported
    if ('serviceWorker' in navigator) {
      console.log('[Service Worker Register] Iniciando registro do Service Worker...');
      
      registerServiceWorker()
        .then((registration) => {
          if (registration) {
            console.log('[Service Worker Register] Service Worker registrado com sucesso');
            
            // Listen for service worker updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[Service Worker Register] Nova versão do Service Worker disponível');
                  }
                });
              }
            });
          } else {
            console.warn('[Service Worker Register] Falha ao registrar Service Worker');
          }
        })
        .catch((error) => {
          console.error('[Service Worker Register] Erro ao registrar Service Worker:', error);
        });
    } else {
      console.warn('[Service Worker Register] Service Workers não são suportados neste navegador');
    }
  }, []);

  return null; // This component doesn't render anything
}
