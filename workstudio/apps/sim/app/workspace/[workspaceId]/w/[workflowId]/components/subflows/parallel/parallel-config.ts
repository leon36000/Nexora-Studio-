import { Split } from '@sim/emcn/icons'
import { docsUrl } from '@/lib/branding/docs-url'

/**
 * Parallel tool configuration for the toolbar.
 * Defines the visual appearance of the Parallel subflow container in the toolbar.
 */
export const ParallelTool = {
  type: 'parallel',
  name: 'Parallel',
  icon: Split,
  bgColor: '#FEE12B',
  docsLink: docsUrl('/workflows/blocks/parallel'),
} as const
