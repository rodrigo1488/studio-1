import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { supabaseServer } from '@/lib/supabase/server';

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { name, avatarUrl, nickname } = await request.json();

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      );
    }

    // Check if nickname is already taken (if provided and different from current)
    if (nickname && nickname.trim().length > 0) {
      const { data: existingUser } = await supabaseServer
        ?.from('users')
        .select('id, nickname')
        .eq('nickname', nickname.trim())
        .neq('id', user.id)
        .single();

      if (existingUser) {
        return NextResponse.json(
          { error: 'Este nickname já está em uso' },
          { status: 400 }
        );
      }
    }

    if (!supabaseServer) {
      return NextResponse.json(
        { error: 'Erro de configuração' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseServer
      .from('users')
      .update({
        name: name.trim(),
        avatar_url: avatarUrl || null,
        nickname: nickname && nickname.trim().length > 0 ? nickname.trim() : null,
      })
      .eq('id', user.id)
      .select('id, email, name, avatar_url, nickname')
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      user: {
        id: data.id,
        email: data.email,
        name: data.name,
        avatarUrl: data.avatar_url || undefined,
        nickname: data.nickname || undefined,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao atualizar perfil' },
      { status: 500 }
    );
  }
}
