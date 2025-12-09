import { NextResponse } from 'next/server';
import { getUserDirectConversations } from '@/lib/supabase/direct-messages';
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

    const conversations = await getUserDirectConversations(user.id);

    return NextResponse.json({ conversations });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar conversas diretas' },
      { status: 500 }
    );
  }
}

