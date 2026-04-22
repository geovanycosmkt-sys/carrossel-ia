/**
 * Template Manager Utility
 * Manages template loading, hydration, and field extraction
 */

import { supabase } from '@/integrations/supabase/client';
import { Template, TemplateConfig, SlideJSON, FabricObject, SlideField } from '@/types';

/**
 * Load a template by ID from database
 */
export async function loadTemplate(templateId: string): Promise<Template> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error) {
    throw new Error(`Failed to load template: ${error.message}`);
  }

  return data as Template;
}

/**
 * Load a system template (no user_id)
 */
export async function loadSystemTemplate(templateId: string): Promise<Template> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .eq('is_system', true)
    .single();

  if (error) {
    throw new Error(`Failed to load system template: ${error.message}`);
  }

  return data as Template;
}

/**
 * Load all system templates
 */
export async function loadSystemTemplates(category?: string): Promise<Template[]> {
  let query = supabase
    .from('templates')
    .select('*')
    .eq('is_system', true)
    .order('name');

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to load system templates: ${error.message}`);
  }

  return (data || []) as Template[];
}

/**
 * THE MOST IMPORTANT FUNCTION
 * Hydrate template slides with carousel content and images
 * Iterates through slide objects, finds isVariable=true fields, and replaces text/images
 */
export function hydrateTemplate(
  templateSlides: SlideJSON[],
  carouselText: Record<number, Record<string, string>>,
  images: Record<number, string>
): SlideJSON[] {
  return templateSlides.map((slide, slideIndex) => {
    const hydrated = { ...slide };
    hydrated.objects = slide.objects.map((obj: FabricObject) => {
      const hydratedObj = { ...obj };

      // Check if this is a variable field
      if (hydratedObj.isVariable && hydratedObj.content_key) {
        const contentKey = hydratedObj.content_key;
        const slideContent = carouselText[slideIndex] || {};

        // Handle text replacement
        if (hydratedObj.type === 'textbox' || hydratedObj.type === 'i-text' || hydratedObj.type === 'text') {
          const textValue = slideContent[contentKey];
          if (textValue) {
            hydratedObj.text = textValue;

            // Apply auto-fit if needed
            if (hydratedObj.width && hydratedObj.height && hydratedObj.fontSize) {
              const fitted = applyAutofit(
                textValue,
                hydratedObj.fontSize as number,
                hydratedObj.width as number,
                hydratedObj.height as number
              );
              hydratedObj.text = fitted.text;
              hydratedObj.fontSize = fitted.fontSize;
            }
          }
        }

        // Handle image replacement
        if (hydratedObj.type === 'image') {
          const imageUrl = images[slideIndex];
          if (imageUrl) {
            hydratedObj.src = imageUrl;
          }
        }
      }

      return hydratedObj;
    });

    return hydrated;
  });
}

/**
 * Apply auto-fit to text: reduce fontSize until text fits dimensions
 */
export function applyAutofit(
  text: string,
  fontSize: number,
  maxWidth: number,
  maxHeight: number
): { text: string; fontSize: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return { text, fontSize };
  }

  let currentSize = fontSize;
  let fitted = false;

  // Try to fit text by reducing font size
  while (currentSize > 8 && !fitted) {
    ctx.font = `${currentSize}px Arial`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = currentSize * 1.2; // Approximate height

    if (textWidth <= maxWidth && textHeight <= maxHeight) {
      fitted = true;
    } else {
      currentSize -= 1;
    }
  }

  return { text, fontSize: currentSize };
}

/**
 * Generate dynamic AI prompt based on template config
 */
export function generateDynamicPrompt(templateConfig: TemplateConfig): string {
  const slideCount = templateConfig.slideCount;
  const fieldLimits = extractFieldLimits(templateConfig);

  let prompt = `You are creating content for a ${slideCount}-slide carousel.
Please generate engaging content for each slide with the following specifications:

`;

  Object.entries(fieldLimits).forEach(([fieldName, limit]) => {
    if (limit) {
      prompt += `- ${fieldName}: maximum ${limit} characters\n`;
    }
  });

  prompt += `
The content should be:
- Engaging and attention-grabbing
- Optimized for social media
- Clear and concise
- Well-structured for carousel format

Please provide the content in JSON format with the following structure:
{
  "0": { "title": "...", "description": "...", "cta": "..." },
  "1": { "title": "...", "description": "...", "cta": "..." },
  ...
}`;

  return prompt;
}

/**
 * Extract field limits from template config
 */
function extractFieldLimits(templateConfig: TemplateConfig): Record<string, number | undefined> {
  const limits: Record<string, number | undefined> = {};

  Object.entries(templateConfig.fields).forEach(([slideIndex, fields]) => {
    Object.entries(fields).forEach(([fieldKey, fieldConfig]) => {
      if (fieldConfig.limit) {
        const key = `slide_${slideIndex}_${fieldKey}`;
        limits[key] = fieldConfig.limit;
      }
    });
  });

  return limits;
}

/**
 * Extract all editable fields from template config
 */
export function extractTemplateFields(templateConfig: TemplateConfig): SlideField[][] {
  const fieldsBySlide: SlideField[][] = [];

  Object.entries(templateConfig.fields).forEach(([slideIndex, fields]) => {
    const slideFields: SlideField[] = [];

    Object.entries(fields).forEach(([fieldKey, fieldConfig]) => {
      slideFields.push({
        key: fieldKey,
        value: '',
        type: fieldConfig.type,
        isVariable: true,
        limit: fieldConfig.limit,
      });
    });

    fieldsBySlide[parseInt(slideIndex)] = slideFields;
  });

  return fieldsBySlide;
}

/**
 * Get editable fields for a single slide
 */
export function getSlideEditableFields(
  templateConfig: TemplateConfig,
  slideIndex: number
): SlideField[] {
  const fields = templateConfig.fields[slideIndex] || {};
  const slideFields: SlideField[] = [];

  Object.entries(fields).forEach(([fieldKey, fieldConfig]) => {
    slideFields.push({
      key: fieldKey,
      value: '',
      type: fieldConfig.type,
      isVariable: true,
      limit: fieldConfig.limit,
    });
  });

  return slideFields;
}

/**
 * Validate carousel content against template constraints
 */
export function validateCarouselContent(
  carouselContent: Record<number, Record<string, string>>,
  templateConfig: TemplateConfig
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  Object.entries(carouselContent).forEach(([slideIndex, fields]) => {
    const slideIndex_num = parseInt(slideIndex);
    const templateFields = templateConfig.fields[slideIndex_num];

    if (!templateFields) {
      errors.push(`Slide ${slideIndex_num} not found in template`);
      return;
    }

    Object.entries(fields).forEach(([fieldKey, fieldValue]) => {
      const fieldConfig = templateFields[fieldKey];

      if (!fieldConfig) {
        errors.push(`Field "${fieldKey}" not found in slide ${slideIndex_num}`);
        return;
      }

      if (fieldConfig.limit && fieldValue.length > fieldConfig.limit) {
        errors.push(
          `Field "${fieldKey}" in slide ${slideIndex_num} exceeds limit of ${fieldConfig.limit} characters (${fieldValue.length} provided)`
        );
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Create template from Fabric.js slides
 */
export async function createTemplateFromSlides(
  name: string,
  description: string,
  slides: SlideJSON[],
  templateConfig: TemplateConfig,
  category: string = 'custom',
  isPublic: boolean = false
): Promise<Template> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User not authenticated');
  }

  const template: Omit<Template, 'id' | 'created_at' | 'updated_at'> = {
    user_id: user.id,
    name,
    description,
    category,
    slides,
    template_config: templateConfig,
    is_public: isPublic,
    is_system: false,
  };

  const { data, error } = await supabase
    .from('templates')
    .insert([template])
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create template: ${error.message}`);
  }

  return data as Template;
}

/**
 * Update existing template
 */
export async function updateTemplate(
  templateId: string,
  updates: Partial<Omit<Template, 'id' | 'created_at' | 'updated_at'>>
): Promise<Template> {
  const { data, error } = await supabase
    .from('templates')
    .update(updates)
    .eq('id', templateId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update template: ${error.message}`);
  }

  return data as Template;
}

/**
 * Get template categories
 */
export async function getTemplateCategories(): Promise<string[]> {
  const { data, error } = await supabase
    .from('templates')
    .select('category')
    .eq('is_system', true)
    .distinct();

  if (error) {
    console.error('Failed to get template categories:', error);
    return [];
  }

  return data?.map(d => d.category).filter(Boolean) || [];
}

/**
 * Duplicate a template
 */
export async function duplicateTemplate(templateId: string, newName?: string): Promise<Template> {
  const template = await loadTemplate(templateId);

  const duplicated: Omit<Template, 'id' | 'created_at' | 'updated_at'> = {
    ...template,
    name: newName || `${template.name} (Copy)`,
    user_id: undefined,
  };

  return createTemplateFromSlides(
    duplicated.name,
    duplicated.description || '',
    duplicated.slides,
    duplicated.template_config,
    duplicated.category,
    duplicated.is_public
  );
}
