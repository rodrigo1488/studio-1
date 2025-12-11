import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { getFeedPosts } from '@/lib/supabase/feed';
import { getPostsLikeCounts, getPostsUserLikes } from '@/lib/supabase/feed-likes';
import { getPostsCommentCounts } from '@/lib/supabase/feed-comments';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { posts, error } = await getFeedPosts(user.id, limit, offset);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    // Get like counts, user likes, and comment counts
    const postIds = posts.map((p) => p.id);
    const [likeCounts, userLikes, commentCounts] = await Promise.all([
      getPostsLikeCounts(postIds),
      getPostsUserLikes(postIds, user.id),
      getPostsCommentCounts(postIds),
    ]);

    // Enrich posts with counts and ensure dates are serialized correctly
    const enrichedPosts = posts.map((post) => ({
      ...post,
      createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : post.createdAt,
      updatedAt: post.updatedAt instanceof Date ? post.updatedAt.toISOString() : post.updatedAt,
      media: post.media.map((m) => ({
        ...m,
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
      })),
      likesCount: likeCounts[post.id] || 0,
      commentsCount: commentCounts[post.id] || 0,
      isLiked: userLikes[post.id] || false,
    }));

    return NextResponse.json({ posts: enrichedPosts });
  } catch (error: any) {
    console.error('Error fetching feed:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch feed' }, { status: 500 });
  }
}

