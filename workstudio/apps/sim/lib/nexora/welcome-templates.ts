import { NEXORA_TEMPLATES, type NexoraTemplate } from '@/lib/nexora/templates'

/** The everyday templates a newcomer meets first, in this order. */
const PREFERRED_SLUGS = ['devis', 'relance-facture', 'compte-rendu', 'offre-emploi'] as const

/** A template can be run in place when it takes text only and every step is an Agent step. */
function runsInPlace(template: NexoraTemplate): boolean {
  return (
    template.inputs.length > 0 &&
    template.inputs.every(
      (input) => (input.type ?? 'string') === 'string' && input.example.trim()
    ) &&
    template.steps.every((step) => step.kind === undefined)
  )
}

/**
 * Nexora edition, first launch: the few templates offered on the welcome panel. Each one runs
 * with its example values and a single click, so the first result comes without typing, a file,
 * an approval or a mail server.
 */
export function welcomeTemplates(): NexoraTemplate[] {
  return PREFERRED_SLUGS.flatMap((slug) => {
    const template = NEXORA_TEMPLATES.find((candidate) => candidate.slug === slug)
    return template && runsInPlace(template) ? [template] : []
  })
}
