import { NextRequest, NextResponse } from 'next/server';
import { addContact } from '@/lib/supabase/direct-messages';
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

    const { contactId } = await request.json();

    if (!contactId) {
      return NextResponse.json(
        { error: 'ID do contato é obrigatório' },
        { status: 400 }
      );
    }

    const result = await addContact(user.id, contactId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erro ao adicionar contato' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao adicionar contato' },
      { status: 500 }
    );
  }
}

