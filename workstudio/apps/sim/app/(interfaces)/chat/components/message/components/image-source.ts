const INLINE_IMAGE = /^data:image\/[a-z0-9.+-]+[;,]/i

/**
 * How an image in a model's answer is shown: `embed` for an image of `origin` or an inline
 * `data:image`, `link` for any other web address (displaying it would send the reader's request,
 * and whatever the model wrote into the address, to a third party), `text` for the rest.
 */
export function imageSourcePolicy(src: string, origin: string): 'embed' | 'link' | 'text' {
  const source = src.trim()
  if (!source) return 'text'
  if (INLINE_IMAGE.test(source)) return 'embed'
  let url: URL
  try {
    url = new URL(source, origin)
  } catch {
    return 'text'
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'text'
  return url.origin === origin ? 'embed' : 'link'
}
