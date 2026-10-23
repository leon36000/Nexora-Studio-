'use client'

import { useMemo } from 'react'
import { type EmcnLabels, EmcnLabelsProvider } from '@sim/emcn'
import { toRecord } from '@sim/utils/object'
import { type WorkflowRendererLabels, WorkflowRendererLabelsProvider } from '@sim/workflow-renderer'
import { useMessages } from 'next-intl'

interface SharedLabelsProviderProps {
  children: React.ReactNode
}

/** The string messages of one `common` section, read raw so `{name}` placeholders stay intact. */
function stringMessages(section: unknown): Record<string, string> {
  const strings: Record<string, string> = {}
  for (const [key, value] of Object.entries(toRecord(section))) {
    if (typeof value === 'string') strings[key] = value
  }
  return strings
}

/**
 * Gives the shared packages (emcn, the workflow canvas) their built-in copy in the interface
 * language, from `common.emcn` and `common.workflowRenderer`. A key missing from the locale's
 * messages keeps the package's English default.
 */
export function SharedLabelsProvider({ children }: SharedLabelsProviderProps) {
  const messages = useMessages()
  const { emcn, workflowRenderer } = useMemo(() => {
    const common = toRecord(messages.common)
    return {
      emcn: stringMessages(common.emcn) as Partial<EmcnLabels>,
      workflowRenderer: stringMessages(common.workflowRenderer) as Partial<WorkflowRendererLabels>,
    }
  }, [messages])
  return (
    <EmcnLabelsProvider labels={emcn}>
      <WorkflowRendererLabelsProvider labels={workflowRenderer}>
        {children}
      </WorkflowRendererLabelsProvider>
    </EmcnLabelsProvider>
  )
}
