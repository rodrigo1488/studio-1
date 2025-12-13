import { supabaseServer } from '@/lib/supabase/server';

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
  user?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
}

export async function addMessageReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<{ reaction: MessageReaction | null; error: string | null }> {
  try {
    if (!supabaseServer) {
      return { reaction: null, error: 'Supabase não inicializado' };
    }

    const { data, error } = await supabaseServer
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: userId,
        emoji,
      })
      .select(`
        *,
        users (id, name, avatar_url)
      `)
      .single();

    if (error) {
      return { reaction: null, error: error.message };
    }

    return {
      reaction: {
        id: data.id,
        messageId: data.message_id,
        userId: data.user_id,
        emoji: data.emoji,
        createdAt: new Date(data.created_at),
        user: data.users ? {
          id: data.users.id,
          name: data.users.name,
          avatarUrl: data.users.avatar_url || undefined,
        } : undefined,
      },
      error: null,
    };
  } catch (error: any) {
    return { reaction: null, error: error.message || 'Erro ao adicionar reação' };
  }
}

export async function removeMessageReaction(
  messageId: string,
  userId: string,
  emoji: string
): Promise<{ removed: boolean; error: string | null }> {
  try {

    if (!supabaseServer) {
      return { removed: false, error: 'Supabase não inicializado' };
    }

    const { error } = await supabaseServer
      .from('message_reactions')
      .delete()
      .eq('message_id', messageId)
      .eq('user_id', userId)
      .eq('emoji', emoji);

    if (error) {
      return { removed: false, error: error.message };
    }

    return { removed: true, error: null };
  } catch (error: any) {
    return { removed: false, error: error.message || 'Erro ao remover reação' };
  }
}

export async function getMessageReactions(
  messageId: string
): Promise<{ reactions: MessageReaction[]; error: string | null }> {
  try {

    if (!supabaseServer) {
      return { reactions: [], error: 'Supabase não inicializado' };
    }

    const { data, error } = await supabaseServer
      .from('message_reactions')
      .select(`
        *,
        users (id, name, avatar_url)
      `)
      .eq('message_id', messageId)
      .order('created_at', { ascending: true });

    if (error) {
      return { reactions: [], error: error.message };
    }

    return {
      reactions: data.map((r: any) => ({
        id: r.id,
        messageId: r.message_id,
        userId: r.user_id,
        emoji: r.emoji,
        createdAt: new Date(r.created_at),
        user: r.users ? {
          id: r.users.id,
          name: r.users.name,
          avatarUrl: r.users.avatar_url || undefined,
        } : undefined,
      })),
      error: null,
    };
  } catch (error: any) {
    return { reactions: [], error: error.message || 'Erro ao buscar reações' };
  }
}

