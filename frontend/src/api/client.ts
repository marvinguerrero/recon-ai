/**
 * Shared API URL resolver.
 *
 * - Dev:  VITE_API_BASE_URL is unset → returns a bare path like "/api/upload"
 *         which Vite's dev-server proxy forwards to http://localhost:5000.
 *
 * - Prod: VITE_API_BASE_URL is set to the hosted backend origin
 *         (e.g. https://your-backend.onrender.com) → returns the full URL
 *         so the browser can reach the backend directly across origins.
 *
 * Usage:  apiUrl('/api/upload')  →  '/api/upload' | 'https://host/api/upload'
 */
export function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_BASE_URL
  if (typeof base === 'string' && base.length > 0) {
    return `${base.replace(/\/$/, '')}${path}`
  }
  return path
}
