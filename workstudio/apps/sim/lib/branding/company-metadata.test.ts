import { describe, expect, it } from 'vitest'
import { generateBrandedMetadata } from '@/ee/whitelabeling'

describe('generateBrandedMetadata', () => {
  it('names the product after the brand and the company Nexora AI as author and publisher', () => {
    const metadata = generateBrandedMetadata()
    expect(metadata.applicationName).toBe('Nexora WorkStudio')
    expect(metadata.creator).toBe('Nexora AI')
    expect(metadata.publisher).toBe('Nexora AI')
    expect(metadata.authors).toEqual([{ name: 'Nexora AI' }])
  })
})
