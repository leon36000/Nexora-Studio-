'use client'

import { Label, Switch } from '@sim/emcn'
import { useTranslations } from 'next-intl'
import { useNexoraAgentTools } from '@/hooks/queries/nexora-code-execution'

interface BuiltinToolSwitchesProps {
  codeInterpreter: boolean
  webSearch: boolean
  disabled: boolean
  onChange: (field: 'codeInterpreter' | 'webSearch', value: boolean) => void
}

/**
 * The agent's built-in tools: the Python interpreter and the web search. A switch stays usable
 * when it is on already (so it can be turned off), but cannot be turned on while the instance
 * cannot run the tool: it says why.
 */
export function BuiltinToolSwitches({
  codeInterpreter,
  webSearch,
  disabled,
  onChange,
}: BuiltinToolSwitchesProps) {
  const t = useTranslations('agents.editor.builtinTools')
  const { data } = useNexoraAgentTools()
  const items = [
    {
      field: 'codeInterpreter',
      checked: codeInterpreter,
      available: data?.codeInterpreter ?? false,
    },
    { field: 'webSearch', checked: webSearch, available: data?.webSearch ?? false },
  ] as const

  return (
    <div className='flex flex-col gap-3'>
      {items.map((item) => (
        <div key={item.field} className='flex items-center justify-between gap-4 pl-0.5'>
          <div className='flex flex-col gap-1'>
            <Label htmlFor={`agent-${item.field}`}>{t(`${item.field}.label`)}</Label>
            <p className='text-[var(--text-muted)] text-caption'>
              {item.available || item.checked
                ? t(`${item.field}.hint`)
                : t(`${item.field}.unavailable`)}
            </p>
          </div>
          <Switch
            id={`agent-${item.field}`}
            checked={item.checked}
            disabled={disabled || (!item.available && !item.checked)}
            onCheckedChange={(value) => onChange(item.field, value)}
          />
        </div>
      ))}
    </div>
  )
}
