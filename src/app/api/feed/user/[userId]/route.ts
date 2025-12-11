import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { getUserPosts } from '@/lib/supabase/feed';
import { getPostsLikeCounts, getPostsUserLikes } from '@/lib/supabase/feed-likes';
import { getPostsCommentCounts } from '@/lib/supabase/feed-comments';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { posts, error } = await getUserPosts(userId, limit, offset);

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

    // Enrich posts with counts
    const enrichedPosts = posts.map((post) => ({
      ...post,
      likesCount: likeCounts[post.id] || 0,
      commentsCount: commentCounts[post.id] || 0,
      isLiked: userLikes[post.id] || false,
    }));

    return NextResponse.json({ posts: enrichedPosts });
  } catch (error: any) {
    console.error('Error fetching user posts:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch user posts' }, { status: 500 });
  }
}

