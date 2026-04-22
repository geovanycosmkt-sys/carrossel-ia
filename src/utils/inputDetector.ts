/**
 * Input Detector Utility
 * Detect input type and validate URLs
 */

export type InputType = 'url' | 'text' | 'script';

/**
 * Detect input type
 */
export function detectInputType(input: string): InputType {
  if (!input || input.trim().length === 0) {
    return 'text';
  }

  // Check if it looks like a URL
  if (isUrl(input)) {
    return 'url';
  }

  // Check if it looks like a script or code
  if (isScript(input)) {
    return 'script';
  }

  // Default to text
  return 'text';
}

/**
 * Check if input is a valid URL
 */
export function isUrl(input: string): boolean {
  try {
    new URL(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if input is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  const youtubeRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

  return youtubeRegex.test(url);
}

/**
 * Extract YouTube video ID
 */
export function extractYouTubeVideoId(url: string): string | null {
  const youtubeRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

  const match = url.match(youtubeRegex);
  return match ? match[1] : null;
}

/**
 * Check if input is an Instagram URL
 */
export function isInstagramUrl(url: string): boolean {
  const instagramRegex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/;

  return instagramRegex.test(url);
}

/**
 * Extract Instagram username/handle
 */
export function extractInstagramHandle(url: string): string | null {
  const instagramRegex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/;

  const match = url.match(instagramRegex);
  return match ? match[1] : null;
}

/**
 * Check if input is a TikTok URL
 */
export function isTikTokUrl(url: string): boolean {
  const tiktokRegex = /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com|vt\.tiktok\.com)\/([a-zA-Z0-9]+)/;

  return tiktokRegex.test(url);
}

/**
 * Extract TikTok video ID
 */
export function extractTikTokVideoId(url: string): string | null {
  const tiktokRegex = /(?:https?:\/\/)?(?:www\.)?(?:tiktok\.com|vt\.tiktok\.com)\/(?:v\/)?([a-zA-Z0-9]+)/;

  const match = url.match(tiktokRegex);
  return match ? match[1] : null;
}

/**
 * Check if input is a generic social media URL
 */
export function isSocialMediaUrl(url: string): boolean {
  const socialRegex =
    /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com|facebook\.com|twitter\.com|x\.com|tiktok\.com|youtube\.com|linkedin\.com|pinterest\.com)/;

  return socialRegex.test(url);
}

/**
 * Get social media platform from URL
 */
export function getSocialMediaPlatform(
  url: string
): 'instagram' | 'facebook' | 'twitter' | 'tiktok' | 'youtube' | 'linkedin' | 'pinterest' | null {
  if (isInstagramUrl(url)) return 'instagram';
  if (/facebook\.com/.test(url)) return 'facebook';
  if (/(?:twitter\.com|x\.com)/.test(url)) return 'twitter';
  if (isTikTokUrl(url)) return 'tiktok';
  if (isYouTubeUrl(url)) return 'youtube';
  if (/linkedin\.com/.test(url)) return 'linkedin';
  if (/pinterest\.com/.test(url)) return 'pinterest';

  return null;
}

/**
 * Check if input contains code/script
 */
function isScript(input: string): boolean {
  const codePatterns = [
    /^\s*<[!?]?(html|body|div|script|style)/i, // HTML
    /^\s*(function|class|const|let|var)\s+\w+/i, // JavaScript
    /^\s*(def|import|class|if|for|while)\s+/i, // Python
    /^\s*(public|private|protected|class|interface)\s+/i, // Java/C#
    /^\s*\/\//i, // Comment
    /^\s*#/i, // Shebang or comment
    /\{.*?\}/i, // Likely JSON or code
  ];

  return codePatterns.some(pattern => pattern.test(input));
}

/**
 * Check if input is JSON
 */
export function isJson(input: string): boolean {
  try {
    JSON.parse(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if input looks like a tweet/social media post
 */
export function isSocialMediaPost(input: string): boolean {
  const indicators = [
    /@\w+/g, // Mentions
    /#\w+/g, // Hashtags
  ];

  let indicatorCount = 0;

  for (const indicator of indicators) {
    const matches = input.match(indicator);
    indicatorCount += matches ? matches.length : 0;
  }

  // If has 2+ social indicators and is short, likely a social post
  return indicatorCount >= 2 && input.length < 500;
}

/**
 * Check if input is a brief/outline
 */
export function isBrief(input: string): boolean {
  // Multiple bullet points or short lines
  const lines = input.split('\n');
  const bulletPoints = lines.filter(line => /^[•\-*]\s/.test(line.trim())).length;
  const shortLines = lines.filter(line => line.trim().length < 80).length;

  return (bulletPoints >= 3 || shortLines >= 5) && input.length < 2000;
}

/**
 * Check if input is a full script/article
 */
export function isFullScript(input: string): boolean {
  return input.length > 500 && !isBrief(input);
}

/**
 * Classify input comprehensively
 */
export function classifyInput(input: string): {
  type: InputType;
  isUrl: boolean;
  isSocialUrl: boolean;
  socialPlatform?: string;
  isPost: boolean;
  isBrief: boolean;
  isScript: boolean;
  isJson: boolean;
} {
  return {
    type: detectInputType(input),
    isUrl: isUrl(input),
    isSocialUrl: isSocialMediaUrl(input),
    socialPlatform: getSocialMediaPlatform(input) || undefined,
    isPost: isSocialMediaPost(input),
    isBrief: isBrief(input),
    isScript: isScript(input),
    isJson: isJson(input),
  };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): { valid: boolean; error?: string } {
  if (!url) {
    return { valid: false, error: 'URL cannot be empty' };
  }

  try {
    const urlObj = new URL(url);

    // Check for valid protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'URL must use http or https protocol' };
    }

    // Check for valid hostname
    if (!urlObj.hostname) {
      return { valid: false, error: 'URL must have a valid hostname' };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Normalize URL
 */
export function normalizeUrl(url: string): string {
  // Add protocol if missing
  if (!/^https?:\/\//.test(url)) {
    return `https://${url}`;
  }

  return url;
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return null;
  }
}

/**
 * Check if URL is from specific domain
 */
export function isFromDomain(url: string, domain: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === domain || urlObj.hostname?.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}
