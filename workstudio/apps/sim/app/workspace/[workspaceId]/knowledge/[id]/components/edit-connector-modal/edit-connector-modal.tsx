'use client'

import { useState } from 'react'
import {
  ChipModal,
  ChipModalBody,
  ChipModalFooter,
  ChipModalHeader,
  ChipModalTabs,
} from '@sim/emcn'
import { useTranslations } from 'next-intl'
import type { ConnectorDocumentFilter } from '@/lib/api/contracts/knowledge/connectors'
import type { ResourceScope } from '@/lib/core/resource-scope'
import {
  ConnectorDocumentsTab,
  ConnectorDocumentsTabFilter,
} from '@/app/workspace/[workspaceId]/knowledge/[id]/components/edit-connector-modal/connector-documents-tab'
import { ConnectorSettingsFields } from '@/app/workspace/[workspaceId]/knowledge/[id]/components/edit-connector-modal/connector-settings-fields'
import { useConnectorSettingsForm } from '@/app/workspace/[workspaceId]/knowledge/[id]/components/edit-connector-modal/use-connector-settings-form'
import { withBrandIcon } from '@/blocks/brand-icon'
import type { ConnectorData } from '@/hooks/queries/kb/connectors'

interface EditConnectorModalProps {
  scope?: ResourceScope
  open: boolean
  onOpenChange: (open: boolean) => void
  knowledgeBaseId: string
  isSearchIndex?: boolean
  connector: ConnectorData
}

export function EditConnectorModal({
  open,
  onOpenChange,
  knowledgeBaseId,
  isSearchIndex = false,
  connector,
  scope,
}: EditConnectorModalProps) {
  const t = useTranslations('knowledge.editConnector')
  const [activeTab, setActiveTab] = useState('settings')
  const [documentFilter, setDocumentFilter] = useState<ConnectorDocumentFilter>('active')
  const form = useConnectorSettingsForm({
    scope,
    knowledgeBaseId,
    isSearchIndex,
    connector,
    onSaved: () => onOpenChange(false),
  })

  return (
    <ChipModal
      open={open}
      onOpenChange={onOpenChange}
      srTitle={t('title', { name: form.displayName })}
      size='md'
      dismissDisabled={form.saving}
    >
      <ChipModalHeader
        icon={form.icon ? withBrandIcon(form.icon) : null}
        onClose={() => onOpenChange(false)}
      >
        {t('title', { name: form.displayName })}
      </ChipModalHeader>
      <ChipModalBody>
        <div className='mx-2 flex shrink-0 items-center justify-between gap-2'>
          <ChipModalTabs
            tabs={[
              { value: 'settings', label: t('settingsTab') },
              { value: 'documents', label: t('documentsTab') },
            ]}
            value={activeTab}
            onChange={setActiveTab}
            aria-label={t('views')}
          />
          {activeTab === 'documents' && (
            <ConnectorDocumentsTabFilter
              knowledgeBaseId={knowledgeBaseId}
              connectorId={connector.id}
              filter={documentFilter}
              onFilterChange={setDocumentFilter}
            />
          )}
        </div>
        {activeTab === 'settings' ? (
          <ConnectorSettingsFields {...form.fieldsProps} />
        ) : (
          <ConnectorDocumentsTab
            knowledgeBaseId={knowledgeBaseId}
            connectorId={connector.id}
            filter={documentFilter}
            onFilterChange={setDocumentFilter}
          />
        )}
      </ChipModalBody>
      {activeTab === 'settings' && (
        <ChipModalFooter
          cancelLabel={t('cancel')}
          onCancel={() => onOpenChange(false)}
          secondaryActions={
            form.docsUrl
              ? [
                  {
                    label: t('setupGuide'),
                    onClick: () => window.open(form.docsUrl, '_blank', 'noopener,noreferrer'),
                  },
                ]
              : undefined
          }
          primaryAction={{
            label: form.saving ? t('saving') : t('save'),
            onClick: form.save,
            disabled: !form.canSave,
            disabledTooltip: form.saveBlockedReason,
          }}
        />
      )}
    </ChipModal>
  )
}
