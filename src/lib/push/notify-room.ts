import { supabaseAdmin } from '@/lib/supabase/server';
import { sendPushNotification } from './send-notification';

interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  data?: Record<string, any>;
}

/**
 * Send push notification to all members of a room (except sender)
 */
export async function sendPushNotificationToRoomMembers(
  roomId: string,
  senderId: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    if (!supabaseAdmin) {
      console.warn('[Push] Supabase admin not initialized');
      return;
    }

    // Get room members
    const { data: members, error } = await supabaseAdmin
      .from('room_members')
      .select('user_id')
      .eq('room_id', roomId);

    if (error || !members) {
      console.error('[Push] Error fetching room members:', error);
      return;
    }

    // Filter out sender
    const recipientIds = members
      .map((m: any) => m.user_id)
      .filter((id: string) => id !== senderId);

    if (recipientIds.length === 0) {
      return;
    }

    console.log(`[Push] Sending notifications to ${recipientIds.length} recipient(s) in room ${roomId}`);

    // Send notification to each recipient
    const results = await Promise.allSettled(
      recipientIds.map(async (userId: string) => {
        const result = await sendPushNotification(userId, payload.title, payload.body, {
          ...payload.data,
          url: payload.url || '/chat',
          roomId,
        });
        if (!result.success) {
          console.warn(`[Push] Failed to send to user ${userId}: ${result.error}`);
        }
        return result;
      })
    );

    const successCount = results.filter(r => r.status === 'fulfilled').length;
    const failureCount = results.filter(r => r.status === 'rejected').length;
    console.log(`[Push] Room notifications: ${successCount} success, ${failureCount} failures`);
  } catch (error) {
    console.error('[Push] Error sending notifications to room members:', error);
  }
}

/**
 * Send push notification to a specific user
 */
export async function sendPushNotificationToUser(
  userId: string,
  payload: NotificationPayload
): Promise<void> {
  try {
    await sendPushNotification(userId, payload.title, payload.body, {
      ...payload.data,
      url: payload.url || '/',
    });
  } catch (error) {
    console.error('[Push] Error sending notification to user:', error);
  }
}

