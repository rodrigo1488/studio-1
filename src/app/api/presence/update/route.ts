import { NextRequest, NextResponse } from 'next/server';
import { updateUserPresence } from '@/lib/supabase/presence';
import { getCurrentUser } from '@/lib/supabase/middleware';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { status } = await request.json();

    if (!status || !['online', 'offline', 'away'].includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    const result = await updateUserPresence(user.id, status);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      presence: {
        ...result.presence,
        lastSeen: result.presence?.lastSeen.toISOString(),
        updatedAt: result.presence?.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar presença' },
      { status: 500 }
    );
  }
}

