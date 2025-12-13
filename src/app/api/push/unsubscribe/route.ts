import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Unregister push subscription for a user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 });
    }

    // Remove all subscriptions for this user
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting push subscriptions:', error);
      return NextResponse.json({ error: 'Erro ao remover subscriptions' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in POST /api/push/unsubscribe:', error);
    return NextResponse.json({ error: error.message || 'Erro ao desregistrar subscription' }, { status: 500 });
  }
}

