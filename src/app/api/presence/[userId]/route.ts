import { NextRequest, NextResponse } from 'next/server';
import { getUserPresence } from '@/lib/supabase/presence';
import { getCurrentUser } from '@/lib/supabase/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const result = await getUserPresence(params.userId);

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
      { error: error.message || 'Erro ao buscar presença' },
      { status: 500 }
    );
  }
}

