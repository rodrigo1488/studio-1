import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sendMessage } from '@/lib/supabase/messages';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { sendPushNotificationToRoomMembers } from '@/lib/push/notify-room';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // VALIDAÇÃO CRÍTICA: Sempre buscar usuário do servidor
    const user = await getCurrentUser();

    if (!user || !user.id) {
      console.error('[Send Message] Unauthorized: No user or invalid user');
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // VALIDAÇÃO ADICIONAL: Verificar se o cookie user_id corresponde ao usuário retornado
    const cookieStore = await cookies();
    const cookieUserId = cookieStore.get('user_id')?.value;
    
    if (!cookieUserId || cookieUserId !== user.id) {
      console.error('[Send Message] Security: Cookie user_id mismatch', {
        cookieUserId,
        serverUserId: user.id,
      });
      return NextResponse.json(
        { error: 'Sessão inválida. Por favor, faça login novamente.' },
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

    // Check if room has temporary message TTL configured
    let expiresAt: Date | null = null;
    if (supabaseServer) {
      const { data: roomData } = await supabaseServer
        .from('rooms')
        .select('temporary_message_ttl')
        .eq('id', roomId)
        .single();
      
      if (roomData?.temporary_message_ttl && roomData.temporary_message_ttl > 0) {
        // Calculate expiration time
        const now = new Date();
        expiresAt = new Date(now.getTime() + roomData.temporary_message_ttl * 60 * 1000);
      }
    }

    const result = await sendMessage(roomId, actualSenderId, text || '', mediaUrl, mediaType, replyToId, expiresAt);

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Send push notifications asynchronously (don't block response)
    (async () => {
      try {
        // Get sender and room info for enriched notifications
        const { getUserById } = await import('@/lib/supabase/auth');
        const { getRoomById } = await import('@/lib/supabase/rooms');
        
        const [sender, room] = await Promise.all([
          getUserById(actualSenderId),
          getRoomById(roomId),
        ]);

        // Build notification body
        let notificationBody = '';
        if (text) {
          // Truncate long messages
          notificationBody = text.length > 100 ? text.substring(0, 100) + '...' : text;
        } else if (mediaType) {
          const mediaEmojis: Record<string, string> = {
            image: '📷',
            video: '🎥',
            audio: '🎵',
            gif: '🎬',
          };
          notificationBody = `${mediaEmojis[mediaType] || '📎'} ${mediaType === 'image' ? 'Imagem' : mediaType === 'video' ? 'Vídeo' : mediaType === 'audio' ? 'Áudio' : 'GIF'}`;
        } else {
          notificationBody = 'Nova mensagem';
        }

        // Determine room name
        let roomName = 'Conversa';
        if (room) {
          roomName = room.name || 'Conversa';
        } else {
          // Try to get other user name for direct conversations
          try {
            const otherUserResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:9002'}/api/direct-conversations/${roomId}/other-user`);
            if (otherUserResponse.ok) {
              const otherUserData = await otherUserResponse.json();
              if (otherUserData.user) {
                roomName = otherUserData.user.name || 'Conversa';
              }
            }
          } catch (error) {
            // Fallback to sender name
            roomName = sender?.name || 'Conversa';
          }
        }

        // Send push notifications to room members (except sender)
        await sendPushNotificationToRoomMembers(roomId, actualSenderId, {
          title: sender ? `${sender.name}${room && room.members && room.members.length > 2 ? ` em ${roomName}` : ''}` : 'Nova mensagem',
          body: notificationBody,
          url: `/chat/${roomId}`,
          senderName: sender?.name,
          senderAvatar: sender?.avatarUrl,
          roomName: roomName,
          mediaType: mediaType,
          mediaUrl: mediaUrl,
        });
      } catch (error) {
        console.error('[Push] Error sending notifications:', error);
      }
    })();

    // Serialize the message with replyTo if it exists
    const serializedMessage = {
      ...result.message,
      timestamp: result.message.timestamp instanceof Date ? result.message.timestamp.toISOString() : result.message.timestamp,
      replyTo: result.message.replyTo ? {
        ...result.message.replyTo,
        timestamp: result.message.replyTo.timestamp instanceof Date ? result.message.replyTo.timestamp.toISOString() : result.message.replyTo.timestamp,
      } : undefined,
    };

    return NextResponse.json({ message: serializedMessage });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao enviar mensagem' },
      { status: 500 }
    );
  }
}

