import { supabase } from './client';
import { supabaseServer } from './server';
import type { User } from '@/lib/data';

export interface DirectConversation {
  id: string;
  user1Id: string;
  user2Id: string;
  otherUser: User;
  lastMessage?: {
    text: string;
    timestamp: Date;
  };
}

/**
 * Get user by nickname
 */
export async function getUserByNickname(nickname: string): Promise<User | null> {
  try {
    if (!supabaseServer) {
      return null;
    }

    const { data, error } = await supabaseServer
      .from('users')
      .select('id, email, name, avatar_url, nickname')
      .eq('nickname', nickname)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      avatarUrl: data.avatar_url || undefined,
      nickname: data.nickname || undefined,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Add a contact
 */
export async function addContact(userId: string, contactId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (userId === contactId) {
      return { success: false, error: 'Você não pode adicionar a si mesmo' };
    }

    // Check if contact already exists
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('user_id', userId)
      .eq('contact_id', contactId)
      .single();

    if (existing) {
      return { success: false, error: 'Contato já adicionado' };
    }

    const { error } = await supabase
      .from('contacts')
      .insert({
        user_id: userId,
        contact_id: contactId,
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: 'Erro ao adicionar contato' };
  }
}

/**
 * Get user's contacts
 */
export async function getUserContacts(userId: string): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select(`
        contact_id,
        users!contacts_contact_id_fkey (
          id,
          email,
          name,
          avatar_url,
          nickname
        )
      `)
      .eq('user_id', userId)
      .order('added_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data
      .map((item: any) => item.users)
      .filter(Boolean)
      .map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url || undefined,
        nickname: user.nickname || undefined,
      }));
  } catch (error) {
    return [];
  }
}

/**
 * Get or create direct conversation
 * Creates a room for the direct conversation if it doesn't exist
 */
export async function getOrCreateDirectConversation(
  userId1: string,
  userId2: string
): Promise<{ conversationId: string; error: null } | { conversationId: null; error: string }> {
  try {
    if (!supabaseServer) {
      return { conversationId: null, error: 'Configuração do Supabase não encontrada' };
    }

    // First, get or create the direct conversation record using RPC
    const { data: convData, error: convError } = await supabaseServer.rpc('get_or_create_direct_conversation', {
      p_user1_id: userId1,
      p_user2_id: userId2,
    });

    if (convError) {
      return { conversationId: null, error: convError.message };
    }

    const conversationId = convData as string;

    // Check if a room already exists for this conversation
    const { data: existingRoom } = await supabaseServer
      .from('rooms')
      .select('id')
      .eq('id', conversationId)
      .single();

    if (existingRoom) {
      return { conversationId, error: null };
    }

    // Get user names for room name
    const { data: user1 } = await supabaseServer
      .from('users')
      .select('name')
      .eq('id', userId1)
      .single();

    const { data: user2 } = await supabaseServer
      .from('users')
      .select('name')
      .eq('id', userId2)
      .single();

    const roomName = user1 && user2 
      ? `${user1.name} & ${user2.name}`
      : 'Conversa Direta';

    // Create a room for this direct conversation
    const { data: room, error: roomError } = await supabaseServer
      .from('rooms')
      .insert({
        id: conversationId, // Use conversation ID as room ID
        name: roomName,
        code: `DM-${conversationId.substring(0, 8)}`, // Special code for direct messages
        owner_id: userId1,
      })
      .select('id')
      .single();

    if (roomError) {
      return { conversationId: null, error: roomError.message };
    }

    // Add both users as members
    await supabaseServer.from('room_members').insert([
      { room_id: conversationId, user_id: userId1 },
      { room_id: conversationId, user_id: userId2 },
    ]);

    return { conversationId, error: null };
  } catch (error) {
    return { conversationId: null, error: 'Erro ao criar conversa direta' };
  }
}

/**
 * Get direct conversations for a user
 */
export async function getUserDirectConversations(userId: string): Promise<DirectConversation[]> {
  try {
    const { data, error } = await supabase
      .from('direct_conversations')
      .select(`
        id,
        user1_id,
        user2_id,
        created_at
      `)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    // Get the other user and last message for each conversation
    const conversations = await Promise.all(
      data.map(async (conv: any) => {
        const otherUserId = conv.user1_id === userId ? conv.user2_id : conv.user1_id;

        // Get other user
        if (!supabaseServer) {
          return null;
        }

        const { data: otherUser } = await supabaseServer
          .from('users')
          .select('id, email, name, avatar_url, nickname')
          .eq('id', otherUserId)
          .single();

        // Get last message (we'll use the same messages table but filter by a special room pattern)
        // For now, we'll need to create a room for each direct conversation
        // Or we can use the conversation ID as room ID
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('text, created_at')
          .eq('room_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        return {
          id: conv.id,
          user1Id: conv.user1_id,
          user2Id: conv.user2_id,
          otherUser: otherUser
            ? {
                id: otherUser.id,
                email: otherUser.email,
                name: otherUser.name,
                avatarUrl: otherUser.avatar_url || undefined,
                nickname: otherUser.nickname || undefined,
              }
            : null,
          lastMessage: lastMessage
            ? {
                text: lastMessage.text,
                timestamp: new Date(lastMessage.created_at),
              }
            : undefined,
        };
      })
    );

    return conversations.filter((conv) => conv.otherUser !== null) as DirectConversation[];
  } catch (error) {
    return [];
  }
}

