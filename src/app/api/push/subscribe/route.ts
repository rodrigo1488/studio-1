import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Register push subscription for a user
 */
export async function POST(request: NextRequest) {
  try {
    // Debug: Check cookies
    const cookieStore = await cookies();
    const userIdCookie = cookieStore.get('user_id');
    console.log('[Push Subscribe] Cookie user_id:', userIdCookie?.value || 'not found');
    
    const user = await getCurrentUser();

    if (!user) {
      console.error('[Push Subscribe] User not found. Cookie exists:', !!userIdCookie);
      return NextResponse.json(
        { 
          error: 'Não autenticado',
          message: 'Por favor, faça login novamente'
        },
        { status: 401 }
      );
    }

    console.log('[Push Subscribe] User authenticated:', user.id);

    const subscription = await request.json();

    if (!subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Subscription inválida' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Erro no servidor' }, { status: 500 });
    }

    // Store subscription in database
    // First, check if user already has a subscription
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', user.id)
      .eq('endpoint', subscription.endpoint)
      .maybeSingle();

    // If table doesn't exist, return helpful error
    if (checkError && checkError.code === '42P01') {
      console.error('Table push_subscriptions does not exist. Please run migration 017_push_subscriptions.sql');
      return NextResponse.json(
        { 
          error: 'Tabela de notificações não encontrada. Por favor, execute a migration no Supabase.',
          code: 'TABLE_NOT_FOUND'
        },
        { status: 500 }
      );
    }

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
        return NextResponse.json(
          { 
            error: 'Erro ao atualizar subscription',
            details: error.message,
            code: error.code
          },
          { status: 500 }
        );
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
        return NextResponse.json(
          { 
            error: 'Erro ao salvar subscription',
            details: error.message,
            code: error.code
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in POST /api/push/subscribe:', error);
    return NextResponse.json({ error: error.message || 'Erro ao registrar subscription' }, { status: 500 });
  }
}

