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
    const type = searchParams.get('type') as 'text' | 'media' | 'link' | 'all' | null;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    if (!roomId) {
      return NextResponse.json(
        { error: 'roomId é obrigatório' },
        { status: 400 }
      );
    }

    if (!supabaseServer) {
      return NextResponse.json({ error: 'Supabase não inicializado' }, { status: 500 });
    }

    // Build query
    let query = supabaseServer
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
        is_edited,
        edited_at,
        users (id, name, email, avatar_url, nickname)
      `)
      .eq('room_id', roomId);

    // Apply text search
    if (q && q.trim().length > 0) {
      query = query.ilike('text', `%${q.trim()}%`);
    }

    // Apply type filter
    if (type && type !== 'all') {
      if (type === 'text') {
        query = query.is('media_url', null);
      } else if (type === 'media') {
        query = query.not('media_url', 'is', null);
      } else if (type === 'link') {
        // Search for links in text (basic URL detection)
        query = query.or('text.ilike.%http%,text.ilike.%https%,text.ilike.%www.%');
      }
    }

    // Apply date filters
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data: messages, error } = await query
      .order('created_at', { ascending: false })
      .limit(100);

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
      isEdited: msg.is_edited || false,
      editedAt: msg.edited_at ? new Date(msg.edited_at) : undefined,
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

