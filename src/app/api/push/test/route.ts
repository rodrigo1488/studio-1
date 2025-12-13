import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';
import { sendPushNotification } from '@/lib/push/send-notification';

/**
 * Test push notification endpoint
 * GET /api/push/test - Test if push notifications are working
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Check VAPID keys
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidEmail = process.env.VAPID_EMAIL;

    const diagnostics = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      vapid: {
        publicKey: vapidPublicKey ? '✅ Configurada' : '❌ Não configurada',
        privateKey: vapidPrivateKey ? '✅ Configurada' : '❌ Não configurada',
        email: vapidEmail || 'Não configurado',
      },
      subscriptions: [] as any[],
      testResult: null as any,
    };

    // Check subscriptions
    if (supabaseAdmin) {
      const { data: subscriptions, error } = await supabaseAdmin
        .from('push_subscriptions')
        .select('id, endpoint, created_at')
        .eq('user_id', user.id);

      if (error) {
        diagnostics.subscriptions = [{ error: error.message }];
      } else {
        diagnostics.subscriptions = subscriptions || [];
      }

      // Try to send a test notification if subscriptions exist
      if (subscriptions && subscriptions.length > 0) {
        const result = await sendPushNotification(
          user.id,
          'Teste de Notificação',
          'Se você recebeu esta notificação, o sistema está funcionando!',
          { test: true }
        );
        diagnostics.testResult = result;
      }
    }

    return NextResponse.json(diagnostics);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Erro ao testar notificações' },
      { status: 500 }
    );
  }
}

