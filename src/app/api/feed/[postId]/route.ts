import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { getPostById } from '@/lib/supabase/feed';
import { getPostLikeCount, isPostLiked } from '@/lib/supabase/feed-likes';
import { getPostCommentCount } from '@/lib/supabase/feed-comments';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await params;

    const { post, error } = await getPostById(postId);

    if (error || !post) {
      return NextResponse.json({ error: error || 'Post not found' }, { status: 404 });
    }

    // Get like count, user like status, and comment count
    const [likeCount, liked, commentCount] = await Promise.all([
      getPostLikeCount(postId),
      isPostLiked(postId, user.id),
      getPostCommentCount(postId),
    ]);

    const enrichedPost = {
      ...post,
      likesCount: likeCount,
      commentsCount: commentCount,
      isLiked: liked,
    };

    return NextResponse.json({ post: enrichedPost });
  } catch (error: any) {
    console.error('Error fetching post:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch post' }, { status: 500 });
  }
}

