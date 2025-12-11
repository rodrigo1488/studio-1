import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { createComment } from '@/lib/supabase/feed-comments';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await params;
    const body = await request.json();
    const { text } = body;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
    }

    const { comment, error } = await createComment(postId, user.id, text);

    if (error || !comment) {
      return NextResponse.json({ error: error || 'Failed to create comment' }, { status: 500 });
    }

    return NextResponse.json({ comment }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating comment:', error);
    return NextResponse.json({ error: error.message || 'Failed to create comment' }, { status: 500 });
  }
}

