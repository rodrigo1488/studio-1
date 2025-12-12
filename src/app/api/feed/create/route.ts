import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { createPost } from '@/lib/supabase/feed';
import { supabaseAdmin } from '@/lib/supabase/server';

// Increase timeout for file uploads (Vercel has 10s limit on Hobby plan, 60s on Pro)
export const maxDuration = 60; // 60 seconds
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (error: any) {
      console.error('Error parsing form data:', error);
      return NextResponse.json(
        { error: 'Erro ao processar os dados do formulário. Verifique se os arquivos não excedem o tamanho máximo.' },
        { status: 400 }
      );
    }

    const description = formData.get('description') as string | null;
    const mentionedUserIdsStr = formData.get('mentionedUserIds') as string | null;
    const mentionedUserIds: string[] = mentionedUserIdsStr ? JSON.parse(mentionedUserIdsStr) : [];
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'At least one image is required' }, { status: 400 });
    }

    // Validate files
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    for (const file of files) {
      if (file.size > maxFileSize) {
        return NextResponse.json({ error: `File ${file.name} is too large. Maximum size is 10MB.` }, { status: 400 });
      }
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: `File ${file.name} is not a valid image type.` }, { status: 400 });
      }
    }

    if (!supabaseAdmin) {
      console.error('Supabase admin client not initialized. Check environment variables:');
      console.error('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing');
      console.error('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');
      return NextResponse.json(
        { 
          error: 'Serviço de armazenamento não disponível. Verifique as variáveis de ambiente na Vercel.',
          details: 'SUPABASE_SERVICE_ROLE_KEY não configurada'
        },
        { status: 500 }
      );
    }

    // Verify bucket exists
    const BUCKET_NAME = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'media';
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase admin client not initialized' },
        { status: 500 }
      );
    }
    
    const { data: buckets, error: bucketListError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketListError) {
      console.error('Error listing buckets:', bucketListError);
      return NextResponse.json(
        { error: `Erro ao acessar o storage: ${bucketListError.message}` },
        { status: 500 }
      );
    }

    const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
    if (!bucketExists) {
      return NextResponse.json(
        { error: `Bucket "${BUCKET_NAME}" não encontrado. Por favor, crie o bucket no Supabase Storage.` },
        { status: 500 }
      );
    }

    // Upload all files to Supabase Storage
    // Convert files to ArrayBuffer for better compatibility with Vercel
    const uploadPromises = files.map(async (file, index) => {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}-${index}.${fileExt}`;
      const filePath = `feed/${user.id}/${fileName}`;

      // Convert File to ArrayBuffer for Vercel compatibility
      const arrayBuffer = await file.arrayBuffer();

      if (!supabaseAdmin) {
        throw new Error('Supabase admin client not available');
      }

      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(filePath, arrayBuffer, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (error || !data) {
        throw new Error(`Failed to upload file ${file.name}: ${error?.message}`);
      }

      const { data: urlData } = supabaseAdmin.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        type: 'image' as const,
        orderIndex: index,
      };
    });

    const mediaFiles = await Promise.all(uploadPromises);

    // Create post
    const { post, error } = await createPost(user.id, description || undefined, mediaFiles);

    if (error || !post) {
      return NextResponse.json({ error: error || 'Failed to create post' }, { status: 500 });
    }

    // Create mentions if any
    if (mentionedUserIds.length > 0 && supabaseAdmin) {
      const mentions = mentionedUserIds.map((mentionedUserId) => ({
        post_id: post.id,
        user_id: mentionedUserId,
      }));

      const { error: mentionsError } = await supabaseAdmin
        .from('post_mentions')
        .insert(mentions);

      if (mentionsError) {
        console.error('Error creating mentions:', mentionsError);
        // Don't fail the post creation if mentions fail
      }
    }

    // Serialize dates for JSON response
    // Ensure all dates are properly converted to ISO strings
    const serializedPost = {
      ...post,
      createdAt: post.createdAt instanceof Date 
        ? post.createdAt.toISOString() 
        : typeof post.createdAt === 'string' 
          ? post.createdAt 
          : new Date(post.createdAt).toISOString(),
      updatedAt: post.updatedAt instanceof Date 
        ? post.updatedAt.toISOString() 
        : typeof post.updatedAt === 'string' 
          ? post.updatedAt 
          : new Date(post.updatedAt).toISOString(),
      media: post.media.map((m) => ({
        id: m.id,
        postId: m.postId,
        mediaUrl: m.mediaUrl,
        mediaType: m.mediaType,
        orderIndex: m.orderIndex,
        createdAt: m.createdAt instanceof Date 
          ? m.createdAt.toISOString() 
          : typeof m.createdAt === 'string' 
            ? m.createdAt 
            : new Date(m.createdAt).toISOString(),
      })),
      user: post.user ? {
        id: post.user.id,
        name: post.user.name,
        email: post.user.email,
        avatarUrl: post.user.avatarUrl || null,
        nickname: post.user.nickname || null,
      } : null,
    };

    return NextResponse.json({ post: serializedPost }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: error.message || 'Failed to create post' }, { status: 500 });
  }
}

