import { NextRequest, NextResponse } from 'next/server';
import { sendMessage } from '@/lib/supabase/messages';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { sendPushNotificationToRoomMembers } from '@/lib/push/notify-room';

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

    return NextResponse.json({ message: result.message });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao enviar mensagem' },
      { status: 500 }
    );
  }
}

