import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/supabase/messages';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { messageId, toRoomId } = await request.json();

    if (!messageId || !toRoomId) {
      return NextResponse.json(
        { error: 'messageId e toRoomId são obrigatórios' },
        { status: 400 }
      );
    }

    if (!supabaseServer) {
      return NextResponse.json({ error: 'Supabase não inicializado' }, { status: 500 });
    }

    // Get original message
    const { data: originalMessage, error: messageError } = await supabaseServer
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (messageError || !originalMessage) {
      return NextResponse.json(
        { error: 'Mensagem original não encontrada' },
        { status: 404 }
      );
    }

    // Create forwarded message
    const forwardedText = originalMessage.text
      ? `Encaminhado: ${originalMessage.text}`
      : 'Mensagem encaminhada';

    const result = await sendMessage(
      toRoomId,
      user.id,
      forwardedText,
      originalMessage.media_url,
      originalMessage.media_type as 'image' | 'video' | 'audio'
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Record forward
    await supabaseServer.from('message_forwards').insert({
      original_message_id: messageId,
      forwarded_message_id: result.message.id,
      forwarded_by_user_id: user.id,
      forwarded_to_room_id: toRoomId,
    });

    return NextResponse.json({ message: result.message });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao encaminhar mensagem' },
      { status: 500 }
    );
  }
}

