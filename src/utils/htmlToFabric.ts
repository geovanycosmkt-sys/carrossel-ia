/**
 * HTML to Fabric.js Styles Converter
 * Convert HTML text from Gemini to Fabric.js per-character styles
 */

/**
 * HTML to Fabric.js styles conversion
 * Converts <b>, <i>, <br/>, <p> tags to Fabric.js per-character styles
 */
export function htmlToFabricStyles(html: string): {
  text: string;
  styles: Record<number, Record<string, any>>;
} {
  const styles: Record<number, Record<string, any>> = {};
  let charIndex = 0;

  // Parse HTML and build text with inline styles
  const div = document.createElement('div');
  div.innerHTML = html;

  processNode(div, styles, charIndex);

  // Extract plain text for reconstruction
  const plainText = extractPlainText(html);

  return {
    text: plainText,
    styles: styles,
  };
}

/**
 * Process DOM nodes recursively
 */
function processNode(
  node: Node,
  styles: Record<number, Record<string, any>>,
  charIndex: { value: number }
): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    charIndex.value += text.length;
  } else if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    const tag = element.tagName.toLowerCase();

    // Get style properties for this tag
    const styleProps = getStylePropsForTag(tag);

    // Process children
    let localCharIndex = charIndex.value;

    for (let child of element.childNodes) {
      const childTextLength = getTextLength(child);

      // Apply styles to character range
      if (styleProps) {
        for (let i = localCharIndex; i < localCharIndex + childTextLength; i++) {
          if (!styles[i]) {
            styles[i] = {};
          }
          Object.assign(styles[i], styleProps);
        }
      }

      processNode(child, styles, charIndex);
      localCharIndex += childTextLength;
    }

    // Handle line breaks
    if (tag === 'br') {
      charIndex.value++;
    } else if (tag === 'p') {
      charIndex.value++;
    }
  }
}

/**
 * Get Fabric.js style properties for HTML tag
 */
function getStylePropsForTag(tag: string): Record<string, any> | null {
  switch (tag.toLowerCase()) {
    case 'b':
    case 'strong':
      return { fontWeight: 'bold' };

    case 'i':
    case 'em':
      return { fontStyle: 'italic' };

    case 'u':
      return { underline: true };

    case 'code':
    case 'pre':
      return {
        fontFamily: 'monospace',
        fontSize: 0.9, // relative to parent
      };

    case 'h1':
      return { fontSize: 2, fontWeight: 'bold' };

    case 'h2':
      return { fontSize: 1.5, fontWeight: 'bold' };

    case 'h3':
      return { fontSize: 1.2, fontWeight: 'bold' };

    default:
      return null;
  }
}

/**
 * Get text length of node (for positioning)
 */
function getTextLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent || '').length;
  }

  let length = 0;
  for (let child of node.childNodes) {
    length += getTextLength(child);
  }

  // Add line break for block elements
  if (node.nodeType === Node.ELEMENT_NODE) {
    const tag = (node as Element).tagName.toLowerCase();
    if (['p', 'div', 'br'].includes(tag)) {
      length++;
    }
  }

  return length;
}

/**
 * Extract plain text from HTML (strip all tags)
 */
export function extractPlainText(html: string): string {
  // Convert HTML entities
  let text = html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Create temporary DOM
  const div = document.createElement('div');
  div.innerHTML = text;

  // Extract text
  text = div.textContent || div.innerText || '';

  // Clean up whitespace
  text = text
    .replace(/\n+/g, '\n') // Multiple newlines to single
    .trim();

  return text;
}

/**
 * Apply auto-fit to text
 * Reduce font size until text fits dimensions
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
  const minSize = 8;
  const fontFamily = 'Arial, sans-serif';

  // Binary search for best fit
  while (currentSize >= minSize && !fitted) {
    ctx.font = `${currentSize}px ${fontFamily}`;

    // Measure text
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = currentSize * 1.4; // Line height multiplier

    // Count lines for multi-line text
    const lines = text.split('\n').length;
    const totalHeight = textHeight * lines;

    if (textWidth <= maxWidth && totalHeight <= maxHeight) {
      fitted = true;
    } else if (!fitted) {
      currentSize -= 1;
    }
  }

  return {
    text,
    fontSize: Math.max(currentSize, minSize),
  };
}

/**
 * Apply multiple style rules to text
 */
export function applyStyleRules(
  text: string,
  rules: Array<{
    pattern: RegExp;
    style: Record<string, any>;
  }>
): Record<number, Record<string, any>> {
  const styles: Record<number, Record<string, any>> = {};

  rules.forEach(rule => {
    let match;
    while ((match = rule.pattern.exec(text)) !== null) {
      for (let i = match.index; i < match.index + match[0].length; i++) {
        if (!styles[i]) {
          styles[i] = {};
        }
        Object.assign(styles[i], rule.style);
      }
    }
  });

  return styles;
}

/**
 * Convert markdown-style formatting to Fabric styles
 */
export function markdownToFabricStyles(markdown: string): {
  text: string;
  styles: Record<number, Record<string, any>>;
} {
  let text = markdown;
  const styles: Record<number, Record<string, any>> = {};

  // Convert markdown to Fabric styles
  const rules: Array<{
    pattern: RegExp;
    style: Record<string, any>;
  }> = [
    {
      pattern: /\*\*(.+?)\*\*/g,
      style: { fontWeight: 'bold' },
    },
    {
      pattern: /\*(.+?)\*/g,
      style: { fontStyle: 'italic' },
    },
    {
      pattern: /__(.+?)__/g,
      style: { underline: true },
    },
    {
      pattern: /`(.+?)`/g,
      style: { fontFamily: 'monospace', fontSize: 0.9 },
    },
  ];

  // Apply rules and remove markdown syntax
  const styleRules = applyStyleRules(text, rules);
  Object.assign(styles, styleRules);

  // Remove markdown syntax
  text = text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`(.+?)`/g, '$1');

  return { text, styles };
}

/**
 * Sanitize HTML to safe subset
 */
export function sanitizeHtml(html: string): string {
  const allowedTags = ['b', 'strong', 'i', 'em', 'u', 'br', 'p', 'h1', 'h2', 'h3', 'code', 'pre'];
  const div = document.createElement('div');
  div.innerHTML = html;

  const sanitize = (node: Node): Node => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.cloneNode();
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tag = element.tagName.toLowerCase();

      if (!allowedTags.includes(tag)) {
        // Replace with text content
        const textNode = document.createTextNode(element.textContent || '');
        return textNode;
      }

      const clone = element.cloneNode(false) as Element;
      for (let child of element.childNodes) {
        clone.appendChild(sanitize(child));
      }

      return clone;
    }

    return node.cloneNode();
  };

  const cleaned = document.createElement('div');
  for (let child of div.childNodes) {
    cleaned.appendChild(sanitize(child));
  }

  return cleaned.innerHTML;
}

/**
 * Convert line breaks and preserve formatting
 */
export function preserveLineBreaks(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n/g, '<br/>')
    .replace(/  /g, '&nbsp;&nbsp;');
}

/**
 * Build Fabric text object from HTML
 */
export function buildFabricTextObject(
  html: string,
  options?: {
    left?: number;
    top?: number;
    width?: number;
    height?: number;
    fontSize?: number;
    fontFamily?: string;
    fill?: string;
  }
): {
  text: string;
  styles: Record<number, Record<string, any>>;
  width: number;
  height: number;
  fontSize: number;
} {
  const { text, styles } = htmlToFabricStyles(html);

  const width = options?.width || 300;
  const height = options?.height || 200;
  const fontSize = options?.fontSize || 16;

  // Apply autofit if needed
  const fitted = applyAutofit(text, fontSize, width, height);

  return {
    text: fitted.text,
    styles,
    width,
    height,
    fontSize: fitted.fontSize,
  };
}
