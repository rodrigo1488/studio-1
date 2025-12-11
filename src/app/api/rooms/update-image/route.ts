import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { uploadMedia } from '@/lib/supabase/storage';
import { supabaseServer } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const roomId = formData.get('roomId') as string;

    if (!file || !roomId) {
      return NextResponse.json(
        { error: 'Arquivo e ID da sala são obrigatórios' },
        { status: 400 }
      );
    }

    if (!supabaseServer) {
      return NextResponse.json(
        { error: 'Configuração do Supabase não encontrada' },
        { status: 500 }
      );
    }

    // Verificar se o usuário é dono da sala
    const { data: room } = await supabaseServer
      .from('rooms')
      .select('owner_id, code')
      .eq('id', roomId)
      .single();

    if (!room) {
      return NextResponse.json(
        { error: 'Sala não encontrada' },
        { status: 404 }
      );
    }

    if (room.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Apenas o dono da sala pode alterar a imagem' },
        { status: 403 }
      );
    }

    // Não permitir alterar imagem de conversas diretas
    if (room.code?.startsWith('DM-')) {
      return NextResponse.json(
        { error: 'Não é possível alterar a imagem de conversas diretas' },
        { status: 400 }
      );
    }

    // Upload da imagem
    const tempMessageId = crypto.randomUUID();
    const uploadResult = await uploadMedia(
      file,
      roomId,
      tempMessageId,
      'image'
    );

    if (uploadResult.error) {
      return NextResponse.json(
        { error: uploadResult.error },
        { status: 400 }
      );
    }

    // Atualizar a sala com a nova URL da imagem
    // Nota: Precisamos adicionar uma coluna avatar_url na tabela rooms
    // Por enquanto, vamos usar um campo customizado ou armazenar em outro lugar
    // Vou criar uma tabela room_metadata ou adicionar coluna avatar_url

    // Por enquanto, vamos retornar a URL para o frontend atualizar
    return NextResponse.json({ 
      url: uploadResult.url,
      message: 'Imagem atualizada com sucesso. Nota: A funcionalidade de armazenar a URL da imagem na sala ainda precisa ser implementada no banco de dados.'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao atualizar imagem' },
      { status: 500 }
    );
  }
}

