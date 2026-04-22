/**
 * ZIP Download Service
 * Export carousel slides as ZIP file or sequential downloads
 */

/**
 * Convert Data URL to Blob
 */
export function dataURLtoBlob(dataURL: string): Blob {
  const parts = dataURL.split(',');
  const mimeMatch = parts[0].match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(parts[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }

  return new Blob([u8arr], { type: mimeType });
}

/**
 * Convert canvas to data URL
 */
function canvasToDataURL(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png');
}

/**
 * Convert data URL to PNG Blob
 */
export function dataURLtoPNG(dataURL: string): Blob {
  return dataURLtoBlob(dataURL);
}

/**
 * Download a single slide as PNG
 */
export function downloadSlide(dataURL: string, filename: string): void {
  const blob = dataURLtoBlob(dataURL);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `slide.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download multiple slides sequentially with delay
 */
export async function downloadSequential(
  slides: string[],
  delay: number = 500,
  titlePrefix: string = 'slide'
): Promise<void> {
  for (let i = 0; i < slides.length; i++) {
    const filename = `${titlePrefix}_${String(i + 1).padStart(2, '0')}.png`;
    downloadSlide(slides[i], filename);

    // Wait before downloading next slide to avoid browser limits
    if (i < slides.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Detect if JSZip is available in the environment
 */
function isJSZipAvailable(): boolean {
  return typeof window !== 'undefined' && (window as any).JSZip !== undefined;
}

/**
 * Download as ZIP using JSZip
 * Note: Requires JSZip library to be included in the project
 */
export async function downloadAsZip(
  slides: string[],
  title: string = 'carousel',
  options?: {
    includeMetadata?: boolean;
    quality?: 'high' | 'medium' | 'low';
  }
): Promise<Blob | null> {
  // Check if JSZip is available
  if (!isJSZipAvailable()) {
    console.warn('JSZip not available. Falling back to sequential download.');
    await downloadSequential(slides, 300, title);
    return null;
  }

  try {
    // @ts-ignore JSZip is loaded from CDN or bundler
    const JSZip = window.JSZip;
    const zip = new JSZip();

    // Add slides to ZIP
    for (let i = 0; i < slides.length; i++) {
      const blob = dataURLtoBlob(slides[i]);
      const filename = `${title}_slide_${String(i + 1).padStart(2, '0')}.png`;
      zip.file(filename, blob);
    }

    // Add metadata if requested
    if (options?.includeMetadata) {
      const metadata = {
        title,
        slideCount: slides.length,
        createdAt: new Date().toISOString(),
        format: 'png',
      };
      zip.file('metadata.json', JSON.stringify(metadata, null, 2));
    }

    // Generate and download ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}_carousel_${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return zipBlob;
  } catch (error) {
    console.error('Failed to create ZIP file:', error);
    // Fallback to sequential download
    await downloadSequential(slides, 300, title);
    return null;
  }
}

/**
 * Export carousel as ZIP with options for metadata and quality
 */
export async function exportCarouselAsZip(
  slides: string[],
  carouselTitle: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; message: string }> {
  try {
    if (!isJSZipAvailable()) {
      return {
        success: false,
        message: 'JSZip library not loaded. Please ensure JSZip is included in your project.',
      };
    }

    // @ts-ignore JSZip is loaded from CDN or bundler
    const JSZip = window.JSZip;
    const zip = new JSZip();

    // Add slides
    for (let i = 0; i < slides.length; i++) {
      const blob = dataURLtoBlob(slides[i]);
      const filename = `slide_${String(i + 1).padStart(3, '0')}.png`;
      zip.file(filename, blob);
    }

    // Add metadata
    if (metadata) {
      zip.file('carousel.json', JSON.stringify(metadata, null, 2));
    }

    // Add a README
    const readme = `# ${carouselTitle}\n\nCarousel exported on ${new Date().toLocaleString()}\n\nTotal slides: ${slides.length}\n`;
    zip.file('README.md', readme);

    // Generate ZIP
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Download
    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${carouselTitle.toLowerCase().replace(/\s+/g, '-')}_${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return {
      success: true,
      message: `Successfully exported ${slides.length} slides as ZIP`,
    };
  } catch (error) {
    console.error('Export failed:', error);
    return {
      success: false,
      message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Get blob from data URL for advanced processing
 */
export function getBlob(dataURL: string, mimeType: string = 'image/png'): Blob {
  if (dataURL.startsWith('data:')) {
    return dataURLtoBlob(dataURL);
  }

  // If it's a URL, fetch it
  return fetch(dataURL)
    .then(res => res.blob())
    .catch(() => {
      console.error(`Failed to fetch image from ${dataURL}`);
      return new Blob();
    });
}

/**
 * Generate download preview URL (for showing before download)
 */
export function generateDownloadPreviewURL(dataURL: string): string {
  try {
    const blob = dataURLtoBlob(dataURL);
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Failed to generate preview URL:', error);
    return dataURL;
  }
}

/**
 * Check if browser supports download
 */
export function isDownloadSupported(): boolean {
  const link = document.createElement('a');
  return typeof link.download !== 'undefined';
}

/**
 * Get total size of all slides in bytes
 */
export function getCarouselSize(slides: string[]): number {
  let totalSize = 0;

  for (const slide of slides) {
    const blob = dataURLtoBlob(slide);
    totalSize += blob.size;
  }

  return totalSize;
}

/**
 * Format bytes to readable size
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Create a carousel summary file
 */
export function createSummaryFile(
  title: string,
  slideCount: number,
  templateName?: string,
  niche?: string
): string {
  const summary = `
CAROUSEL SUMMARY
================

Title: ${title}
Slides: ${slideCount}
${templateName ? `Template: ${templateName}` : ''}
${niche ? `Niche: ${niche}` : ''}
Exported: ${new Date().toLocaleString()}

This folder contains all carousel slides as PNG images ready for upload to Instagram, TikTok, or other platforms.

Each slide is numbered in the order they should appear.
`;

  return summary;
}
