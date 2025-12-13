import { supabase } from '@/lib/supabase/client';

export interface PostShare {
  id: string;
  postId: string;
  userId: string;
  sharedToUserId?: string;
  sharedToRoomId?: string;
  createdAt: Date;
}

export async function sharePost(
  postId: string,
  userId: string,
  options: {
    sharedToUserId?: string;
    sharedToRoomId?: string;
  }
): Promise<{ share: PostShare | null; error: string | null }> {
  try {

    const { data, error } = await supabase
      .from('post_shares')
      .insert({
        post_id: postId,
        user_id: userId,
        shared_to_user_id: options.sharedToUserId || null,
        shared_to_room_id: options.sharedToRoomId || null,
      })
      .select()
      .single();

    if (error) {
      return { share: null, error: error.message };
    }

    return {
      share: {
        id: data.id,
        postId: data.post_id,
        userId: data.user_id,
        sharedToUserId: data.shared_to_user_id,
        sharedToRoomId: data.shared_to_room_id,
        createdAt: new Date(data.created_at),
      },
      error: null,
    };
  } catch (error: any) {
    return { share: null, error: error.message || 'Erro ao compartilhar post' };
  }
}

export async function getPostShares(
  postId: string
): Promise<{ shares: PostShare[]; error: string | null }> {
  try {

    const { data, error } = await supabase
      .from('post_shares')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false });

    if (error) {
      return { shares: [], error: error.message };
    }

    return {
      shares: data.map((s) => ({
        id: s.id,
        postId: s.post_id,
        userId: s.user_id,
        sharedToUserId: s.shared_to_user_id,
        sharedToRoomId: s.shared_to_room_id,
        createdAt: new Date(s.created_at),
      })),
      error: null,
    };
  } catch (error: any) {
    return { shares: [], error: error.message || 'Erro ao buscar compartilhamentos' };
  }
}

