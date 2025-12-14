import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { editMessage } from '@/lib/supabase/messages';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json({ error: 'Texto é obrigatório' }, { status: 400 });
    }

    console.log(`[Edit Message] User ${user.id} editing message ${messageId}`);

    const { message, error } = await editMessage(messageId, user.id, text.trim());

    if (error) {
      console.error(`[Edit Message] Error: ${error}`);
      return NextResponse.json({ error }, { status: 400 });
    }

    if (!message) {
      console.error(`[Edit Message] Message is null after edit`);
      return NextResponse.json({ error: 'Erro ao editar mensagem' }, { status: 400 });
    }

    return NextResponse.json({ 
      message: {
        ...message,
        timestamp: message.timestamp.toISOString(),
        editedAt: message.editedAt?.toISOString(),
      }
    });
  } catch (error: any) {
    console.error('[Edit Message] Exception:', error);
    return NextResponse.json({ error: error.message || 'Failed to edit message' }, { status: 500 });
  }
}

