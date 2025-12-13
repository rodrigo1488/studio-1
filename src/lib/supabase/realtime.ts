import { supabase } from './client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Message, User } from '@/lib/data';

export interface MessageInsert {
  id: string;
  room_id: string;
  sender_id: string;
  text: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'audio' | 'gif';
  created_at: string;
  reply_to_id?: string;
}

/**
 * Subscribe to messages in a room
 */
export function subscribeToMessages(
  roomId: string,
  callback: (message: MessageInsert) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        callback(payload.new as MessageInsert);
      }
    )
    .subscribe();

  return channel;
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribeFromChannel(channel: RealtimeChannel): Promise<void> {
  await supabase.removeChannel(channel);
}

/**
 * Convert database message to app message format
 */
export function convertMessageToAppFormat(
  dbMessage: MessageInsert, 
  user?: User | null
): Message & { user?: User } {
  return {
    id: dbMessage.id,
    roomId: dbMessage.room_id,
    senderId: dbMessage.sender_id,
    text: dbMessage.text,
    timestamp: new Date(dbMessage.created_at),
    mediaUrl: dbMessage.media_url || undefined,
    mediaType: dbMessage.media_type || undefined,
    replyToId: dbMessage.reply_to_id || undefined,
    status: 'sent', // Mensagens do banco sempre estão enviadas
    user: user || undefined,
  };
}

