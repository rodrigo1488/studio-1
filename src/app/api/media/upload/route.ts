import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { uploadMedia, getMediaTypeFromFile } from '@/lib/supabase/storage';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Serviço de armazenamento não disponível' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const roomId = formData.get('roomId') as string;
    const messageId = formData.get('messageId') as string;

    if (!file || !roomId || !messageId) {
      return NextResponse.json(
        { error: 'Arquivo, roomId e messageId são obrigatórios' },
        { status: 400 }
      );
    }

    const mediaType = getMediaTypeFromFile(file);
    if (!mediaType) {
      return NextResponse.json(
        { error: 'Tipo de arquivo não suportado' },
        { status: 400 }
      );
    }

    // Use admin client for upload (has proper permissions)
    const result = await uploadMedia(file, roomId, messageId, mediaType, supabaseAdmin);

    return NextResponse.json({ url: result.url, path: result.path });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao fazer upload' },
      { status: 500 }
    );
  }
}

