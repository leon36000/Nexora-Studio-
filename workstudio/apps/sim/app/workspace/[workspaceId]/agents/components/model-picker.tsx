'use client'

import { useMemo } from 'react'
import { ChipCombobox, type ComboboxOption } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { DEFAULT_MODEL_ALIAS } from '@/lib/nexora/model-ids'
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

  const options = useMemo<ComboboxOption[]>(() => {
    const models = data?.models ?? []
    const ids = value && !models.includes(value) ? [value, ...models] : models
    return ids.map((id) => {
      const name = id.startsWith(VLLM_PREFIX) ? id.slice(VLLM_PREFIX.length) : id
      return { value: id, label: name === DEFAULT_MODEL_ALIAS ? t('default') : name }
    })
  }, [data?.models, value, t])

  return (
    <ChipCombobox
      options={options}
      value={value}
      onChange={onChange}
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
