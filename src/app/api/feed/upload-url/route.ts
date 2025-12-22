
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/middleware';
import { supabaseAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { filename, fileType } = await request.json();

        if (!filename || !fileType) {
            return NextResponse.json({ error: 'Filename and fileType are required' }, { status: 400 });
        }

        const BUCKET_NAME = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'media';

        // Ensure admin client is available
        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Generate a unique file path
        const fileExt = filename.split('.').pop() || 'jpg';
        const filePath = `feed/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        // Create a signed upload URL
        const { data, error } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .createSignedUploadUrl(filePath);

        if (error || !data) {
            console.error('Error creating signed url:', error);
            return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
        }

        // Get the public URL for the file (where it will be accessible after upload)
        const { data: publicUrlData } = supabaseAdmin.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        return NextResponse.json({
            signedUrl: data.signedUrl,
            path: filePath,
            token: data.token, // Might be needed depending on upload method, usually signedUrl is enough
            publicUrl: publicUrlData.publicUrl,
            fullPath: data.signedUrl // Often the signedUrl is the full URL to PUT to
        });

    } catch (error: any) {
        console.error('Error in upload-url:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
