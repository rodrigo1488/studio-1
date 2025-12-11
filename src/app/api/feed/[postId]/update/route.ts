import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { updatePost } from '@/lib/supabase/feed';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await params;
    const body = await request.json();
    const { description } = body;

    const { post, error } = await updatePost(postId, user.id, description);

    if (error || !post) {
      return NextResponse.json({ error: error || 'Failed to update post' }, { status: 500 });
    }

    return NextResponse.json({ post });
  } catch (error: any) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: error.message || 'Failed to update post' }, { status: 500 });
  }
}

