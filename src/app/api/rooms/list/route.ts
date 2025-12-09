import { NextResponse } from 'next/server';
import { getUserRooms } from '@/lib/supabase/rooms';
import { getCurrentUser } from '@/lib/supabase/middleware';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const rooms = await getUserRooms(user.id);

    return NextResponse.json({ rooms });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar salas' },
      { status: 500 }
    );
  }
}

