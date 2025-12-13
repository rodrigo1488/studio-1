import { NextResponse } from 'next/server';

/**
 * Get VAPID public key for push notifications
 * The private key should be stored in environment variables
 */
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return NextResponse.json(
      { error: 'VAPID public key not configured' },
      { status: 500 }
    );
  }

  return NextResponse.json({ publicKey });
}

