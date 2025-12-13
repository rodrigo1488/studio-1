import { supabase } from '@/lib/supabase/client';

export interface MessageRead {
  id: string;
  messageId: string;
  userId: string;
  readAt: Date;
  user?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

export async function markMessageAsRead(
  messageId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {

    const { error } = await supabase.from('message_reads').upsert(
      {
        message_id: messageId,
        user_id: userId,
        read_at: new Date().toISOString(),
      },
      {
        onConflict: 'message_id,user_id',
      }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao marcar mensagem como lida' };
  }
}

export async function markRoomMessagesAsRead(
  roomId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {

    // Get all unread messages in the room
    const { data: messages } = await supabase
      .from('messages')
      .select('id')
      .eq('room_id', roomId)
      .neq('sender_id', userId);

    if (!messages || messages.length === 0) {
      return { success: true, error: null };
    }

    const messageIds = messages.map((m) => m.id);

    // Mark all as read
    const { error } = await supabase.from('message_reads').upsert(
      messageIds.map((messageId) => ({
        message_id: messageId,
        user_id: userId,
        read_at: new Date().toISOString(),
      })),
      {
        onConflict: 'message_id,user_id',
      }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao marcar mensagens como lidas' };
  }
}

export async function getMessageReads(
  messageId: string
): Promise<{ reads: MessageRead[]; error: string | null }> {
  try {

    const { data, error } = await supabase
      .from('message_reads')
      .select(`
        *,
        users (id, name, avatar_url)
      `)
      .eq('message_id', messageId)
      .order('read_at', { ascending: false });

    if (error) {
      return { reads: [], error: error.message };
    }

    return {
      reads: (data || []).map((r: any) => ({
        id: r.id,
        messageId: r.message_id,
        userId: r.user_id,
        readAt: new Date(r.read_at),
        user: r.users ? {
          id: r.users.id,
          name: r.users.name,
          avatarUrl: r.users.avatar_url || undefined,
        } : undefined,
      })),
      error: null,
    };
  } catch (error: any) {
    return { reads: [], error: error.message || 'Erro ao buscar leituras' };
  }
}

