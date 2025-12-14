import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { createThreadMessage, getThreadMessages } from '@/lib/supabase/message-threads';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;
    const { roomId, text, mediaUrl, mediaType } = await request.json();

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ error: 'Texto é obrigatório' }, { status: 400 });
    }

    const { message, error } = await createThreadMessage(
      roomId,
      user.id,
      text.trim(),
      messageId,
      mediaUrl,
      mediaType
    );

    if (error || !message) {
      return NextResponse.json({ error: error || 'Erro ao criar thread' }, { status: 400 });
    }

    return NextResponse.json({
      message: {
        ...message,
        timestamp: message.timestamp.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error creating thread message:', error);
    return NextResponse.json({ error: error.message || 'Failed to create thread message' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await params;

    const { messages, error } = await getThreadMessages(messageId);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({
      messages: messages.map((msg) => ({
        ...msg,
        timestamp: msg.timestamp.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching thread messages:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch thread messages' }, { status: 500 });
  }
}



