import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { togglePostLike } from '@/lib/supabase/feed-likes';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await params;

    const { liked, error } = await togglePostLike(postId, user.id);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ liked });
  } catch (error: any) {
    console.error('Error toggling like:', error);
    return NextResponse.json({ error: error.message || 'Failed to toggle like' }, { status: 500 });
  }
}

