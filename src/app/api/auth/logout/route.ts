import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Delete all authentication-related cookies
    cookieStore.delete('user_id');
    
    // Also try to delete with different path/domain options to ensure cleanup
    const response = NextResponse.json({ success: true });
    
    // Clear cookies with explicit settings
    response.cookies.delete('user_id');
    response.cookies.set('user_id', '', {
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    // Add header to instruct client to clear localStorage
    response.headers.set('X-Clear-Cache', 'true');

    return response;
  } catch (error) {
    console.error('[Logout] Error:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer logout' },
      { status: 500 }
    );
  }
}

