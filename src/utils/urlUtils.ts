/**
 * URL normalization utilities
 */

/**
 * Normalizes a URL by ensuring it has a proper scheme
 * @param url - The URL to normalize
 * @returns Normalized URL with proper scheme
 */
export function normalizeUrl(url: string): string {
  if (!url) return '';
  
  // If URL already has a scheme, return as-is
  if (url.match(/^https?:\/\//i)) {
    return url;
  }
  
  // Add https:// if no scheme is present
  return `https://${url}`;
}

/**
 * Validates if a URL is well-formed
 * @param url - The URL to validate
 * @returns True if valid, false otherwise
 */
export function isValidUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    new URL(normalizeUrl(url));
    return true;
  } catch {
    return false;
  }
}