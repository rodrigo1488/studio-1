import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { getPostById } from '@/lib/supabase/feed';
import { getPostsLikeCounts, getPostsUserLikes } from '@/lib/supabase/feed-likes';
import { getPostsCommentCounts } from '@/lib/supabase/feed-comments';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await params;

    const { post, error } = await getPostById(postId);

    if (error || !post) {
      return NextResponse.json({ error: error || 'Post not found' }, { status: 404 });
    }

    // Get like counts, user likes, and comment counts
    const [likeCounts, userLikes, commentCounts] = await Promise.all([
      getPostsLikeCounts([postId]),
      getPostsUserLikes([postId], user.id),
      getPostsCommentCounts([postId]),
    ]);

    // Enrich post with counts
    const enrichedPost = {
      ...post,
      createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : post.createdAt,
      updatedAt: post.updatedAt instanceof Date ? post.updatedAt.toISOString() : post.updatedAt,
      media: post.media.map((m) => ({
        ...m,
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
      })),
      likesCount: likeCounts[postId] || 0,
      commentsCount: commentCounts[postId] || 0,
      isLiked: userLikes[postId] || false,
    };

    return NextResponse.json({ post: enrichedPost });
  } catch (error: any) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch post' }, { status: 500 });
  }
}

