'use client'

import { useState } from 'react'
import { ChipInput, Label } from '@sim/emcn'
import { isRecordLike, toArray } from '@sim/utils/object'
import { useTranslations } from 'next-intl'
import { useCollaborativeWorkflow } from '@/hooks/use-collaborative-workflow'

interface InputField {
  id?: string
  name: string
  type: string
  value: unknown
  description?: string
  [key: string]: unknown
}

function inputFieldsOf(value: unknown): InputField[] {
  return toArray(value)
    .filter(isRecordLike)
    .filter(
      (field): field is InputField => typeof field.name === 'string' && field.name.trim() !== ''
    )
    .map((field) => ({ ...field, type: typeof field.type === 'string' ? field.type : 'string' }))
}

interface SampleFieldProps {
  field: InputField
  disabled: boolean
  onCommit: (name: string, value: string) => void
}

/** One trigger field: edited locally, saved with the workflow when the person leaves the field. */
function SampleField({ field, disabled, onCommit }: SampleFieldProps) {
  const stored = typeof field.value === 'string' ? field.value : ''
  const [draft, setDraft] = useState(stored)
  const [seen, setSeen] = useState(stored)
  if (seen !== stored) {
    setSeen(stored)
    setDraft(stored)
  }
  return (
    <div className='flex flex-col gap-1'>
      <Label htmlFor={`sample-${field.name}`} className='text-small'>
        {field.name}
        {field.description ? ` — ${field.description}` : ''}
      </Label>
      <ChipInput
        id={`sample-${field.name}`}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => draft !== stored && onCommit(field.name, draft)}
      />
    </div>
  )
}

interface SampleDataProps {
  triggerId: string
  triggerType: string
  /** The trigger's `inputFormat` value, as stored. */
  inputFormat: unknown
  canEdit: boolean
}

/** The values the test sends in place of what the trigger would receive. */
export function SampleData({ triggerId, triggerType, inputFormat, canEdit }: SampleDataProps) {
  const t = useTranslations('steps.test')
  const { collaborativeSetSubblockValue } = useCollaborativeWorkflow()

  if (triggerType === 'schedule') {
    return <p className='text-[var(--text-muted)] text-caption'>{t('inputsSchedule')}</p>
  }
  if (triggerType === 'generic_webhook') {
    return <p className='text-[var(--text-muted)] text-caption'>{t('inputsWebhook')}</p>
  }
  const all = toArray(inputFormat).filter(isRecordLike)
  const fields = inputFieldsOf(inputFormat).filter((field) => !field.type.startsWith('file'))
  if (fields.length === 0) {
    return <p className='text-[var(--text-muted)] text-caption'>{t('noInputs')}</p>
  }

  const commit = (name: string, value: string) => {
    const next = all.map((field) => (field.name === name ? { ...field, value } : field))
    collaborativeSetSubblockValue(triggerId, 'inputFormat', next)
  }

  return (
    <div className='flex flex-col gap-3'>
      <span className='text-[var(--text-muted)] text-caption'>{t('sampleDataHint')}</span>
      {fields.map((field) => (
        <SampleField key={field.name} field={field} disabled={!canEdit} onCommit={commit} />
      ))}
    </div>
  )
}
