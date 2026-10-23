'use client'

import { useMemo } from 'react'
import { ChipCombobox, type ComboboxOptionGroup } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import type { StoredTool } from '@/lib/workflows/tool-input/types'
import {
  type SelectedItem,
  SelectedList,
} from '@/app/workspace/[workspaceId]/agents/[workflowId]/components/selected-list'
import { type McpToolForUI, useMcpTools } from '@/hooks/mcp/use-mcp-tools'
import { useMcpServers } from '@/hooks/queries/mcp'
import { useWorkflows } from '@/hooks/queries/workflows'

interface ToolsFieldProps {
  workspaceId: string
  /** The agent itself, never offered as one of its own tools. */
  workflowId: string
  value: StoredTool[]
  onChange: (tools: StoredTool[]) => void
  disabled?: boolean
}

function mcpKey(serverId: string, toolName: string): string {
  return `mcp:${serverId}:${toolName}`
}

function workflowKey(workflowId: string): string {
  return `workflow:${workflowId}`
}

/** A tool's picker value; tools the picker does not offer (added in the editor) get none. */
function pickerKey(tool: StoredTool): string | null {
  if (tool.type === 'mcp' && tool.params?.serverId && tool.params.toolName) {
    return mcpKey(tool.params.serverId, tool.params.toolName)
  }
  if (tool.type === 'workflow_input' && tool.params?.workflowId) {
    return workflowKey(tool.params.workflowId)
  }
  return null
}

/** An MCP tool entry, exactly as the block editor's tool picker stores it. */
function buildMcpTool(tool: McpToolForUI, serverUrl: string | undefined): StoredTool {
  return {
    type: 'mcp',
    title: tool.name,
    toolId: tool.id,
    params: {
      serverId: tool.serverId,
      ...(serverUrl && { serverUrl }),
      toolName: tool.name,
      serverName: tool.serverName,
    },
    isExpanded: true,
    usageControl: 'auto',
    schema: { ...tool.inputSchema, description: tool.description },
  }
}

/** A workflow-as-tool entry, exactly as the block editor's tool picker stores it. */
function buildWorkflowTool(workflowId: string): StoredTool {
  return {
    type: 'workflow_input',
    title: 'Workflow', // i18n-ignore: persisted tool title, as the tool picker stores it
    toolId: 'workflow_executor',
    params: { workflowId },
    isExpanded: true,
    usageControl: 'auto',
  }
}

/** The agent's tools: the workspace's MCP tools (Nexora Connect) and its other workflows. */
export function ToolsField({
  workspaceId,
  workflowId,
  value,
  onChange,
  disabled,
}: ToolsFieldProps) {
  const t = useTranslations('agents.editor.tools')
  const { mcpTools, isLoading: mcpLoading } = useMcpTools(workspaceId)
  const { data: servers } = useMcpServers(workspaceId)
  const { data: workflows, isLoading: workflowsLoading } = useWorkflows(workspaceId)

  const catalog = useMemo(() => {
    const serverUrls = new Map((servers ?? []).map((server) => [server.id, server.url]))
    const mcpByKey = new Map<string, McpToolForUI>()
    const groups = new Map<string, ComboboxOptionGroup>()
    for (const tool of mcpTools) {
      const key = mcpKey(tool.serverId, tool.name)
      mcpByKey.set(key, tool)
      const group = groups.get(tool.serverId) ?? {
        section: tool.serverName || t('unknownServer'),
        items: [],
      }
      group.items.push({ value: key, label: tool.name })
      groups.set(tool.serverId, group)
    }
    const workflowNames = new Map<string, string>()
    const workflowItems = []
    for (const workflow of workflows ?? []) {
      workflowNames.set(workflow.id, workflow.name)
      if (workflow.id === workflowId) continue
      workflowItems.push({ value: workflowKey(workflow.id), label: workflow.name })
    }
    const optionGroups = [...groups.values()]
    if (workflowItems.length > 0) {
      optionGroups.push({ section: t('workflows'), items: workflowItems })
    }
    return { serverUrls, mcpByKey, workflowNames, optionGroups }
  }, [mcpTools, servers, workflows, workflowId, t])

  const selectedKeys = useMemo(
    () => value.map(pickerKey).filter((key): key is string => key !== null),
    [value]
  )

  const items = useMemo<SelectedItem[]>(
    () =>
      value.map((tool, index) => {
        const key = pickerKey(tool)
        if (tool.type === 'mcp' && key) {
          const serverName = tool.params?.serverName
          const name = tool.params?.toolName ?? tool.title ?? ''
          return {
            key,
            label: serverName ? `${name} · ${serverName}` : name,
            missing: !mcpLoading && !catalog.mcpByKey.has(key),
          }
        }
        if (tool.type === 'workflow_input' && key) {
          const id = tool.params?.workflowId ?? ''
          const name = catalog.workflowNames.get(id)
          return {
            key,
            label: t('workflowTitle', { name: name ?? id }),
            missing: !workflowsLoading && name === undefined,
          }
        }
        return { key: `other:${index}`, label: tool.title ?? tool.type, missing: false }
      }),
    [value, catalog, mcpLoading, workflowsLoading, t]
  )

  const handlePickerChange = (keys: string[]) => {
    const picked = new Set(keys)
    const current = new Set(selectedKeys)
    const kept = value.filter((tool) => {
      const key = pickerKey(tool)
      return key === null || picked.has(key)
    })
    const added: StoredTool[] = []
    for (const key of keys) {
      if (current.has(key)) continue
      const mcpTool = catalog.mcpByKey.get(key)
      if (mcpTool) {
        added.push(buildMcpTool(mcpTool, catalog.serverUrls.get(mcpTool.serverId)))
      } else if (key.startsWith('workflow:')) {
        added.push(buildWorkflowTool(key.slice('workflow:'.length)))
      }
    }
    onChange([...kept, ...added])
  }

  const handleRemove = (key: string) => {
    onChange(value.filter((tool, index) => (pickerKey(tool) ?? `other:${index}`) !== key))
  }

  return (
    <div className='flex flex-col gap-2'>
      <ChipCombobox
        options={[]}
        groups={catalog.optionGroups}
        multiSelect
        multiSelectValues={selectedKeys}
        onMultiSelectChange={handlePickerChange}
        overlayLabel={t('add')}
        placeholder={t('add')}
        emptyMessage={t('none')}
        isLoading={mcpLoading || workflowsLoading}
        searchable
        disabled={disabled}
      />
      <SelectedList items={items} onRemove={handleRemove} disabled={disabled} />
    </div>
  )
}
