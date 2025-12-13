import { NextRequest, NextResponse } from 'next/server';
import { getAllActiveStories } from '@/lib/supabase/stories';
import { getCurrentUser } from '@/lib/supabase/middleware';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { stories, error } = await getAllActiveStories(user.id);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({
      stories: stories.map((story) => ({
        ...story,
        createdAt: story.createdAt.toISOString(),
        expiresAt: story.expiresAt.toISOString(),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao buscar stories' }, { status: 500 });
  }
}

