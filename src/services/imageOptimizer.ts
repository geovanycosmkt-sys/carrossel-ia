/**
 * Image Optimizer Service
 * Convert Base64 images to Supabase Storage URLs with optimization
 */

import { supabase } from '@/integrations/supabase/client';

interface UploadToStorageRequest {
  base64: string;
  path: string;
  contentType?: string;
}

interface OptimizeImageRequest {
  base64: string;
  maxWidth?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

/**
 * Upload Base64 image to Supabase Storage
 */
export async function uploadToStorage(
  base64: string,
  path: string,
  contentType: string = 'image/png'
): Promise<string> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  // Convert base64 to blob
  const blob = base64ToBlob(base64, contentType);

  // Generate unique filename
  const timestamp = Date.now();
  const filename = `${timestamp}_${path.split('/').pop()}`;
  const storagePath = `carousels/${user.id}/${filename}`;

  // Upload to storage
  const { data, error } = await supabase.storage
    .from('carousel-images')
    .upload(storagePath, blob, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from('carousel-images')
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}

/**
 * Optimize image before upload
 */
export async function optimizeImage(
  base64: string,
  maxWidth: number = 1200,
  quality: number = 0.8,
  format: 'jpeg' | 'png' | 'webp' = 'png'
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate dimensions
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }

        // Create canvas and resize
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to desired format
        const mimeType =
          format === 'jpeg'
            ? 'image/jpeg'
            : format === 'webp'
              ? 'image/webp'
              : 'image/png';

        const optimized = canvas.toDataURL(mimeType, quality);
        resolve(optimized);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = base64;
  });
}

/**
 * Convert base64 to blob
 */
export function base64ToBlob(base64: string, contentType: string = 'image/png'): Blob {
  const parts = base64.split(',');
  const bstr = atob(parts[1] || parts[0]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }

  return new Blob([u8arr], { type: contentType });
}

/**
 * Convert blob to base64
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Upload and optimize image in one step
 */
export async function uploadAndOptimizeImage(
  base64: string,
  path: string,
  options?: {
    maxWidth?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
  }
): Promise<string> {
  try {
    // Optimize image first
    const optimized = await optimizeImage(base64, options?.maxWidth, options?.quality, options?.format);

    // Upload optimized image
    const contentType =
      options?.format === 'jpeg'
        ? 'image/jpeg'
        : options?.format === 'webp'
          ? 'image/webp'
          : 'image/png';

    const url = await uploadToStorage(optimized, path, contentType);
    return url;
  } catch (error) {
    console.error('Failed to upload and optimize image:', error);
    throw error;
  }
}

/**
 * Get image size (in bytes)
 */
export function getImageSize(base64: string): number {
  const parts = base64.split(',');
  const bstr = atob(parts[1] || parts[0]);
  return bstr.length;
}

/**
 * Format bytes to human-readable size
 */
export function formatImageSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Batch upload multiple images
 */
export async function batchUploadImages(
  images: Array<{ base64: string; path: string }>,
  options?: {
    maxWidth?: number;
    quality?: number;
    format?: 'jpeg' | 'png' | 'webp';
    onProgress?: (current: number, total: number) => void;
  }
): Promise<string[]> {
  const results: string[] = [];

  for (let i = 0; i < images.length; i++) {
    try {
      const url = await uploadAndOptimizeImage(images[i].base64, images[i].path, {
        maxWidth: options?.maxWidth,
        quality: options?.quality,
        format: options?.format,
      });

      results.push(url);

      if (options?.onProgress) {
        options.onProgress(i + 1, images.length);
      }
    } catch (error) {
      console.error(`Failed to upload image ${i + 1}:`, error);
      results.push(''); // placeholder for failed upload
    }
  }

  return results;
}

/**
 * Delete image from storage
 */
export async function deleteImageFromStorage(url: string): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  // Extract path from URL
  const pathMatch = url.match(/carousel-images\/(.+?)(\?|$)/);
  if (!pathMatch) {
    throw new Error('Invalid image URL');
  }

  const path = pathMatch[1];

  const { error } = await supabase.storage
    .from('carousel-images')
    .remove([path]);

  if (error) {
    throw new Error(`Failed to delete image: ${error.message}`);
  }
}

/**
 * Get image dimensions from base64
 */
export function getImageDimensions(base64: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = base64;
  });
}

/**
 * Check if image is Base64 format
 */
export function isBase64Image(str: string): boolean {
  return str.startsWith('data:image/');
}

/**
 * Validate image format
 */
export function isValidImageFormat(base64: string): boolean {
  const validFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const match = base64.match(/data:([^;]+);/);

  if (!match) return false;

  return validFormats.includes(match[1]);
}

/**
 * Compress image using canvas
 */
export async function compressImage(
  base64: string,
  targetQuality: number = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const compressed = canvas.toDataURL('image/jpeg', targetQuality);
      resolve(compressed);
    };

    img.onerror = () => {
      reject(new Error('Failed to compress image'));
    };

    img.src = base64;
  });
}
