import { NextRequest, NextResponse } from 'next/server';
import { getUserProfileStats } from '@/lib/supabase/profile-stats';
import { getCurrentUser } from '@/lib/supabase/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { userId } = await params;
    const result = await getUserProfileStats(userId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ stats: result.stats });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar estatísticas' },
      { status: 500 }
    );
  }
}

