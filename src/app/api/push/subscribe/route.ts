import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Register push subscription for a user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const subscription = await request.json();

    if (!subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Subscription inválida' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 });
    }

    // Store subscription in database
    // First, check if user already has a subscription
    const { data: existing } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('endpoint', subscription.endpoint)
      .single();

    if (existing) {
      // Update existing subscription
      const { error } = await supabaseAdmin
        .from('push_subscriptions')
        .update({
          p256dh_key: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating push subscription:', error);
        return NextResponse.json({ error: 'Erro ao atualizar subscription' }, { status: 500 });
      }
    } else {
      // Insert new subscription
      const { error } = await supabaseAdmin.from('push_subscriptions').insert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh_key: subscription.keys.p256dh,
        auth_key: subscription.keys.auth,
      });

      if (error) {
        console.error('Error inserting push subscription:', error);
        return NextResponse.json({ error: 'Erro ao salvar subscription' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in POST /api/push/subscribe:', error);
    return NextResponse.json({ error: error.message || 'Erro ao registrar subscription' }, { status: 500 });
  }
}

