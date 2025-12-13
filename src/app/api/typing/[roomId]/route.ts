import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { roomId } = await params;
    const { isTyping } = await request.json();

    if (!supabaseServer) {
      return NextResponse.json({ error: 'Supabase não inicializado' }, { status: 500 });
    }

    const { error } = await supabaseServer
      .from('typing_indicators')
      .upsert(
        {
          user_id: user.id,
          room_id: roomId,
          is_typing: isTyping,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,room_id',
        }
      );

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar status de digitação' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { roomId } = await params;

    if (!supabaseServer) {
      return NextResponse.json({ error: 'Supabase não inicializado' }, { status: 500 });
    }

    const { data, error } = await supabaseServer
      .from('typing_indicators')
      .select(`
        user_id,
        is_typing,
        updated_at,
        users (id, name, avatar_url)
      `)
      .eq('room_id', roomId)
      .eq('is_typing', true)
      .neq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter out old typing indicators (more than 3 seconds old)
    const now = new Date();
    const typingUsers = (data || [])
      .filter((indicator: any) => {
        const updatedAt = new Date(indicator.updated_at);
        const secondsSinceUpdate = (now.getTime() - updatedAt.getTime()) / 1000;
        return secondsSinceUpdate < 3;
      })
      .map((indicator: any) => ({
        userId: indicator.user_id,
        userName: indicator.users?.name || 'Usuário',
        avatarUrl: indicator.users?.avatar_url || undefined,
      }));

    return NextResponse.json({ typingUsers });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar indicadores de digitação' },
      { status: 500 }
    );
  }
}

