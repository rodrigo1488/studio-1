import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { setRoomTemporaryMessageTTL, getRoomTemporaryMessageTTL } from '@/lib/supabase/temporary-messages';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId } = await params;

    const { ttlMinutes, error } = await getRoomTemporaryMessageTTL(roomId);

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ ttlMinutes });
  } catch (error: any) {
    console.error('Error fetching temporary message TTL:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch TTL' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId } = await params;
    const { ttlMinutes } = await request.json();

    // Validate TTL (null or positive integer)
    if (ttlMinutes !== null && (typeof ttlMinutes !== 'number' || ttlMinutes <= 0)) {
      return NextResponse.json({ error: 'TTL deve ser null ou um número positivo' }, { status: 400 });
    }

    // Verify user is a member of the room
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }

    const { data: roomMember } = await supabaseAdmin
      .from('room_members')
      .select('room_id')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    if (!roomMember) {
      return NextResponse.json({ error: 'Você não é membro desta sala' }, { status: 403 });
    }

    const { success, error } = await setRoomTemporaryMessageTTL(roomId, ttlMinutes);

    if (!success || error) {
      return NextResponse.json({ error: error || 'Erro ao configurar mensagens temporárias' }, { status: 500 });
    }

    return NextResponse.json({ success: true, ttlMinutes });
  } catch (error: any) {
    console.error('Error setting temporary message TTL:', error);
    return NextResponse.json({ error: error.message || 'Failed to set TTL' }, { status: 500 });
  }
}



