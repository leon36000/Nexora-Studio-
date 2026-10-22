import type { AbstractIntlMessages } from 'next-intl'
import type { Locale } from '@/lib/i18n/config'
import enAuth from '@/messages/en/auth.json'
import enCommon from '@/messages/en/common.json'
import enEditor from '@/messages/en/editor.json'
import enErrors from '@/messages/en/errors.json'
import enFiles from '@/messages/en/files.json'
import enGovernance from '@/messages/en/governance.json'
import enHome from '@/messages/en/home.json'
import enIntegrations from '@/messages/en/integrations.json'
import enKnowledge from '@/messages/en/knowledge.json'
import enLogs from '@/messages/en/logs.json'
import enSettings from '@/messages/en/settings.json'
import enShell from '@/messages/en/shell.json'
import enTables from '@/messages/en/tables.json'
import frAuth from '@/messages/fr/auth.json'
import frCommon from '@/messages/fr/common.json'
import frEditor from '@/messages/fr/editor.json'
import frErrors from '@/messages/fr/errors.json'
import frFiles from '@/messages/fr/files.json'
import frGovernance from '@/messages/fr/governance.json'
import frHome from '@/messages/fr/home.json'
import frIntegrations from '@/messages/fr/integrations.json'
import frKnowledge from '@/messages/fr/knowledge.json'
import frLogs from '@/messages/fr/logs.json'
import frSettings from '@/messages/fr/settings.json'
import frShell from '@/messages/fr/shell.json'
import frTables from '@/messages/fr/tables.json'

/** Message namespaces, one JSON file per interface area under `messages/<locale>/`. */
export const MESSAGE_NAMESPACES = [
  'common',
  'auth',
  'shell',
  'home',
  'editor',
  'logs',
  'settings',
  'integrations',
  'tables',
  'files',
  'knowledge',
  'errors',
  'governance',
] as const

/** Every message of every namespace, per locale. */
export const MESSAGES: Record<Locale, AbstractIntlMessages> = {
  fr: {
    common: frCommon,
    auth: frAuth,
    shell: frShell,
    home: frHome,
    editor: frEditor,
    logs: frLogs,
    settings: frSettings,
    integrations: frIntegrations,
    tables: frTables,
    files: frFiles,
    knowledge: frKnowledge,
    errors: frErrors,
    governance: frGovernance,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    shell: enShell,
    home: enHome,
    editor: enEditor,
    logs: enLogs,
    settings: enSettings,
    integrations: enIntegrations,
    tables: enTables,
    files: enFiles,
    knowledge: enKnowledge,
    errors: enErrors,
    governance: enGovernance,
  },
}

function mergeMessages(
  base: AbstractIntlMessages,
  override: AbstractIntlMessages
): AbstractIntlMessages {
  const merged: AbstractIntlMessages = { ...base }
  for (const [key, value] of Object.entries(override)) {
    const current = merged[key]
    merged[key] =
      typeof value === 'object' && value !== null && typeof current === 'object' && current !== null
        ? mergeMessages(current, value)
        : value
  }
  return merged
}

/** Messages for a locale, with English filling any key a translation lacks. */
export function getLocaleMessages(locale: Locale): AbstractIntlMessages {
  return locale === 'en' ? MESSAGES.en : mergeMessages(MESSAGES.en, MESSAGES[locale])
}
