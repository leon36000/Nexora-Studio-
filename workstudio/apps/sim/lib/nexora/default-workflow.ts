import type { Locale } from '@/lib/i18n/config'

const STARTER_WORKFLOW: Record<Locale, { name: string; description: string }> = {
  fr: {
    name: 'Agent par défaut',
    description: 'Votre premier workflow : commencez à construire ici !',
  },
  /** The original strings of Sim. */
  en: {
    name: 'default-agent',
    description: 'Your first workflow - start building here!',
  },
}

/**
 * Nexora edition: the name and description of the workflow every new workspace starts with, in
 * the language of the request that creates the workspace (French by default).
 */
export function starterWorkflowCopy(locale: Locale) {
  return STARTER_WORKFLOW[locale]
}
