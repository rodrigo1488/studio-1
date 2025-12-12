import { NextRequest, NextResponse } from 'next/server';
import { markMessageAsRead, getMessageReads } from '@/lib/supabase/message-reads';
import { getCurrentUser } from '@/lib/supabase/middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const result = await markMessageAsRead(params.messageId, user.id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: result.success });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao marcar mensagem como lida' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const result = await getMessageReads(params.messageId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      reads: result.reads.map((r) => ({
        ...r,
        readAt: r.readAt.toISOString(),
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar leituras' },
      { status: 500 }
    );
  }
}

