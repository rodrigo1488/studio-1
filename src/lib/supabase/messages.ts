import { supabase } from './client';
import type { Message } from '@/lib/data';

export interface MessageInsert {
  id: string;
  room_id: string;
  sender_id: string;
  text: string;
  media_url?: string;
  media_type?: 'image' | 'video' | 'audio' | 'gif';
  created_at: string;
}

/**
 * Send a message
 */
export async function sendMessage(
  roomId: string,
  senderId: string,
  text: string,
  mediaUrl?: string,
  mediaType?: 'image' | 'video' | 'audio' | 'gif',
  replyToId?: string
): Promise<{ message: Message; error: null } | { message: null; error: string }> {
  try {
    // VALIDAÇÃO: Garantir que senderId não está vazio
    if (!senderId || senderId.trim() === '') {
      return { message: null, error: 'SenderId é obrigatório' };
    }

    // VALIDAÇÃO: Garantir que roomId não está vazio
    if (!roomId || roomId.trim() === '') {
      return { message: null, error: 'RoomId é obrigatório' };
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        sender_id: senderId, // Este senderId vem do servidor (sessão autenticada)
        text: text || '',
        media_url: mediaUrl,
        media_type: mediaType,
        reply_to_id: replyToId || null,
      })
      .select('id, room_id, sender_id, text, media_url, media_type, created_at, reply_to_id')
      .single();

    if (error) {
      return { message: null, error: error.message };
    }

    // VALIDAÇÃO: Garantir que o senderId retornado é o mesmo que foi enviado
    if (data.sender_id !== senderId) {
      console.error(`SenderId mismatch in database: expected ${senderId}, got ${data.sender_id}`);
      // Ainda assim retornar a mensagem, mas com o senderId do banco (fonte da verdade)
    }

    return {
      message: {
        id: data.id,
        roomId: data.room_id,
        senderId: data.sender_id, // SEMPRE usar o senderId do banco de dados (fonte da verdade)
        text: data.text,
        timestamp: new Date(data.created_at),
        mediaUrl: data.media_url || undefined,
        mediaType: data.media_type || undefined,
        replyToId: data.reply_to_id || undefined,
      },
      error: null,
    };
  } catch (error) {
    return { message: null, error: 'Erro ao enviar mensagem' };
  }
}

/**
 * Get messages for a room with pagination
 */
export async function getRoomMessages(
  roomId: string,
  limit: number = 50,
  offset: number = 0,
  before?: Date
): Promise<{ messages: Message[]; hasMore: boolean }> {
  try {
    let query = supabase
      .from('messages')
      .select('id, room_id, sender_id, text, media_url, media_type, created_at, reply_to_id', { count: 'exact' })
      .eq('room_id', roomId);

    // If before date is provided, get messages before that date
    if (before) {
      query = query.lt('created_at', before.toISOString());
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) {
      return { messages: [], hasMore: false };
    }

    // Get reply message IDs
    const replyToIds = data
      .filter((msg: any) => msg.reply_to_id)
      .map((msg: any) => msg.reply_to_id);

    // Fetch reply messages if any
    let replyMessagesMap: Record<string, any> = {};
    if (replyToIds.length > 0) {
      const { data: replyData } = await supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          text,
          media_url,
          media_type,
          created_at,
          users!messages_sender_id_fkey (id, name, email, avatar_url, nickname)
        `)
        .in('id', replyToIds);

      if (replyData) {
        replyMessagesMap = replyData.reduce((acc: Record<string, any>, msg: any) => {
          acc[msg.id] = {
            id: msg.id,
            roomId: roomId,
            senderId: msg.sender_id,
            text: msg.text,
            timestamp: new Date(msg.created_at),
            mediaUrl: msg.media_url || undefined,
            mediaType: msg.media_type || undefined,
            user: msg.users ? {
              id: msg.users.id,
              name: msg.users.name,
              email: msg.users.email,
              avatarUrl: msg.users.avatar_url || undefined,
              nickname: msg.users.nickname || undefined,
            } : undefined,
          };
          return acc;
        }, {});
      }
    }

    // Reverse to get chronological order (oldest first)
    // VALIDAÇÃO: Garantir que o senderId sempre vem do banco de dados
    const messages = data
      .reverse()
      .map((msg: any) => {
        const message: Message = {
          id: msg.id,
          roomId: msg.room_id,
          senderId: msg.sender_id, // SEMPRE usar o senderId do banco (fonte da verdade)
          text: msg.text,
          timestamp: new Date(msg.created_at),
          mediaUrl: msg.media_url || undefined,
          mediaType: msg.media_type || undefined,
          replyToId: msg.reply_to_id || undefined,
        };

        // Add replyTo if exists
        if (msg.reply_to_id && replyMessagesMap[msg.reply_to_id]) {
          message.replyTo = replyMessagesMap[msg.reply_to_id];
        }

        return message;
      })
      .filter((msg) => msg.senderId && msg.senderId.trim() !== ''); // Filtrar mensagens sem senderId válido

    const hasMore = count ? offset + limit < count : false;

    return { messages, hasMore };
  } catch (error) {
    return { messages: [], hasMore: false };
  }
}

