import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { searchUsers } from '@/lib/supabase/direct-messages';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] });
    }

    const users = await searchUsers(query, limit);

    // Filter out the current user from results
    const filteredUsers = users.filter((u) => u.id !== user.id);

    return NextResponse.json({ users: filteredUsers });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar usuários' },
      { status: 500 }
    );
  }
}

