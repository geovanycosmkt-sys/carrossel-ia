/**
 * Template Metadata Extractor
 * Extract editable fields and metadata from Fabric.js JSON templates
 */

import { SlideJSON, FabricObject } from '@/types';

export interface FieldMetadata {
  key: string;
  type: 'text' | 'image';
  contentKey?: string;
  limit?: number;
  maxWidth?: number;
  maxHeight?: number;
  fontSize?: number;
  fontFamily?: string;
}

export interface SlideMetadata {
  slideIndex: number;
  fields: FieldMetadata[];
  hasImages: boolean;
  hasText: boolean;
}

export interface TemplateMetadata {
  slideCount: number;
  slides: SlideMetadata[];
  totalEditableFields: number;
  imageCount: number;
  textFieldCount: number;
}

/**
 * Extract metadata from Fabric.js JSON slides
 */
export function extractMetadata(slidesJson: SlideJSON[]): TemplateMetadata {
  const slides: SlideMetadata[] = [];
  let totalEditableFields = 0;
  let imageCount = 0;
  let textFieldCount = 0;

  slidesJson.forEach((slide, slideIndex) => {
    const slideMetadata = getSlideFields(slide, slideIndex);
    slides.push(slideMetadata);

    totalEditableFields += slideMetadata.fields.length;
    imageCount += slideMetadata.fields.filter(f => f.type === 'image').length;
    textFieldCount += slideMetadata.fields.filter(f => f.type === 'text').length;
  });

  return {
    slideCount: slidesJson.length,
    slides,
    totalEditableFields,
    imageCount,
    textFieldCount,
  };
}

/**
 * Get editable fields for a single slide
 */
export function getSlideFields(slide: SlideJSON, slideIndex: number = 0): SlideMetadata {
  const fields: FieldMetadata[] = [];
  let hasImages = false;
  let hasText = false;

  slide.objects.forEach((obj: FabricObject) => {
    // Only extract variable fields
    if (obj.isVariable && obj.content_key) {
      const fieldType = determineFieldType(obj);

      fields.push({
        key: obj.content_key,
        type: fieldType,
        contentKey: obj.content_key,
        limit: extractCharLimit(obj),
        maxWidth: obj.width,
        maxHeight: obj.height,
        fontSize: obj.fontSize,
        fontFamily: obj.fontFamily,
      });

      if (fieldType === 'image') {
        hasImages = true;
      } else {
        hasText = true;
      }
    }
  });

  return {
    slideIndex,
    fields,
    hasImages,
    hasText,
  };
}

/**
 * Determine field type from Fabric.js object
 */
function determineFieldType(obj: FabricObject): 'text' | 'image' {
  const type = (obj.type || '').toLowerCase();

  if (type === 'image') {
    return 'image';
  }

  if (
    type === 'textbox' ||
    type === 'i-text' ||
    type === 'text' ||
    obj.text !== undefined
  ) {
    return 'text';
  }

  // Default to text if uncertain
  return 'text';
}

/**
 * Extract character limit from object metadata
 */
function extractCharLimit(obj: FabricObject): number | undefined {
  // Check for explicit limit property
  if (obj.charLimit !== undefined) {
    return obj.charLimit as number;
  }

  // Estimate from width and average character width
  if (obj.width && obj.fontSize) {
    const avgCharWidth = (obj.fontSize as number) * 0.6;
    const estimatedLimit = Math.floor((obj.width as number) / avgCharWidth);
    return Math.max(estimatedLimit, 10);
  }

  return undefined;
}

/**
 * Get all content keys from template
 */
export function getTemplateContentKeys(slidesJson: SlideJSON[]): string[] {
  const keys = new Set<string>();

  slidesJson.forEach(slide => {
    slide.objects.forEach((obj: FabricObject) => {
      if (obj.isVariable && obj.content_key) {
        keys.add(obj.content_key);
      }
    });
  });

  return Array.from(keys);
}

/**
 * Get all text fields from template
 */
export function getTemplateTextFields(slidesJson: SlideJSON[]): Array<{
  slideIndex: number;
  contentKey: string;
  limit?: number;
}> {
  const textFields: Array<{
    slideIndex: number;
    contentKey: string;
    limit?: number;
  }> = [];

  slidesJson.forEach((slide, slideIndex) => {
    slide.objects.forEach((obj: FabricObject) => {
      if (
        obj.isVariable &&
        obj.content_key &&
        determineFieldType(obj) === 'text'
      ) {
        textFields.push({
          slideIndex,
          contentKey: obj.content_key,
          limit: extractCharLimit(obj),
        });
      }
    });
  });

  return textFields;
}

/**
 * Get all image fields from template
 */
export function getTemplateImageFields(slidesJson: SlideJSON[]): Array<{
  slideIndex: number;
  contentKey: string;
  width: number;
  height: number;
}> {
  const imageFields: Array<{
    slideIndex: number;
    contentKey: string;
    width: number;
    height: number;
  }> = [];

  slidesJson.forEach((slide, slideIndex) => {
    slide.objects.forEach((obj: FabricObject) => {
      if (
        obj.isVariable &&
        obj.content_key &&
        determineFieldType(obj) === 'image'
      ) {
        imageFields.push({
          slideIndex,
          contentKey: obj.content_key,
          width: (obj.width || 0) as number,
          height: (obj.height || 0) as number,
        });
      }
    });
  });

  return imageFields;
}

/**
 * Validate template structure
 */
export function validateTemplateStructure(slidesJson: SlideJSON[]): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Array.isArray(slidesJson) || slidesJson.length === 0) {
    errors.push('Template must have at least one slide');
    return { valid: false, errors, warnings };
  }

  slidesJson.forEach((slide, slideIndex) => {
    if (!slide.objects || !Array.isArray(slide.objects)) {
      errors.push(`Slide ${slideIndex} has invalid objects structure`);
      return;
    }

    const variableObjects = slide.objects.filter((obj: FabricObject) => obj.isVariable);

    if (variableObjects.length === 0) {
      warnings.push(`Slide ${slideIndex} has no editable fields`);
    }

    variableObjects.forEach((obj: FabricObject) => {
      if (!obj.content_key) {
        errors.push(`Slide ${slideIndex} has variable field without content_key`);
      }

      if (!obj.width || !obj.height) {
        warnings.push(`Slide ${slideIndex} field "${obj.content_key}" has missing dimensions`);
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Get template statistics
 */
export function getTemplateStats(slidesJson: SlideJSON[]): {
  totalObjects: number;
  editableObjects: number;
  staticObjects: number;
  editablePercentage: number;
} {
  let totalObjects = 0;
  let editableObjects = 0;

  slidesJson.forEach(slide => {
    slide.objects.forEach((obj: FabricObject) => {
      totalObjects++;
      if (obj.isVariable) {
        editableObjects++;
      }
    });
  });

  const staticObjects = totalObjects - editableObjects;
  const editablePercentage =
    totalObjects > 0 ? (editableObjects / totalObjects) * 100 : 0;

  return {
    totalObjects,
    editableObjects,
    staticObjects,
    editablePercentage: Math.round(editablePercentage * 100) / 100,
  };
}

/**
 * Generate field configuration from template
 */
export function generateFieldConfig(slidesJson: SlideJSON[]): Record<number, Record<string, any>> {
  const config: Record<number, Record<string, any>> = {};

  slidesJson.forEach((slide, slideIndex) => {
    config[slideIndex] = {};

    slide.objects.forEach((obj: FabricObject) => {
      if (obj.isVariable && obj.content_key) {
        const fieldType = determineFieldType(obj);

        config[slideIndex][obj.content_key] = {
          type: fieldType,
          limit: extractCharLimit(obj),
          maxWidth: obj.width,
          maxHeight: obj.height,
          fontSize: obj.fontSize,
          fontFamily: obj.fontFamily,
        };
      }
    });
  });

  return config;
}

/**
 * Map Fabric objects to simplified field structure
 */
export function mapFabricObjectsToFields(objects: FabricObject[]): FieldMetadata[] {
  return objects
    .filter(obj => obj.isVariable && obj.content_key)
    .map(obj => ({
      key: obj.content_key || '',
      type: determineFieldType(obj),
      contentKey: obj.content_key,
      limit: extractCharLimit(obj),
      maxWidth: obj.width,
      maxHeight: obj.height,
      fontSize: obj.fontSize,
      fontFamily: obj.fontFamily,
    }));
}

/**
 * Get the most restrictive character limit from all fields
 */
export function getMinCharLimit(slidesJson: SlideJSON[]): number | undefined {
  const limits = getTemplateTextFields(slidesJson)
    .map(f => f.limit)
    .filter((l): l is number => l !== undefined);

  return limits.length > 0 ? Math.min(...limits) : undefined;
}

/**
 * Get the most permissive character limit from all fields
 */
export function getMaxCharLimit(slidesJson: SlideJSON[]): number | undefined {
  const limits = getTemplateTextFields(slidesJson)
    .map(f => f.limit)
    .filter((l): l is number => l !== undefined);

  return limits.length > 0 ? Math.max(...limits) : undefined;
}
