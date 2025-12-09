import { NextRequest, NextResponse } from 'next/server';
import { getRoomMessages } from '@/lib/supabase/messages';
import { getCurrentUser } from '@/lib/supabase/middleware';

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
    const messages = await getRoomMessages(roomId);

    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar mensagens' },
      { status: 500 }
    );
  }
}

