import { supabaseServer, supabaseAdmin } from './server';
import type { Message, User } from '@/lib/data';

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
  replyToId?: string,
  expiresAt?: Date | null
): Promise<{ message: Message; error: null } | { message: null; error: string }> {
  try {
    // VALIDAÇÃO RIGOROSA: Garantir que senderId não está vazio e é um UUID válido
    if (!senderId || senderId.trim() === '') {
      console.error('[Send Message] Invalid senderId: empty');
      return { message: null, error: 'SenderId é obrigatório' };
    }

    // Validar formato UUID básico
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(senderId)) {
      console.error('[Send Message] Invalid senderId format:', senderId);
      return { message: null, error: 'SenderId inválido' };
    }

    // VALIDAÇÃO: Garantir que roomId não está vazio e é um UUID válido
    if (!roomId || roomId.trim() === '') {
      console.error('[Send Message] Invalid roomId: empty');
      return { message: null, error: 'RoomId é obrigatório' };
    }

    if (!uuidRegex.test(roomId)) {
      console.error('[Send Message] Invalid roomId format:', roomId);
      return { message: null, error: 'RoomId inválido' };
    }

    if (!supabaseServer) {
      return { message: null, error: 'Supabase não inicializado' };
    }

    const { data, error } = await supabaseServer
      .from('messages')
      .insert({
        room_id: roomId,
        sender_id: senderId, // Este senderId vem do servidor (sessão autenticada)
        text: text || '',
        media_url: mediaUrl,
        media_type: mediaType,
        reply_to_id: replyToId || null,
        expires_at: expiresAt ? expiresAt.toISOString() : null,
      })
      .select('id, room_id, sender_id, text, media_url, media_type, created_at, reply_to_id, expires_at')
      .single();

    if (error) {
      return { message: null, error: error.message };
    }

    // VALIDAÇÃO: Garantir que o senderId retornado é o mesmo que foi enviado
    if (data.sender_id !== senderId) {
      console.error(`SenderId mismatch in database: expected ${senderId}, got ${data.sender_id}`);
      // Ainda assim retornar a mensagem, mas com o senderId do banco (fonte da verdade)
    }

    // Fetch reply message if replyToId exists
    let replyTo: Message & { user?: User } | undefined = undefined;
    if (data.reply_to_id) {
      const { data: replyData } = await supabaseServer
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
        .eq('id', data.reply_to_id)
        .single();

      if (replyData) {
        const userData = Array.isArray(replyData.users) ? replyData.users[0] : replyData.users;
        replyTo = {
          id: replyData.id,
          roomId: roomId,
          senderId: replyData.sender_id,
          text: replyData.text,
          timestamp: new Date(replyData.created_at),
          mediaUrl: replyData.media_url || undefined,
          mediaType: replyData.media_type || undefined,
          user: userData ? {
            id: userData.id,
            name: userData.name,
            email: userData.email,
            avatarUrl: userData.avatar_url || undefined,
            nickname: userData.nickname || undefined,
          } : undefined,
        };
      }
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
        replyTo: replyTo,
        expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
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
    if (!supabaseServer) {
      return { messages: [], hasMore: false };
    }

    let query = supabaseServer
      .from('messages')
      .select('id, room_id, sender_id, text, media_url, media_type, created_at, reply_to_id, is_edited, edited_at, expires_at', { count: 'exact' })
      .eq('room_id', roomId);
    
    // Filter out expired messages
    query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

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
      const { data: replyData } = await supabaseServer
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
          isEdited: msg.is_edited || false,
          editedAt: msg.edited_at ? new Date(msg.edited_at) : undefined,
          expiresAt: msg.expires_at ? new Date(msg.expires_at) : undefined,
          threadId: msg.thread_id || undefined,
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

/**
 * Edit a message
 * Only the sender can edit their own message, and only within a time limit (e.g., 15 minutes)
 */
export async function editMessage(
  messageId: string,
  userId: string,
  newText: string,
  timeLimitMinutes: number = 15
): Promise<{ message: Message | null; error: string | null }> {
  try {
    if (!supabaseServer || !supabaseAdmin) {
      return { message: null, error: 'Supabase não inicializado' };
    }

    // Get the original message (use admin to bypass RLS)
    const { data: originalMessage, error: fetchError } = await supabaseAdmin
      .from('messages')
      .select('id, sender_id, text, created_at, is_edited, media_url')
      .eq('id', messageId)
      .single();

    if (fetchError) {
      console.error('[Edit Message] Error fetching message:', fetchError);
      return { message: null, error: fetchError.message || 'Mensagem não encontrada' };
    }

    if (!originalMessage) {
      return { message: null, error: 'Mensagem não encontrada' };
    }

    // Não permitir editar mensagens com mídia
    if (originalMessage.media_url) {
      return { message: null, error: 'Não é possível editar mensagens com mídia' };
    }

    // Verify ownership
    if (originalMessage.sender_id !== userId) {
      return { message: null, error: 'Você não pode editar esta mensagem' };
    }

    // Check time limit
    const messageDate = new Date(originalMessage.created_at);
    const now = new Date();
    const minutesSinceCreation = (now.getTime() - messageDate.getTime()) / (1000 * 60);

    if (minutesSinceCreation > timeLimitMinutes) {
      return { message: null, error: `Você só pode editar mensagens dentro de ${timeLimitMinutes} minutos após o envio` };
    }

    // Save edit history (always create a new entry to track all edits)
    try {
      const { error: editHistoryError } = await supabaseAdmin
        .from('message_edits')
        .insert({
          message_id: messageId,
          original_text: originalMessage.text,
          edited_text: newText,
        });

      if (editHistoryError) {
        // Log but don't fail if edit history fails (table might not exist yet)
        console.warn('[Edit Message] Error saving edit history:', editHistoryError);
      }
    } catch (error) {
      // Ignore errors in edit history (table might not exist)
      console.warn('[Edit Message] Exception saving edit history:', error);
    }

    // Update the message (use admin to bypass RLS)
    const { data: updatedMessage, error: updateError } = await supabaseAdmin
      .from('messages')
      .update({
        text: newText,
        is_edited: true,
        edited_at: now.toISOString(),
      })
      .eq('id', messageId)
      .select('id, room_id, sender_id, text, media_url, media_type, created_at, reply_to_id, is_edited, edited_at')
      .single();

    if (updateError || !updatedMessage) {
      return { message: null, error: updateError?.message || 'Erro ao editar mensagem' };
    }

    return {
      message: {
        id: updatedMessage.id,
        roomId: updatedMessage.room_id,
        senderId: updatedMessage.sender_id,
        text: updatedMessage.text,
        timestamp: new Date(updatedMessage.created_at),
        mediaUrl: updatedMessage.media_url || undefined,
        mediaType: updatedMessage.media_type || undefined,
        replyToId: updatedMessage.reply_to_id || undefined,
        isEdited: updatedMessage.is_edited || false,
        editedAt: updatedMessage.edited_at ? new Date(updatedMessage.edited_at) : undefined,
      },
      error: null,
    };
  } catch (error: any) {
    return { message: null, error: error.message || 'Erro ao editar mensagem' };
  }
}

/**
 * Get edit history for a message
 */
export async function getMessageEditHistory(
  messageId: string
): Promise<{ edits: Array<{ id: string; originalText: string; editedText: string; editedAt: Date }>; error: string | null }> {
  try {
    if (!supabaseServer) {
      return { edits: [], error: 'Supabase não inicializado' };
    }

    const { data, error } = await supabaseServer
      .from('message_edits')
      .select('id, original_text, edited_text, edited_at')
      .eq('message_id', messageId)
      .order('edited_at', { ascending: true });

    if (error) {
      return { edits: [], error: error.message };
    }

    const edits = (data || []).map((edit: any) => ({
      id: edit.id,
      originalText: edit.original_text,
      editedText: edit.edited_text,
      editedAt: new Date(edit.edited_at),
    }));

    return { edits, error: null };
  } catch (error: any) {
    return { edits: [], error: error.message || 'Erro ao buscar histórico de edições' };
  }
}

