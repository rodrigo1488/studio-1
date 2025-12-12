import { createClient } from '@/lib/supabase/client';

export async function followUser(
  followerId: string,
  followingId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    const { error } = await supabase.from('follows').insert({
      follower_id: followerId,
      following_id: followingId,
    });

    if (error) {
      if (error.code === '23505') {
        return { success: true, error: null }; // Already following
      }
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao seguir usuário' };
  }
}

export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao deixar de seguir' };
  }
}

export async function isFollowing(
  followerId: string,
  followingId: string
): Promise<{ following: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { following: false, error: null };
      }
      return { following: false, error: error.message };
    }

    return { following: !!data, error: null };
  } catch (error: any) {
    return { following: false, error: error.message || 'Erro ao verificar follow' };
  }
}

