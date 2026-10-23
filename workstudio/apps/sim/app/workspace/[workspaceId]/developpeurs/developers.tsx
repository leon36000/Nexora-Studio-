'use client'

import { useState } from 'react'
import { ChipCopyInput, ChipDropdown, ChipLink } from '@sim/emcn'
import { KeySquare, SquareArrowUpRight } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { getBaseUrl } from '@/lib/core/utils/urls'
import { developerBaseUrl } from '@/lib/nexora/developer-api/snippets'
import { DEFAULT_MODEL_ALIAS } from '@/lib/nexora/model-ids'
import { CodeSamples } from '@/app/workspace/[workspaceId]/developpeurs/components/code-samples'
import { SettingsSection } from '@/app/workspace/[workspaceId]/settings/components/settings-section/settings-section'
import { useAssistantAgents } from '@/hooks/queries/nexora-assistant'
import { useProviderModels } from '@/hooks/queries/providers'

const NEXORA_MODEL_PREFIX = 'vllm/'
const ERROR_CODES = [
  'invalid_api_key',
  'expired_api_key',
  'revoked_api_key',
  'model_not_allowed',
  'rate_limit_exceeded',
  'monthly_cap_reached',
  'monthly_budget_reached',
] as const

interface DevelopersProps {
  workspaceId: string
}

/** The id an agent answers to: its name, or its workflow id when another agent has that name. */
function agentModelIds(agents: readonly { workflowId: string; name: string }[]) {
  const counts = new Map<string, number>()
  for (const agent of agents) {
    const key = agent.name.trim().toLowerCase()
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return agents.map((agent) => ({
    label: agent.name,
    model: `agent:${(counts.get(agent.name.trim().toLowerCase()) ?? 0) > 1 ? agent.workflowId : agent.name.trim()}`,
  }))
}

/**
 * Nexora edition: everything a developer needs to call the instance's models and published agents
 * in the OpenAI format — address, key, available ids, ready-to-copy examples, OpenAPI.
 */
export function Developers({ workspaceId }: DevelopersProps) {
  const t = useTranslations('developers.page')
  const { data: modelList } = useProviderModels('vllm')
  const { data: agentList } = useAssistantAgents(workspaceId)
  const baseUrl = developerBaseUrl(getBaseUrl())
  const models = [
    DEFAULT_MODEL_ALIAS,
    ...(modelList?.models ?? [])
      .map((model) => model.replace(NEXORA_MODEL_PREFIX, ''))
      .filter((model) => model !== DEFAULT_MODEL_ALIAS),
  ]
  const agents = agentModelIds(agentList ?? [])
  const [model, setModel] = useState(DEFAULT_MODEL_ALIAS)
  const options = [
    ...models.map((name) => ({ value: name, label: name })),
    ...agents.map((agent) => ({ value: agent.model, label: agent.model })),
  ]

  return (
    <div className='min-h-0 flex-1 overflow-y-auto px-6'>
      <div className='mx-auto flex w-full max-w-[48rem] flex-col gap-7 py-10'>
        <header className='flex flex-col gap-2'>
          <h1 className='font-medium text-[var(--text-body)] text-lg'>{t('title')}</h1>
          <p className='text-[var(--text-muted)] text-small'>{t('intro')}</p>
        </header>

        <SettingsSection label={t('baseUrl')}>
          <ChipCopyInput value={baseUrl} />
          <p className='mt-2 text-[var(--text-muted)] text-caption'>{t('baseUrlNote')}</p>
        </SettingsSection>

        <SettingsSection
          label={t('auth')}
          action={
            <ChipLink href={`/workspace/${workspaceId}/settings/api-keys`} leftIcon={KeySquare}>
              {t('manageKeys')}
            </ChipLink>
          }
        >
          <p className='text-[var(--text-body)] text-small'>{t('authText')}</p>
        </SettingsSection>

        <SettingsSection label={t('models')}>
          <div className='flex flex-col gap-2 text-small'>
            <p className='text-[var(--text-body)]'>{t('modelsText')}</p>
            <p className='font-mono text-[var(--text-body)]'>{models.join(' · ')}</p>
            <p className='text-[var(--text-body)]'>{t('agentsText')}</p>
            <p className='font-mono text-[var(--text-body)]'>
              {agents.length > 0 ? agents.map((agent) => agent.model).join(' · ') : t('noAgents')}
            </p>
          </div>
        </SettingsSection>

        <SettingsSection
          label={t('examples')}
          action={<ChipDropdown value={model} onChange={setModel} options={options} align='end' />}
        >
          <CodeSamples model={model} />
        </SettingsSection>

        <SettingsSection label={t('errors')}>
          <ul className='flex flex-col gap-1 text-[var(--text-body)] text-small'>
            {ERROR_CODES.map((code) => (
              <li key={code}>
                <span className='font-mono'>{code}</span> — {t(`errorCodes.${code}`)}
              </li>
            ))}
          </ul>
        </SettingsSection>

        <SettingsSection label={t('reference')}>
          <div className='flex flex-col gap-2 text-[var(--text-body)] text-small'>
            <ChipLink
              href='/v1/openapi.json'
              target='_blank'
              rel='noopener noreferrer'
              leftIcon={SquareArrowUpRight}
              className='self-start'
            >
              {t('openapi')}
            </ChipLink>
            <p>{t('sdk')}</p>
          </div>
        </SettingsSection>
      </div>
    </div>
  )
}
