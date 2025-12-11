import { supabaseServer } from './server';
import type { Post, PostMedia } from '@/lib/data';

export interface PostInsert {
  user_id: string;
  description?: string;
}

export interface PostMediaInsert {
  post_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  order_index: number;
}

/**
 * Create a new post with media
 */
export async function createPost(
  userId: string,
  description: string | undefined,
  mediaFiles: Array<{ url: string; type: 'image' | 'video'; orderIndex: number }>
): Promise<{ post: Post | null; error: string | null }> {
  if (!supabaseServer) {
    return { post: null, error: 'Supabase server not initialized' };
  }

  try {
    // Create post
    const { data: postData, error: postError } = await supabaseServer
      .from('posts')
      .insert({
        user_id: userId,
        description: description || null,
      })
      .select()
      .single();

    if (postError || !postData) {
      return { post: null, error: postError?.message || 'Failed to create post' };
    }

    // Create media entries
    if (mediaFiles.length > 0) {
      const mediaInserts: PostMediaInsert[] = mediaFiles.map((file) => ({
        post_id: postData.id,
        media_url: file.url,
        media_type: file.type,
        order_index: file.orderIndex,
      }));

      const { error: mediaError } = await supabaseServer
        .from('post_media')
        .insert(mediaInserts);

      if (mediaError) {
        // Rollback: delete the post if media insertion fails
        await supabaseServer.from('posts').delete().eq('id', postData.id);
        return { post: null, error: mediaError.message };
      }
    }

    // Fetch the complete post with media
    const { post, error: fetchError } = await getPostById(postData.id);

    if (fetchError || !post) {
      return { post: null, error: fetchError || 'Failed to fetch created post' };
    }

    return { post, error: null };
  } catch (error: any) {
    return { post: null, error: error.message || 'Failed to create post' };
  }
}

/**
 * Get post by ID
 */
export async function getPostById(postId: string): Promise<{ post: Post | null; error: string | null }> {
  if (!supabaseServer) {
    return { post: null, error: 'Supabase server not initialized' };
  }

  try {
    const { data: postData, error: postError } = await supabaseServer
      .from('posts')
      .select(`
        *,
        post_media (*),
        users (id, name, email, avatar_url, nickname)
      `)
      .eq('id', postId)
      .single();

    if (postError || !postData) {
      return { post: null, error: postError?.message || 'Post not found' };
    }

    const post = convertToPost(postData);
    return { post, error: null };
  } catch (error: any) {
    return { post: null, error: error.message || 'Failed to fetch post' };
  }
}

/**
 * Get feed posts (posts from contacts)
 */
export async function getFeedPosts(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ posts: Post[]; error: string | null }> {
  if (!supabaseServer) {
    return { posts: [], error: 'Supabase server not initialized' };
  }

  try {
    // Get user's contacts
    const { data: contactsData, error: contactsError } = await supabaseServer
      .from('contacts')
      .select('contact_id')
      .eq('user_id', userId);

    if (contactsError) {
      return { posts: [], error: contactsError.message };
    }

    const contactIds = contactsData?.map((c) => c.contact_id) || [];
    // Include own posts
    const userIds = [...contactIds, userId];

    // Get posts from contacts and self
    const { data: postsData, error: postsError } = await supabaseServer
      .from('posts')
      .select(`
        *,
        post_media (*),
        users (id, name, email, avatar_url, nickname)
      `)
      .in('user_id', userIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (postsError) {
      return { posts: [], error: postsError.message };
    }

    const posts = (postsData || []).map(convertToPost);
    return { posts, error: null };
  } catch (error: any) {
    return { posts: [], error: error.message || 'Failed to fetch feed' };
  }
}

/**
 * Get posts by user ID
 */
export async function getUserPosts(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ posts: Post[]; error: string | null }> {
  if (!supabaseServer) {
    return { posts: [], error: 'Supabase server not initialized' };
  }

  try {
    const { data: postsData, error: postsError } = await supabaseServer
      .from('posts')
      .select(`
        *,
        post_media (*),
        users (id, name, email, avatar_url, nickname)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (postsError) {
      return { posts: [], error: postsError.message };
    }

    const posts = (postsData || []).map(convertToPost);
    return { posts, error: null };
  } catch (error: any) {
    return { posts: [], error: error.message || 'Failed to fetch user posts' };
  }
}

/**
 * Update post description
 */
export async function updatePost(
  postId: string,
  userId: string,
  description: string | undefined
): Promise<{ post: Post | null; error: string | null }> {
  if (!supabaseServer) {
    return { post: null, error: 'Supabase server not initialized' };
  }

  try {
    // Verify ownership
    const { data: existingPost, error: checkError } = await supabaseServer
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (checkError || !existingPost) {
      return { post: null, error: 'Post not found' };
    }

    if (existingPost.user_id !== userId) {
      return { post: null, error: 'Unauthorized' };
    }

    const { data: postData, error: updateError } = await supabaseServer
      .from('posts')
      .update({ description: description || null })
      .eq('id', postId)
      .select(`
        *,
        post_media (*),
        users (id, name, email, avatar_url, nickname)
      `)
      .single();

    if (updateError || !postData) {
      return { post: null, error: updateError?.message || 'Failed to update post' };
    }

    const post = convertToPost(postData);
    return { post, error: null };
  } catch (error: any) {
    return { post: null, error: error.message || 'Failed to update post' };
  }
}

/**
 * Delete post and all associated media
 */
export async function deletePost(postId: string, userId: string): Promise<{ success: boolean; error: string | null }> {
  if (!supabaseServer) {
    return { success: false, error: 'Supabase server not initialized' };
  }

  try {
    // Verify ownership
    const { data: existingPost, error: checkError } = await supabaseServer
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (checkError || !existingPost) {
      return { success: false, error: 'Post not found' };
    }

    if (existingPost.user_id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    // Delete post (cascade will delete media, likes, comments)
    const { error: deleteError } = await supabaseServer
      .from('posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      return { success: false, error: deleteError.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete post' };
  }
}

/**
 * Convert database post to app format
 */
function convertToPost(dbPost: any): Post {
  const media: PostMedia[] = (dbPost.post_media || [])
    .sort((a: any, b: any) => a.order_index - b.order_index)
    .map((m: any) => ({
      id: m.id,
      postId: m.post_id,
      mediaUrl: m.media_url,
      mediaType: m.media_type,
      orderIndex: m.order_index,
      createdAt: new Date(m.created_at),
    }));

  return {
    id: dbPost.id,
    userId: dbPost.user_id,
    description: dbPost.description || undefined,
    createdAt: dbPost.created_at instanceof Date ? dbPost.created_at : new Date(dbPost.created_at),
    updatedAt: dbPost.updated_at instanceof Date ? dbPost.updated_at : new Date(dbPost.updated_at),
    media,
    user: dbPost.users
      ? {
          id: dbPost.users.id,
          name: dbPost.users.name,
          email: dbPost.users.email,
          avatarUrl: dbPost.users.avatar_url || undefined,
          nickname: dbPost.users.nickname || undefined,
        }
      : undefined,
  };
}

