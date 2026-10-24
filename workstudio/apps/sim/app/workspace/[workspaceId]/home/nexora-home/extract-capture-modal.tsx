'use client'

import { useState } from 'react'
import {
  ChipModal,
  ChipModalBody,
  ChipModalError,
  ChipModalField,
  ChipModalFooter,
  ChipModalHeader,
  Switch,
} from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { EXTRACTION_TABLE_NAMES } from '@/lib/nexora/capture-templates'
import { EXTRACTION_TEMPLATE_IDS, type ExtractionTemplateId } from '@/lib/nexora/document-ai/fields'

interface ExtractCaptureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (template: ExtractionTemplateId, saveToTable: boolean) => Promise<void>
  isCreating: boolean
  error: string | null
}

/** « Extraire des données »: the kind of document, and whether each one goes into a table. */
export function ExtractCaptureModal({
  open,
  onOpenChange,
  onConfirm,
  isCreating,
  error,
}: ExtractCaptureModalProps) {
  const t = useTranslations('home.nexoraHome.capture.extraction.modal')
  const [template, setTemplate] = useState<ExtractionTemplateId>('invoice')
  const [saveToTable, setSaveToTable] = useState(true)
  const options = EXTRACTION_TEMPLATE_IDS.map((id) => ({ value: id, label: t(`templates.${id}`) }))

  return (
    <ChipModal
      open={open}
      onOpenChange={onOpenChange}
      srTitle={t('title')}
      dismissDisabled={isCreating}
    >
      <ChipModalHeader onClose={() => onOpenChange(false)}>{t('title')}</ChipModalHeader>
      <ChipModalBody>
        <ChipModalField
          type='dropdown'
          title={t('template')}
          value={template}
          options={options}
          onChange={(value) => {
            const chosen = EXTRACTION_TEMPLATE_IDS.find((id) => id === value)
            if (chosen) setTemplate(chosen)
          }}
        />
        <ChipModalField
          type='custom'
          title={t('saveToTable')}
          hint={
            saveToTable ? t('tableHint', { name: EXTRACTION_TABLE_NAMES[template] }) : undefined
          }
        >
          {(aria) => (
            <Switch
              {...aria}
              checked={saveToTable}
              disabled={isCreating}
              onCheckedChange={setSaveToTable}
            />
          )}
        </ChipModalField>
        <ChipModalError>{error ?? undefined}</ChipModalError>
      </ChipModalBody>
      <ChipModalFooter
        onCancel={() => onOpenChange(false)}
        cancelDisabled={isCreating}
        primaryAction={{
          label: isCreating ? t('creating') : t('create'),
          onClick: () => void onConfirm(template, saveToTable),
          disabled: isCreating,
        }}
      />
    </ChipModal>
  )
}
