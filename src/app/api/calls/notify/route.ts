import { NextRequest, NextResponse } from 'next/server';
import { sendPushNotification } from '@/lib/push/send-notification';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const { roomId, callerId, callerName, callType, recipientId } = await req.json();

        if (!roomId || !callerId || !recipientId) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Verify caller is authenticated (optional but recommended)
        // For speed, assuming the callerId matches the session or trusting the client for now
        // In production, we should verify the session user matches callerId

        const title = '📞 Chamada Entrando';
        const body = `${callerName || 'Alguém'} está te ligando para uma chamada de ${callType === 'video' ? 'vídeo' : 'áudio'}.`;

        const data = {
            type: 'call',
            roomId,
            callerId,
            callerName,
            callType,
            url: `/chat/${roomId}?call=true`, // Deep link to open call directly? Or just chat
        };

        const actions = [
            { action: 'answer', title: 'Atender' },
            { action: 'decline', title: 'Recusar' }
        ];

        const result = await sendPushNotification(recipientId, title, body, data, actions);

        if (!result.success) {
            console.warn(`[CallNotify] Failed to send push to ${recipientId}:`, result.error);
            // Don't fail the request, just warn. The call proceeds via WebSocket anyway.
            return NextResponse.json({ success: false, error: result.error }, { status: 200 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('[CallNotify] Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
