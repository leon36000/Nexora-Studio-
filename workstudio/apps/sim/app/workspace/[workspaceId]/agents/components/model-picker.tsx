'use client'

import { useMemo } from 'react'
import { ChipCombobox, type ComboboxOption } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { DEFAULT_MODEL_ALIAS } from '@/lib/nexora/model-ids'
import { plainModelName } from '@/lib/nexora/model-label'
import { useNexoraHome } from '@/hooks/queries/nexora-home'
import { useProviderModels } from '@/hooks/queries/providers'

const VLLM_PREFIX = 'vllm/'

interface ModelPickerProps {
  /** Model id as blocks store it (`vllm/<name>`). */
  value: string
  onChange: (model: string) => void
  disabled?: boolean
  className?: string
}

/** The models Nexora API serves, as the workflow blocks list them. */
export function ModelPicker({ value, onChange, disabled, className }: ModelPickerProps) {
  const t = useTranslations('agents.model')
  const { data, isLoading } = useProviderModels('vllm')
  const { data: home } = useNexoraHome()
  const defaultLabel = home?.defaultModel
    ? t('defaultNamed', { name: plainModelName(home.defaultModel) })
    : t('default')

  const options = useMemo<ComboboxOption[]>(() => {
    const models = data?.models ?? []
    const ids = value && !models.includes(value) ? [value, ...models] : models
    return ids.map((id) => {
      const name = id.startsWith(VLLM_PREFIX) ? id.slice(VLLM_PREFIX.length) : id
      return { value: id, label: name === DEFAULT_MODEL_ALIAS ? defaultLabel : name }
    })
  }, [data?.models, value, defaultLabel])

  return (
    <ChipCombobox
      options={options}
      value={value}
      onChange={onChange}
      aria-label={t('label')}
      placeholder={t('placeholder')}
      emptyMessage={t('empty')}
      searchPlaceholder={t('search')}
      isLoading={isLoading}
      disabled={disabled}
      searchable
      className={className}
    />
  )
}
