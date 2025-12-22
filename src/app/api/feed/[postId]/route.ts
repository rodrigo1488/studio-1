import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await params;

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        likes: {
          where: { userId: session.user.id },
          select: { userId: true },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        media: true,
      },
    });

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Format post to match the expected interface on client
    const formattedPost = {
      ...post,
      isLiked: post.likes.length > 0,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
    };

    return NextResponse.json({ post: formattedPost });
  } catch (error) {
    console.error('Error fetching post:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
