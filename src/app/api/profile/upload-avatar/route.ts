import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';

const BUCKET_NAME = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'media';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo não fornecido' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Apenas arquivos de imagem são permitidos' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Generate file path
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${user.id}/${fileName}`;

    // Ensure bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
    
    if (!bucketExists) {
      const { error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, { public: true });
      if (createError && createError.message !== `The bucket "${BUCKET_NAME}" already exists`) {
        return NextResponse.json(
          { error: `Erro ao criar bucket: ${createError.message}` },
          { status: 500 }
        );
      }
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Upload using admin client
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, arrayBuffer, {
        cacheControl: '3600',
        upsert: true, // Allow overwriting old avatars
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError);
      return NextResponse.json(
        { error: `Erro ao fazer upload: ${uploadError.message}` },
        { status: 500 }
      );
    }

    if (!uploadData) {
      return NextResponse.json(
        { error: 'Upload concluído mas nenhum dado retornado' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    if (!urlData || !urlData.publicUrl) {
      // Try signed URL as fallback
      const { data: signedData, error: signedError } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, 31536000); // 1 year

      if (signedError || !signedData) {
        return NextResponse.json(
          { error: 'Falha ao obter URL do arquivo' },
          { status: 500 }
        );
      }

      return NextResponse.json({ 
        url: signedData.signedUrl, 
        path: filePath 
      });
    }

    return NextResponse.json({ 
      url: urlData.publicUrl, 
      path: filePath 
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    
    return NextResponse.json(
      { error: error.message || 'Erro ao fazer upload' },
      { status: 500 }
    );
  }
}

