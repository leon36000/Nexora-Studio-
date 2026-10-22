import { BrainIcon } from '@/components/icons'
import { docsUrl } from '@/lib/branding/docs-url'
import type { BlockConfig } from '@/blocks/types'

export const ThinkingBlock: BlockConfig = {
  type: 'thinking',
  name: 'Thinking',
  description: 'Forces model to outline its thought process.',
  longDescription:
    'Adds a step where the model explicitly outlines its thought process before proceeding. This can improve reasoning quality by encouraging step-by-step analysis.',
  docsLink: docsUrl('/integrations/thinking'),
  category: 'blocks',
  bgColor: '#181C1E',
  icon: BrainIcon,
  canvasPresentation: {
    defaultTitle: 'Thinking',
    sentences: { default: ['Outline a step-by-step thought process'] },
  },
  hideFromToolbar: true,

  subBlocks: [
    {
      id: 'thought',
      title: 'Thought Process / Instruction',
      type: 'long-input',
      placeholder: 'Describe the step-by-step thinking process here...',
      hidden: true,
      required: true,
    },
  ],

  inputs: {
    thought: { type: 'string', description: 'Thinking process instructions' },
  },

  outputs: {
    acknowledgedThought: { type: 'string', description: 'Acknowledged thought process' },
  },

  tools: {
    access: ['thinking_tool'],
  },
}
