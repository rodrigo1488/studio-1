import { NextRequest, NextResponse } from 'next/server';
import { followUser, unfollowUser, isFollowing } from '@/lib/supabase/follows';
import { getCurrentUser } from '@/lib/supabase/middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { userId } = await params;

    if (user.id === userId) {
      return NextResponse.json(
        { error: 'Não é possível seguir a si mesmo' },
        { status: 400 }
      );
    }

    const result = await followUser(user.id, userId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: result.success });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao seguir usuário' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { userId } = await params;
    const result = await unfollowUser(user.id, userId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: result.success });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao deixar de seguir' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { userId } = await params;
    const result = await isFollowing(user.id, userId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ following: result.following });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao verificar follow' },
      { status: 500 }
    );
  }
}

