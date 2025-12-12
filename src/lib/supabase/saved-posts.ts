import { createClient } from '@/lib/supabase/client';

export interface SavedPost {
  id: string;
  postId: string;
  userId: string;
  createdAt: Date;
}

export async function savePost(
  postId: string,
  userId: string
): Promise<{ saved: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    const { error } = await supabase.from('saved_posts').insert({
      post_id: postId,
      user_id: userId,
    });

    if (error) {
      if (error.code === '23505') {
        // Already saved
        return { saved: true, error: null };
      }
      return { saved: false, error: error.message };
    }

    return { saved: true, error: null };
  } catch (error: any) {
    return { saved: false, error: error.message || 'Erro ao salvar post' };
  }
}

export async function unsavePost(
  postId: string,
  userId: string
): Promise<{ unsaved: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    const { error } = await supabase
      .from('saved_posts')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) {
      return { unsaved: false, error: error.message };
    }

    return { unsaved: true, error: null };
  } catch (error: any) {
    return { unsaved: false, error: error.message || 'Erro ao remover post salvo' };
  }
}

export async function isPostSaved(
  postId: string,
  userId: string
): Promise<{ saved: boolean; error: string | null }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('saved_posts')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { saved: false, error: null };
      }
      return { saved: false, error: error.message };
    }

    return { saved: !!data, error: null };
  } catch (error: any) {
    return { saved: false, error: error.message || 'Erro ao verificar post salvo' };
  }
}

export async function getSavedPosts(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ posts: SavedPost[]; error: string | null }> {
  try {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('saved_posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return { posts: [], error: error.message };
    }

    return {
      posts: data.map((s) => ({
        id: s.id,
        postId: s.post_id,
        userId: s.user_id,
        createdAt: new Date(s.created_at),
      })),
      error: null,
    };
  } catch (error: any) {
    return { posts: [], error: error.message || 'Erro ao buscar posts salvos' };
  }
}

