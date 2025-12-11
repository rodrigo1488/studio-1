import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { roomId } = await params;

    if (!supabaseServer) {
      return NextResponse.json(
        { error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      );
    }

    // Buscar a conversa direta
    const { data: conversation, error: convError } = await supabaseServer
      .from('direct_conversations')
      .select('user1_id, user2_id')
      .eq('id', roomId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversa direta não encontrada' },
        { status: 404 }
      );
    }

    // Determinar qual é o outro usuário
    const otherUserId = conversation.user1_id === user.id 
      ? conversation.user2_id 
      : conversation.user1_id;

    // Buscar dados do outro usuário
    const { data: otherUser, error: userError } = await supabaseServer
      .from('users')
      .select('id, email, name, avatar_url, nickname')
      .eq('id', otherUserId)
      .single();

    if (userError || !otherUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      user: {
        id: otherUser.id,
        email: otherUser.email,
        name: otherUser.name,
        avatarUrl: otherUser.avatar_url,
        nickname: otherUser.nickname,
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar usuário' },
      { status: 500 }
    );
  }
}

