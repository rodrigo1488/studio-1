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

    let description: string | null = null;
    let mentionedUserIds: string[] = [];
    let mediaFiles: Array<{ url: string; type: 'image' | 'video'; orderIndex: number }> = [];

    // Parse JSON body
    try {
      const body = await request.json();
      description = body.description || null;
      mentionedUserIds = body.mentionedUserIds || [];
      mediaFiles = body.media || [];
    } catch (error) {
      console.error('Error parsing JSON body:', error);
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (mediaFiles.length === 0 && !description) {
      return NextResponse.json({ error: 'Post must have a description or media' }, { status: 400 });
    }

    // Create post
    const { post, error } = await createPost(user.id, description || undefined, mediaFiles);

    // Send push notifications to followers about new post
    if (post && !error) {
      const { sendPushNotificationToFollowers } = await import('@/lib/push/notify-feed');
      sendPushNotificationToFollowers(user.id, {
        title: `${user.name} publicou um novo post`,
        body: description || (mediaFiles.length > 0 ? '📷 Nova publicação' : 'Nova publicação'),
        url: `/feed?postId=${post.id}`,
        data: { postId: post.id, userId: user.id },
      }).catch(console.error);
    }

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

