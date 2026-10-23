'use client'

import { useState } from 'react'
import { Button, ChipButtonGroup, ChipButtonGroupItem, Code, Tooltip } from '@sim/emcn'
import { Check, Clipboard } from '@sim/emcn/icons'
import { useTranslations } from 'next-intl'
import { getBaseUrl } from '@/lib/core/utils/urls'
import {
  buildSnippet,
  developerBaseUrl,
  SNIPPET_LANGUAGES,
  type SnippetLanguage,
} from '@/lib/nexora/developer-api/snippets'

const LANGUAGE_NAMES: Record<SnippetLanguage, string> = {
  python: 'Python',
  typescript: 'TypeScript',
  curl: 'cURL',
  n8n: 'n8n',
}

const LANGUAGE_SYNTAX: Record<SnippetLanguage, 'python' | 'javascript'> = {
  python: 'python',
  typescript: 'javascript',
  curl: 'javascript',
  n8n: 'python',
}

const COPIED_MS = 1500

interface CodeSamplesProps {
  /** A model name or `agent:<name>`. */
  model: string
  instructions?: string
}

/** Ready-to-copy calls of `model` through the developer API, with the instance's real address. */
export function CodeSamples({ model, instructions }: CodeSamplesProps) {
  const t = useTranslations('developers.code')
  const [language, setLanguage] = useState<SnippetLanguage>('python')
  const [copied, setCopied] = useState(false)
  const code = buildSnippet(language, {
    baseUrl: developerBaseUrl(getBaseUrl()),
    model,
    ...(instructions?.trim() ? { instructions } : {}),
  })

  const copy = () => {
    void navigator.clipboard.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), COPIED_MS)
  }

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-between gap-2'>
        <ChipButtonGroup
          value={language}
          onValueChange={(value) => {
            const next = SNIPPET_LANGUAGES.find((entry) => entry === value)
            if (next) setLanguage(next)
          }}
        >
          {SNIPPET_LANGUAGES.map((entry) => (
            <ChipButtonGroupItem key={entry} value={entry}>
              {LANGUAGE_NAMES[entry]}
            </ChipButtonGroupItem>
          ))}
        </ChipButtonGroup>
        <Tooltip.Root>
          <Tooltip.Trigger asChild>
            <Button variant='ghost' onClick={copy} aria-label={t('copy')} iconPadding='md'>
              {copied ? <Check className='size-3' /> : <Clipboard className='size-3' />}
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content>
            <span>{copied ? t('copied') : t('copy')}</span>
          </Tooltip.Content>
        </Tooltip.Root>
      </div>
      <Code.Viewer
        code={code}
        language={LANGUAGE_SYNTAX[language]}
        wrapText
        className='min-h-0! rounded-sm border border-[var(--border)]'
      />
    </div>
  )
}
