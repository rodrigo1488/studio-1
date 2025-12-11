import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { createPost } from '@/lib/supabase/feed';
import { uploadMedia } from '@/lib/supabase/storage';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const description = formData.get('description') as string | null;
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

    // Upload all files to Supabase Storage
    const uploadPromises = files.map(async (file, index) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${index}.${fileExt}`;
      const filePath = `feed/${user.id}/${fileName}`;

      const { data, error } = await supabaseAdmin.storage
        .from(process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'media')
        .upload(filePath, file, {
          contentType: file.type,
        });

      if (error || !data) {
        throw new Error(`Failed to upload file ${file.name}: ${error?.message}`);
      }

      const { data: urlData } = supabaseAdmin.storage
        .from(process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'media')
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

    return NextResponse.json({ post }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: error.message || 'Failed to create post' }, { status: 500 });
  }
}

