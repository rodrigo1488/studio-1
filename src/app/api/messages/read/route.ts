import { NextRequest, NextResponse } from 'next/server';
import { markRoomMessagesAsRead } from '@/lib/supabase/message-reads';
import { getCurrentUser } from '@/lib/supabase/middleware';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json(
        { error: 'roomId é obrigatório' },
        { status: 400 }
      );
    }

    const result = await markRoomMessagesAsRead(roomId, user.id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: result.success });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao marcar mensagens como lidas' },
      { status: 500 }
    );
  }
}

