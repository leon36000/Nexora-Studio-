'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@sim/emcn'
import { Duplicate, Eye, Pencil, Plus, SquareArrowUpRight, Trash } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { useSelectionLabels } from '@/app/workspace/[workspaceId]/components/resource/selection-label'

interface ChunkContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  onClose: () => void
  onOpenInNewTab?: () => void
  onEdit?: () => void
  onCopyContent?: () => void
  onToggleEnabled?: () => void
  onDelete?: () => void
  onAddChunk?: () => void
  isChunkEnabled?: boolean
  hasChunk: boolean
  disableToggleEnabled?: boolean
  disableDelete?: boolean
  disableAddChunk?: boolean
  disableEdit?: boolean
  isConnectorDocument?: boolean
  selectedCount: number
  enabledCount?: number
  disabledCount?: number
}

/**
 * Context menu for chunks table.
 * Shows chunk actions when right-clicking a row, or "New chunk" when right-clicking empty space.
 * Supports batch operations when multiple chunks are selected.
 */
export function ChunkContextMenu({
  isOpen,
  position,
  onClose,
  onOpenInNewTab,
  onEdit,
  onCopyContent,
  onToggleEnabled,
  onDelete,
  onAddChunk,
  isChunkEnabled = true,
  hasChunk,
  disableToggleEnabled = false,
  disableDelete = false,
  disableAddChunk = false,
  disableEdit = false,
  isConnectorDocument = false,
  selectedCount,
  enabledCount = 0,
  disabledCount = 0,
}: ChunkContextMenuProps) {
  const t = useTranslations('knowledge.chunkContextMenu')
  const { selectionActionLabel, selectionToggleActionLabel } = useSelectionLabels()
  const isMultiSelect = selectedCount > 1
  const toggleLabel = selectionToggleActionLabel({
    selectedCount,
    enabledCount,
    disabledCount,
    isSelectedItemEnabled: isChunkEnabled,
  })

  const hasNavigationSection = !isMultiSelect && !!onOpenInNewTab
  const hasEditSection = !isMultiSelect && (!!onEdit || !!onCopyContent)
  const hasStateSection = !!onToggleEnabled
  const hasDestructiveSection = !!onDelete
  const hasActionsAboveDestructive = hasNavigationSection || hasEditSection || hasStateSection

  return (
    <DropdownMenu open={isOpen} onOpenChange={(open) => !open && onClose()} modal={false}>
      <DropdownMenuTrigger asChild>
        <div
          style={{
            position: 'fixed',
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: '1px',
            height: '1px',
            pointerEvents: 'none',
          }}
          tabIndex={-1}
          aria-hidden
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align='start'
        side='bottom'
        sideOffset={4}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {hasChunk ? (
          <>
            {hasNavigationSection && (
              <DropdownMenuItem onSelect={onOpenInNewTab!}>
                <SquareArrowUpRight />
                {t('openInNewTab')}
              </DropdownMenuItem>
            )}
            {!isMultiSelect && onEdit && (
              <DropdownMenuItem disabled={disableEdit} onSelect={onEdit}>
                <Pencil />
                {isConnectorDocument ? t('view') : t('edit')}
              </DropdownMenuItem>
            )}
            {!isMultiSelect && onCopyContent && (
              <DropdownMenuItem onSelect={onCopyContent}>
                <Duplicate />
                {t('copyContent')}
              </DropdownMenuItem>
            )}
            {onToggleEnabled && (
              <DropdownMenuItem disabled={disableToggleEnabled} onSelect={onToggleEnabled}>
                <Eye />
                {toggleLabel}
              </DropdownMenuItem>
            )}

            {hasActionsAboveDestructive && hasDestructiveSection && <DropdownMenuSeparator />}
            {onDelete && (
              <DropdownMenuItem disabled={disableDelete} onSelect={onDelete}>
                <Trash />
                {selectionActionLabel(t('delete'), selectedCount)}
              </DropdownMenuItem>
            )}
          </>
        ) : (
          onAddChunk && (
            <DropdownMenuItem disabled={disableAddChunk} onSelect={onAddChunk}>
              <Plus />
              {t('newChunk')}
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
