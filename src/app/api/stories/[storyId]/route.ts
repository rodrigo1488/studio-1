import { NextRequest, NextResponse } from 'next/server';
import { deleteStory } from '@/lib/supabase/stories';
import { getCurrentUser } from '@/lib/supabase/middleware';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { storyId } = await params;

    const { success, error } = await deleteStory(storyId, user.id);

    if (error || !success) {
      return NextResponse.json({ error: error || 'Erro ao deletar story' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao deletar story' }, { status: 500 });
  }
}

