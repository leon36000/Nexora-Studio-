import { perceivedBrightness } from '@sim/utils/color'

/**
 * True when `color` is light enough that a white foreground would wash out.
 * Non-color values (gradients, `currentColor`, unknown) are treated as not
 * light. `threshold` is the perceived-brightness cutoff (default 0.6, tuned so
 * only clearly light tiles flip to a dark foreground).
 */
export function isLightColor(color: string, threshold = 0.6): boolean {
  const brightness = perceivedBrightness(color)
  return brightness !== null && brightness > threshold
}
