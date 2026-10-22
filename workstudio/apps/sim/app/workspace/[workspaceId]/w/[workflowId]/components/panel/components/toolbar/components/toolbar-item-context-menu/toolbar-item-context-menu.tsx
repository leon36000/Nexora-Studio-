'use client'

import { Popover, PopoverAnchor, PopoverContent, PopoverItem } from '@sim/emcn'
import { useTranslations } from 'next-intl'

interface ToolbarItemContextMenuProps {
  /**
   * Whether the context menu is open
   */
  isOpen: boolean
  /**
   * Position of the context menu
   */
  position: { x: number; y: number }
  /**
   * Ref for the menu element
   */
  menuRef: React.RefObject<HTMLDivElement | null>
  /**
   * Callback when menu should close
   */
  onClose: () => void
  /**
   * Callback when add to canvas is clicked
   */
  onAddToCanvas: () => void
  /**
   * Callback when view documentation is clicked
   */
  onViewDocumentation?: () => void
  /**
   * Whether the view documentation option should be shown
   */
  showViewDocumentation?: boolean
}

/**
 * Context menu component for toolbar items (triggers and blocks).
 * Displays options to add to canvas and view documentation.
 */
export function ToolbarItemContextMenu({
  isOpen,
  position,
  menuRef,
  onClose,
  onAddToCanvas,
  onViewDocumentation,
  showViewDocumentation = false,
}: ToolbarItemContextMenuProps) {
  const t = useTranslations('editor.toolbar.contextMenu')
  return (
    <Popover open={isOpen} onOpenChange={(open) => !open && onClose()} size='sm'>
      <PopoverAnchor
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          width: '1px',
          height: '1px',
        }}
      />
      <PopoverContent ref={menuRef} align='start' side='bottom' sideOffset={4}>
        <PopoverItem
          onClick={() => {
            onAddToCanvas()
            onClose()
          }}
        >
          {t('addToCanvas')}
        </PopoverItem>
        {showViewDocumentation && onViewDocumentation && (
          <PopoverItem
            onClick={() => {
              onViewDocumentation()
              onClose()
            }}
          >
            {t('viewDocumentation')}
          </PopoverItem>
        )}
      </PopoverContent>
    </Popover>
  )
}
