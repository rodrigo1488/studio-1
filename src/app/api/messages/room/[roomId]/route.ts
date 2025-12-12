import { NextRequest, NextResponse } from 'next/server';
import { getRoomMessages } from '@/lib/supabase/messages';
import { getCurrentUser } from '@/lib/supabase/middleware';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { roomId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '8', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const beforeParam = searchParams.get('before');

    const before = beforeParam ? new Date(beforeParam) : undefined;

    const { messages, hasMore } = await getRoomMessages(roomId, limit, offset, before);

    return NextResponse.json({ messages, hasMore });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar mensagens' },
      { status: 500 }
    );
  }
}

