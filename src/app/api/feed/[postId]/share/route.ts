import { NextRequest, NextResponse } from 'next/server';
import { sharePost } from '@/lib/supabase/post-shares';
import { getCurrentUser } from '@/lib/supabase/middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { postId } = await params;
    const { sharedToUserId, sharedToRoomId } = await request.json();

    if (!sharedToUserId && !sharedToRoomId) {
      return NextResponse.json(
        { error: 'Deve especificar sharedToUserId ou sharedToRoomId' },
        { status: 400 }
      );
    }

    const result = await sharePost(postId, user.id, {
      sharedToUserId,
      sharedToRoomId,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      share: {
        ...result.share,
        createdAt: result.share?.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao compartilhar post' },
      { status: 500 }
    );
  }
}

