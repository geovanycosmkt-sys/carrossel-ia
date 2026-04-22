/**
 * XSS Protection Utility
 * Sanitize HTML and text inputs to prevent XSS attacks
 */

/**
 * Allowed HTML tags for sanitization
 */
const ALLOWED_TAGS = [
  'b',
  'strong',
  'i',
  'em',
  'u',
  'br',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'a',
  'code',
  'pre',
  'span',
  'div',
];

/**
 * Allowed attributes per tag
 */
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'title', 'target'],
  span: ['style', 'class'],
  div: ['style', 'class'],
};

/**
 * Sanitize HTML string to prevent XSS
 * Uses DOMPurify if available, falls back to manual sanitization
 */
export function sanitizeHtml(html: string): string {
  // Try to use DOMPurify if available
  if (typeof window !== 'undefined' && (window as any).DOMPurify) {
    return (window as any).DOMPurify.sanitize(html);
  }

  // Fallback: manual sanitization
  return manualSanitizeHtml(html);
}

/**
 * Manual HTML sanitization (fallback if DOMPurify not available)
 */
function manualSanitizeHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;

  const sanitize = (node: Node): Node => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.cloneNode();
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tag = element.tagName.toLowerCase();

      // Only allow specific tags
      if (!ALLOWED_TAGS.includes(tag)) {
        // Replace with text content
        const textNode = document.createTextNode(element.textContent || '');
        return textNode;
      }

      const clone = element.cloneNode(false) as Element;

      // Only allow specific attributes
      const allowedAttrs = ALLOWED_ATTRIBUTES[tag] || [];
      for (const attr of element.attributes) {
        if (allowedAttrs.includes(attr.name)) {
          // Sanitize href to prevent javascript: URLs
          if (attr.name === 'href' && !attr.value.startsWith('javascript:')) {
            clone.setAttribute(attr.name, attr.value);
          } else if (attr.name !== 'href') {
            clone.setAttribute(attr.name, attr.value);
          }
        }
      }

      // Sanitize children
      for (const child of element.childNodes) {
        clone.appendChild(sanitize(child));
      }

      return clone;
    }

    return node.cloneNode();
  };

  const sanitized = document.createElement('div');
  for (const child of div.childNodes) {
    sanitized.appendChild(sanitize(child));
  }

  return sanitized.innerHTML;
}

/**
 * Strip all HTML tags from text
 */
export function sanitizeText(text: string): string {
  const div = document.createElement('div');
  div.innerHTML = text;

  return div.textContent || div.innerText || '';
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'\/]/g, char => map[char]);
}

/**
 * Unescape HTML entities
 */
export function unescapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x2F;': '/',
  };

  let result = text;
  for (const [entity, char] of Object.entries(map)) {
    result = result.replace(new RegExp(entity, 'g'), char);
  }

  return result;
}

/**
 * Remove dangerous protocols from URLs (javascript:, data:, etc.)
 */
export function sanitizeUrl(url: string): string | null {
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];

  const lowerUrl = url.toLowerCase().trim();

  for (const protocol of dangerousProtocols) {
    if (lowerUrl.startsWith(protocol)) {
      return null;
    }
  }

  return url;
}

/**
 * Sanitize user input for safe usage
 */
export function sanitizeUserInput(input: string): string {
  // Remove potential script tags and dangerous content
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*[\"'][^\"']*[\"']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    .trim();
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  return email
    .toLowerCase()
    .trim()
    .replace(/[<>\"']/g, '');
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:\"\/\\|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .trim();
}

/**
 * Remove non-alphanumeric characters (keep spaces and hyphens)
 */
export function sanitizeAlphanumeric(text: string): string {
  return text.replace(/[^a-zA-Z0-9\s-]/g, '').trim();
}

/**
 * Remove extra whitespace
 */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sanitize JSON string
 */
export function sanitizeJsonString(jsonString: string): string {
  try {
    const parsed = JSON.parse(jsonString);
    return JSON.stringify(parsed);
  } catch {
    return '{}';
  }
}

/**
 * Create safe innerHTML from potentially dangerous HTML
 */
export function setSafeInnerHTML(
  element: HTMLElement,
  html: string
): void {
  const sanitized = sanitizeHtml(html);
  element.innerHTML = sanitized;
}

/**
 * Check if string contains potential XSS
 */
export function containsXSS(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /on\w+\s*=\s*[\"'][^\"']*[\"']/gi,
    /javascript:/gi,
    /data:text\/html/gi,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize CSS to prevent injection
 */
export function sanitizeCss(css: string): string {
  // Remove @import, @media queries with javascript
  return css
    .replace(/@import\s+[^;]+;/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/expression\s*\(/gi, '');
}

/**
 * Comprehensive content sanitization
 */
export function sanitizeContent(
  content: string,
  type: 'text' | 'html' | 'email' | 'filename' = 'html'
): string {
  switch (type) {
    case 'text':
      return sanitizeText(sanitizeUserInput(content));

    case 'html':
      return sanitizeHtml(content);

    case 'email':
      return sanitizeEmail(content);

    case 'filename':
      return sanitizeFilename(content);

    default:
      return sanitizeUserInput(content).trim();
  }
}
