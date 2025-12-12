import { NextRequest, NextResponse } from 'next/server';
import { savePost, unsavePost, isPostSaved } from '@/lib/supabase/saved-posts';
import { getCurrentUser } from '@/lib/supabase/middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const result = await savePost(params.postId, user.id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ saved: result.saved });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar post' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const result = await unsavePost(params.postId, user.id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ unsaved: result.unsaved });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao remover post salvo' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { postId: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const result = await isPostSaved(params.postId, user.id);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ saved: result.saved });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao verificar post salvo' },
      { status: 500 }
    );
  }
}

