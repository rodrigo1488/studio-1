import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateDirectConversation } from '@/lib/supabase/direct-messages';
import { getCurrentUser } from '@/lib/supabase/middleware';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { otherUserId } = await request.json();

    if (!otherUserId) {
      return NextResponse.json(
        { error: 'ID do outro usuário é obrigatório' },
        { status: 400 }
      );
    }

    if (user.id === otherUserId) {
      return NextResponse.json(
        { error: 'Você não pode iniciar uma conversa consigo mesmo' },
        { status: 400 }
      );
    }

    const result = await getOrCreateDirectConversation(user.id, otherUserId);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ conversationId: result.conversationId });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao criar conversa direta' },
      { status: 500 }
    );
  }
}

