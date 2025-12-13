import { supabaseAdmin } from '@/lib/supabase/server';
import webpush from 'web-push';

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
      console.warn(`[Push] No subscriptions found for user ${userId}`);
      return { success: false, error: 'No subscriptions found for user' };
    }

    console.log(`[Push] Found ${subscriptions.length} subscription(s) for user ${userId}`);

    // Send notification to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        try {
          const subscription = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key,
            },
          };

          const payload = JSON.stringify({
            title,
            body,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            tag: 'notification',
            data: data || {},
          });

          console.log(`[Push] Sending notification to endpoint: ${sub.endpoint.substring(0, 50)}...`);
          await webpush.sendNotification(subscription, payload);
          console.log(`[Push] ✅ Notification sent successfully to ${sub.endpoint.substring(0, 50)}...`);
        } catch (err: any) {
          console.error(`[Push] ❌ Error sending to ${sub.endpoint}:`, err.message);
          throw err;
        }
      })
    );

    const failures = results.filter((r) => r.status === 'rejected');
    if (failures.length > 0) {
      console.error('Some push notifications failed:', failures);
      // Remove invalid subscriptions
      for (const failure of failures) {
        if (failure.status === 'rejected') {
          const error = failure.reason as any;
          if (error.statusCode === 410 || error.statusCode === 404) {
            // Subscription expired or not found, remove it
            const endpoint = error.endpoint;
            if (endpoint) {
              await supabaseAdmin
                .from('push_subscriptions')
                .delete()
                .eq('endpoint', endpoint);
            }
          }
        }
      }
    }

    const successes = results.filter((r) => r.status === 'fulfilled');
    if (successes.length === 0) {
      return { success: false, error: 'All push notifications failed' };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return { success: false, error: error.message || 'Failed to send push notification' };
  }
}

