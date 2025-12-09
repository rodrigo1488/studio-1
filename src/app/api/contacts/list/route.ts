import { NextResponse } from 'next/server';
import { getUserContacts } from '@/lib/supabase/direct-messages';
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

    const contacts = await getUserContacts(user.id);

    return NextResponse.json({ contacts });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar contatos' },
      { status: 500 }
    );
  }
}

