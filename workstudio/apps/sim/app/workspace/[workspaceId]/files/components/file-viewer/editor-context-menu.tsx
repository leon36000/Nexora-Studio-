'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@sim/emcn'
import { Blimp, Clipboard, Duplicate, Scissors, Search, SelectAll } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'

interface EditorContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  onClose: () => void
  hasSelection: boolean
  canEdit: boolean
  onCut: () => void
  onCopy: () => void
  onCopyAll: () => void
  onPaste: () => void
  onSelectAll: () => void
  onFind: () => void
  /** Adds the current selection to Chat as a reference. Omit to hide the item. */
  onAddToChat?: () => void
}

export function EditorContextMenu({
  isOpen,
  position,
  onClose,
  hasSelection,
  canEdit,
  onCut,
  onCopy,
  onCopyAll,
  onPaste,
  onSelectAll,
  onFind,
  onAddToChat,
}: EditorContextMenuProps) {
  const t = useTranslations('files.editorMenu')
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
        sideOffset={2}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {onAddToChat && (
          <>
            <DropdownMenuItem disabled={!hasSelection} onSelect={onAddToChat}>
              <Blimp />
              {t('addToChat')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {canEdit && (
          <DropdownMenuItem disabled={!hasSelection} onSelect={onCut}>
            <Scissors />
            {t('cut')}
            <DropdownMenuShortcut>⌘X</DropdownMenuShortcut>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem disabled={!hasSelection} onSelect={onCopy}>
          <Duplicate />
          {t('copy')}
          <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onCopyAll}>
          <Duplicate />
          {t('copyAll')}
        </DropdownMenuItem>
        {canEdit && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onPaste}>
              <Clipboard />
              {t('paste')}
              <DropdownMenuShortcut>⌘V</DropdownMenuShortcut>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onSelectAll}>
          <SelectAll />
          {t('selectAll')}
          <DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onFind}>
          <Search />
          {t('find')}
          <DropdownMenuShortcut>⌘F</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
