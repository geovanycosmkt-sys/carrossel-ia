/**
 * Canva Integration Service
 * Build and send data to Canva API for carousel creation
 */

import { TemplateConfig, CarouselSlide } from '@/types';

interface CanvaAutofillData {
  [key: string]: string | Record<string, any>;
}

interface CanvaDesignData {
  design: {
    id: string;
    title: string;
    thumbnail: {
      width: number;
      height: number;
      url: string;
    };
  };
}

/**
 * Build autofill data structure for Canva API
 * Maps carousel content and images to Canva's required format
 */
export function buildAutofillData(
  carouselText: Record<number, Record<string, string>>,
  images: Record<number, string>,
  userSettings?: {
    name?: string;
    email?: string;
    company?: string;
  }
): CanvaAutofillData {
  const autofillData: CanvaAutofillData = {};

  // Add text content for each slide
  Object.entries(carouselText).forEach(([slideIndex, fields]) => {
    const index = parseInt(slideIndex);

    Object.entries(fields).forEach(([fieldKey, fieldValue]) => {
      // Create unique key for each field: slide_0_title, slide_0_description, etc.
      const key = `slide_${index}_${fieldKey}`;
      autofillData[key] = fieldValue;
    });

    // Add image if available
    if (images[index]) {
      autofillData[`slide_${index}_image`] = {
        type: 'image',
        url: images[index],
      };
    }
  });

  // Add user metadata if provided
  if (userSettings) {
    if (userSettings.name) {
      autofillData['user_name'] = userSettings.name;
    }
    if (userSettings.email) {
      autofillData['user_email'] = userSettings.email;
    }
    if (userSettings.company) {
      autofillData['user_company'] = userSettings.company;
    }
  }

  return autofillData;
}

/**
 * Build autofill data from carousel slides
 */
export function buildAutofillDataFromSlides(
  slides: CarouselSlide[],
  images: Record<number, string>,
  userSettings?: {
    name?: string;
    email?: string;
    company?: string;
  }
): CanvaAutofillData {
  const textContent: Record<number, Record<string, string>> = {};

  // Convert slide fields to text content
  slides.forEach((slide, index) => {
    textContent[index] = {};

    slide.fields.forEach(field => {
      if (field.type !== 'image') {
        textContent[index][field.key] = field.value;
      }
    });
  });

  return buildAutofillData(textContent, images, userSettings);
}

/**
 * Send autofill data to Canva API
 */
export async function sendToCanva(
  templateId: string,
  autofillData: CanvaAutofillData,
  accessToken: string
): Promise<CanvaDesignData> {
  const canvaApiUrl = 'https://api.canva.com/v1/designs';

  try {
    const response = await fetch(canvaApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        design_type: 'doc',
        template_id: templateId,
        autofill_data: autofillData,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Canva API error: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    return data as CanvaDesignData;
  } catch (error) {
    throw new Error(`Failed to send design to Canva: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get Canva design preview URL
 */
export function getCanvaDesignPreviewUrl(designData: CanvaDesignData): string {
  return designData.design.thumbnail.url;
}

/**
 * Build Canva publish URL
 */
export function buildCanvaPublishUrl(designData: CanvaDesignData): string {
  return `https://www.canva.com/design/${designData.design.id}`;
}

/**
 * Validate Canva access token
 */
export async function validateCanvaAccessToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.canva.com/v1/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Failed to validate Canva token:', error);
    return false;
  }
}

/**
 * Create design from template and autofill data
 * Simplified wrapper for common use case
 */
export async function createDesignFromTemplate(
  templateId: string,
  title: string,
  slides: CarouselSlide[],
  images: Record<number, string>,
  accessToken: string,
  userSettings?: {
    name?: string;
    email?: string;
    company?: string;
  }
): Promise<string> {
  // Build autofill data
  const autofillData = buildAutofillDataFromSlides(slides, images, userSettings);

  // Add title
  autofillData['design_title'] = title;

  // Send to Canva
  const designData = await sendToCanva(templateId, autofillData, accessToken);

  return buildCanvaPublishUrl(designData);
}

/**
 * Batch create multiple designs
 */
export async function batchCreateDesigns(
  templateId: string,
  designs: Array<{
    title: string;
    slides: CarouselSlide[];
    images: Record<number, string>;
  }>,
  accessToken: string,
  onProgress?: (current: number, total: number) => void
): Promise<string[]> {
  const urls: string[] = [];

  for (let i = 0; i < designs.length; i++) {
    try {
      const url = await createDesignFromTemplate(
        templateId,
        designs[i].title,
        designs[i].slides,
        designs[i].images,
        accessToken
      );

      urls.push(url);

      if (onProgress) {
        onProgress(i + 1, designs.length);
      }
    } catch (error) {
      console.error(`Failed to create design ${i + 1}:`, error);
      urls.push(''); // placeholder for failed design
    }
  }

  return urls;
}

/**
 * Get Canva user profile
 */
export async function getCanvaUserProfile(accessToken: string): Promise<Record<string, any>> {
  try {
    const response = await fetch('https://api.canva.com/v1/users/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user profile: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Failed to get Canva user profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get list of user's Canva designs
 */
export async function getCanvaDesigns(
  accessToken: string,
  limit: number = 10,
  offset: number = 0
): Promise<CanvaDesignData[]> {
  try {
    const response = await fetch(
      `https://api.canva.com/v1/designs?limit=${limit}&offset=${offset}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to get designs: ${response.statusText}`);
    }

    const data = await response.json();
    return data.designs || [];
  } catch (error) {
    throw new Error(`Failed to get Canva designs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Map template fields to Canva autofill keys
 */
export function mapTemplateFieldsToCanva(
  templateConfig: TemplateConfig,
  slideContents: Record<number, Record<string, string>>
): CanvaAutofillData {
  const autofillData: CanvaAutofillData = {};

  Object.entries(slideContents).forEach(([slideIndex, fields]) => {
    const index = parseInt(slideIndex);
    const templateFields = templateConfig.fields[index] || {};

    Object.entries(fields).forEach(([fieldKey, fieldValue]) => {
      // Map to Canva format
      const canvaKey = `slide_${index}_${fieldKey}`;
      autofillData[canvaKey] = fieldValue;
    });
  });

  return autofillData;
}

/**
 * Build Canva brand colors from settings
 */
export function buildCanvaBrandColors(colors: Record<string, string>): Record<string, any> {
  return {
    brand_colors: colors,
  };
}

/**
 * Build Canva fonts from settings
 */
export function buildCanvaFonts(
  fonts: Record<string, string>
): Record<string, any> {
  return {
    fonts: fonts,
  };
}
