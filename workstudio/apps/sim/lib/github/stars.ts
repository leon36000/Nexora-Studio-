/** Static count shown on the marketing pages; never fetched from GitHub (no third-party call). */
const FALLBACK_STAR_COUNT = 28900

/**
 * Formats a raw star count for display (e.g. 28900 → "28.9k").
 */
export function formatStarCount(num: number): string {
  if (num < 1000) return String(num)
  const formatted = (Math.round(num / 100) / 10).toFixed(1)
  return formatted.endsWith('.0') ? `${formatted.slice(0, -2)}k` : `${formatted}k`
}

/**
 * The project's GitHub star count, formatted for display.
 *
 * Nexora edition: an instance makes no third-party call by default (no request to GitHub from
 * the server), so this returns the static floor.
 */
export async function getGitHubStars(): Promise<string> {
  return formatStarCount(FALLBACK_STAR_COUNT)
}
