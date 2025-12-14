import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { supabaseServer } from '@/lib/supabase/server';
import { extractHashtags, extractMentions } from '@/lib/storage/search-history';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ posts: [], total: 0 });
    }

    if (!supabaseServer) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    const searchQuery = query.trim();
    const hashtags = extractHashtags(searchQuery);
    const mentions = extractMentions(searchQuery);
    const textQuery = searchQuery.replace(/#\w+/g, '').replace(/@\w+/g, '').trim();

    // Build query
    let postsQuery = supabaseServer
      .from('posts')
      .select(`
        *,
        post_media (*),
        users (id, name, email, avatar_url, nickname)
      `, { count: 'exact' });

    // Search in description
    if (textQuery.length > 0) {
      postsQuery = postsQuery.ilike('description', `%${textQuery}%`);
    }

    // Search by hashtags (if any)
    if (hashtags.length > 0) {
      // Search for hashtags in description
      const hashtagPatterns = hashtags.map((tag) => `%#${tag}%`).join('|');
      postsQuery = postsQuery.or(`description.ilike.${hashtagPatterns}`);
    }

    // Search by mentions (if any)
    if (mentions.length > 0) {
      // First, find user IDs by nickname or name
      const { data: mentionedUsers } = await supabaseServer
        .from('users')
        .select('id')
        .or(mentions.map((m) => `nickname.ilike.%${m}%,name.ilike.%${m}%`).join(','));

      const mentionedUserIds = (mentionedUsers || []).map((u: any) => u.id);

      if (mentionedUserIds.length > 0) {
        // Get posts where user is mentioned
        const { data: mentionedPosts } = await supabaseServer
          .from('post_mentions')
          .select('post_id')
          .in('user_id', mentionedUserIds);

        const mentionedPostIds = (mentionedPosts || []).map((p: any) => p.post_id);

        if (mentionedPostIds.length > 0) {
          // If we have text query, combine with OR
          if (textQuery.length > 0 || hashtags.length > 0) {
            postsQuery = postsQuery.or(`id.in.(${mentionedPostIds.join(',')})`);
          } else {
            postsQuery = postsQuery.in('id', mentionedPostIds);
          }
        }
      }
    }

    // Order by relevance (most recent first)
    postsQuery = postsQuery.order('created_at', { ascending: false });

    const { data: postsData, error: postsError, count } = await postsQuery
      .range(offset, offset + limit - 1);

    if (postsError) {
      return NextResponse.json({ error: postsError.message }, { status: 500 });
    }

    // Get mentions for all posts
    const postIds = (postsData || []).map((p: any) => p.id);
    let mentionsMap: Record<string, any[]> = {};
    
    if (postIds.length > 0) {
      const { data: mentionsData } = await supabaseServer
        .from('post_mentions')
        .select(`
          id,
          post_id,
          user_id,
          created_at,
          users (id, name, email, avatar_url, nickname)
        `)
        .in('post_id', postIds);

      if (mentionsData) {
        mentionsMap = mentionsData.reduce((acc: Record<string, any[]>, mention: any) => {
          if (!acc[mention.post_id]) {
            acc[mention.post_id] = [];
          }
          acc[mention.post_id].push({
            id: mention.id,
            postId: mention.post_id,
            userId: mention.user_id,
            createdAt: new Date(mention.created_at),
            user: mention.users ? {
              id: mention.users.id,
              name: mention.users.name,
              email: mention.users.email,
              avatarUrl: mention.users.avatar_url || undefined,
              nickname: mention.users.nickname || undefined,
            } : undefined,
          });
          return acc;
        }, {});
      }
    }

    // Convert to app format
    const posts = (postsData || []).map((p: any) => {
      const media = (p.post_media || [])
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
        id: p.id,
        userId: p.user_id,
        description: p.description || undefined,
        createdAt: p.created_at instanceof Date ? p.created_at : new Date(p.created_at),
        updatedAt: p.updated_at instanceof Date ? p.updated_at : new Date(p.updated_at),
        media,
        user: p.users
          ? {
              id: p.users.id,
              name: p.users.name,
              email: p.users.email,
              avatarUrl: p.users.avatar_url || undefined,
              nickname: p.users.nickname || undefined,
            }
          : undefined,
        mentions: mentionsMap[p.id] || [],
      };
    });

    return NextResponse.json({ posts, total: count || 0 });
  } catch (error: any) {
    console.error('Error searching feed:', error);
    return NextResponse.json({ error: error.message || 'Failed to search feed' }, { status: 500 });
  }
}

