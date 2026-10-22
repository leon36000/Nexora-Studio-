import { Repeat } from '@sim/emcn/icons'
import { docsUrl } from '@/lib/branding/docs-url'

/**
 * Loop tool configuration for the toolbar.
 * Defines the visual appearance of the Loop subflow container in the toolbar.
 */
export const LoopTool = {
  type: 'loop',
  name: 'Loop',
  icon: Repeat,
  bgColor: '#2FB3FF',
  docsLink: docsUrl('/workflows/blocks/loop'),
} as const
