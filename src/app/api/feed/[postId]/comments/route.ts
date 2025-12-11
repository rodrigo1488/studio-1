import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { getPostComments } from '@/lib/supabase/feed-comments';

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
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { comments, error } = await getPostComments(postId, limit, offset);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    // Serialize dates for JSON response
    const serializedComments = comments.map((comment) => ({
      ...comment,
      createdAt: comment.createdAt instanceof Date ? comment.createdAt.toISOString() : comment.createdAt,
      updatedAt: comment.updatedAt instanceof Date ? comment.updatedAt.toISOString() : comment.updatedAt,
    }));

    return NextResponse.json({ comments: serializedComments });
  } catch (error: any) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch comments' }, { status: 500 });
  }
}

