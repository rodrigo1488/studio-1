import { createClient } from '@/lib/supabase/client';
import type { User } from '@/lib/data';

export type PresenceStatus = 'online' | 'offline' | 'away';

export interface UserPresence {
  id: string;
  userId: string;
  status: PresenceStatus;
  lastSeen: Date;
  updatedAt: Date;
  user?: User;
}

export async function updateUserPresence(
  userId: string,
  status: PresenceStatus
): Promise<{ presence: UserPresence | null; error: string | null }> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('user_presence')
      .upsert(
        {
          user_id: userId,
          status,
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id',
        }
      )
      .select()
      .single();

    if (error) {
      return { presence: null, error: error.message };
    }

    return {
      presence: {
        id: data.id,
        userId: data.user_id,
        status: data.status as PresenceStatus,
        lastSeen: new Date(data.last_seen),
        updatedAt: new Date(data.updated_at),
      },
      error: null,
    };
  } catch (error: any) {
    return { presence: null, error: error.message || 'Erro ao atualizar presença' };
  }
}

export async function getUserPresence(
  userId: string
): Promise<{ presence: UserPresence | null; error: string | null }> {
  try {
    const supabase = createClient();
    
    const { data, error } = await supabase
      .from('user_presence')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No presence record found, return offline
        return {
          presence: {
            id: '',
            userId,
            status: 'offline',
            lastSeen: new Date(),
            updatedAt: new Date(),
          },
          error: null,
        };
      }
      return { presence: null, error: error.message };
    }

    return {
      presence: {
        id: data.id,
        userId: data.user_id,
        status: data.status as PresenceStatus,
        lastSeen: new Date(data.last_seen),
        updatedAt: new Date(data.updated_at),
      },
      error: null,
    };
  } catch (error: any) {
    return { presence: null, error: error.message || 'Erro ao buscar presença' };
  }
}

export async function getContactsPresence(
  userId: string
): Promise<{ presences: Record<string, UserPresence>; error: string | null }> {
  try {
    const supabase = createClient();
    
    // Get user's contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('user_id, contact_id')
      .or(`user_id.eq.${userId},contact_id.eq.${userId}`);

    if (contactsError) {
      return { presences: {}, error: contactsError.message };
    }

    const contactIds = contacts
      .map((c) => (c.user_id === userId ? c.contact_id : c.user_id))
      .filter((id) => id !== userId);

    if (contactIds.length === 0) {
      return { presences: {}, error: null };
    }

    const { data, error } = await supabase
      .from('user_presence')
      .select('*')
      .in('user_id', contactIds);

    if (error) {
      return { presences: {}, error: error.message };
    }

    const presences: Record<string, UserPresence> = {};
    data.forEach((p) => {
      presences[p.user_id] = {
        id: p.id,
        userId: p.user_id,
        status: p.status as PresenceStatus,
        lastSeen: new Date(p.last_seen),
        updatedAt: new Date(p.updated_at),
      };
    });

    return { presences, error: null };
  } catch (error: any) {
    return { presences: {}, error: error.message || 'Erro ao buscar presenças' };
  }
}

