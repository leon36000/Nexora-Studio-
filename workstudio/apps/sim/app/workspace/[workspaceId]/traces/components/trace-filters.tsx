'use client'

import { Chip, ChipDropdown, ChipInput } from '@sim/emcn'
import { Search } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { NEXORA_TRACE_SOURCES, type NexoraTraceFacets } from '@/lib/api/contracts/nexora-traces'
import {
  DURATION_CHOICES,
  formatDuration,
  PERIOD_CHOICES,
} from '@/app/workspace/[workspaceId]/traces/utils/span-tree'

export interface TraceFilterValues {
  search: string
  status: 'ok' | 'error' | null
  source: (typeof NEXORA_TRACE_SOURCES)[number] | null
  model: string
  agent: string
  key: string
  duration: (typeof DURATION_CHOICES)[number] | null
  period: (typeof PERIOD_CHOICES)[number] | null
}

interface TraceFiltersProps {
  values: TraceFilterValues
  facets: NexoraTraceFacets | undefined
  locale: string
  onSearch: (value: string) => void
  onChange: (patch: Partial<TraceFilterValues>) => void
}

/** The member of `choices` that `value` names; `null` for « all » or anything else. */
function literal<const T extends readonly string[]>(choices: T, value: string): T[number] | null {
  return choices.find((choice) => choice === value) ?? null
}

const STATUSES = ['ok', 'error'] as const

/** The Traces filters: search, then one dropdown per criterion; « all » clears a criterion. */
export function TraceFilters({ values, facets, locale, onSearch, onChange }: TraceFiltersProps) {
  const t = useTranslations('traces')
  const text = (key: 'model' | 'agent' | 'key') => (value: string) => onChange({ [key]: value })
  const active = Object.entries(values).some(([key, value]) => key !== 'search' && value)

  return (
    <div className='flex flex-col gap-2'>
      <ChipInput
        icon={Search}
        className='w-full'
        placeholder={t('filters.search')}
        value={values.search}
        onChange={(event) => onSearch(event.target.value)}
      />
      <div className='flex flex-wrap gap-1'>
        <ChipDropdown
          value={values.status ?? ''}
          onChange={(value) => onChange({ status: literal(STATUSES, value) })}
          options={[
            { value: '', label: t('filters.allStatuses') },
            { value: 'ok', label: t('filters.statusOk') },
            { value: 'error', label: t('filters.statusError') },
          ]}
        />
        <ChipDropdown
          value={values.source ?? ''}
          onChange={(value) => onChange({ source: literal(NEXORA_TRACE_SOURCES, value) })}
          options={[
            { value: '', label: t('filters.allSources') },
            ...NEXORA_TRACE_SOURCES.map((source) => ({
              value: source,
              label: t(`sources.${source}`),
            })),
          ]}
        />
        <ChipDropdown
          value={values.model}
          onChange={text('model')}
          options={[
            { value: '', label: t('filters.allModels') },
            ...(facets?.models ?? []).map((model) => ({ value: model, label: model })),
          ]}
        />
        <ChipDropdown
          value={values.agent}
          onChange={text('agent')}
          options={[
            { value: '', label: t('filters.allAgents') },
            ...(facets?.agents ?? []).map((agent) => ({ value: agent.id, label: agent.name })),
          ]}
        />
        <ChipDropdown
          value={values.key}
          onChange={text('key')}
          options={[
            { value: '', label: t('filters.allKeys') },
            ...(facets?.apiKeys ?? []).map((key) => ({ value: key.id, label: key.name })),
          ]}
        />
        <ChipDropdown
          value={values.duration ?? ''}
          onChange={(value) => onChange({ duration: literal(DURATION_CHOICES, value) })}
          options={[
            { value: '', label: t('filters.anyDuration') },
            ...DURATION_CHOICES.map((choice) => ({
              value: choice,
              label: t('filters.durationOver', { value: formatDuration(Number(choice), locale) }),
            })),
          ]}
        />
        <ChipDropdown
          value={values.period ?? ''}
          onChange={(value) => onChange({ period: literal(PERIOD_CHOICES, value) })}
          options={[
            { value: '', label: t('filters.anyPeriod') },
            ...PERIOD_CHOICES.map((choice) => ({
              value: choice,
              label: t(`filters.period.${choice}`),
            })),
          ]}
        />
        {active && (
          <Chip
            variant='border'
            onClick={() =>
              onChange({
                status: null,
                source: null,
                model: '',
                agent: '',
                key: '',
                duration: null,
                period: null,
              })
            }
          >
            {t('filters.reset')}
          </Chip>
        )}
      </div>
    </div>
  )
}
