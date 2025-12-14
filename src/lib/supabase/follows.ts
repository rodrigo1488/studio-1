import { supabaseAdmin } from '@/lib/supabase/server';

export async function followUser(
  followerId: string,
  followingId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Supabase admin client not initialized' };
    }

    const { error } = await supabaseAdmin.from('follows').insert({
      follower_id: followerId,
      following_id: followingId,
    });

    if (error) {
      if (error.code === '23505') {
        return { success: true, error: null }; // Already following
      }
      console.error('[Follow] Error following user:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('[Follow] Exception following user:', error);
    return { success: false, error: error.message || 'Erro ao seguir usuário' };
  }
}

export async function unfollowUser(
  followerId: string,
  followingId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Supabase admin client not initialized' };
    }

    const { error } = await supabaseAdmin
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);

    if (error) {
      console.error('[Follow] Error unfollowing user:', error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('[Follow] Exception unfollowing user:', error);
    return { success: false, error: error.message || 'Erro ao deixar de seguir' };
  }
}

export async function isFollowing(
  followerId: string,
  followingId: string
): Promise<{ following: boolean; error: string | null }> {
  try {
    if (!supabaseAdmin) {
      return { following: false, error: 'Supabase admin client not initialized' };
    }

    const { data, error } = await supabaseAdmin
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { following: false, error: null };
      }
      console.error('[Follow] Error checking follow status:', error);
      return { following: false, error: error.message };
    }

    return { following: !!data, error: null };
  } catch (error: any) {
    console.error('[Follow] Exception checking follow status:', error);
    return { following: false, error: error.message || 'Erro ao verificar follow' };
  }
}

