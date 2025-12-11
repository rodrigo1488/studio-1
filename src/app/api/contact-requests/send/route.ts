import { NextRequest, NextResponse } from 'next/server';
import { sendContactRequest } from '@/lib/supabase/contact-requests';
import { getCurrentUser } from '@/lib/supabase/middleware';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { requestedId } = await request.json();

    if (!requestedId) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      );
    }

    const result = await sendContactRequest(user.id, requestedId);

    if (result.error || !result.request) {
      return NextResponse.json(
        { error: result.error || 'Erro ao enviar solicitação' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      request: {
        ...result.request,
        createdAt: result.request.createdAt.toISOString(),
        updatedAt: result.request.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao enviar solicitação' },
      { status: 500 }
    );
  }
}

