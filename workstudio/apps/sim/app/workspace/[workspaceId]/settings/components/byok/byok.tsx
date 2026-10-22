'use client'

import { useMemo } from 'react'
import { ChipTag } from '@sim/emcn'
import { getErrorMessage } from '@sim/utils/errors'
import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useQueryState } from 'nuqs'
import {
  AnthropicIcon,
  BasetenIcon,
  BrandfetchIcon,
  CohereIcon,
  ContextDevIcon,
  DatagmaIcon,
  DropcontactIcon,
  EnrowIcon,
  ExaAIIcon,
  FalIcon,
  FindymailIcon,
  FirecrawlIcon,
  FireworksIcon,
  GeminiIcon,
  GoogleIcon,
  HunterIOIcon,
  IcypeasIcon,
  JinaAIIcon,
  KieIcon,
  KimiIcon,
  LeadMagicIcon,
  LinkupIcon,
  MillionVerifierIcon,
  MistralIcon,
  NeverBounceIcon,
  OllamaIcon,
  OpenAIIcon,
  ParallelIcon,
  PeopleDataLabsIcon,
  PerplexityIcon,
  ProspeoIcon,
  SerperIcon,
  TinyFishIcon,
  TogetherIcon,
  TypeSafeIcon,
  WizaIcon,
  xAIIcon,
  ZaiIcon,
  ZeroBounceIcon,
} from '@/components/icons'
import { NebiusIcon } from '@/components/icons/nebius'
import { canMutateWorkspaceSettingsSection } from '@/components/settings/navigation'
import { type BYOKProviderId, MAX_BYOK_KEYS_PER_PROVIDER } from '@/lib/api/contracts/byok-keys'
import { useDeploymentShape } from '@/lib/core/config/deployment-shape'
import { useWorkspaceHostContext } from '@/app/workspace/[workspaceId]/providers/workspace-host-provider'
import { useUserPermissionsContext } from '@/app/workspace/[workspaceId]/providers/workspace-permissions-provider'
import {
  byokScopeParam,
  byokScopeUrlKeys,
} from '@/app/workspace/[workspaceId]/settings/[section]/search-params'
import {
  BYOKKeyManager,
  type BYOKManagerCapabilities,
  type BYOKManagerKey,
  type BYOKManagerProvider,
  type BYOKProviderSection,
} from '@/app/workspace/[workspaceId]/settings/components/byok/byok-key-manager'
import { SettingsEmptyState } from '@/app/workspace/[workspaceId]/settings/components/settings-empty-state'
import { SettingsPanel } from '@/app/workspace/[workspaceId]/settings/components/settings-panel'
import { useSettingsSearch } from '@/app/workspace/[workspaceId]/settings/components/use-settings-search'
import {
  useBYOKKeys,
  useDeleteBYOKKey,
  useDeleteOrganizationBYOKKey,
  useInheritedBYOKStatus,
  useOrganizationBYOKKeys,
  useUpsertBYOKKey,
  useUpsertOrganizationBYOKKey,
} from '@/hooks/queries/byok-keys'

interface ProviderDefinition extends Omit<BYOKManagerProvider, 'description' | 'placeholder'> {
  id: BYOKProviderId
  /** Message key under `settings.byok.descriptions`. */
  descriptionKey: string
  /** Literal key-format hint shown as the input placeholder. */
  placeholder?: string
  /** Name used in the "Enter your … API key" placeholder when no format hint is given. */
  keyLabel?: string
}

const PROVIDERS: ProviderDefinition[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    icon: OpenAIIcon,
    descriptionKey: 'llmEmbeddings',
    placeholder: 'sk-...',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    icon: AnthropicIcon,
    descriptionKey: 'llm',
    placeholder: 'sk-ant-...',
  },
  {
    id: 'google',
    name: 'Google',
    icon: GeminiIcon,
    descriptionKey: 'llm',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    icon: MistralIcon,
    descriptionKey: 'llmOcr',
  },
  {
    id: 'zai',
    name: 'Z.ai',
    icon: ZaiIcon,
    descriptionKey: 'llm',
    keyLabel: 'Z.ai',
  },
  {
    id: 'cohere',
    name: 'Cohere',
    icon: CohereIcon,
    descriptionKey: 'embeddingsReranking',
    keyLabel: 'Cohere',
  },
  {
    id: 'xai',
    name: 'xAI',
    icon: xAIIcon,
    descriptionKey: 'llm',
    placeholder: 'xai-...',
  },
  {
    id: 'kimi',
    name: 'Kimi',
    icon: KimiIcon,
    descriptionKey: 'llm',
    placeholder: 'sk-...',
  },
  {
    id: 'typesafe',
    name: 'TypeSafe',
    icon: TypeSafeIcon,
    descriptionKey: 'jevEvaluation',
    keyLabel: 'TypeSafe',
  },
  {
    id: 'fireworks',
    name: 'Fireworks',
    icon: FireworksIcon,
    descriptionKey: 'llm',
    keyLabel: 'Fireworks',
  },
  {
    id: 'together',
    name: 'Together AI',
    icon: TogetherIcon,
    descriptionKey: 'llm',
    keyLabel: 'Together AI',
  },
  {
    id: 'baseten',
    name: 'Baseten',
    icon: BasetenIcon,
    descriptionKey: 'llm',
    keyLabel: 'Baseten',
  },
  {
    id: 'nebius',
    name: 'Nebius',
    icon: NebiusIcon,
    descriptionKey: 'llm',
    keyLabel: 'Nebius Token Factory',
  },
  {
    id: 'ollama-cloud',
    name: 'Ollama Cloud',
    icon: OllamaIcon,
    descriptionKey: 'llm',
    keyLabel: 'Ollama',
  },
  {
    id: 'kie',
    name: 'Kie',
    icon: KieIcon,
    descriptionKey: 'llm',
    keyLabel: 'Kie',
  },
  {
    id: 'falai',
    name: 'Fal.ai',
    icon: FalIcon,
    descriptionKey: 'imageVideo',
    keyLabel: 'Fal.ai',
  },
  {
    id: 'firecrawl',
    name: 'Firecrawl',
    icon: FirecrawlIcon,
    descriptionKey: 'scrapingExtraction',
    keyLabel: 'Firecrawl',
  },
  {
    id: 'exa',
    name: 'Exa',
    icon: ExaAIIcon,
    descriptionKey: 'aiSearchResearch',
    keyLabel: 'Exa',
  },
  {
    id: 'context_dev',
    name: 'Context.dev',
    icon: ContextDevIcon,
    descriptionKey: 'scrapingBrandIntelligence',
    keyLabel: 'Context.dev',
  },
  {
    id: 'tinyfish',
    name: 'TinyFish',
    icon: TinyFishIcon,
    descriptionKey: 'webAgentAutomation',
    keyLabel: 'TinyFish',
  },
  {
    id: 'serper',
    name: 'Serper',
    icon: SerperIcon,
    descriptionKey: 'googleSearchApi',
    keyLabel: 'Serper',
  },
  {
    id: 'linkup',
    name: 'Linkup',
    icon: LinkupIcon,
    descriptionKey: 'webSearchRetrieval',
    keyLabel: 'Linkup',
  },
  {
    id: 'parallel_ai',
    name: 'Parallel AI',
    icon: ParallelIcon,
    descriptionKey: 'webSearchDeepResearch',
    keyLabel: 'Parallel AI',
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    icon: PerplexityIcon,
    descriptionKey: 'aiChatWebSearch',
    placeholder: 'pplx-...',
  },
  {
    id: 'jina',
    name: 'Jina AI',
    icon: JinaAIIcon,
    descriptionKey: 'webReadingSearch',
    placeholder: 'jina_...',
  },
  {
    id: 'google_cloud',
    name: 'Google Cloud',
    icon: GoogleIcon,
    descriptionKey: 'googleCloudApis',
    keyLabel: 'Google Cloud',
  },
  {
    id: 'brandfetch',
    name: 'Brandfetch',
    icon: BrandfetchIcon,
    descriptionKey: 'brandAssets',
    keyLabel: 'Brandfetch',
  },
  {
    id: 'hunter',
    name: 'Hunter',
    icon: HunterIOIcon,
    descriptionKey: 'emailFinderDomainSearch',
    keyLabel: 'Hunter.io',
  },
  {
    id: 'peopledatalabs',
    name: 'People Data Labs',
    icon: PeopleDataLabsIcon,
    descriptionKey: 'personCompanyIdentity',
    keyLabel: 'People Data Labs',
  },
  {
    id: 'findymail',
    name: 'Findymail',
    icon: FindymailIcon,
    descriptionKey: 'emailFinderPhoneLookup',
    keyLabel: 'Findymail',
  },
  {
    id: 'prospeo',
    name: 'Prospeo',
    icon: ProspeoIcon,
    descriptionKey: 'personCompanySearch',
    keyLabel: 'Prospeo',
  },
  {
    id: 'wiza',
    name: 'Wiza',
    icon: WizaIcon,
    descriptionKey: 'prospectSearch',
    keyLabel: 'Wiza',
  },
  {
    id: 'datagma',
    name: 'Datagma',
    icon: DatagmaIcon,
    descriptionKey: 'emailPhoneEnrichment',
    keyLabel: 'Datagma',
  },
  {
    id: 'dropcontact',
    name: 'Dropcontact',
    icon: DropcontactIcon,
    descriptionKey: 'gdprContactEnrichment',
    keyLabel: 'Dropcontact',
  },
  {
    id: 'leadmagic',
    name: 'LeadMagic',
    icon: LeadMagicIcon,
    descriptionKey: 'emailB2bEnrichment',
    keyLabel: 'LeadMagic',
  },
  {
    id: 'icypeas',
    name: 'Icypeas',
    icon: IcypeasIcon,
    descriptionKey: 'emailFindingVerification',
    keyLabel: 'Icypeas',
  },
  {
    id: 'enrow',
    name: 'Enrow',
    icon: EnrowIcon,
    descriptionKey: 'emailFindingVerification',
    keyLabel: 'Enrow',
  },
  {
    id: 'zerobounce',
    name: 'ZeroBounce',
    icon: ZeroBounceIcon,
    descriptionKey: 'realtimeValidationDeliverability',
    keyLabel: 'ZeroBounce',
  },
  {
    id: 'neverbounce',
    name: 'NeverBounce',
    icon: NeverBounceIcon,
    descriptionKey: 'realtimeVerificationListCleaning',
    keyLabel: 'NeverBounce',
  },
  {
    id: 'millionverifier',
    name: 'MillionVerifier',
    icon: MillionVerifierIcon,
    descriptionKey: 'realtimeVerificationDeliverability',
    keyLabel: 'MillionVerifier',
  },
]

/**
 * Provider groupings rendered as labeled sections. Every provider id in
 * {@link PROVIDERS} belongs to exactly one section; rows keep their
 * {@link PROVIDERS} order within each group.
 */
const PROVIDER_SECTIONS: { labelKey: string; ids: BYOKProviderId[] }[] = [
  {
    labelKey: 'models',
    ids: [
      'openai',
      'anthropic',
      'google',
      'mistral',
      'zai',
      'cohere',
      'xai',
      'kimi',
      'typesafe',
      'fireworks',
      'together',
      'baseten',
      'nebius',
      'ollama-cloud',
      'kie',
      'falai',
    ],
  },
  {
    labelKey: 'searchWeb',
    ids: [
      'firecrawl',
      'exa',
      'context_dev',
      'tinyfish',
      'serper',
      'linkup',
      'parallel_ai',
      'perplexity',
      'jina',
      'google_cloud',
    ],
  },
  {
    labelKey: 'enrichment',
    ids: [
      'brandfetch',
      'hunter',
      'peopledatalabs',
      'findymail',
      'prospeo',
      'wiza',
      'datagma',
      'dropcontact',
      'leadmagic',
      'icypeas',
      'enrow',
      'zerobounce',
      'neverbounce',
      'millionverifier',
    ],
  },
]

export function BYOK() {
  const t = useTranslations('settings.byok')
  const params = useParams()
  const workspaceId = (params?.workspaceId as string) || ''
  const hostContext = useWorkspaceHostContext()
  const workspacePermissions = useUserPermissionsContext()
  const { hosted } = useDeploymentShape()
  const canManageWorkspace = canMutateWorkspaceSettingsSection('byok', workspacePermissions)
  const hostOrganizationId = hostContext.hostOrganizationId
  const canSelectOrganization = Boolean(
    hosted && hostOrganizationId && hostContext.viewer.isHostOrganizationAdmin
  )
  const [requestedScope, setRequestedScope] = useQueryState(byokScopeParam.key, {
    ...byokScopeParam.parser,
    ...byokScopeUrlKeys,
  })
  const [searchTerm, setSearchTerm] = useSettingsSearch()
  const effectiveScope =
    requestedScope === 'organization' && canSelectOrganization ? 'organization' : 'workspace'
  const isOrganizationScope = effectiveScope === 'organization'
  const organizationQueryId = isOrganizationScope ? (hostOrganizationId ?? undefined) : undefined
  const inheritedStatusWorkspaceId =
    !isOrganizationScope && hosted && hostOrganizationId ? workspaceId : undefined

  const workspaceKeys = useBYOKKeys(workspaceId)
  const organizationKeys = useOrganizationBYOKKeys(organizationQueryId, {
    enabled: isOrganizationScope,
  })
  const inheritedStatus = useInheritedBYOKStatus(inheritedStatusWorkspaceId)
  const upsertWorkspaceKey = useUpsertBYOKKey()
  const deleteWorkspaceKey = useDeleteBYOKKey()
  const upsertOrganizationKey = useUpsertOrganizationBYOKKey()
  const deleteOrganizationKey = useDeleteOrganizationBYOKKey()

  const activeQueryData = isOrganizationScope ? organizationKeys.data : workspaceKeys.data
  const activeKeys = activeQueryData?.keys
  const isLoading = isOrganizationScope ? organizationKeys.isLoading : workspaceKeys.isLoading
  const keysError = isOrganizationScope ? organizationKeys.error : workspaceKeys.error
  const isSaving = isOrganizationScope
    ? upsertOrganizationKey.isPending
    : upsertWorkspaceKey.isPending
  const isDeleting = isOrganizationScope
    ? deleteOrganizationKey.isPending
    : deleteWorkspaceKey.isPending
  const isMutating =
    upsertWorkspaceKey.isPending ||
    deleteWorkspaceKey.isPending ||
    upsertOrganizationKey.isPending ||
    deleteOrganizationKey.isPending

  const capabilities: BYOKManagerCapabilities = isOrganizationScope
    ? {
        add: organizationKeys.data?.entitled === true,
        update: organizationKeys.data?.entitled === true,
        delete: true,
      }
    : {
        add: canManageWorkspace,
        update: canManageWorkspace,
        delete: canManageWorkspace,
      }

  const keysByProvider = useMemo(() => {
    const grouped = new Map<string, BYOKManagerKey[]>()
    for (const key of activeKeys ?? []) {
      const providerKeys = grouped.get(key.providerId) ?? []
      providerKeys.push({ id: key.id, name: key.name, maskedKey: key.maskedKey })
      grouped.set(key.providerId, providerKeys)
    }
    return grouped
  }, [activeKeys])

  const translatedProviders = useMemo(
    () =>
      PROVIDERS.map(
        ({
          descriptionKey,
          placeholder,
          keyLabel,
          ...provider
        }): BYOKManagerProvider & {
          id: BYOKProviderId
        } => ({
          ...provider,
          description: t(`descriptions.${descriptionKey}`),
          placeholder:
            placeholder ??
            (keyLabel
              ? t('placeholders.providerApiKey', { provider: keyLabel })
              : t('placeholders.apiKey')),
        })
      ),
    [t]
  )

  const sections = useMemo<BYOKProviderSection[]>(
    () => PROVIDER_SECTIONS.map(({ labelKey, ids }) => ({ label: t(`sections.${labelKey}`), ids })),
    [t]
  )

  const providers = useMemo(() => {
    if (isOrganizationScope || inheritedStatus.isError) return translatedProviders

    const inheritedProviderIds = new Set(inheritedStatus.data?.inheritedProviderIds ?? [])
    if (inheritedProviderIds.size === 0) return translatedProviders

    return translatedProviders.map((provider) =>
      inheritedProviderIds.has(provider.id)
        ? {
            ...provider,
            badge: <ChipTag variant='gray'>{t('inheritedFromOrganization')}</ChipTag>,
          }
        : provider
    )
  }, [
    inheritedStatus.data?.inheritedProviderIds,
    inheritedStatus.isError,
    isOrganizationScope,
    translatedProviders,
    t,
  ])

  const description = isOrganizationScope
    ? organizationKeys.data?.entitled === false
      ? t('organizationDescriptionNotEntitled')
      : t('organizationDescription')
    : inheritedStatus.isError
      ? t('inheritedStatusUnavailable')
      : undefined

  const keyUsageDescription = isOrganizationScope ? t('organizationKeyUsage') : undefined

  const lastKeyDeleteMessage = isOrganizationScope
    ? t('lastKeyDelete.organization')
    : hostOrganizationId
      ? t('lastKeyDelete.workspaceWithOrganization')
      : t('lastKeyDelete.workspace')

  return (
    <SettingsPanel
      actions={
        canSelectOrganization
          ? [
              {
                id: 'byok-scope-workspace',
                text: t('scopeWorkspace'),
                active: effectiveScope === 'workspace',
                onSelect: () => void setRequestedScope('workspace'),
                disabled: isMutating,
              },
              {
                id: 'byok-scope-organization',
                text: t('scopeOrganization'),
                active: effectiveScope === 'organization',
                onSelect: () => void setRequestedScope('organization'),
                disabled: isMutating,
              },
            ]
          : undefined
      }
    >
      {keysError && activeQueryData === undefined ? (
        <SettingsEmptyState>{getErrorMessage(keysError, t('loadFailed'))}</SettingsEmptyState>
      ) : (
        <BYOKKeyManager
          key={`${workspaceId}:${effectiveScope}:${hostOrganizationId ?? 'none'}`}
          multiKey
          providers={providers}
          sections={sections}
          keysByProvider={keysByProvider}
          maxKeysPerProvider={MAX_BYOK_KEYS_PER_PROVIDER}
          isLoading={isLoading}
          isSaving={isSaving}
          isDeleting={isDeleting}
          capabilities={capabilities}
          description={description}
          scopeLabel={
            isOrganizationScope ? t('scopeLabel.organization') : t('scopeLabel.workspace')
          }
          keyUsageDescription={keyUsageDescription}
          lastKeyDeleteMessage={lastKeyDeleteMessage}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onSaveKey={async ({ providerId, apiKey, keyId, name }) => {
            if (isOrganizationScope && organizationQueryId) {
              await upsertOrganizationKey.mutateAsync({
                organizationId: organizationQueryId,
                providerId: providerId as BYOKProviderId,
                apiKey,
                keyId,
                name,
              })
              return
            }

            await upsertWorkspaceKey.mutateAsync({
              workspaceId,
              providerId: providerId as BYOKProviderId,
              apiKey,
              keyId,
              name,
            })
          }}
          onDeleteKey={async (providerId, keyId) => {
            if (isOrganizationScope && organizationQueryId) {
              await deleteOrganizationKey.mutateAsync({
                organizationId: organizationQueryId,
                providerId: providerId as BYOKProviderId,
                keyId,
              })
              return
            }

            await deleteWorkspaceKey.mutateAsync({
              workspaceId,
              providerId: providerId as BYOKProviderId,
              keyId,
            })
          }}
        />
      )}
    </SettingsPanel>
  )
}
