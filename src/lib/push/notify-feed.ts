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
    await Promise.allSettled(
      followerIds.map((followerId: string) =>
        sendPushNotification(followerId, payload.title, payload.body, {
          ...payload.data,
          url: payload.url || '/feed',
          userId,
        })
      )
    );
  } catch (error) {
    console.error('[Push] Error sending notifications to followers:', error);
  }
}

