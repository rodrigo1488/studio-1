import { supabaseAdmin } from '@/lib/supabase/server';
import webpush from 'web-push';

const MAX_TITLE_LENGTH = 120;
const MAX_BODY_LENGTH = 220;

function sanitizeText(
  value: string | undefined | null,
  maxLength: number,
  fallback: string
): string {
  if (!value || typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength - 1) + '…';
}

function isValidSubscriptionRow(sub: any): boolean {
  if (!sub) return false;
  if (typeof sub.endpoint !== 'string' || !sub.endpoint.startsWith('https://')) {
    return false;
  }
  if (typeof sub.p256dh_key !== 'string' || sub.p256dh_key.length < 16) {
    return false;
  }
  if (typeof sub.auth_key !== 'string' || sub.auth_key.length < 8) {
    return false;
  }
  return true;
}

/**
 * Envia uma notificação com retries e prioridade alta.
 * Torna falhas transitórias muito menos prováveis.
 */
async function sendWithRetry(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
  maxRetries = 2
): Promise<void> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // TTL curto e urgência alta para entrega rápida
      const options: webpush.RequestOptions = {
        TTL: 60, // segundos
        urgency: 'high',
      };

      await webpush.sendNotification(subscription, payload, options);
      return;
    } catch (err: any) {
      lastError = err;
      const statusCode = err?.statusCode || err?.status;

      // Erros definitivos (4xx que não sejam 429) não adiantam retry
      const isClientError =
        statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429;
      if (isClientError) {
        throw err;
      }

      // Última tentativa: propaga o erro
      if (attempt === maxRetries) {
        throw err;
      }

      // Backoff exponencial curto (até ~3s)
      const delayMs = Math.min(1000 * (attempt + 1), 3000);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  if (lastError) {
    throw lastError;
  }
}

/**
 * Send push notification to a user
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Supabase admin not initialized' };
    }

    // Get VAPID keys from environment
    let vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    let vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@familychat.com';
    
    // Ensure VAPID email is in correct format (mailto:email@domain.com)
    if (vapidEmail && !vapidEmail.startsWith('mailto:')) {
      vapidEmail = `mailto:${vapidEmail}`;
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return { success: false, error: 'VAPID keys not configured' };
    }

    // Normalize VAPID public key to URL-safe Base64
    // VAPID keys should be URL-safe Base64 without padding
    // Remove any whitespace and normalize format
    let normalizedPublicKey = vapidPublicKey.trim();
    
    // If key has standard Base64 characters (+ and /), convert to URL-safe
    if (normalizedPublicKey.includes('+') || normalizedPublicKey.includes('/')) {
      normalizedPublicKey = normalizedPublicKey
        .replace(/\+/g, '-') // Replace + with -
        .replace(/\//g, '_'); // Replace / with _
    }
    
    // Remove padding (=) if present
    normalizedPublicKey = normalizedPublicKey.replace(/=/g, '');

    try {
      // Configure web-push with normalized key
      webpush.setVapidDetails(vapidEmail, normalizedPublicKey, vapidPrivateKey);
      console.log('[Push] VAPID keys configured successfully');
    } catch (error: any) {
      console.error('[Push] Error setting VAPID details:', error.message);
      console.error('[Push] Public key (first 20 chars):', normalizedPublicKey.substring(0, 20));
      return { 
        success: false, 
        error: `Invalid VAPID keys: ${error.message}. Please regenerate keys using: node GERAR_VAPID_KEYS.js` 
      };
    }

    // Get user's push subscriptions
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh_key, auth_key')
      .eq('user_id', userId);

    if (error) {
      console.error('[Push] Error fetching subscriptions:', error);
      return { success: false, error: `Error fetching subscriptions: ${error.message}` };
    }

    if (!subscriptions || subscriptions.length === 0) {
      // This is expected if user hasn't enabled push notifications - not an error
      // Only log at debug level, not as warning/error
      if (process.env.NODE_ENV === 'development') {
        console.debug(`[Push] No subscriptions found for user ${userId} (user may not have enabled notifications)`);
      }
      return { success: false, error: 'No subscriptions found for user' };
    }

    // Filtrar linhas obviamente inválidas antes de tentar enviar
    const validSubscriptions = subscriptions.filter(isValidSubscriptionRow);
    const invalidSubscriptions = subscriptions.filter((sub: any) => !isValidSubscriptionRow(sub));

    if (invalidSubscriptions.length > 0) {
      console.warn(
        `[Push] Found ${invalidSubscriptions.length} invalid subscription row(s) for user ${userId}, scheduling cleanup`
      );
      // Limpar de forma assíncrona; não bloqueia o envio para as válidas
      const invalidEndpoints = invalidSubscriptions
        .map((sub: any) => sub?.endpoint)
        .filter((endpoint: any) => typeof endpoint === 'string');

      if (invalidEndpoints.length > 0) {
        supabaseAdmin
          ?.from('push_subscriptions')
          .delete()
          .in('endpoint', invalidEndpoints)
          .then(({ error: deleteError }) => {
            if (deleteError) {
              console.error('[Push] Error removing structurally invalid subscriptions:', deleteError);
            } else {
              console.log(
                `[Push] Removed ${invalidEndpoints.length} structurally invalid subscription(s) for user ${userId}`
              );
            }
          })
          .catch((err) => {
            console.error('[Push] Unexpected error removing structurally invalid subscriptions:', err);
          });
      }
    }

    if (validSubscriptions.length === 0) {
      return { success: false, error: 'No valid subscriptions found for user' };
    }

    console.log(
      `[Push] Found ${validSubscriptions.length} valid subscription(s) for user ${userId} (from ${subscriptions.length} total)`
    );

    // Send notification to all subscriptions
    const results = await Promise.allSettled(
      validSubscriptions.map(async (sub: any) => {
        try {
          const subscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key,
            },
          };

          // Build rich notification payload (sanitizado para evitar erros de tamanho)
          const safeTitle = sanitizeText(title, MAX_TITLE_LENGTH, 'FamilyChat');
          const safeBody = sanitizeText(
            body,
            MAX_BODY_LENGTH,
            'Você tem uma nova notificação'
          );

          const notificationPayload: any = {
            title: safeTitle,
            body: safeBody,
            icon: data?.senderAvatar || '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: data?.roomId || 'notification',
            requireInteraction: false,
            // IMPORTANTE: Limitação das notificações push web
            // O campo 'sound' só aceita nomes de sons do sistema ou nomes de arquivos (sem caminho)
            // Para PWAs instalados, alguns navegadores podem aceitar apenas o nome do arquivo
            // Se não funcionar, o sistema usará o som padrão do dispositivo
            sound: 'notification-sound.mp3', // Apenas o nome do arquivo (sem caminho)
            data: {
              ...data,
              timestamp: new Date().toISOString(),
            },
          };

          // Add image if media type is image
          if (data?.mediaType === 'image' && data?.mediaUrl) {
            notificationPayload.image = data.mediaUrl;
          }

          // Add actions for better UX (if supported by browser)
          notificationPayload.actions = [
            {
              action: 'open',
              title: 'Abrir conversa',
            },
          ];

          const payload = JSON.stringify(notificationPayload);

          console.log(`[Push] Sending notification to endpoint: ${sub.endpoint.substring(0, 50)}...`);
          // Usa retries com prioridade alta
          await sendWithRetry(subscription, payload);
          console.log(`[Push] ✅ Notification sent successfully to ${sub.endpoint.substring(0, 50)}...`);
        } catch (err: any) {
          console.error(`[Push] ❌ Error sending to ${sub.endpoint}:`, err.message);
          throw err;
        }
      })
    );

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      console.error('[Push] Some push notifications failed:', failures.length);
      
      // Remove invalid subscriptions
      const endpointsToRemove: string[] = [];
      
      for (const failure of failures) {
        if (failure.status === 'rejected') {
          const error = failure.reason as any;
          const statusCode = error.statusCode || error.status;
          const endpoint = error.endpoint;
          
          // Remove subscriptions that are:
          // - 410: Gone (expired)
          // - 404: Not found
          // - 403: Invalid VAPID credentials (keys changed)
          if (statusCode === 410 || statusCode === 404 || statusCode === 403) {
            if (endpoint) {
              endpointsToRemove.push(endpoint);
              console.log(`[Push] Marking subscription for removal (${statusCode}): ${endpoint.substring(0, 50)}...`);
            }
          }
        }
      }
      
      // Remove all invalid subscriptions in batch
      if (endpointsToRemove.length > 0) {
        const { error: deleteError } = await supabaseAdmin
          .from('push_subscriptions')
          .delete()
          .in('endpoint', endpointsToRemove);
        
        if (deleteError) {
          console.error('[Push] Error removing invalid subscriptions:', deleteError);
        } else {
          console.log(`[Push] Removed ${endpointsToRemove.length} invalid subscription(s)`);
        }
      }
    }

    const successes = results.filter((r) => r.status === 'fulfilled');
    if (successes.length === 0) {
      // Check if all failures were due to "no subscriptions" (expected case)
      const allNoSubscriptions = failures.every((f) => {
        if (f.status === 'rejected') {
          const error = f.reason as any;
          return error?.message?.includes('No subscriptions') || error?.error === 'No subscriptions found for user';
        }
        return false;
      });
      
      if (allNoSubscriptions) {
        // This is expected - user hasn't enabled notifications
        return { success: false, error: 'No subscriptions found for user' };
      }
      
      return { success: false, error: 'All push notifications failed' };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('[Push] Error sending push notification:', error);
    return { success: false, error: error.message || 'Failed to send push notification' };
  }
}

