import { NextResponse } from 'next/server';
import { getSentRequests } from '@/lib/supabase/contact-requests';
import { getCurrentUser } from '@/lib/supabase/middleware';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const result = await getSentRequests(user.id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      requests: result.requests.map((req) => ({
        ...req,
        createdAt: req.createdAt.toISOString(),
        updatedAt: req.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar solicitações enviadas' },
      { status: 500 }
    );
  }
}

