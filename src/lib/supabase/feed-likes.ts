import { supabaseServer } from './server';
import type { PostLike } from '@/lib/data';

/**
 * Toggle like on a post
 */
export async function togglePostLike(
  postId: string,
  userId: string
): Promise<{ liked: boolean; error: string | null }> {
  if (!supabaseServer) {
    return { liked: false, error: 'Supabase server not initialized' };
  }

  try {
    // Check if already liked
    const { data: existingLike, error: checkError } = await supabaseServer
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" which is expected if not liked
      return { liked: false, error: checkError.message };
    }

    if (existingLike) {
      // Unlike
      const { error: deleteError } = await supabaseServer
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (deleteError) {
        return { liked: false, error: deleteError.message };
      }

      return { liked: false, error: null };
    } else {
      // Like
      const { error: insertError } = await supabaseServer
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: userId,
        });

      if (insertError) {
        return { liked: false, error: insertError.message };
      }

      return { liked: true, error: null };
    }
  } catch (error: any) {
    return { liked: false, error: error.message || 'Failed to toggle like' };
  }
}

/**
 * Check if user liked a post
 */
export async function isPostLiked(postId: string, userId: string): Promise<boolean> {
  if (!supabaseServer) {
    return false;
  }

  try {
    const { data, error } = await supabaseServer
      .from('post_likes')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    return !error && !!data;
  } catch {
    return false;
  }
}

/**
 * Get like count for a post
 */
export async function getPostLikeCount(postId: string): Promise<number> {
  if (!supabaseServer) {
    return 0;
  }

  try {
    const { count, error } = await supabaseServer
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (error) {
      return 0;
    }

    return count || 0;
  } catch {
    return 0;
  }
}

/**
 * Get likes for multiple posts
 */
export async function getPostsLikeCounts(postIds: string[]): Promise<Record<string, number>> {
  if (!supabaseServer || postIds.length === 0) {
    return {};
  }

  try {
    const { data, error } = await supabaseServer
      .from('post_likes')
      .select('post_id')
      .in('post_id', postIds);

    if (error) {
      return {};
    }

    const counts: Record<string, number> = {};
    postIds.forEach((id) => {
      counts[id] = 0;
    });

    (data || []).forEach((like: any) => {
      counts[like.post_id] = (counts[like.post_id] || 0) + 1;
    });

    return counts;
  } catch {
    return {};
  }
}

/**
 * Get user likes for multiple posts
 */
export async function getPostsUserLikes(postIds: string[], userId: string): Promise<Record<string, boolean>> {
  if (!supabaseServer || postIds.length === 0) {
    return {};
  }

  try {
    const { data, error } = await supabaseServer
      .from('post_likes')
      .select('post_id')
      .in('post_id', postIds)
      .eq('user_id', userId);

    if (error) {
      return {};
    }

    const likes: Record<string, boolean> = {};
    postIds.forEach((id) => {
      likes[id] = false;
    });

    (data || []).forEach((like: any) => {
      likes[like.post_id] = true;
    });

    return likes;
  } catch {
    return {};
  }
}

