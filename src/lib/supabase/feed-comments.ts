import { supabaseServer } from './server';
import type { PostComment } from '@/lib/data';

export interface CommentInsert {
  post_id: string;
  user_id: string;
  text: string;
}

/**
 * Create a comment on a post
 */
export async function createComment(
  postId: string,
  userId: string,
  text: string
): Promise<{ comment: PostComment | null; error: string | null }> {
  if (!supabaseServer) {
    return { comment: null, error: 'Supabase server not initialized' };
  }

  try {
    const { data: commentData, error: commentError } = await supabaseServer
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        text: text.trim(),
      })
      .select(`
        *,
        users (id, name, email, avatar_url, nickname)
      `)
      .single();

    if (commentError || !commentData) {
      return { comment: null, error: commentError?.message || 'Failed to create comment' };
    }

    const comment = convertToComment(commentData);
    return { comment, error: null };
  } catch (error: any) {
    return { comment: null, error: error.message || 'Failed to create comment' };
  }
}

/**
 * Get comments for a post
 */
export async function getPostComments(
  postId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ comments: PostComment[]; error: string | null }> {
  if (!supabaseServer) {
    return { comments: [], error: 'Supabase server not initialized' };
  }

  try {
    const { data: commentsData, error: commentsError } = await supabaseServer
      .from('post_comments')
      .select(`
        *,
        users (id, name, email, avatar_url, nickname)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (commentsError) {
      return { comments: [], error: commentsError.message };
    }

    const comments = (commentsData || []).map(convertToComment);
    return { comments, error: null };
  } catch (error: any) {
    return { comments: [], error: error.message || 'Failed to fetch comments' };
  }
}

/**
 * Get comment count for a post
 */
export async function getPostCommentCount(postId: string): Promise<number> {
  if (!supabaseServer) {
    return 0;
  }

  try {
    const { count, error } = await supabaseServer
      .from('post_comments')
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
 * Get comment counts for multiple posts
 */
export async function getPostsCommentCounts(postIds: string[]): Promise<Record<string, number>> {
  if (!supabaseServer || postIds.length === 0) {
    return {};
  }

  try {
    const { data, error } = await supabaseServer
      .from('post_comments')
      .select('post_id')
      .in('post_id', postIds);

    if (error) {
      return {};
    }

    const counts: Record<string, number> = {};
    postIds.forEach((id) => {
      counts[id] = 0;
    });

    (data || []).forEach((comment: any) => {
      counts[comment.post_id] = (counts[comment.post_id] || 0) + 1;
    });

    return counts;
  } catch {
    return {};
  }
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  userId: string,
  text: string
): Promise<{ comment: PostComment | null; error: string | null }> {
  if (!supabaseServer) {
    return { comment: null, error: 'Supabase server not initialized' };
  }

  try {
    // Verify ownership
    const { data: existingComment, error: checkError } = await supabaseServer
      .from('post_comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (checkError || !existingComment) {
      return { comment: null, error: 'Comment not found' };
    }

    if (existingComment.user_id !== userId) {
      return { comment: null, error: 'Unauthorized' };
    }

    const { data: commentData, error: updateError } = await supabaseServer
      .from('post_comments')
      .update({ text: text.trim() })
      .eq('id', commentId)
      .select(`
        *,
        users (id, name, email, avatar_url, nickname)
      `)
      .single();

    if (updateError || !commentData) {
      return { comment: null, error: updateError?.message || 'Failed to update comment' };
    }

    const comment = convertToComment(commentData);
    return { comment, error: null };
  } catch (error: any) {
    return { comment: null, error: error.message || 'Failed to update comment' };
  }
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string, userId: string): Promise<{ success: boolean; error: string | null }> {
  if (!supabaseServer) {
    return { success: false, error: 'Supabase server not initialized' };
  }

  try {
    // Verify ownership
    const { data: existingComment, error: checkError } = await supabaseServer
      .from('post_comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (checkError || !existingComment) {
      return { success: false, error: 'Comment not found' };
    }

    if (existingComment.user_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error: deleteError } = await supabaseServer
      .from('post_comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete comment' };
  }
}

/**
 * Convert database comment to app format
 */
function convertToComment(dbComment: any): PostComment {
  return {
    id: dbComment.id,
    postId: dbComment.post_id,
    userId: dbComment.user_id,
    text: dbComment.text,
    createdAt: new Date(dbComment.created_at),
    updatedAt: new Date(dbComment.updated_at),
    user: dbComment.users
      ? {
          id: dbComment.users.id,
          name: dbComment.users.name,
          email: dbComment.users.email,
          avatarUrl: dbComment.users.avatar_url || undefined,
          nickname: dbComment.users.nickname || undefined,
        }
      : undefined,
  };
}

