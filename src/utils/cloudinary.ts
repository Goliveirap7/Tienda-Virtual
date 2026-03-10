/**
 * Adds f_auto,q_auto to any Cloudinary image URL.
 * f_auto → best format per browser (WebP, AVIF, etc.)
 * q_auto → optimal quality with smallest file size
 */
export function optimizeCloudinaryUrl(url: string | null | undefined): string {
  if (!url || !url.includes('cloudinary.com')) return url ?? ''
  // Insert transformation params after /upload/
  return url.replace('/upload/', '/upload/f_auto,q_auto/')
}
