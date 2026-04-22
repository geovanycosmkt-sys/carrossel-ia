/**
 * Carousel History Service
 * Save, load, update, and delete carousels from database
 */

import { supabase } from '@/integrations/supabase/client';
import { CarouselContent, CarouselSlide } from '@/types';

interface CarouselFilters {
  status?: 'draft' | 'published' | 'archived';
  niche?: string;
  templateId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Save a new carousel to user_carousels table
 */
export async function saveCarousel(data: Omit<CarouselContent, 'id' | 'created_at' | 'updated_at'>): Promise<CarouselContent> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  const carouselData = {
    user_id: user.id,
    ...data,
  };

  const { data: result, error } = await supabase
    .from('user_carousels')
    .insert([carouselData])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save carousel: ${error.message}`);
  }

  return result as CarouselContent;
}

/**
 * Load all carousels for current user with optional filters
 */
export async function loadCarousels(filters?: CarouselFilters): Promise<CarouselContent[]> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  let query = supabase
    .from('user_carousels')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.niche) {
    query = query.eq('niche', filters.niche);
  }

  if (filters?.templateId) {
    query = query.eq('template_id', filters.templateId);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load carousels: ${error.message}`);
  }

  return (data || []) as CarouselContent[];
}

/**
 * Load a single carousel by ID
 */
export async function getCarousel(id: string): Promise<CarouselContent> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('user_carousels')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    throw new Error(`Failed to load carousel: ${error.message}`);
  }

  return data as CarouselContent;
}

/**
 * Update carousel with partial updates
 */
export async function updateCarousel(
  id: string,
  updates: Partial<Omit<CarouselContent, 'id' | 'user_id' | 'created_at'>>
): Promise<CarouselContent> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('user_carousels')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update carousel: ${error.message}`);
  }

  return data as CarouselContent;
}

/**
 * Update carousel status
 */
export async function updateCarouselStatus(
  id: string,
  status: 'draft' | 'published' | 'archived'
): Promise<CarouselContent> {
  return updateCarousel(id, { status });
}

/**
 * Update carousel slides
 */
export async function updateCarouselSlides(id: string, slides: CarouselSlide[]): Promise<CarouselContent> {
  return updateCarousel(id, { slides });
}

/**
 * Update carousel images
 */
export async function updateCarouselImages(id: string, images: Record<string, string>): Promise<CarouselContent> {
  return updateCarousel(id, { images });
}

/**
 * Delete carousel by ID
 */
export async function deleteCarousel(id: string): Promise<void> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('user_carousels')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(`Failed to delete carousel: ${error.message}`);
  }
}

/**
 * Duplicate carousel (create a copy)
 */
export async function duplicateCarousel(id: string, newTitle?: string): Promise<CarouselContent> {
  const carousel = await getCarousel(id);

  const duplicated = await saveCarousel({
    ...carousel,
    title: newTitle || `${carousel.title} (Copy)`,
    status: 'draft',
  });

  return duplicated;
}

/**
 * Get carousel count for current user
 */
export async function getCarouselCount(filters?: Omit<CarouselFilters, 'limit' | 'offset'>): Promise<number> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  let query = supabase
    .from('user_carousels')
    .select('id', { count: 'exact' })
    .eq('user_id', user.id);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.niche) {
    query = query.eq('niche', filters.niche);
  }

  if (filters?.templateId) {
    query = query.eq('template_id', filters.templateId);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(`Failed to count carousels: ${error.message}`);
  }

  return count || 0;
}

/**
 * Get carousels by template ID
 */
export async function getCarouselsByTemplate(templateId: string): Promise<CarouselContent[]> {
  return loadCarousels({ templateId });
}

/**
 * Get carousels by niche
 */
export async function getCarouselsByNiche(niche: string): Promise<CarouselContent[]> {
  return loadCarousels({ niche });
}

/**
 * Archive old carousels (older than days)
 */
export async function archiveOldCarousels(days: number = 30): Promise<number> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { error, data } = await supabase
    .from('user_carousels')
    .update({ status: 'archived' })
    .eq('user_id', user.id)
    .eq('status', 'draft')
    .lt('updated_at', cutoffDate.toISOString())
    .select();

  if (error) {
    throw new Error(`Failed to archive carousels: ${error.message}`);
  }

  return data?.length || 0;
}
