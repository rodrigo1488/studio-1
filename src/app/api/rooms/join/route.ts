import { NextRequest, NextResponse } from 'next/server';
import { joinRoomByCode } from '@/lib/supabase/rooms';
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

    const { code } = await request.json();

    if (!code || code.trim().length === 0) {
      return NextResponse.json(
        { error: 'Código da sala é obrigatório' },
        { status: 400 }
      );
    }

    const result = await joinRoomByCode(code.trim().toUpperCase(), user.id);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ room: result.room });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao entrar na sala' },
      { status: 500 }
    );
  }
}

