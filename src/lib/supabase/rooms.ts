import { supabase } from './client';
import type { Room } from '@/lib/data';

export interface RoomWithMembers extends Room {
  code: string;
  memberCount?: number;
}

/**
 * Generate a unique room code
 */
async function generateRoomCode(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  // Check if code exists
  const { data } = await supabase
    .from('rooms')
    .select('id')
    .eq('code', code)
    .single();

  if (data) {
    // If code exists, generate a new one recursively
    return generateRoomCode();
  }

  return code;
}

/**
 * Create a new room
 */
export async function createRoom(
  name: string,
  ownerId: string
): Promise<{ room: RoomWithMembers; error: null } | { room: null; error: string }> {
  try {
    const code = await generateRoomCode();

    const { data: room, error } = await supabase
      .from('rooms')
      .insert({
        name,
        code,
        owner_id: ownerId,
      })
      .select('id, name, code, owner_id, created_at')
      .single();

    if (error) {
      return { room: null, error: error.message };
    }

    // Add owner as member
    const { error: memberError } = await supabase
      .from('room_members')
      .insert({
        room_id: room.id,
        user_id: ownerId,
      });

    if (memberError) {
      return { room: null, error: memberError.message };
    }

    return {
      room: {
        id: room.id,
        name: room.name,
        code: room.code,
        ownerId: room.owner_id,
        members: [ownerId],
      },
      error: null,
    };
  } catch (error) {
    return { room: null, error: 'Erro ao criar sala' };
  }
}

/**
 * Join a room by code
 * Does not allow joining direct conversations (rooms with code starting with "DM-")
 */
export async function joinRoomByCode(
  code: string,
  userId: string
): Promise<{ room: RoomWithMembers; error: null } | { room: null; error: string }> {
  try {
    const upperCode = code.toUpperCase();
    
    // Reject direct conversation codes
    if (upperCode.startsWith('DM-')) {
      return { room: null, error: 'Código de sala inválido' };
    }

    // Find room by code
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .select('id, name, code, owner_id, created_at')
      .eq('code', upperCode)
      .single();

    if (roomError || !room) {
      return { room: null, error: 'Código de sala inválido' };
    }

    // Double check: reject if room code starts with DM- (safety check)
    if (room.code && room.code.startsWith('DM-')) {
      return { room: null, error: 'Código de sala inválido' };
    }

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', room.id)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      // User is already a member, return the room
      const { data: members } = await supabase
        .from('room_members')
        .select('user_id')
        .eq('room_id', room.id);

      return {
        room: {
          id: room.id,
          name: room.name,
          code: room.code,
          ownerId: room.owner_id,
          members: members?.map((m) => m.user_id) || [],
        },
        error: null,
      };
    }

    // Add user as member
    const { error: memberError } = await supabase
      .from('room_members')
      .insert({
        room_id: room.id,
        user_id: userId,
      });

    if (memberError) {
      return { room: null, error: memberError.message };
    }

    // Get all members
    const { data: members } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', room.id);

    return {
      room: {
        id: room.id,
        name: room.name,
        code: room.code,
        ownerId: room.owner_id,
        members: members?.map((m) => m.user_id) || [],
      },
      error: null,
    };
  } catch (error) {
    return { room: null, error: 'Erro ao entrar na sala' };
  }
}

/**
 * Get rooms for a user
 * Excludes direct conversations (rooms with code starting with "DM-")
 */
export async function getUserRooms(userId: string): Promise<RoomWithMembers[]> {
  try {
    const { data, error } = await supabase
      .from('room_members')
      .select(`
        room_id,
        rooms (
          id,
          name,
          code,
          owner_id,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    // Filter out direct conversations (rooms with code starting with "DM-")
    const filteredData = data.filter((item: any) => {
      const room = item.rooms;
      return room && room.code && !room.code.startsWith('DM-');
    });

    // Get last message for each room
    const roomsWithLastMessage = await Promise.all(
      filteredData.map(async (item: any) => {
        const room = item.rooms;
        
        // Get last message
        const { data: lastMessage } = await supabase
          .from('messages')
          .select('text, created_at')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Get member count
        const { count } = await supabase
          .from('room_members')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', room.id);

        return {
          id: room.id,
          name: room.name,
          code: room.code,
          ownerId: room.owner_id,
          members: [], // Will be populated if needed
          memberCount: count || 0,
          lastMessage: lastMessage
            ? {
                text: lastMessage.text,
                timestamp: new Date(lastMessage.created_at),
              }
            : undefined,
        };
      })
    );

    return roomsWithLastMessage;
  } catch (error) {
    return [];
  }
}

/**
 * Get room by ID
 */
export async function getRoomById(roomId: string): Promise<RoomWithMembers | null> {
  try {
    const { data: room, error } = await supabase
      .from('rooms')
      .select('id, name, code, owner_id, created_at')
      .eq('id', roomId)
      .single();

    if (error || !room) {
      return null;
    }

    // Get members
    const { data: members } = await supabase
      .from('room_members')
      .select('user_id')
      .eq('room_id', roomId);

    return {
      id: room.id,
      name: room.name,
      code: room.code,
      ownerId: room.owner_id,
      members: members?.map((m) => m.user_id) || [],
    };
  } catch (error) {
    return null;
  }
}

