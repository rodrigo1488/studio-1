import { supabase } from '@/lib/supabase/client';

export interface ProfileStats {
  postsCount: number;
  likesReceived: number;
  commentsReceived: number;
  followersCount: number;
  followingCount: number;
}

export async function getUserProfileStats(
  userId: string
): Promise<{ stats: ProfileStats; error: string | null }> {
  try {

    // Get posts count
    const { count: postsCount } = await supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    // Get likes received (from posts)
    const { data: userPosts } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', userId);

    const postIds = userPosts?.map((p) => p.id) || [];
    let likesReceived = 0;
    if (postIds.length > 0) {
      const { count } = await supabase
        .from('post_likes')
        .select('*', { count: 'exact', head: true })
        .in('post_id', postIds);
      likesReceived = count || 0;
    }

    // Get comments received
    let commentsReceived = 0;
    if (postIds.length > 0) {
      const { count } = await supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .in('post_id', postIds);
      commentsReceived = count || 0;
    }

    // Get followers count
    const { count: followersCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);

    // Get following count
    const { count: followingCount } = await supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);

    return {
      stats: {
        postsCount: postsCount || 0,
        likesReceived,
        commentsReceived,
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
      },
      error: null,
    };
  } catch (error: any) {
    return {
      stats: {
        postsCount: 0,
        likesReceived: 0,
        commentsReceived: 0,
        followersCount: 0,
        followingCount: 0,
      },
      error: error.message || 'Erro ao buscar estatísticas',
    };
  }
}

