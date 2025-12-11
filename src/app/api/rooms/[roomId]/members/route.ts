import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const { roomId } = await params;

    if (!supabaseServer) {
      return NextResponse.json(
        { error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      );
    }

    // Verificar se o usuário é membro da sala
    const { data: memberCheck } = await supabaseServer
      .from('room_members')
      .select('user_id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (!memberCheck) {
      return NextResponse.json(
        { error: 'Você não é membro desta sala' },
        { status: 403 }
      );
    }

    // Buscar o dono da sala
    const { data: room } = await supabaseServer
      .from('rooms')
      .select('owner_id')
      .eq('id', roomId)
      .single();

    // Buscar todos os membros
    const { data: members, error: membersError } = await supabaseServer
      .from('room_members')
      .select('user_id')
      .eq('room_id', roomId);

    if (membersError || !members) {
      return NextResponse.json(
        { error: 'Erro ao buscar membros' },
        { status: 500 }
      );
    }

    // Buscar dados dos usuários
    const userIds = members.map((m) => m.user_id);
    const { data: users, error: usersError } = await supabaseServer
      .from('users')
      .select('id, email, name, avatar_url, nickname')
      .in('id', userIds);

    if (usersError || !users) {
      return NextResponse.json(
        { error: 'Erro ao buscar dados dos usuários' },
        { status: 500 }
      );
    }

    // Mapear membros com flag de dono
    const membersWithOwner = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatar_url,
      nickname: user.nickname,
      isOwner: user.id === room?.owner_id,
    }));

    return NextResponse.json({ members: membersWithOwner });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar membros' },
      { status: 500 }
    );
  }
}

