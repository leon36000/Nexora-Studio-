import { omit } from '@sim/utils/object'
import type { AbstractIntlMessages } from 'next-intl'
import type { Locale } from '@/lib/i18n/config'
import enAgents from '@/messages/en/agents.json'
import enAssistant from '@/messages/en/assistant.json'
import enAuth from '@/messages/en/auth.json'
import enBlocks from '@/messages/en/blocks.json'
import enCommon from '@/messages/en/common.json'
import enConnectors from '@/messages/en/connectors.json'
import enCopilot from '@/messages/en/copilot.json'
import enDevelopers from '@/messages/en/developers.json'
import enEditor from '@/messages/en/editor.json'
import enEmails from '@/messages/en/emails.json'
import enErrors from '@/messages/en/errors.json'
import enEvaluations from '@/messages/en/evaluations.json'
import enFiles from '@/messages/en/files.json'
import enGovernance from '@/messages/en/governance.json'
import enHome from '@/messages/en/home.json'
import enIntegrations from '@/messages/en/integrations.json'
import enInterfaces from '@/messages/en/interfaces.json'
import enKnowledge from '@/messages/en/knowledge.json'
import enLogs from '@/messages/en/logs.json'
import enSettings from '@/messages/en/settings.json'
import enShell from '@/messages/en/shell.json'
import enTables from '@/messages/en/tables.json'
import enTraces from '@/messages/en/traces.json'
import frAgents from '@/messages/fr/agents.json'
import frAssistant from '@/messages/fr/assistant.json'
import frAuth from '@/messages/fr/auth.json'
import frBlocks from '@/messages/fr/blocks.json'
import frCommon from '@/messages/fr/common.json'
import frConnectors from '@/messages/fr/connectors.json'
import frCopilot from '@/messages/fr/copilot.json'
import frDevelopers from '@/messages/fr/developers.json'
import frEditor from '@/messages/fr/editor.json'
import frEmails from '@/messages/fr/emails.json'
import frErrors from '@/messages/fr/errors.json'
import frEvaluations from '@/messages/fr/evaluations.json'
import frFiles from '@/messages/fr/files.json'
import frGovernance from '@/messages/fr/governance.json'
import frHome from '@/messages/fr/home.json'
import frIntegrations from '@/messages/fr/integrations.json'
import frInterfaces from '@/messages/fr/interfaces.json'
import frKnowledge from '@/messages/fr/knowledge.json'
import frLogs from '@/messages/fr/logs.json'
import frSettings from '@/messages/fr/settings.json'
import frShell from '@/messages/fr/shell.json'
import frTables from '@/messages/fr/tables.json'
import frTraces from '@/messages/fr/traces.json'

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
  'interfaces',
  'emails',
  'blocks',
  'agents',
  'connectors',
  'assistant',
  'copilot',
  'developers',
  'traces',
  'evaluations',
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
    interfaces: frInterfaces,
    emails: frEmails,
    blocks: frBlocks,
    agents: frAgents,
    connectors: frConnectors,
    assistant: frAssistant,
    copilot: frCopilot,
    developers: frDevelopers,
    traces: frTraces,
    evaluations: frEvaluations,
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
    interfaces: enInterfaces,
    emails: enEmails,
    blocks: enBlocks,
    agents: enAgents,
    connectors: enConnectors,
    assistant: enAssistant,
    copilot: enCopilot,
    developers: enDevelopers,
    traces: enTraces,
    evaluations: enEvaluations,
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

/**
 * Namespaces only the workspace reads in the browser (the block catalog: canvas, editor, previews).
 * The root layout leaves them out, so public pages (chat, sign-in, invitations) do not download
 * them; `app/workspace/layout.tsx` provides every namespace again.
 */
export const WORKSPACE_ONLY_NAMESPACES = ['blocks'] as const

/** The messages the root layout sends to every page: all but {@link WORKSPACE_ONLY_NAMESPACES}. */
export function pageMessages(messages: AbstractIntlMessages): AbstractIntlMessages {
  return omit(messages, [...WORKSPACE_ONLY_NAMESPACES])
}
