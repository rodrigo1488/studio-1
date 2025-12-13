import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/supabase/messages';
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

    const { roomId, text, mediaUrl, mediaType, senderId, replyToId } = await request.json();

    if (!roomId) {
      return NextResponse.json(
        { error: 'ID da sala é obrigatório' },
        { status: 400 }
      );
    }

    if (!text && !mediaUrl) {
      return NextResponse.json(
        { error: 'Mensagem ou mídia é obrigatória' },
        { status: 400 }
      );
    }

    // Reject temporary/optimistic message IDs for replyToId
    if (replyToId && replyToId.startsWith('temp-')) {
      return NextResponse.json(
        { error: 'Não é possível responder a mensagens temporárias' },
        { status: 400 }
      );
    }

    // VALIDAÇÃO CRÍTICA: O senderId SEMPRE vem do servidor (user.id da sessão)
    // Ignorar qualquer senderId enviado pelo cliente por segurança
    // O servidor é a única fonte confiável para identificar o remetente
    const actualSenderId = user.id;
    
    // Se o cliente enviou um senderId diferente, logar como warning mas usar o correto
    if (senderId && senderId !== actualSenderId) {
      console.warn(`SenderId mismatch: client sent ${senderId}, but server using ${actualSenderId}`);
    }

    const result = await sendMessage(roomId, actualSenderId, text || '', mediaUrl, mediaType, replyToId);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: result.message });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao enviar mensagem' },
      { status: 500 }
    );
  }
}

