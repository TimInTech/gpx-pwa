/**
 * Safely constructs URLs with proper error handling
 * @param path - The URL path to construct
 * @param base - Optional base URL (defaults to window.location.origin)
 * @returns URL object
 * @throws Error if URL construction fails
 */
export function safeUrl(path: string, base?: string): URL {
  const baseUrl = base || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")

  if (!path) {
    throw new Error("URL path is empty or undefined")
  }

  try {
    return new URL(path, baseUrl)
  } catch (e) {
    console.error("Invalid URL:", path, "Base:", baseUrl, e)
    throw e
  }
}

/**
 * Safely constructs URLs with fallback handling
 * @param path - The URL path to construct
 * @param base - Optional base URL
 * @param fallback - Fallback URL if construction fails
 * @returns URL object or fallback
 */
export function safeUrlWithFallback(path: string, base?: string, fallback?: string): URL | null {
  try {
    return safeUrl(path, base)
  } catch (e) {
    if (fallback) {
      try {
        return safeUrl(fallback, base)
      } catch (fallbackError) {
        console.error("Fallback URL also failed:", fallback, fallbackError)
        return null
      }
    }
    return null
  }
}
