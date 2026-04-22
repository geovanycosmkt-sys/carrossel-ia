/**
 * Logger Utility
 * Conditional logging - dev mode only except for errors
 */

/**
 * Check if we're in development mode
 */
function isDev(): boolean {
  return import.meta.env.DEV;
}

/**
 * Check if logging is enabled
 */
function isLoggingEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check for localStorage flag
  try {
    return localStorage.getItem('DEBUG') === 'true' || isDev();
  } catch {
    return isDev();
  }
}

/**
 * Format log message with timestamp
 */
function formatMessage(label: string, args: any[]): void {
  const timestamp = new Date().toISOString();
  const formattedArgs = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
  );

  console.log(`[${timestamp}] ${label}:`, ...formattedArgs);
}

/**
 * Format error message with stack
 */
function formatError(label: string, error: any): void {
  const timestamp = new Date().toISOString();

  if (error instanceof Error) {
    console.error(`[${timestamp}] ${label}:`, error.message);
    if (error.stack && isDev()) {
      console.error(error.stack);
    }
  } else {
    console.error(`[${timestamp}] ${label}:`, error);
  }
}

/**
 * Log message (dev mode only)
 */
export function log(...args: any[]): void {
  if (!isLoggingEnabled()) {
    return;
  }

  formatMessage('LOG', args);
}

/**
 * Log warning (dev mode only)
 */
export function warn(...args: any[]): void {
  if (!isLoggingEnabled()) {
    return;
  }

  const timestamp = new Date().toISOString();
  const formattedArgs = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
  );

  console.warn(`[${timestamp}] WARN:`, ...formattedArgs);
}

/**
 * Log error (always logged)
 */
export function error(...args: any[]): void {
  const timestamp = new Date().toISOString();

  // Handle Error objects
  if (args.length === 1 && args[0] instanceof Error) {
    formatError('ERROR', args[0]);
  } else {
    const formattedArgs = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
    );

    console.error(`[${timestamp}] ERROR:`, ...formattedArgs);
  }
}

/**
 * Log info message (dev mode only)
 */
export function info(...args: any[]): void {
  if (!isLoggingEnabled()) {
    return;
  }

  formatMessage('INFO', args);
}

/**
 * Log debug message (dev mode only)
 */
export function debug(...args: any[]): void {
  if (!isLoggingEnabled()) {
    return;
  }

  formatMessage('DEBUG', args);
}

/**
 * Log success message (dev mode only)
 */
export function success(...args: any[]): void {
  if (!isLoggingEnabled()) {
    return;
  }

  const timestamp = new Date().toISOString();
  const formattedArgs = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg
  );

  // Use console.log with success styling for browsers that support it
  console.log(`%c[${timestamp}] SUCCESS:`, 'color: green; font-weight: bold;', ...formattedArgs);
}

/**
 * Log group start (dev mode only)
 */
export function groupStart(label: string): void {
  if (!isLoggingEnabled()) {
    return;
  }

  console.group(`[${new Date().toISOString()}] ${label}`);
}

/**
 * Log group end (dev mode only)
 */
export function groupEnd(): void {
  if (!isLoggingEnabled()) {
    return;
  }

  console.groupEnd();
}

/**
 * Log table (dev mode only)
 */
export function table(data: any): void {
  if (!isLoggingEnabled()) {
    return;
  }

  console.table(data);
}

/**
 * Measure performance (dev mode only)
 */
export function time(label: string): void {
  if (!isLoggingEnabled()) {
    return;
  }

  console.time(label);
}

/**
 * End performance measurement (dev mode only)
 */
export function timeEnd(label: string): void {
  if (!isLoggingEnabled()) {
    return;
  }

  console.timeEnd(label);
}

/**
 * Assert condition (dev mode only)
 */
export function assert(condition: boolean, message?: string): void {
  if (!isLoggingEnabled()) {
    return;
  }

  if (!condition) {
    console.assert(condition, message || 'Assertion failed');
  }
}

/**
 * Enable debug logging
 */
export function enableDebug(): void {
  try {
    localStorage.setItem('DEBUG', 'true');
  } catch {
    // Silently fail if localStorage not available
  }
}

/**
 * Disable debug logging
 */
export function disableDebug(): void {
  try {
    localStorage.removeItem('DEBUG');
  } catch {
    // Silently fail if localStorage not available
  }
}

/**
 * Get logging status
 */
export function getLoggingStatus(): { enabled: boolean; isDev: boolean } {
  return {
    enabled: isLoggingEnabled(),
    isDev: isDev(),
  };
}

/**
 * Create a namespaced logger
 */
export function createLogger(namespace: string) {
  return {
    log: (...args: any[]) => log(`${namespace}`, ...args),
    warn: (...args: any[]) => warn(`${namespace}`, ...args),
    error: (...args: any[]) => error(`${namespace}`, ...args),
    info: (...args: any[]) => info(`${namespace}`, ...args),
    debug: (...args: any[]) => debug(`${namespace}`, ...args),
    success: (...args: any[]) => success(`${namespace}`, ...args),
  };
}

/**
 * Log API request
 */
export function logApiRequest(
  method: string,
  url: string,
  data?: any,
  headers?: Record<string, string>
): void {
  if (!isLoggingEnabled()) {
    return;
  }

  groupStart(`API Request: ${method} ${url}`);
  if (data) {
    info('Body:', data);
  }
  if (headers) {
    info('Headers:', headers);
  }
  groupEnd();
}

/**
 * Log API response
 */
export function logApiResponse(
  method: string,
  url: string,
  status: number,
  data?: any,
  duration?: number
): void {
  if (!isLoggingEnabled()) {
    return;
  }

  const label = status >= 400 ? 'API Error' : 'API Response';
  groupStart(`${label}: ${method} ${url} (${status})`);

  if (duration) {
    info(`Duration: ${duration}ms`);
  }

  if (data) {
    info('Response:', data);
  }

  groupEnd();
}

/**
 * Log API error
 */
export function logApiError(
  method: string,
  url: string,
  error: any,
  status?: number
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (status) {
    error(`API Error: ${method} ${url} (${status}) - ${errorMessage}`);
  } else {
    error(`API Error: ${method} ${url} - ${errorMessage}`);
  }

  if (error instanceof Error && isDev()) {
    debug('Error stack:', error.stack);
  }
}
