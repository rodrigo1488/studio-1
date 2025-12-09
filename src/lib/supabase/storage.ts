import { supabase } from './client';
import { supabaseAdmin } from './server';
import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET_NAME = process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'media';
const MAX_FILE_SIZE = parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760'); // 10MB default

export type MediaType = 'image' | 'video' | 'audio';

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload a media file to Supabase Storage
 * Uses admin client if called from server, otherwise uses public client
 */
export async function uploadMedia(
  file: File,
  roomId: string,
  messageId: string,
  mediaType: MediaType,
  client?: SupabaseClient
): Promise<UploadResult> {
  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Validate file type
  const allowedTypes = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    video: ['video/mp4', 'video/webm', 'video/quicktime'],
    audio: ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'],
  };

  if (!allowedTypes[mediaType].includes(file.type)) {
    throw new Error(`Invalid file type for ${mediaType}. Allowed types: ${allowedTypes[mediaType].join(', ')}`);
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${messageId}.${fileExt}`;
  const filePath = `rooms/${roomId}/${fileName}`;

  // Use provided client, or admin client (server-side), or public client (client-side)
  const storageClient = client || (typeof window === 'undefined' ? supabaseAdmin : supabase);

  if (!storageClient) {
    throw new Error('Supabase client not available');
  }

  // Upload file
  const { data, error } = await storageClient.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  // Get public URL - try public URL first, fallback to signed URL if needed
  let publicUrl: string;
  
  try {
    const { data: urlData } = storageClient.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    
    if (urlData && urlData.publicUrl) {
      publicUrl = urlData.publicUrl;
    } else {
      // If public URL fails, try to create a signed URL (valid for 1 year)
      const { data: signedUrlData, error: signedError } = await storageClient.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, 31536000); // 1 year in seconds
      
      if (signedError || !signedUrlData) {
        throw new Error('Failed to get URL for uploaded file');
      }
      
      publicUrl = signedUrlData.signedUrl;
    }
  } catch (urlError: any) {
    throw new Error(`Failed to get URL for uploaded file: ${urlError.message || 'Unknown error'}`);
  }

  return {
    url: publicUrl,
    path: filePath,
  };
}

/**
 * Delete a media file from Supabase Storage
 */
export async function deleteMedia(filePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Get media type from file
 */
export function getMediaTypeFromFile(file: File): MediaType | null {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return null;
}

