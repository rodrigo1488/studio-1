import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const roomId = searchParams.get('roomId');
    const q = searchParams.get('q');

    if (!roomId || !q) {
      return NextResponse.json(
        { error: 'roomId e q são obrigatórios' },
        { status: 400 }
      );
    }

    if (!supabaseServer) {
      return NextResponse.json({ error: 'Supabase não inicializado' }, { status: 500 });
    }

    // Search messages in the room
    const { data: messages, error } = await supabaseServer
      .from('messages')
      .select(`
        id,
        room_id,
        sender_id,
        text,
        media_url,
        media_type,
        created_at,
        reply_to_id,
        users (id, name, email, avatar_url, nickname)
      `)
      .eq('room_id', roomId)
      .ilike('text', `%${q}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      roomId: msg.room_id,
      senderId: msg.sender_id,
      text: msg.text,
      timestamp: new Date(msg.created_at),
      mediaUrl: msg.media_url || undefined,
      mediaType: msg.media_type || undefined,
      replyToId: msg.reply_to_id || undefined,
      user: msg.users ? {
        id: msg.users.id,
        name: msg.users.name,
        email: msg.users.email,
        avatarUrl: msg.users.avatar_url || undefined,
        nickname: msg.users.nickname || undefined,
      } : undefined,
    }));

    return NextResponse.json({
      messages: formattedMessages,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar mensagens' },
      { status: 500 }
    );
  }
}

