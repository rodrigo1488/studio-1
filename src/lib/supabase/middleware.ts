import { cookies } from 'next/headers';
import { supabaseServer } from './server';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  nickname?: string;
}

/**
 * Get current authenticated user from cookies
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    // In a real implementation, you'd store the user session in cookies
    // For now, we'll check for a user_id cookie
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return null;
    }

    // Fetch user from database
    if (!supabaseServer) {
      return null;
    }

    const { data, error } = await supabaseServer
      .from('users')
      .select('id, email, name, avatar_url, nickname')
      .eq('id', userId)
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
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

