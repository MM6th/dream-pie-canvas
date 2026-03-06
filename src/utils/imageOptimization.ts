import imageCompression from 'browser-image-compression';
import { supabase } from '@/integrations/supabase/client';

/**
 * Compress an image file before uploading to Supabase storage.
 * Reduces file size while maintaining reasonable quality.
 */
export async function compressImage(file: File, options?: {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  quality?: number;
}): Promise<File> {
  // Skip compression for GIFs (would lose animation) and small files
  if (file.type === 'image/gif' || file.size < 200 * 1024) {
    return file;
  }

  const compressionOptions = {
    maxSizeMB: options?.maxSizeMB ?? 1,
    maxWidthOrHeight: options?.maxWidthOrHeight ?? 2048,
    useWebWorker: true,
    initialQuality: options?.quality ?? 0.8,
    fileType: file.type as string,
  };

  try {
    const compressedFile = await imageCompression(file, compressionOptions);
    console.log(
      `Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB (${((1 - compressedFile.size / file.size) * 100).toFixed(0)}% reduction)`
    );
    return compressedFile as File;
  } catch (error) {
    console.warn('Image compression failed, using original:', error);
    return file;
  }
}

/**
 * Get a Supabase storage URL with image transformation parameters.
 * Requires Image Transformations to be enabled in Supabase dashboard.
 * 
 * @param bucket - Storage bucket name
 * @param path - File path within the bucket
 * @param transform - Transformation options
 */
export function getTransformedImageUrl(
  bucket: string,
  path: string,
  transform?: {
    width?: number;
    height?: number;
    quality?: number;
    resize?: 'cover' | 'contain' | 'fill';
  }
): string {
  if (!transform) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path, {
    transform: {
      width: transform.width,
      height: transform.height,
      quality: transform.quality ?? 75,
      resize: transform.resize ?? 'cover',
    },
  });

  return data.publicUrl;
}

/**
 * Common transform presets for different use cases.
 */
export const imageTransformPresets = {
  thumbnail: { width: 200, height: 200, quality: 60, resize: 'cover' as const },
  card: { width: 400, height: 400, quality: 70, resize: 'cover' as const },
  medium: { width: 800, height: 800, quality: 75, resize: 'contain' as const },
  large: { width: 1200, height: 1200, quality: 80, resize: 'contain' as const },
};
