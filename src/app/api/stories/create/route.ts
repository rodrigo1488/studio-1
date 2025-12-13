import { NextRequest, NextResponse } from 'next/server';
import { createStory } from '@/lib/supabase/stories';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';

const BUCKET_NAME = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'media';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const mediaType = formData.get('mediaType') as 'image' | 'video';

    if (!file) {
      return NextResponse.json({ error: 'Arquivo é obrigatório' }, { status: 400 });
    }

    if (!mediaType || !['image', 'video'].includes(mediaType)) {
      return NextResponse.json({ error: 'Tipo de mídia inválido' }, { status: 400 });
    }

    // Validate file size (max 10MB for images, 50MB for videos)
    const maxSize = mediaType === 'image' ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Tamanho máximo: ${maxSize / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const allowedTypes = mediaType === 'image' ? allowedImageTypes : allowedVideoTypes;

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de arquivo não suportado' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 });
    }

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop() || (mediaType === 'image' ? 'jpg' : 'mp4');
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `stories/${user.id}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, arrayBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      });

    if (uploadError || !uploadData) {
      return NextResponse.json(
        { error: uploadError?.message || 'Erro ao fazer upload do arquivo' },
        { status: 500 }
      );
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    const mediaUrl = urlData.publicUrl;

    // Create story
    const { story, error } = await createStory(user.id, mediaUrl, mediaType);

    if (error || !story) {
      // Try to delete uploaded file if story creation fails
      await supabaseAdmin.storage.from(BUCKET_NAME).remove([filePath]).catch(() => {});
      return NextResponse.json({ error: error || 'Erro ao criar story' }, { status: 500 });
    }

    // Send push notifications to followers about new story (async, don't block response)
    (async () => {
      try {
        const { getUserById } = await import('@/lib/supabase/auth');
        const { sendPushNotificationToFollowers } = await import('@/lib/push/notify-feed');
        
        const storyUser = await getUserById(user.id);
        if (storyUser) {
          await sendPushNotificationToFollowers(user.id, {
            title: `${storyUser.name} publicou uma nova story`,
            body: mediaType === 'image' ? '📷 Nova story' : '🎥 Nova story',
            url: '/feed',
            data: { 
              storyId: story.id, 
              userId: user.id,
              mediaType,
              mediaUrl,
            },
          });
        }
      } catch (error) {
        // Log error but don't fail story creation
        console.error('[Push] Error sending story notification:', error);
      }
    })();

    return NextResponse.json({
      story: {
        ...story,
        createdAt: story.createdAt.toISOString(),
        expiresAt: story.expiresAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error in POST /api/stories/create:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao criar story',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}

