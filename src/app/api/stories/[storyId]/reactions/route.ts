import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { addStoryReaction, removeStoryReaction, getStoryReactions } from '@/lib/supabase/story-reactions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { reactionType } = body;

    if (!reactionType || !['like', 'love', 'laugh', 'wow', 'sad', 'angry'].includes(reactionType)) {
      return NextResponse.json({ error: 'Tipo de reação inválido' }, { status: 400 });
    }

    const { success, error } = await addStoryReaction(storyId, user.id, reactionType);

    if (!success || error) {
      return NextResponse.json({ error: error || 'Erro ao adicionar reação' }, { status: 500 });
    }

    // Get updated reactions
    const { reactions } = await getStoryReactions(storyId);

    return NextResponse.json({ reactions });
  } catch (error: any) {
    console.error('Error in POST /api/stories/[storyId]/reactions:', error);
    return NextResponse.json({ error: error.message || 'Erro ao adicionar reação' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { success, error } = await removeStoryReaction(storyId, user.id);

    if (!success || error) {
      return NextResponse.json({ error: error || 'Erro ao remover reação' }, { status: 500 });
    }

    // Get updated reactions
    const { reactions } = await getStoryReactions(storyId);

    return NextResponse.json({ reactions });
  } catch (error: any) {
    console.error('Error in DELETE /api/stories/[storyId]/reactions:', error);
    return NextResponse.json({ error: error.message || 'Erro ao remover reação' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const { storyId } = await params;

    const { reactions, error } = await getStoryReactions(storyId);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ reactions });
  } catch (error: any) {
    console.error('Error in GET /api/stories/[storyId]/reactions:', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar reações' }, { status: 500 });
  }
}

