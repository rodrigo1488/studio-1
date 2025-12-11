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

    // Serialize dates for JSON response
    const serializedPost = {
      ...post,
      createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : post.createdAt,
      updatedAt: post.updatedAt instanceof Date ? post.updatedAt.toISOString() : post.updatedAt,
      media: post.media.map((m) => ({
        ...m,
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
      })),
    };

    return NextResponse.json({ post: serializedPost });
  } catch (error: any) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: error.message || 'Failed to update post' }, { status: 500 });
  }
}

