import { describe, expect, it } from 'vitest'
import { NEXORA_TEMPLATES } from '@/lib/nexora/templates'
import { welcomeTemplates } from '@/lib/nexora/welcome-templates'

describe('welcomeTemplates', () => {
  it('offers a few templates a newcomer can run in place, the everyday ones first', () => {
    const offered = welcomeTemplates()
    expect(offered.length).toBeGreaterThanOrEqual(3)
    expect(offered.length).toBeLessThanOrEqual(4)
    expect(offered[0]?.slug).toBe('devis')
    for (const template of offered) {
      expect(NEXORA_TEMPLATES).toContain(template)
    }
  })

  it('never offers a template that needs a file, an approval, a recording or an e-mail server', () => {
    for (const template of welcomeTemplates()) {
      expect(template.inputs.every((input) => (input.type ?? 'string') === 'string')).toBe(true)
      expect(template.steps.every((step) => step.kind === undefined)).toBe(true)
    }
    // the filter is real: the catalogue does hold templates that cannot be run in place
    expect(
      NEXORA_TEMPLATES.some((template) => template.steps.some((step) => step.kind !== undefined))
    ).toBe(true)
  })

  it('gives every offered template an example for each field, so it runs without typing', () => {
    for (const template of welcomeTemplates()) {
      expect(template.inputs.length).toBeGreaterThan(0)
      expect(template.inputs.every((input) => input.example.trim().length > 0)).toBe(true)
    }
  })
})
