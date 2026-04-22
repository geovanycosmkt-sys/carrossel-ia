/**
 * Hybrid Image Service
 * Combines image search (SerpAPI) and AI generation (Gemini)
 */

import { supabase } from '@/integrations/supabase/client';
import { TemplateConfig, SlideField } from '@/types';

interface SearchImagesRequest {
  query: string;
  count?: number;
  language?: string;
}

interface SearchImagesResponse {
  images: Array<{
    url: string;
    title: string;
    source?: string;
  }>;
  totalResults: number;
}

interface GenerateAIImageRequest {
  prompt: string;
  slideContent?: Record<string, string>;
  aspectRatio?: string;
}

interface GenerateAIImageResponse {
  imageUrl: string;
  prompt: string;
  model: string;
}

interface GetImagesForSlidesRequest {
  imageKeywords: Record<number, string>; // slideIndex -> keyword
  useAI: boolean;
  templateConfig: TemplateConfig;
  slideContents?: Record<number, Record<string, string>>;
}

interface GetImagesForSlidesResponse {
  images: Record<number, string>; // slideIndex -> imageUrl
  sources: Record<number, 'serp' | 'ai' | 'fallback'>;
  failedSlides?: number[];
}

/**
 * Search for images via SerpAPI
 */
export async function searchImages(
  query: string,
  count: number = 5,
  language: string = 'pt-BR'
): Promise<SearchImagesResponse> {
  const { data, error } = await supabase.functions.invoke('image-search', {
    body: {
      action: 'searchImages',
      query,
      count,
      language,
    } as SearchImagesRequest,
  });

  if (error) {
    throw new Error(`Failed to search images: ${error.message}`);
  }

  return data as SearchImagesResponse;
}

/**
 * Generate AI image via Gemini
 */
export async function generateAIImage(
  prompt: string,
  slideContent?: Record<string, string>,
  aspectRatio: string = '1:1'
): Promise<GenerateAIImageResponse> {
  const { data, error } = await supabase.functions.invoke('image-generate', {
    body: {
      action: 'generateAIImage',
      prompt,
      slideContent,
      aspectRatio,
    } as GenerateAIImageRequest,
  });

  if (error) {
    throw new Error(`Failed to generate AI image: ${error.message}`);
  }

  return data as GenerateAIImageResponse;
}

/**
 * Get images for all slides using hybrid approach
 * First tries SerpAPI search, falls back to AI generation if needed
 */
export async function getImagesForSlides(
  imageKeywords: Record<number, string>,
  useAI: boolean = true,
  templateConfig?: TemplateConfig,
  slideContents?: Record<number, Record<string, string>>
): Promise<GetImagesForSlidesResponse> {
  const { data, error } = await supabase.functions.invoke('image-hybrid', {
    body: {
      action: 'getImagesForSlides',
      imageKeywords,
      useAI,
      templateConfig,
      slideContents,
    } as GetImagesForSlidesRequest,
  });

  if (error) {
    throw new Error(`Failed to get images for slides: ${error.message}`);
  }

  return data as GetImagesForSlidesResponse;
}

/**
 * Search for a single image with retry and fallback
 */
export async function searchImageWithFallback(
  query: string,
  fallbackQueries: string[] = [],
  language: string = 'pt-BR'
): Promise<string | null> {
  try {
    const result = await searchImages(query, 1, language);
    if (result.images.length > 0) {
      return result.images[0].url;
    }
  } catch (error) {
    console.error(`Failed to search for "${query}":`, error);
  }

  // Try fallback queries
  for (const fallbackQuery of fallbackQueries) {
    try {
      const result = await searchImages(fallbackQuery, 1, language);
      if (result.images.length > 0) {
        return result.images[0].url;
      }
    } catch (error) {
      console.error(`Failed to search for fallback "${fallbackQuery}":`, error);
    }
  }

  return null;
}

/**
 * Validate image URL and check if it's accessible
 */
export async function isImageAccessible(imageUrl: string): Promise<boolean> {
  try {
    const response = await fetch(imageUrl, {
      method: 'HEAD',
      mode: 'no-cors',
    });
    return response.ok || response.status === 0; // 0 for no-cors
  } catch (error) {
    console.error(`Image accessibility check failed for ${imageUrl}:`, error);
    return false;
  }
}

/**
 * Generate multiple image options for a slide
 */
export async function generateImageOptions(
  slideContent: Record<string, string>,
  count: number = 3,
  useAI: boolean = true
): Promise<Array<{ url: string; source: 'serp' | 'ai' }>> {
  const imageKeyword = slideContent.title || slideContent.text || 'carousel';

  try {
    // Try SerpAPI first
    const searchResult = await searchImages(imageKeyword, count);
    if (searchResult.images.length > 0) {
      return searchResult.images.map(img => ({
        url: img.url,
        source: 'serp' as const,
      }));
    }
  } catch (error) {
    console.error('Search failed, trying AI generation:', error);
  }

  // Fallback to AI generation
  if (useAI) {
    const options: Array<{ url: string; source: 'ai' }> = [];

    try {
      const aiImage = await generateAIImage(imageKeyword, slideContent);
      options.push({ url: aiImage.imageUrl, source: 'ai' });
    } catch (error) {
      console.error('AI image generation failed:', error);
    }

    return options;
  }

  return [];
}

/**
 * Batch search for multiple keywords
 */
export async function batchSearchImages(
  keywords: string[],
  language: string = 'pt-BR'
): Promise<Record<string, Array<{ url: string; title: string }>>> {
  const results: Record<string, Array<{ url: string; title: string }>> = {};

  for (const keyword of keywords) {
    try {
      const result = await searchImages(keyword, 3, language);
      results[keyword] = result.images;
    } catch (error) {
      console.error(`Failed to search images for keyword "${keyword}":`, error);
      results[keyword] = [];
    }
  }

  return results;
}
