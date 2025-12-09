import { NextRequest, NextResponse } from 'next/server';
import { getRoomById } from '@/lib/supabase/rooms';
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
    const room = await getRoomById(roomId);

    if (!room) {
      return NextResponse.json(
        { error: 'Sala não encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ room });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar sala' },
      { status: 500 }
    );
  }
}

