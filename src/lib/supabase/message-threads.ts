import { supabaseAdmin } from './server';
import type { Message } from '@/lib/data';

/**
 * Create a thread (reply to a message)
 */
export async function createThreadMessage(
  roomId: string,
  senderId: string,
  text: string,
  parentMessageId: string,
  mediaUrl?: string,
  mediaType?: 'image' | 'video' | 'audio' | 'gif'
): Promise<{ message: Message | null; error: string | null }> {
  try {
    if (!supabaseAdmin) {
      return { message: null, error: 'Supabase não inicializado' };
    }

    // Get parent message to determine root
    const { data: parentMessage, error: parentError } = await supabaseAdmin
      .from('messages')
      .select('id, thread_id')
      .eq('id', parentMessageId)
      .single();

    if (parentError || !parentMessage) {
      return { message: null, error: 'Mensagem pai não encontrada' };
    }

    // Determine root message (if parent is in a thread, use its thread_id, otherwise use parent itself)
    const rootMessageId = parentMessage.thread_id || parentMessage.id;

    // Create the thread message
    const { data: newMessage, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        room_id: roomId,
        sender_id: senderId,
        text: text || '',
        media_url: mediaUrl,
        media_type: mediaType,
        thread_id: rootMessageId,
      })
      .select('id, room_id, sender_id, text, media_url, media_type, created_at, thread_id')
      .single();

    if (messageError || !newMessage) {
      return { message: null, error: messageError?.message || 'Erro ao criar mensagem na thread' };
    }

    // Create thread relationship if it doesn't exist
    const { error: threadError } = await supabaseAdmin
      .from('message_threads')
      .insert({
        parent_message_id: parentMessageId,
        root_message_id: rootMessageId,
      })
      .select()
      .single();

    // Ignore error if relationship already exists
    if (threadError && !threadError.message.includes('duplicate')) {
      console.warn('Error creating thread relationship:', threadError);
    }

    return {
      message: {
        id: newMessage.id,
        roomId: newMessage.room_id,
        senderId: newMessage.sender_id,
        text: newMessage.text,
        timestamp: new Date(newMessage.created_at),
        mediaUrl: newMessage.media_url || undefined,
        mediaType: newMessage.media_type || undefined,
        threadId: newMessage.thread_id || undefined,
      },
      error: null,
    };
  } catch (error: any) {
    return { message: null, error: error.message || 'Erro ao criar thread' };
  }
}

/**
 * Get thread messages for a parent message
 */
export async function getThreadMessages(
  parentMessageId: string
): Promise<{ messages: Message[]; error: string | null }> {
  try {
    if (!supabaseAdmin) {
      return { messages: [], error: 'Supabase não inicializado' };
    }

    // Get root message ID (could be the parent itself or its thread_id)
    const { data: parentMessage } = await supabaseAdmin
      .from('messages')
      .select('id, thread_id')
      .eq('id', parentMessageId)
      .single();

    if (!parentMessage) {
      return { messages: [], error: 'Mensagem pai não encontrada' };
    }

    const rootMessageId = parentMessage.thread_id || parentMessage.id;

    // Get all messages in the thread
    const { data: threadMessages, error } = await supabaseAdmin
      .from('messages')
      .select(`
        id,
        room_id,
        sender_id,
        text,
        media_url,
        media_type,
        created_at,
        thread_id,
        users (id, name, email, avatar_url, nickname)
      `)
      .eq('thread_id', rootMessageId)
      .order('created_at', { ascending: true });

    if (error) {
      return { messages: [], error: error.message };
    }

    const messages = (threadMessages || []).map((msg: any) => ({
      id: msg.id,
      roomId: msg.room_id,
      senderId: msg.sender_id,
      text: msg.text,
      timestamp: new Date(msg.created_at),
      mediaUrl: msg.media_url || undefined,
      mediaType: msg.media_type || undefined,
      threadId: msg.thread_id || undefined,
      user: msg.users ? {
        id: msg.users.id,
        name: msg.users.name,
        email: msg.users.email,
        avatarUrl: msg.users.avatar_url || undefined,
        nickname: msg.users.nickname || undefined,
      } : undefined,
    }));

    return { messages, error: null };
  } catch (error: any) {
    return { messages: [], error: error.message || 'Erro ao buscar thread' };
  }
}

/**
 * Get thread count for a message
 */
export async function getThreadCount(messageId: string): Promise<{ count: number; error: string | null }> {
  try {
    if (!supabaseAdmin) {
      return { count: 0, error: 'Supabase não inicializado' };
    }

    const { data, error } = await supabaseAdmin.rpc('get_thread_count', {
      message_id_param: messageId,
    });

    if (error) {
      return { count: 0, error: error.message };
    }

    return { count: data || 0, error: null };
  } catch (error: any) {
    return { count: 0, error: error.message || 'Erro ao buscar contagem de thread' };
  }
}



