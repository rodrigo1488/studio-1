import { supabaseAdmin } from './server';

/**
 * Set temporary message TTL for a room
 */
export async function setRoomTemporaryMessageTTL(
  roomId: string,
  ttlMinutes: number | null
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Supabase não inicializado' };
    }

    const { error } = await supabaseAdmin
      .from('rooms')
      .update({ temporary_message_ttl: ttlMinutes })
      .eq('id', roomId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao configurar mensagens temporárias' };
  }
}

/**
 * Get temporary message TTL for a room
 */
export async function getRoomTemporaryMessageTTL(
  roomId: string
): Promise<{ ttlMinutes: number | null; error: string | null }> {
  try {
    if (!supabaseAdmin) {
      return { ttlMinutes: null, error: 'Supabase não inicializado' };
    }

    const { data, error } = await supabaseAdmin
      .from('rooms')
      .select('temporary_message_ttl')
      .eq('id', roomId)
      .single();

    if (error) {
      return { ttlMinutes: null, error: error.message };
    }

    return { ttlMinutes: data?.temporary_message_ttl || null, error: null };
  } catch (error: any) {
    return { ttlMinutes: null, error: error.message || 'Erro ao buscar configuração' };
  }
}

/**
 * Cleanup expired messages (should be called periodically)
 */
export async function cleanupExpiredMessages(): Promise<{ deletedCount: number; error: string | null }> {
  try {
    if (!supabaseAdmin) {
      return { deletedCount: 0, error: 'Supabase não inicializado' };
    }

    // Call the database function
    const { data, error } = await supabaseAdmin.rpc('cleanup_expired_messages');

    if (error) {
      return { deletedCount: 0, error: error.message };
    }

    return { deletedCount: data || 0, error: null };
  } catch (error: any) {
    return { deletedCount: 0, error: error.message || 'Erro ao limpar mensagens expiradas' };
  }
}



