import { supabaseAdmin } from '@/lib/supabase/server';
import { sendPushNotification } from './send-notification';

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  data?: Record<string, any>;
}

/**
 * Send push notification to all followers of a user
 */
export async function sendPushNotificationToFollowers(
  userId: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    if (!supabaseAdmin) {
      console.warn('[Push] Supabase admin not initialized');
      return;
    }

    // Get followers
    const { data: followers, error } = await supabaseAdmin
      .from('follows')
      .select('follower_id')
      .eq('following_id', userId);

    if (error || !followers) {
      console.error('[Push] Error fetching followers:', error);
      return;
    }

    const followerIds = followers.map((f: any) => f.follower_id);

    if (followerIds.length === 0) {
      return;
    }

    // Send notification to each follower
    const results = await Promise.allSettled(
      followerIds.map((followerId: string) =>
        sendPushNotification(followerId, payload.title, payload.body, {
          ...payload.data,
          url: payload.url || '/feed',
          userId,
          senderAvatar: payload.data?.senderAvatar,
          mediaType: payload.data?.mediaType,
          mediaUrl: payload.data?.mediaUrl,
        })
      )
    );

    // Log results for debugging
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failureCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
    
    if (successCount > 0) {
      console.log(`[Push] Sent ${successCount} notification(s) to followers of user ${userId}`);
    }
    
    if (failureCount > 0) {
      // Only log failures that are not "no subscriptions" (which is expected)
      const realFailures = results.filter(r => {
        if (r.status === 'rejected') return true;
        if (r.status === 'fulfilled' && !r.value.success) {
          return r.value.error !== 'No subscriptions found for user';
        }
        return false;
      });
      
      if (realFailures.length > 0) {
        console.warn(`[Push] ${realFailures.length} notification(s) failed for followers of user ${userId}`);
      }
    }
  } catch (error) {
    console.error('[Push] Error sending notifications to followers:', error);
  }
}

