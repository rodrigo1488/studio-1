import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user || !supabaseServer) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Get full user data including nickname
    const { data: fullUser, error } = await supabaseServer
      .from('users')
      .select('id, email, name, avatar_url, nickname')
      .eq('id', user.id)
      .single();

    if (error || !fullUser) {
      return NextResponse.json(
        { error: 'Erro ao buscar usuário' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user: {
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        avatarUrl: fullUser.avatar_url || undefined,
        nickname: fullUser.nickname || undefined,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar usuário' },
      { status: 500 }
    );
  }
}

