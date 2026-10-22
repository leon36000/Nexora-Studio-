'use client'

import { useMemo } from 'react'
import { Combobox } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import type { FolderResourceType } from '@/lib/api/contracts/folders'
import { parseFolderPath } from '@/lib/folders/paths'
import { readFolderPath, readFolderPaths } from '@/lib/folders/selection'
import { useWorkflowScope } from '@/app/workspace/[workspaceId]/providers/workflow-scope-provider'
import { useResourceFolders } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/panel/components/editor/components/sub-block/hooks/use-resource-folders'
import { useSubBlockValue } from '@/app/workspace/[workspaceId]/w/[workflowId]/components/panel/components/editor/components/sub-block/hooks/use-sub-block-value'
import type { SubBlockConfig } from '@/blocks/types'

interface WorkspaceFolderSelectorProps {
  blockId: string
  subBlock: SubBlockConfig
  disabled?: boolean
  required?: boolean
  isPreview?: boolean
  previewValue?: unknown
}

/**
 * Picks one or more workspace folders and stores their canonical percent-encoded paths.
 *
 * Folder hierarchy is shown as a searchable breadcrumb instead of a second
 * bespoke tree surface. This keeps the field to one standard EMCN control,
 * makes duplicate leaf names unambiguous, and gives keyboard users the same
 * interaction as every other editor combobox.
 */
export function WorkspaceFolderSelector({
  blockId,
  subBlock,
  disabled = false,
  required = false,
  isPreview = false,
  previewValue,
}: WorkspaceFolderSelectorProps) {
  const t = useTranslations('editor.subBlock.workspaceFolderSelector')
  const { workspaceId } = useWorkflowScope()
  const resourceType = (subBlock.resourceType as FolderResourceType | undefined) ?? 'file'

  const [storeValue, setStoreValue] = useSubBlockValue<unknown>(blockId, subBlock.id)
  const value = isPreview ? previewValue : storeValue
  const selected = readFolderPath(value)
  const selectedPaths = readFolderPaths(value)
  const { folders, isLoading, isPlaceholderData, error, refetch } = useResourceFolders(
    workspaceId,
    resourceType
  )

  const options = useMemo(() => {
    const folderOptions = (isPlaceholderData ? [] : folders).map((folder) => ({
      value: folder.path,
      label: parseFolderPath(folder.path).join(' / '),
    }))
    if (subBlock.multiSelect || required) return folderOptions
    return [{ value: '', label: subBlock.placeholder ?? t('workspaceRoot') }, ...folderOptions]
  }, [t, folders, isPlaceholderData, required, subBlock.multiSelect, subBlock.placeholder])

  return (
    <Combobox
      options={options}
      value={subBlock.multiSelect ? undefined : selected}
      onChange={(value) => {
        if (!isPreview) setStoreValue(value)
      }}
      multiSelect={subBlock.multiSelect}
      multiSelectValues={subBlock.multiSelect ? selectedPaths : undefined}
      onMultiSelectChange={(values) => {
        if (!isPreview) setStoreValue(values.length > 0 ? values : '')
      }}
      showAllOption={subBlock.multiSelect}
      allOptionLabel={t('anywhere')}
      placeholder={subBlock.placeholder ?? t('anywhere')}
      disabled={disabled || isPreview || isPlaceholderData}
      isLoading={isLoading || isPlaceholderData}
      error={error}
      onOpenChange={(open) => {
        if (open && error) refetch()
      }}
      searchable
      searchPlaceholder={t('searchFolders')}
      emptyMessage={t('noFoldersFound')}
      className='w-full'
    />
  )
}
