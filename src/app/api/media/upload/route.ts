import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { getMediaTypeFromFile } from '@/lib/supabase/storage';
import { supabaseAdmin } from '@/lib/supabase/server';

const BUCKET_NAME = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'media';
const MAX_FILE_SIZE = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760'); // 10MB default

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

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
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

    // Generate file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${messageId}.${fileExt}`;
    const filePath = `rooms/${roomId}/${fileName}`;

    // First, verify bucket exists and is accessible
    const { data: buckets, error: bucketListError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketListError) {
      console.error('Error listing buckets:', bucketListError);
      return NextResponse.json(
        { error: `Erro ao acessar o storage: ${bucketListError.message}. Verifique se o SUPABASE_SERVICE_ROLE_KEY está correto.` },
        { status: 500 }
      );
    }

    let bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
    
    // Try to create bucket if it doesn't exist
    if (!bucketExists) {
      console.log(`Bucket "${BUCKET_NAME}" não encontrado. Tentando criar...`);
      const { data: newBucket, error: createError } = await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
      });

      if (createError) {
        console.error('Erro ao criar bucket:', createError);
        return NextResponse.json(
          { 
            error: `Bucket "${BUCKET_NAME}" não existe e não foi possível criá-lo automaticamente. Por favor, crie manualmente no Supabase Dashboard: Storage > New bucket > Nome: "${BUCKET_NAME}" > Public: true. Erro: ${createError.message}` 
          },
          { status: 500 }
        );
      }

      if (newBucket) {
        console.log(`Bucket "${BUCKET_NAME}" criado com sucesso!`);
        bucketExists = true;
      }
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Upload using admin client with explicit error handling
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, arrayBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError) {
      console.error('Supabase Storage upload error:', uploadError);
      
      // More specific error handling
      if (uploadError.message.includes('JWS') || uploadError.message.includes('JWT') || uploadError.message.includes('Invalid Compact JWS')) {
        return NextResponse.json(
          { error: 'Erro de autenticação com o Supabase Storage. Verifique se o SUPABASE_SERVICE_ROLE_KEY está correto e se o bucket existe.' },
          { status: 500 }
        );
      }
      
      if (uploadError.message.includes('Bucket') || uploadError.message.includes('not found')) {
        return NextResponse.json(
          { 
            error: `Bucket "${BUCKET_NAME}" não encontrado. 
            
INSTRUÇÕES PARA CRIAR O BUCKET:
1. Acesse o Supabase Dashboard
2. Vá em "Storage" no menu lateral
3. Clique em "New bucket"
4. Nome do bucket: "${BUCKET_NAME}"
5. Marque como "Public bucket"
6. Clique em "Create bucket"
7. Tente fazer o upload novamente.` 
          },
          { status: 500 }
        );
      }

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

