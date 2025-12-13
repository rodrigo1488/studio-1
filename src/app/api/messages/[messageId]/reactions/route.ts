import { NextRequest, NextResponse } from 'next/server';
import { addMessageReaction, removeMessageReaction, getMessageReactions } from '@/lib/supabase/message-reactions';
import { getCurrentUser } from '@/lib/supabase/middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { messageId } = await params;
    const { emoji } = await request.json();

    if (!emoji) {
      return NextResponse.json({ error: 'Emoji é obrigatório' }, { status: 400 });
    }

    const result = await addMessageReaction(messageId, user.id, emoji);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      reaction: {
        ...result.reaction,
        createdAt: result.reaction?.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao adicionar reação' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { messageId } = await params;
    const { emoji } = await request.json();

    if (!emoji) {
      return NextResponse.json({ error: 'Emoji é obrigatório' }, { status: 400 });
    }

    const result = await removeMessageReaction(messageId, user.id, emoji);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ removed: result.removed });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao remover reação' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { messageId } = await params;
    const result = await getMessageReactions(messageId);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      reactions: result.reactions.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar reações' },
      { status: 500 }
    );
  }
}

