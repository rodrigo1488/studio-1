import { NextRequest, NextResponse } from 'next/server';
import { acceptContactRequest } from '@/lib/supabase/contact-requests';
import { getCurrentUser } from '@/lib/supabase/middleware';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { requestId } = await request.json();

    if (!requestId) {
      return NextResponse.json(
        { error: 'ID da solicitação é obrigatório' },
        { status: 400 }
      );
    }

    const result = await acceptContactRequest(requestId, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erro ao aceitar solicitação' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao aceitar solicitação' },
      { status: 500 }
    );
  }
}

